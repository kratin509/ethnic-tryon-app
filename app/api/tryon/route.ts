import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const SEGMIND_KEY = process.env.SEGMIND_API_KEY ?? "";
const HF_TOKEN    = process.env.HF_TOKEN ?? "";

// HF Spaces fallback (used only if Segmind fails)
const SPACES = [
  "https://nymbo-virtual-try-on.hf.space",
  "https://yisol-idm-vton.hf.space",
];

const GARMENT_DESC =
  "Indian ethnic kurti with traditional embroidery, intricate patterns, " +
  "and premium fabric — festive or formal occasion wear";

// ─── Segmind (primary) ────────────────────────────────────────────────────────

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

async function trySegmind(customerBlob: Blob, garmentBlob: Blob): Promise<string> {
  if (!SEGMIND_KEY) throw new Error("SEGMIND_API_KEY not set.");

  const [modelB64, clothB64] = await Promise.all([
    blobToBase64(customerBlob),
    blobToBase64(garmentBlob),
  ]);

  const res = await fetch("https://api.segmind.com/v1/idm-vton", {
    method: "POST",
    headers: {
      "x-api-key":    SEGMIND_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_image:          modelB64,
      cloth_image:          clothB64,
      category:             "Upper body",
      num_inference_steps:  35,
      guidance_scale:       2,
      seed:                 12467,
      base64:               true,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Segmind (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();

  // Segmind returns { image: "<base64>" }
  if (data.image) return `data:image/jpeg;base64,${data.image}`;

  // Some versions return a URL
  if (data.image_url) return String(data.image_url);

  throw new Error("Segmind response had no image field.");
}

// ─── HF Spaces (fallback) ────────────────────────────────────────────────────

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}`, ...extra } : extra;
}

async function uploadFile(spaceUrl: string, blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("files", blob, filename);

  const res = await fetch(`${spaceUrl}/upload`, {
    method:  "POST",
    headers: authHeaders(),
    body:    form,
    signal:  AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);

  const paths: string[] = await res.json();
  if (!paths?.[0]) throw new Error("Upload returned no file path.");
  return paths[0];
}

async function runTryOn(spaceUrl: string, customerPath: string, garmentPath: string): Promise<string> {
  const sessionHash = Math.random().toString(36).slice(2, 12);

  const fileObj = (path: string) => ({
    path,
    url:       `${spaceUrl}/file=${path}`,
    orig_name: path.split("/").pop() ?? "image.jpg",
    is_stream: false,
  });

  const joinRes = await fetch(`${spaceUrl}/queue/join`, {
    method:  "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      fn_index:     0,
      session_hash: sessionHash,
      event_data:   null,
      data: [
        { background: fileObj(customerPath), layers: [], composite: fileObj(customerPath) },
        fileObj(garmentPath),
        GARMENT_DESC,
        true, false, 30, 42,
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!joinRes.ok) throw new Error(`Queue join failed (${joinRes.status}): ${await joinRes.text()}`);

  const sseRes = await fetch(
    `${spaceUrl}/queue/data?session_hash=${sessionHash}`,
    { headers: authHeaders(), signal: AbortSignal.timeout(110_000) }
  );

  if (!sseRes.ok) throw new Error(`SSE stream failed (${sseRes.status})`);

  const reader   = sseRes.body?.getReader();
  if (!reader) throw new Error("Empty SSE body.");

  const decoder  = new TextDecoder();
  let   buffer   = "";
  const deadline = Date.now() + 110_000;

  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let evt: Record<string, unknown>;
      try { evt = JSON.parse(line.slice(6)); } catch { continue; }

      if (evt.msg === "process_completed") {
        const data = (evt.output as { data?: unknown[] })?.data;
        const img  = Array.isArray(data) ? data[0] : null;
        if (typeof img === "string")        return img;
        if (img && typeof img === "object") {
          const o = img as Record<string, unknown>;
          if (o.url)  return String(o.url);
          if (o.path) return `${spaceUrl}/file=${o.path}`;
        }
        throw new Error("No image in response output.");
      }
      if (evt.msg === "process_error") {
        throw new Error((evt.output as { error?: string })?.error ?? "Processing error.");
      }
    }
  }

  throw new Error("Timed out after 110 s.");
}

async function tryHFSpaces(customerBlob: Blob, garmentBlob: Blob): Promise<string> {
  const errors: string[] = [];

  for (const spaceUrl of SPACES) {
    try {
      console.log(`[kurti-tryon] Trying HF fallback ${spaceUrl}`);
      const [customerPath, garmentPath] = await Promise.all([
        uploadFile(spaceUrl, customerBlob, "customer.jpg"),
        uploadFile(spaceUrl, garmentBlob,  "garment.jpg"),
      ]);
      return await runTryOn(spaceUrl, customerPath, garmentPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[kurti-tryon] ${spaceUrl} failed — ${msg}`);
      errors.push(`${spaceUrl.replace("https://", "")}: ${msg}`);
    }
  }

  throw new Error(
    "All try-on servers are currently busy or down. Please try again in a few minutes.\n\n" +
    errors.join("\n")
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const form         = await req.formData();
    const customerFile = form.get("customer_image") as File | null;
    const kurtiFront   = form.get("kurti_front")    as File | null;

    if (!customerFile || !kurtiFront) {
      return NextResponse.json(
        { error: "Customer photo and kurti front view are required." },
        { status: 400 }
      );
    }

    const customerBlob = new Blob([await customerFile.arrayBuffer()], { type: customerFile.type || "image/jpeg" });
    const garmentBlob  = new Blob([await kurtiFront.arrayBuffer()],   { type: kurtiFront.type  || "image/jpeg" });

    // Try Segmind first, fall back to HF Spaces
    let outputUrl: string;
    let engine: string;

    if (SEGMIND_KEY) {
      try {
        console.log("[kurti-tryon] Trying Segmind IDM-VTON");
        outputUrl = await trySegmind(customerBlob, garmentBlob);
        engine    = "Segmind · IDM-VTON";
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[kurti-tryon] Segmind failed — ${msg}. Falling back to HF Spaces.`);
        outputUrl = await tryHFSpaces(customerBlob, garmentBlob);
        engine    = "Hugging Face · IDM-VTON (fallback)";
      }
    } else {
      outputUrl = await tryHFSpaces(customerBlob, garmentBlob);
      engine    = "Hugging Face · IDM-VTON (free)";
    }

    return NextResponse.json({ image_result: outputUrl, engine_used: engine });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[kurti-tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

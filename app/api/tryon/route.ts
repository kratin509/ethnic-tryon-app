import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const HF_TOKEN = process.env.HF_TOKEN ?? "";

// Spaces tried in order — if one is down the next is used automatically
const SPACES = [
  "https://nymbo-virtual-try-on.hf.space", // primary   (more reliably up)
  "https://yisol-idm-vton.hf.space",        // secondary (original)
];

const GARMENT_DESC =
  "Indian ethnic kurti with traditional embroidery, intricate patterns, " +
  "and premium fabric — festive or formal occasion wear";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return HF_TOKEN
    ? { Authorization: `Bearer ${HF_TOKEN}`, ...extra }
    : extra;
}

async function uploadFile(spaceUrl: string, blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("files", blob, filename);

  const res = await fetch(`${spaceUrl}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed on ${spaceUrl} (${res.status}): ${await res.text()}`);
  }

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

  // Join the prediction queue
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
        true,   // auto-mask
        false,  // auto-crop
        30,     // denoise steps
        42,     // seed
      ],
    }),
  });

  if (!joinRes.ok) {
    throw new Error(`Queue join failed on ${spaceUrl} (${joinRes.status}): ${await joinRes.text()}`);
  }

  // Stream SSE events until process_completed
  const sseRes = await fetch(
    `${spaceUrl}/queue/data?session_hash=${sessionHash}`,
    { headers: authHeaders() }
  );

  if (!sseRes.ok) {
    throw new Error(`SSE stream failed on ${spaceUrl} (${sseRes.status})`);
  }

  const reader = sseRes.body?.getReader();
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
        throw new Error("No image in IDM-VTON output.");
      }

      if (evt.msg === "process_error") {
        throw new Error(
          (evt.output as { error?: string })?.error ?? "IDM-VTON processing error."
        );
      }
    }
  }

  throw new Error(`Timed out after 110 s on ${spaceUrl}.`);
}

// Try each Space in order; move to the next on any error
async function tryAllSpaces(customerBlob: Blob, garmentBlob: Blob): Promise<string> {
  const errors: string[] = [];

  for (const spaceUrl of SPACES) {
    try {
      console.log(`[kurti-tryon] Trying ${spaceUrl}`);

      const [customerPath, garmentPath] = await Promise.all([
        uploadFile(spaceUrl, customerBlob, "customer.jpg"),
        uploadFile(spaceUrl, garmentBlob,  "garment.jpg"),
      ]);

      return await runTryOn(spaceUrl, customerPath, garmentPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[kurti-tryon] ${spaceUrl} failed: ${msg}`);
      errors.push(`${spaceUrl}: ${msg}`);
    }
  }

  throw new Error(
    "All Hugging Face Spaces are currently unavailable. Please try again in a few minutes.\n" +
    errors.join("\n")
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const customerFile = form.get("customer_image") as File | null;
    const kurtiFront   = form.get("kurti_front")    as File | null;

    if (!customerFile || !kurtiFront) {
      return NextResponse.json(
        { error: "Customer photo and kurti front view are required." },
        { status: 400 }
      );
    }

    const customerBlob = new Blob([await customerFile.arrayBuffer()], { type: customerFile.type || "image/jpeg" });
    const garmentBlob  = new Blob([await kurtiFront.arrayBuffer()],   { type: kurtiFront.type   || "image/jpeg" });

    const outputUrl = await tryAllSpaces(customerBlob, garmentBlob);

    return NextResponse.json({
      image_result: outputUrl,
      engine_used:  "Hugging Face · IDM-VTON",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[kurti-tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

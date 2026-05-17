import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const HF_TOKEN    = process.env.HF_TOKEN ?? "";
const SPACE_URL   = "https://yisol-idm-vton.hf.space";
const GARMENT_DESC =
  "Indian ethnic kurti with traditional embroidery, intricate patterns, " +
  "and premium fabric — festive or formal occasion wear";

// ─── Step 1: upload one file to the Space, get back its server path ───────────
async function uploadFile(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("files", blob, filename);

  const headers: Record<string, string> = {};
  if (HF_TOKEN) headers["Authorization"] = `Bearer ${HF_TOKEN}`;

  const res = await fetch(`${SPACE_URL}/upload`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    throw new Error(`File upload failed (${res.status}): ${await res.text()}`);
  }

  const paths: string[] = await res.json();
  if (!paths?.[0]) throw new Error("Upload returned no file path.");
  return paths[0]; // e.g. "/tmp/gradio/abc123/customer.jpg"
}

// ─── Step 2: submit prediction and poll SSE stream for the result ─────────────
async function runTryOn(customerPath: string, garmentPath: string): Promise<string> {
  const sessionHash = Math.random().toString(36).slice(2, 12);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HF_TOKEN) headers["Authorization"] = `Bearer ${HF_TOKEN}`;

  // IDM-VTON fn_index 0 = /tryon
  // ImageEditor input needs { background, layers, composite } with Gradio file objects
  const fileObj = (path: string) => ({
    path,
    url:      `${SPACE_URL}/file=${path}`,
    orig_name: path.split("/").pop(),
    is_stream: false,
  });

  const joinRes = await fetch(`${SPACE_URL}/queue/join`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fn_index:     0,
      session_hash: sessionHash,
      event_data:   null,
      data: [
        // arg 0: ImageEditor dict (human)
        {
          background: fileObj(customerPath),
          layers:     [],
          composite:  fileObj(customerPath),
        },
        // arg 1: garment image
        fileObj(garmentPath),
        // arg 2: garment description text
        GARMENT_DESC,
        // arg 3: auto-mask
        true,
        // arg 4: auto-crop
        false,
        // arg 5: denoise steps
        30,
        // arg 6: seed
        42,
      ],
    }),
  });

  if (!joinRes.ok) {
    throw new Error(`Queue join failed (${joinRes.status}): ${await joinRes.text()}`);
  }

  // ─── Step 3: read the SSE stream until process_completed ─────────────────────
  const sseRes = await fetch(
    `${SPACE_URL}/queue/data?session_hash=${sessionHash}`,
    { headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {} }
  );

  if (!sseRes.ok) {
    throw new Error(`SSE stream failed (${sseRes.status})`);
  }

  const reader  = sseRes.body?.getReader();
  if (!reader) throw new Error("Empty SSE response body.");

  const decoder = new TextDecoder();
  let   buffer  = "";
  const deadline = Date.now() + 110_000; // 110 s max

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
        const outputData = (evt.output as { data?: unknown[] })?.data;
        const img = Array.isArray(outputData) ? outputData[0] : null;

        // Gradio can return { url }, { path }, or a plain string URL
        if (typeof img === "string")          return img;
        if (img && typeof img === "object") {
          const o = img as Record<string, unknown>;
          if (o.url)  return String(o.url);
          if (o.path) return `${SPACE_URL}/file=${o.path}`;
        }
        throw new Error("IDM-VTON returned no image in output.");
      }

      if (evt.msg === "process_error") {
        const errMsg = (evt.output as { error?: string })?.error ?? "Unknown processing error.";
        throw new Error(`IDM-VTON error: ${errMsg}`);
      }
    }
  }

  throw new Error("IDM-VTON timed out after 110 s. Please retry.");
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

    // Upload both files in parallel
    const [customerPath, garmentPath] = await Promise.all([
      uploadFile(customerBlob, "customer.jpg"),
      uploadFile(garmentBlob,  "garment.jpg"),
    ]);

    const outputUrl = await runTryOn(customerPath, garmentPath);

    return NextResponse.json({
      image_result: outputUrl,
      engine_used:  "Hugging Face · IDM-VTON (direct HTTP)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[kurti-tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

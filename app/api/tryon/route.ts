import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── Pre-programmed generation parameters ────────────────────────────────────
// These are tuned for ethnic/Indian womenswear: heavy fabrics, intricate prints,
// structured drape, and warm studio lighting typical of showroom photography.
const FASHN_PARAMS = {
  // Core quality controls
  num_inference_steps: 50,
  guidance_scale: 2.5,
  seed: -1, // -1 = random for variety

  // Garment fidelity — preserves embroidery, zari, block-print details
  garment_photo_type: "auto",

  // Realistic body-fitting: adjusts fabric tension to body curves
  adjust_hands: true,

  // Restores fine facial features after diffusion
  restore_face: true,
  restore_background: true,

  // Higher resolution for showroom-quality output
  cover_feet: false,

  // Lighting & realism
  long_top: false,
};

async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

function buildFashnPayload(
  modelBase64: string,
  garmentBase64: string,
  category: string,
  mimeType: string
) {
  const dataUri = `data:${mimeType};base64,`;
  return {
    model_image: `${dataUri}${modelBase64}`,
    garment_image: `${dataUri}${garmentBase64}`,
    category,
    ...FASHN_PARAMS,
  };
}

// ─── Fashn.ai handler ─────────────────────────────────────────────────────────
async function runFashn(
  modelBase64: string,
  garmentBase64: string,
  category: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) throw new Error("FASHN_API_KEY is not configured.");

  const payload = buildFashnPayload(modelBase64, garmentBase64, category, mimeType);

  // Step 1 — submit job
  const submitRes = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Fashn submit failed (${submitRes.status}): ${err}`);
  }

  const { id: predictionId } = await submitRes.json();

  // Step 2 — poll for result (max 90 s)
  const pollUrl = `https://api.fashn.ai/v1/status/${predictionId}`;
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));

    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) continue;

    const data = await pollRes.json();

    if (data.status === "completed") {
      const outputUrl: string =
        Array.isArray(data.output) ? data.output[0] : data.output;
      return outputUrl;
    }

    if (data.status === "failed") {
      throw new Error(`Fashn processing failed: ${data.error ?? "unknown error"}`);
    }
  }

  throw new Error("Fashn.ai timed out after 90 s.");
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const modelFile = form.get("model_image") as File | null;
    const garmentFile = form.get("garment_image") as File | null;
    const category = (form.get("category") as string | null) ?? "auto";

    if (!modelFile || !garmentFile) {
      return NextResponse.json(
        { error: "Both model_image and garment_image are required." },
        { status: 400 }
      );
    }

    const [modelBase64, garmentBase64] = await Promise.all([
      fileToBase64(modelFile),
      fileToBase64(garmentFile),
    ]);

    const mimeType = modelFile.type || "image/jpeg";
    const resultUrl = await runFashn(modelBase64, garmentBase64, category, mimeType);

    return NextResponse.json({ result_url: resultUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    console.error("[tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

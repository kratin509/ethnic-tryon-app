import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── Pre-programmed garment descriptions by category ──────────────────────────
// IDM-VTON uses the description to understand fabric texture and drape intent.
// Tuned for ethnic Indian womenswear — no salesman input needed.
const GARMENT_DESCRIPTIONS: Record<string, string> = {
  upper_body:
    "women's ethnic upper garment — embroidered kurta, blouse, or jacket with intricate patterns, zari work, and traditional Indian fabric",
  lower_body:
    "women's ethnic lower garment — lehenga skirt, palazzo pants, or sharara with flowing fabric drape and traditional print detail",
  full_body:
    "women's full ethnic Indian outfit — anarkali suit, saree drape, or full salwar kameez with embroidery, mirror work, and rich fabric texture",
  auto: "women's ethnic Indian garment with traditional patterns, embroidery, and premium fabric texture suitable for formal or festive occasions",
};

// ─── IDM-VTON generation parameters ──────────────────────────────────────────
// Higher steps = better fabric/print fidelity. 30 is the sweet spot for
// free-tier HF inference speed vs. quality on ethnic womenswear.
const DENOISE_STEPS = 30;
const SEED = 42;

async function fileToBlob(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  return new Blob([buffer], { type: file.type || "image/jpeg" });
}

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

    const garmentDescription =
      GARMENT_DESCRIPTIONS[category] ?? GARMENT_DESCRIPTIONS.auto;

    const [modelBlob, garmentBlob] = await Promise.all([
      fileToBlob(modelFile),
      fileToBlob(garmentFile),
    ]);

    // Connect to the public IDM-VTON Space on Hugging Face.
    // HF_TOKEN is optional — add it to get better rate limits on busy days.
    const clientOptions = process.env.HF_TOKEN
      ? { token: process.env.HF_TOKEN as `hf_${string}` }
      : {};

    const client = await Client.connect("yisol/IDM-VTON", clientOptions);

    // IDM-VTON expects the human image as an ImageEditor dict
    // (background = the image, layers = [], composite = same image)
    const result = await client.predict("/tryon", {
      dict: {
        background: modelBlob,
        layers: [],
        composite: modelBlob,
      },
      garm_img: garmentBlob,
      garment_des: garmentDescription,
      is_checked: true,      // auto-mask: AI segments the person automatically
      is_checked_crop: false, // keep full-body framing
      denoise_steps: DENOISE_STEPS,
      seed: SEED,
    });

    // result.data is [output_image, masked_image]
    // output_image can be a URL string or a { url: string } object
    const rawOutput = (result.data as unknown[])[0];
    const outputUrl: string =
      typeof rawOutput === "string"
        ? rawOutput
        : (rawOutput as { url: string }).url;

    if (!outputUrl) {
      throw new Error("IDM-VTON returned an empty result.");
    }

    return NextResponse.json({ result_url: outputUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    console.error("[tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

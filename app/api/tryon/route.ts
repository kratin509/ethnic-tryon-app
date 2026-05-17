import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

export const runtime = "nodejs";
export const maxDuration = 120;

// HF_TOKEN is optional — add to .env.local for better queue priority.
// Works without it too (public shared queue, slightly slower).
const HF_TOKEN = process.env.HF_TOKEN as `hf_${string}` | undefined;

// Garment description passed to IDM-VTON so it understands fabric intent.
// Tuned for Indian ethnic kurtis — no salesman input needed.
const GARMENT_DESC =
  "Indian ethnic kurti with traditional embroidery, intricate patterns, " +
  "and premium fabric — festive or formal occasion wear";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const customerFile = form.get("customer_image") as File | null;
    const kurtiFront   = form.get("kurti_front")    as File | null;

    // kurti_back is accepted but IDM-VTON is a single-view model —
    // it uses the front view only for garment overlay.
    if (!customerFile || !kurtiFront) {
      return NextResponse.json(
        { error: "Customer photo and kurti front view are required." },
        { status: 400 }
      );
    }

    const customerBlob = new Blob(
      [await customerFile.arrayBuffer()],
      { type: customerFile.type || "image/jpeg" }
    );
    const garmentBlob = new Blob(
      [await kurtiFront.arrayBuffer()],
      { type: kurtiFront.type || "image/jpeg" }
    );

    const client = await Client.connect("yisol/IDM-VTON", {
      ...(HF_TOKEN ? { token: HF_TOKEN } : {}),
    });

    const result = await client.predict("/tryon", {
      dict: {
        background: customerBlob,
        layers: [],
        composite: customerBlob,
      },
      garm_img:     garmentBlob,
      garment_des:  GARMENT_DESC,
      is_checked:      true,   // auto-mask: AI segments the person automatically
      is_checked_crop: false,  // keep full-body framing
      denoise_steps:   30,
      seed:            42,
    });

    // result.data[0] = output image, result.data[1] = mask (ignored)
    const rawOutput = (result.data as unknown[])[0];
    const outputUrl: string =
      typeof rawOutput === "string"
        ? rawOutput
        : (rawOutput as { url: string }).url;

    if (!outputUrl) {
      throw new Error("IDM-VTON returned an empty result. The Space may be loading — please retry.");
    }

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

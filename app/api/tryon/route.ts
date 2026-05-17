import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

export const runtime = "nodejs";
export const maxDuration = 120;

const HF_TOKEN = process.env.HF_TOKEN as `hf_${string}` | undefined;

const GARMENT_DESC =
  "Indian ethnic kurti with traditional embroidery, intricate patterns, " +
  "and premium fabric — festive or formal occasion wear";

// Retry connecting to the HF Space — it may be sleeping and need a moment to wake.
async function connectWithRetry(attempts = 3): Promise<Client> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await Client.connect("yisol/IDM-VTON", {
        ...(HF_TOKEN ? { token: HF_TOKEN } : {}),
      });
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        // Back off: 4 s, then 8 s
        await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      }
    }
  }
  throw new Error(
    `Could not reach Hugging Face Space after ${attempts} attempts. ` +
    "The Space may be under maintenance — please try again in a minute. " +
    `Detail: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}

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

    const customerBlob = new Blob(
      [await customerFile.arrayBuffer()],
      { type: customerFile.type || "image/jpeg" }
    );
    const garmentBlob = new Blob(
      [await kurtiFront.arrayBuffer()],
      { type: kurtiFront.type || "image/jpeg" }
    );

    const client = await connectWithRetry();

    const result = await client.predict("/tryon", {
      dict: {
        background: customerBlob,
        layers:     [],
        composite:  customerBlob,
      },
      garm_img:        garmentBlob,
      garment_des:     GARMENT_DESC,
      is_checked:      true,
      is_checked_crop: false,
      denoise_steps:   30,
      seed:            42,
    });

    const rawOutput = (result.data as unknown[])[0];
    const outputUrl: string =
      typeof rawOutput === "string"
        ? rawOutput
        : (rawOutput as { url: string }).url;

    if (!outputUrl) {
      throw new Error(
        "IDM-VTON returned an empty result. The Space may still be warming up — please retry."
      );
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

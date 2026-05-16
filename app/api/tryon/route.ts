import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 120;

const GEMINI_API_KEY = "AIzaSyBt5xXAZ2cML6zyA49h7QA1OVbf9M2IxBE";

// Primary: fully-qualified model path as required by the v1beta endpoint routing.
// Fallback: alternative image-capable model on the same API key tier.
const PRIMARY_MODEL  = "models/gemini-2.0-flash-exp";
const FALLBACK_MODEL = "models/gemini-2.5-flash-image";

const SYSTEM_PROMPT =
  "You are a master fashion visualizer for a luxury ethnic streetwear label. " +
  "Study the uploaded Kurti carefully: note its exact patterns, embroidery, neckline, " +
  "sleeve style, hem length, and fabric texture from the front and back photos. " +
  "Overlay the Kurti precisely onto the customer's torso and body, matching their posture " +
  "and dimensions while completely preserving their facial identity and skin tone. " +
  "Synthesize matching solid pants underneath naturally to complete the outfit without " +
  "distorting the Kurti's proportions. Replace the background entirely with a beautifully " +
  "blurred, softly sunlit luxury heritage palace courtyard in Jaipur — warm golden light, " +
  "ornate sandstone arches, and shallow depth of field. " +
  "Return a single photorealistic high-resolution 2D image.";

// ─── Core generation call ─────────────────────────────────────────────────────
async function generateTryOn(
  ai: GoogleGenAI,
  model: string,
  customerB64: string,
  frontB64: string,
  backB64: string,
  customerMime: string,
  frontMime: string,
  backMime: string
): Promise<{ data: string; mimeType: string }> {
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: customerMime, data: customerB64 } },
          { inlineData: { mimeType: frontMime,    data: frontB64   } },
          { inlineData: { mimeType: backMime,     data: backB64    } },
          { text: SYSTEM_PROMPT },
        ],
      },
    ],
    config: { responseModalities: ["TEXT", "IMAGE"] },
  });

  const parts   = response.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData?.data);

  if (!imgPart?.inlineData?.data) {
    throw new Error(`${model} returned no image data in the response stream.`);
  }

  return {
    data:     imgPart.inlineData.data,
    mimeType: imgPart.inlineData.mimeType ?? "image/png",
  };
}

function isRoutingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("deprecated") ||
    msg.includes("retired") ||
    msg.includes("unavailable") ||
    msg.includes("invalid model")
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const customerFile = form.get("customer_image") as File | null;
    const kurtiFront   = form.get("kurti_front")    as File | null;
    const kurtiBack    = form.get("kurti_back")     as File | null;

    if (!customerFile || !kurtiFront || !kurtiBack) {
      return NextResponse.json(
        { error: "All 3 images (customer_image, kurti_front, kurti_back) are required." },
        { status: 400 }
      );
    }

    const toBase64 = async (f: File) =>
      Buffer.from(await f.arrayBuffer()).toString("base64");

    const [customerB64, frontB64, backB64] = await Promise.all([
      toBase64(customerFile),
      toBase64(kurtiFront),
      toBase64(kurtiBack),
    ]);

    const customerMime = customerFile.type || "image/jpeg";
    const frontMime    = kurtiFront.type   || "image/jpeg";
    const backMime     = kurtiBack.type    || "image/jpeg";

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    let result: { data: string; mimeType: string };
    let engineUsed: string;

    try {
      result     = await generateTryOn(ai, PRIMARY_MODEL, customerB64, frontB64, backB64, customerMime, frontMime, backMime);
      engineUsed = PRIMARY_MODEL;
    } catch (primaryErr) {
      if (!isRoutingError(primaryErr)) throw primaryErr;

      console.warn(
        `[kurti-tryon] ${PRIMARY_MODEL} unavailable — trying ${FALLBACK_MODEL}:`,
        primaryErr instanceof Error ? primaryErr.message : primaryErr
      );

      result     = await generateTryOn(ai, FALLBACK_MODEL, customerB64, frontB64, backB64, customerMime, frontMime, backMime);
      engineUsed = FALLBACK_MODEL;
    }

    return NextResponse.json({
      image_result: `data:${result.mimeType};base64,${result.data}`,
      engine_used:  engineUsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[kurti-tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

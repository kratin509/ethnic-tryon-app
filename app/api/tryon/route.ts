import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 120;

const GEMINI_API_KEY = "AIzaSyBt5xXAZ2cML6zyA49h7QA1OVbf9M2IxBE";
const MODEL = "models/gemini-2.5-flash-image";

// ─── Compression settings ─────────────────────────────────────────────────────
// Caps longest edge at 800 px and re-encodes as JPEG @ 82 % quality.
// Typical reduction: 2–6 MB raw → 80–180 KB — cuts input token count by ~90 %.
const MAX_DIM      = 800;
const JPEG_QUALITY = 82;

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

// ─── Image optimizer ──────────────────────────────────────────────────────────
async function optimizeImage(file: File): Promise<{ b64: string; mime: "image/jpeg" }> {
  const raw = Buffer.from(await file.arrayBuffer());

  const compressed = await sharp(raw)
    .resize(MAX_DIM, MAX_DIM, {
      fit: "inside",           // preserves aspect ratio, never upscales
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { b64: compressed.toString("base64"), mime: "image/jpeg" };
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

    // Compress all 3 images in parallel before building the payload
    const [customer, front, back] = await Promise.all([
      optimizeImage(customerFile),
      optimizeImage(kurtiFront),
      optimizeImage(kurtiBack),
    ]);

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: customer.mime, data: customer.b64 } },
            { inlineData: { mimeType: front.mime,    data: front.b64    } },
            { inlineData: { mimeType: back.mime,     data: back.b64     } },
            { text: SYSTEM_PROMPT },
          ],
        },
      ],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });

    const parts   = response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData?.data);

    if (!imgPart?.inlineData?.data) {
      throw new Error(
        `${MODEL} returned no image. ` +
        "Verify the model ID is active for your API key tier at aistudio.google.com."
      );
    }

    return NextResponse.json({
      image_result: `data:${imgPart.inlineData.mimeType ?? "image/png"};base64,${imgPart.inlineData.data}`,
      engine_used:  MODEL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[kurti-tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 120;

const GEMINI_API_KEY = "AIzaSyBt5xXAZ2cML6zyA49h7QA1OVbf9M2IxBE";

// Primary: multimodal image-in / image-out (accepts customer + garment photos)
const PRIMARY_MODEL = "gemini-3.1-flash-image-preview";

// Fallback: text-to-image only — cannot accept image inputs, so the overlay
// is synthesized purely from the text description below.
const FALLBACK_MODEL = "imagen-3.0-generate-002";

const SYSTEM_PROMPT =
  "You are a master fashion visualizer for a luxury ethnic streetwear label. " +
  "Take the uploaded front and back Kurti photos and seamlessly render them onto the customer's body. " +
  "The garment must drape realistically, matching the customer's posture and dimensions while completely " +
  "preserving their facial identity. Synthesize matching solid pants underneath naturally to complete the " +
  "outfit without distorting the Kurti's proportions. Replace the background entirely with a beautifully " +
  "blurred, high-end, softly sunlit luxury palace courtyard in Jaipur. Return a single photorealistic, " +
  "high-resolution 2D image.";

// Used by the Imagen fallback (text-only — no photo inputs available)
const IMAGEN_FALLBACK_PROMPT =
  "A photorealistic high-resolution image of an Indian woman wearing a beautifully draped luxury ethnic " +
  "Kurti with matching solid pants, standing in a softly sunlit Jaipur heritage palace courtyard. " +
  "The kurti features fine embroidery and premium fabric. Background is beautifully blurred. " +
  "Fashion editorial lighting, luxury brand aesthetic.";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isModelNotFound(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("not found") ||
    msg.includes("deprecated") ||
    msg.includes("retired") ||
    msg.includes("model") && msg.includes("unavailable")
  );
}

// ─── Engine A: Gemini multimodal (image-in → image-out) ───────────────────────
async function runGemini(
  ai: GoogleGenAI,
  customerB64: string,
  frontB64: string,
  backB64: string,
  customerMime: string,
  frontMime: string,
  backMime: string
): Promise<{ data: string; mimeType: string; engine: string }> {
  const response = await ai.models.generateContent({
    model: PRIMARY_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: customerMime, data: customerB64 } },
          { inlineData: { mimeType: frontMime,    data: frontB64    } },
          { inlineData: { mimeType: backMime,     data: backB64     } },
          { text: SYSTEM_PROMPT },
        ],
      },
    ],
    config: { responseModalities: ["IMAGE"] },
  });

  const parts   = response.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData?.data);

  if (!imgPart?.inlineData?.data) {
    throw new Error(`${PRIMARY_MODEL} returned no image data.`);
  }

  return {
    data:     imgPart.inlineData.data,
    mimeType: imgPart.inlineData.mimeType ?? "image/png",
    engine:   PRIMARY_MODEL,
  };
}

// ─── Engine B: Imagen fallback (text-to-image — no photo overlay) ─────────────
async function runImagen(
  ai: GoogleGenAI
): Promise<{ data: string; mimeType: string; engine: string }> {
  const response = await ai.models.generateImages({
    model: FALLBACK_MODEL,
    prompt: IMAGEN_FALLBACK_PROMPT,
    config: { numberOfImages: 1, aspectRatio: "9:16" },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error(`${FALLBACK_MODEL} returned no image data.`);
  }

  return {
    data:     imageBytes,
    mimeType: "image/png",
    engine:   FALLBACK_MODEL,
  };
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
        { error: "All 3 images (customer photo, kurti front, kurti back) are required." },
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

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    let result: { data: string; mimeType: string; engine: string };

    try {
      // Attempt primary multimodal model
      result = await runGemini(
        ai,
        customerB64, frontB64, backB64,
        customerFile.type || "image/jpeg",
        kurtiFront.type   || "image/jpeg",
        kurtiBack.type    || "image/jpeg"
      );
    } catch (primaryErr) {
      if (isModelNotFound(primaryErr)) {
        // Primary model unavailable — fall back to Imagen text-to-image
        console.warn(
          `[kurti-tryon] ${PRIMARY_MODEL} unavailable, falling back to ${FALLBACK_MODEL}:`,
          primaryErr instanceof Error ? primaryErr.message : primaryErr
        );
        result = await runImagen(ai);
      } else {
        throw primaryErr;
      }
    }

    return NextResponse.json({
      image_result: `data:${result.mimeType};base64,${result.data}`,
      engine_used:  result.engine,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[kurti-tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

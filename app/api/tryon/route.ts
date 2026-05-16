import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 120;

const GEMINI_API_KEY = "AIzaSyBt5xXAZ2cML6zyA49h7QA1OVbf9M2IxBE";

// gemini-2.0-flash-exp is the current stable model that supports both
// multimodal image INPUT (inlineData) and image OUTPUT (responseModalities IMAGE).
// gemini-1.5-pro / gemini-2.5-flash are vision-to-TEXT models only — they
// cannot generate or return images, so they are not suitable for this pipeline.
const MODEL = "gemini-2.0-flash-exp";

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

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            // Image 1: customer reference
            { inlineData: { mimeType: customerFile.type || "image/jpeg", data: customerB64 } },
            // Image 2: kurti front — patterns, neckline, sleeves, hem
            { inlineData: { mimeType: kurtiFront.type   || "image/jpeg", data: frontB64   } },
            // Image 3: kurti back — back print, placket, rear drape
            { inlineData: { mimeType: kurtiBack.type    || "image/jpeg", data: backB64    } },
            { text: SYSTEM_PROMPT },
          ],
        },
      ],
      config: { responseModalities: ["IMAGE"] },
    });

    const parts   = response.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData?.data);

    if (!imgPart?.inlineData?.data) {
      throw new Error(
        "Model returned no image. Ensure your API key has access to gemini-2.0-flash-exp " +
        "and that the model is available in your region."
      );
    }

    return NextResponse.json({
      image_result: `data:${imgPart.inlineData.mimeType ?? "image/png"};base64,${imgPart.inlineData.data}`,
      engine_used: MODEL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[kurti-tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 120;

const GEMINI_API_KEY = "AIzaSyBt5xXAZ2cML6zyA49h7QA1OVbf9M2IxBE";

const SYSTEM_PROMPT =
  "You are a master fashion visualizer for a luxury ethnic streetwear label. " +
  "Take the uploaded front and back Kurti photos and seamlessly render them onto the customer's body. " +
  "The garment must drape realistically, matching the customer's posture and dimensions while completely " +
  "preserving their facial identity. Synthesize matching solid pants underneath naturally to complete the " +
  "outfit without distorting the Kurti's proportions. Replace the background entirely with a beautifully " +
  "blurred, high-end, softly sunlit luxury palace courtyard in Jaipur. Return a single photorealistic, " +
  "high-resolution 2D image.";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const customerFile  = form.get("customer_image") as File | null;
    const kurtiFront    = form.get("kurti_front")    as File | null;
    const kurtiBack     = form.get("kurti_back")     as File | null;

    if (!customerFile || !kurtiFront || !kurtiBack) {
      return NextResponse.json(
        { error: "All 3 images (customer photo, kurti front, kurti back) are required." },
        { status: 400 }
      );
    }

    const toBase64 = async (file: File) =>
      Buffer.from(await file.arrayBuffer()).toString("base64");

    const [customerB64, frontB64, backB64] = await Promise.all([
      toBase64(customerFile),
      toBase64(kurtiFront),
      toBase64(kurtiBack),
    ]);

    const customerMime = customerFile.type || "image/jpeg";
    const frontMime    = kurtiFront.type   || "image/jpeg";
    const backMime     = kurtiBack.type    || "image/jpeg";

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
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
      throw new Error(
        "Gemini returned no image. Verify the model is available for your API key and region."
      );
    }

    const { data, mimeType = "image/png" } = imgPart.inlineData;

    return NextResponse.json({
      image_result: `data:${mimeType};base64,${data}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[kurti-tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

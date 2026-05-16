import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── Hardcoded credentials ────────────────────────────────────────────────────
const GEMINI_API_KEY = "AIzaSyBt5xXAZ2cML6zyA49h7QA1OVbf9M2IxBE";
const TRIPO3D_API_KEY = "tsk_EhTSeg6Q_NnqOBbZzShrR68_xMEmLf-3zOmUJXOtgFN";
const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi";

// ─── Engine A: Gemini hidden system instruction ───────────────────────────────
const TRYON_PROMPT =
  "Take the uploaded garment and overlay it seamlessly onto the customer's body, " +
  "preserving their facial identity, posture, and body structure perfectly. " +
  "Place them against a beautifully blurred, high-end architectural background " +
  "resembling a premium luxury heritage palace courtyard in Jaipur. " +
  "Return a single high-fidelity photorealistic 2D image.";

async function runGemini(
  customerBase64: string,
  garmentBase64: string,
  mimeType: string
): Promise<{ data: string; mimeType: string }> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-preview-image-generation",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: customerBase64 } },
          { inlineData: { mimeType, data: garmentBase64 } },
          { text: TRYON_PROMPT },
        ],
      },
    ],
    config: { responseModalities: ["IMAGE"] },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p) => p.inlineData?.data);
  if (!imgPart?.inlineData?.data) {
    throw new Error("Gemini returned no image. Check model availability for your region/plan.");
  }
  return {
    data: imgPart.inlineData.data,
    mimeType: imgPart.inlineData.mimeType ?? "image/png",
  };
}

// ─── Engine B: Tripo3D upload + task submit ───────────────────────────────────
async function tripoUpload(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), `garment.${ext}`);

  const res = await fetch(`${TRIPO_BASE}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TRIPO3D_API_KEY}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Tripo upload error (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const token: string | undefined = json?.data?.image_token;
  if (!token) throw new Error("Tripo upload returned no image_token");
  return token;
}

async function tripoSubmitTask(
  frontBuf: ArrayBuffer,
  backBuf: ArrayBuffer,
  leftBuf: ArrayBuffer,
  rightBuf: ArrayBuffer,
  mime: string
): Promise<string> {
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";

  // Upload all 4 views in parallel to get file tokens
  const [frontTok, backTok, leftTok, rightTok] = await Promise.all([
    tripoUpload(frontBuf, mime),
    tripoUpload(backBuf, mime),
    tripoUpload(leftBuf, mime),
    tripoUpload(rightBuf, mime),
  ]);

  const res = await fetch(`${TRIPO_BASE}/task`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TRIPO3D_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "image_to_model",
      file: { type: ext, file_token: frontTok },
      multiview_files: [
        { type: ext, file_token: backTok },
        { type: ext, file_token: leftTok },
        { type: ext, file_token: rightTok },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Tripo task submit error (${res.status}): ${await res.text()}`);
  const json = await res.json();
  const taskId: string | undefined = json?.data?.task_id;
  if (!taskId) throw new Error("Tripo returned no task_id");
  return taskId;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const customerFile = form.get("customer_image") as File | null;
    const frontFile    = form.get("garment_front")  as File | null;
    const backFile     = form.get("garment_back")   as File | null;
    const leftFile     = form.get("garment_left")   as File | null;
    const rightFile    = form.get("garment_right")  as File | null;

    if (!customerFile || !frontFile || !backFile || !leftFile || !rightFile) {
      return NextResponse.json({ error: "All 5 images are required." }, { status: 400 });
    }

    const customerMime = customerFile.type || "image/jpeg";
    const garmentMime  = frontFile.type   || "image/jpeg";

    const [customerBuf, frontBuf, backBuf, leftBuf, rightBuf] = await Promise.all([
      customerFile.arrayBuffer(),
      frontFile.arrayBuffer(),
      backFile.arrayBuffer(),
      leftFile.arrayBuffer(),
      rightFile.arrayBuffer(),
    ]);

    const customerBase64 = Buffer.from(customerBuf).toString("base64");
    const frontBase64    = Buffer.from(frontBuf).toString("base64");

    // Run both engines in parallel:
    //   Engine A — Gemini generates the 2D try-on image
    //   Engine B — Tripo3D uploads 4 views and submits the 3D task (fast; we poll later)
    const [geminiResult, tripoResult] = await Promise.allSettled([
      runGemini(customerBase64, frontBase64, customerMime),
      tripoSubmitTask(frontBuf, backBuf, leftBuf, rightBuf, garmentMime),
    ]);

    return NextResponse.json({
      image_result:
        geminiResult.status === "fulfilled"
          ? `data:${geminiResult.value.mimeType};base64,${geminiResult.value.data}`
          : null,
      image_error:
        geminiResult.status === "rejected"
          ? String((geminiResult.reason as Error).message)
          : null,
      tripo_task_id:
        tripoResult.status === "fulfilled" ? tripoResult.value : null,
      tripo_error:
        tripoResult.status === "rejected"
          ? String((tripoResult.reason as Error).message)
          : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[360tryon]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

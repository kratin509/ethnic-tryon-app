import { NextRequest, NextResponse } from "next/server";

const TRIPO3D_API_KEY = "tsk_EhTSeg6Q_NnqOBbZzShrR68_xMEmLf-3zOmUJXOtgFN";
const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("task_id");
  if (!taskId) {
    return NextResponse.json({ error: "task_id is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${TRIPO_BASE}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${TRIPO3D_API_KEY}` },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Tripo status check failed (${res.status})`);
    }

    const json = await res.json();
    const data = json?.data ?? {};

    return NextResponse.json({
      status:    data.status    ?? "unknown",
      progress:  data.progress  ?? 0,
      model_url: data.output?.model ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status check failed" },
      { status: 500 }
    );
  }
}

"use client";

import { useEffect } from "react";
import Script from "next/script";

interface ResultViewProps {
  imageResult: string | null;
  imageError: string | null;
  modelUrl: string | null;
  modelError: string | null;
  modelLoading: boolean;
  modelProgress: number;
  onReset: () => void;
}

export default function ResultView({
  imageResult,
  imageError,
  modelUrl,
  modelError,
  modelLoading,
  modelProgress,
  onReset,
}: ResultViewProps) {
  // Inject model-viewer script once
  useEffect(() => {}, []);

  const handleDownload = async () => {
    if (!imageResult) return;
    try {
      const a = document.createElement("a");
      a.href = imageResult;
      a.download = `ethnic-tryon-${Date.now()}.png`;
      a.click();
    } catch {
      window.open(imageResult, "_blank");
    }
  };

  return (
    <>
      {/* model-viewer web component loader */}
      <Script
        type="module"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
        strategy="afterInteractive"
      />

      <div className="fade-in-up flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[#2C1A0E] font-bold text-lg tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
              360° Try-On Room
            </h2>
            <p className="text-[#7A5C44] text-xs mt-0.5">Dual-engine AI result</p>
          </div>
          <button
            onClick={onReset}
            className="text-xs text-[#7A5C44] underline underline-offset-2 hover:text-[#2C1A0E] transition-colors"
          >
            New Try-On
          </button>
        </div>

        {/* ── SECTION 1: The Fit & Vibe (Gemini 2D) ────────────────────────── */}
        <div className="flex flex-col gap-3">
          {/* Section label */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#2C1A0E] flex items-center justify-center text-[#C9A96E] text-xs font-bold">
              1
            </div>
            <div>
              <p className="text-[#2C1A0E] font-semibold text-sm tracking-wide">The Fit &amp; Vibe</p>
              <p className="text-[#7A5C44] text-[11px]">Gemini AI · Photorealistic 2D fitting</p>
            </div>
          </div>

          {imageResult ? (
            <div className="rounded-2xl overflow-hidden shadow-lg border border-[#C9A96E]/15">
              <img
                src={imageResult}
                alt="AI try-on result"
                className="w-full h-auto object-cover"
                style={{ maxHeight: "72vh" }}
              />
            </div>
          ) : imageError ? (
            <ErrorCard message={imageError} />
          ) : (
            <ShimmerPlaceholder label="Generating fit image…" aspectRatio="3/4" />
          )}

          {imageResult && (
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 bg-[#2C1A0E] text-[#FAF6F0] rounded-xl text-xs font-semibold tracking-widest uppercase hover:bg-[#3D2517] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <DownloadIcon /> Save Image
              </button>
              <button
                onClick={onReset}
                className="px-4 py-3 border border-[#C9A96E]/40 text-[#7A5C44] rounded-xl text-xs font-semibold tracking-widest uppercase hover:border-[#C9A96E] hover:text-[#2C1A0E] active:scale-[0.98] transition-all"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#C9A96E]/20" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C9A96E]/60">
            then
          </span>
          <div className="flex-1 h-px bg-[#C9A96E]/20" />
        </div>

        {/* ── SECTION 2: The 360° Fabric Mesh (Tripo3D) ────────────────────── */}
        <div className="flex flex-col gap-3">
          {/* Section label */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#2C1A0E] flex items-center justify-center text-[#C9A96E] text-xs font-bold">
              2
            </div>
            <div>
              <p className="text-[#2C1A0E] font-semibold text-sm tracking-wide">The 360° Inspection</p>
              <p className="text-[#7A5C44] text-[11px]">Tripo3D · Interactive fabric mesh</p>
            </div>
          </div>

          {modelUrl ? (
            <div className="rounded-2xl overflow-hidden border border-[#C9A96E]/20 shadow-md bg-[#1A0F07]">
              {/* @ts-expect-error model-viewer is a custom web component */}
              <model-viewer
                src={modelUrl}
                alt="3D garment mesh"
                auto-rotate
                camera-controls
                touch-action="pan-y"
                shadow-intensity="1"
                exposure="0.8"
                style={{ width: "100%", height: "360px", backgroundColor: "#1A0F07" }}
              />
              <div className="px-4 py-2 flex items-center justify-between border-t border-[#C9A96E]/10">
                <p className="text-[10px] text-[#C9A96E]/60 tracking-widest uppercase">
                  Swipe to rotate · Pinch to zoom
                </p>
                <a
                  href={modelUrl}
                  download="garment-3d.glb"
                  className="text-[10px] text-[#C9A96E] underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download .glb
                </a>
              </div>
            </div>
          ) : modelError ? (
            <ErrorCard message={modelError} />
          ) : modelLoading ? (
            <div className="rounded-2xl border border-[#C9A96E]/15 bg-white/50 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-[#C9A96E]/30 border-t-[#C9A96E] animate-spin flex-shrink-0" />
                <p className="text-[#2C1A0E] text-xs font-semibold">Building 3D fabric mesh…</p>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-[#C9A96E]/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C9A96E] rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(5, modelProgress)}%` }}
                />
              </div>
              <p className="text-[#7A5C44] text-[11px]">
                {modelProgress > 0 ? `${modelProgress}% complete` : "Queued — usually takes 2 – 4 minutes"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ShimmerPlaceholder({ label, aspectRatio }: { label: string; aspectRatio: string }) {
  return (
    <div
      className="rounded-2xl shimmer border border-[#C9A96E]/10 flex items-center justify-center"
      style={{ aspectRatio, minHeight: "240px" }}
    >
      <p className="text-[#7A5C44]/50 text-xs">{label}</p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex gap-3 items-start">
      <span className="text-red-400 text-base mt-0.5 flex-shrink-0">⚠</span>
      <p className="text-red-600 text-xs leading-relaxed">{message}</p>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 10L4 6.5M7.5 10L11 6.5M7.5 10V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

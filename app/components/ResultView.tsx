"use client";

import { useState } from "react";

interface ResultViewProps {
  resultUrl: string;
  originalUrl: string;
  onReset: () => void;
}

export default function ResultView({ resultUrl, originalUrl, onReset }: ResultViewProps) {
  const [activeView, setActiveView] = useState<"result" | "compare">("result");

  const handleDownload = async () => {
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ethnic-tryon-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(resultUrl, "_blank");
    }
  };

  return (
    <div className="fade-in-up flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#2C1A0E] font-semibold text-base tracking-wide">
            Try-On Result
          </h2>
          <p className="text-[#7A5C44] text-xs mt-0.5">
            Photorealistic AI fitting
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-[#7A5C44] underline underline-offset-2 hover:text-[#2C1A0E] transition-colors"
        >
          New Try-On
        </button>
      </div>

      {/* Toggle tabs */}
      <div className="flex rounded-xl overflow-hidden border border-[#C9A96E]/20 bg-white/50">
        {(["result", "compare"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={[
              "flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all duration-150",
              activeView === tab
                ? "bg-[#2C1A0E] text-[#C9A96E]"
                : "text-[#7A5C44] hover:text-[#2C1A0E]",
            ].join(" ")}
          >
            {tab === "result" ? "Result" : "Before / After"}
          </button>
        ))}
      </div>

      {/* Image display */}
      {activeView === "result" ? (
        <div className="rounded-2xl overflow-hidden shadow-lg border border-[#C9A96E]/10">
          <img
            src={resultUrl}
            alt="Virtual try-on result"
            className="w-full h-auto object-cover"
            style={{ maxHeight: "70vh" }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Original */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#7A5C44] text-center">
              Original
            </span>
            <div className="rounded-xl overflow-hidden border border-[#C9A96E]/20 shadow-sm aspect-[3/4]">
              <img
                src={originalUrl}
                alt="Original customer photo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          {/* Result */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C9A96E] text-center">
              Try-On
            </span>
            <div className="rounded-xl overflow-hidden border border-[#C9A96E]/40 shadow-md aspect-[3/4]">
              <img
                src={resultUrl}
                alt="Virtual try-on result"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={handleDownload}
          className="flex-1 py-3.5 bg-[#2C1A0E] text-[#FAF6F0] rounded-xl text-sm font-semibold tracking-wide hover:bg-[#3D2517] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
        >
          <DownloadIcon />
          Save Image
        </button>
        <button
          onClick={onReset}
          className="px-5 py-3.5 border border-[#C9A96E]/40 text-[#7A5C44] rounded-xl text-sm font-semibold tracking-wide hover:border-[#C9A96E] hover:text-[#2C1A0E] active:scale-[0.98] transition-all duration-150"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 10L4 6.5M7.5 10L11 6.5M7.5 10V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

"use client";

import { useState } from "react";
import ImageDropZone from "./components/ImageDropZone";
import GarmentSelect from "./components/GarmentSelect";
import LoadingSpinner from "./components/LoadingSpinner";
import ResultView from "./components/ResultView";

type AppState = "idle" | "loading" | "result" | "error";

export default function Home() {
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [garmentImage, setGarmentImage] = useState<File | null>(null);
  const [category, setCategory] = useState("auto");
  const [appState, setAppState] = useState<AppState>("idle");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const canSubmit = modelImage !== null && garmentImage !== null && appState !== "loading";

  const handleModelChange = (file: File | null) => {
    setModelImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setOriginalPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setOriginalPreview("");
    }
  };

  const handleSubmit = async () => {
    if (!modelImage || !garmentImage) return;

    setAppState("loading");
    setErrorMsg("");

    try {
      const form = new FormData();
      form.append("model_image", modelImage);
      form.append("garment_image", garmentImage);
      form.append("category", category);

      const res = await fetch("/api/tryon", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server error (${res.status})`);
      }

      setResultUrl(data.result_url);
      setAppState("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setResultUrl("");
    setErrorMsg("");
    // Keep images so salesman can retry with tweaks
  };

  const handleFullReset = () => {
    setAppState("idle");
    setModelImage(null);
    setGarmentImage(null);
    setResultUrl("");
    setErrorMsg("");
    setOriginalPreview("");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--cream)" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 border-b border-[#C9A96E]/20 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(250,246,240,0.92)" }}
      >
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1
              className="text-[#2C1A0E] font-bold tracking-tight leading-none"
              style={{ fontSize: "1.1rem", fontFamily: "Georgia, serif" }}
            >
              Ethnic Tryon
            </h1>
            <p className="text-[#7A5C44] text-[10px] font-medium tracking-widest uppercase mt-0.5">
              Virtual Fitting Room
            </p>
          </div>
          {/* Brand mark */}
          <div className="w-8 h-8 rounded-full bg-[#2C1A0E] flex items-center justify-center">
            <HangerIcon />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col gap-6 pb-10">

        {appState === "loading" && (
          <div className="rounded-2xl bg-white/70 border border-[#C9A96E]/15 p-6 shadow-sm">
            <LoadingSpinner />
          </div>
        )}

        {appState === "result" && resultUrl && (
          <ResultView
            resultUrl={resultUrl}
            originalUrl={originalPreview}
            onReset={handleReset}
          />
        )}

        {appState === "error" && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-lg leading-none mt-0.5">⚠</span>
              <div>
                <p className="text-red-700 font-semibold text-sm">Try-On Failed</p>
                <p className="text-red-500 text-xs mt-1 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-red-600 underline underline-offset-2 text-left"
            >
              Try again
            </button>
          </div>
        )}

        {/* Always show the form unless actively loading or showing result */}
        {(appState === "idle" || appState === "error") && (
          <>
            {/* Intro copy */}
            <div className="pt-1">
              <h2
                className="text-[#2C1A0E] font-semibold text-xl leading-snug"
                style={{ fontFamily: "Georgia, serif" }}
              >
                See it on her,
                <br />
                before she tries it on.
              </h2>
              <p className="text-[#7A5C44] text-sm mt-2 leading-relaxed">
                Upload two photos — our AI handles the rest.
              </p>
            </div>

            {/* Drop zones */}
            <div className="grid grid-cols-2 gap-3">
              <ImageDropZone
                label="Customer Photo"
                sublabel="Full body, front-facing"
                icon={<PersonIcon />}
                value={modelImage}
                onChange={handleModelChange}
              />
              <ImageDropZone
                label="Garment Photo"
                sublabel="Flat-lay or hanger shot"
                icon={<ShirtIcon />}
                value={garmentImage}
                onChange={setGarmentImage}
              />
            </div>

            {/* Garment category selector */}
            <GarmentSelect value={category} onChange={setCategory} />

            {/* Subtle tip */}
            <div className="flex items-start gap-2.5 bg-[#C9A96E]/8 rounded-xl px-4 py-3 border border-[#C9A96E]/15">
              <span className="text-[#C9A96E] text-sm mt-0.5">✦</span>
              <p className="text-[#7A5C44] text-xs leading-relaxed">
                Fabric drape, lighting, and print fidelity are pre-calibrated for ethnic womenswear. No prompting needed.
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={[
                "w-full py-4 rounded-2xl text-sm font-semibold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-3",
                canSubmit
                  ? "bg-[#2C1A0E] text-[#FAF6F0] hover:bg-[#3D2517] active:scale-[0.98] shadow-md shadow-[#2C1A0E]/20"
                  : "bg-[#2C1A0E]/20 text-[#7A5C44] cursor-not-allowed",
              ].join(" ")}
            >
              <SparkleIcon active={canSubmit} />
              Execute Try-On
            </button>

            {!canSubmit && (
              <p className="text-center text-[11px] text-[#7A5C44]/70 -mt-3">
                {!modelImage && !garmentImage
                  ? "Upload both photos to continue"
                  : !modelImage
                  ? "Upload a customer photo"
                  : "Upload a garment photo"}
              </p>
            )}
          </>
        )}

        {/* After result — allow starting fresh */}
        {appState === "result" && (
          <button
            onClick={handleFullReset}
            className="text-center text-xs text-[#7A5C44] underline underline-offset-2 hover:text-[#2C1A0E] transition-colors mt-2"
          >
            Start with different photos
          </button>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#C9A96E]/15 py-4 text-center">
        <p className="text-[10px] text-[#7A5C44]/60 tracking-widest uppercase">
          Powered by Fashn.ai · AI Fabric Intelligence
        </p>
      </footer>
    </div>
  );
}

// ─── Inline SVG icons ──────────────────────────────────────────────────────────

function HangerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 18H3.62a1 1 0 0 1-.74-1.67L12 7" />
      <path d="M12 7V5" />
      <circle cx="12" cy="4" r="1" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  );
}

function ShirtIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.86l.58-3.57a2 2 0 0 0-1.34-2.23z" />
    </svg>
  );
}

function SparkleIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={active ? "#C9A96E" : "#7A5C44"} stroke="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

"use client";

import { useState } from "react";
import ImageDropZone from "./components/ImageDropZone";
import LoadingSpinner from "./components/LoadingSpinner";
import ResultView from "./components/ResultView";

type AppState = "idle" | "loading" | "result" | "error";

export default function Home() {
  const [customerImage, setCustomerImage] = useState<File | null>(null);
  const [kurtiFront,    setKurtiFront]    = useState<File | null>(null);
  const [kurtiBack,     setKurtiBack]     = useState<File | null>(null);

  const [appState,     setAppState]     = useState<AppState>("idle");
  const [imageResult,  setImageResult]  = useState<string>("");
  const [errorMsg,     setErrorMsg]     = useState<string>("");

  const allUploaded = customerImage && kurtiFront && kurtiBack;

  const handleSubmit = async () => {
    if (!allUploaded) return;

    setAppState("loading");
    setErrorMsg("");
    setImageResult("");

    try {
      const form = new FormData();
      form.append("customer_image", customerImage);
      form.append("kurti_front",    kurtiFront);
      form.append("kurti_back",     kurtiBack);

      const res  = await fetch("/api/tryon", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server error (${res.status})`);
      }

      setImageResult(data.image_result);
      setAppState("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please retry.");
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setImageResult("");
    setErrorMsg("");
  };

  const handleFullReset = () => {
    handleReset();
    setCustomerImage(null);
    setKurtiFront(null);
    setKurtiBack(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--cream)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 border-b border-[#C9A96E]/20 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(250,246,240,0.94)" }}
      >
        <div className="max-w-md mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            {/* Brand wordmark */}
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#C9A96E]">
              NAKSHA
            </p>
            <h1
              className="text-[#2C1A0E] font-bold leading-none mt-0.5"
              style={{ fontSize: "0.95rem", fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}
            >
              KURTI FITTING ROOM
            </h1>
          </div>
          {/* Logo mark */}
          <div className="flex flex-col items-center justify-center w-9 h-9 rounded-full bg-[#2C1A0E]">
            <NakshaLogoMark />
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 flex flex-col gap-5 pb-12">

        {/* LOADING */}
        {appState === "loading" && (
          <div className="rounded-2xl bg-white/70 border border-[#C9A96E]/15 px-5 shadow-sm">
            <LoadingSpinner />
          </div>
        )}

        {/* ERROR */}
        {appState === "error" && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-4 flex flex-col gap-3">
            <div className="flex gap-3 items-start">
              <span className="text-red-400 text-base flex-shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-red-700 font-semibold text-sm">Fitting failed</p>
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

        {/* RESULT */}
        {appState === "result" && imageResult && (
          <>
            <ResultView imageResult={imageResult} onReset={handleReset} />
            <button
              onClick={handleFullReset}
              className="text-center text-xs text-[#7A5C44] underline underline-offset-2 hover:text-[#2C1A0E] transition-colors"
            >
              Start fresh with new photos
            </button>
          </>
        )}

        {/* IDLE UPLOAD SCREEN */}
        {(appState === "idle" || appState === "error") && (
          <>
            {/* Hero copy */}
            <div className="pt-1">
              <h2
                className="text-[#2C1A0E] font-semibold text-xl leading-snug"
                style={{ fontFamily: "Georgia, serif" }}
              >
                See how your
                <br />
                kurti fits — instantly.
              </h2>
              <p className="text-[#7A5C44] text-sm mt-2 leading-relaxed">
                Upload 3 photos. Our AI drapes the kurti onto your customer against a Jaipur palace backdrop.
              </p>
            </div>

            {/* BOX 1 — Customer Photo */}
            <UploadStep step={1} label="Snap/Upload Your Photo" sublabel="Front-facing, full body, plain background" done={!!customerImage}>
              <ImageDropZone
                label="Your Photo"
                sublabel="Full body, front-facing"
                icon={<PersonIcon />}
                value={customerImage}
                onChange={setCustomerImage}
              />
            </UploadStep>

            {/* BOX 2 — Kurti Front */}
            <UploadStep step={2} label="Snap/Upload Kurti — Front View" sublabel="Lay flat or hang on a hanger" done={!!kurtiFront}>
              <ImageDropZone
                label="Kurti Front"
                sublabel="Flat-lay or hanger, front side"
                icon={<KurtiIcon />}
                value={kurtiFront}
                onChange={setKurtiFront}
              />
            </UploadStep>

            {/* BOX 3 — Kurti Back */}
            <UploadStep step={3} label="Snap/Upload Kurti — Back View" sublabel="Flip garment to show back print" done={!!kurtiBack}>
              <ImageDropZone
                label="Kurti Back"
                sublabel="Reverse side, back detailing"
                icon={<KurtiBackIcon />}
                value={kurtiBack}
                onChange={setKurtiBack}
              />
            </UploadStep>

            {/* Tip */}
            <div className="flex items-start gap-2.5 bg-[#C9A96E]/8 rounded-xl px-4 py-3 border border-[#C9A96E]/15">
              <span className="text-[#C9A96E] text-sm mt-0.5 flex-shrink-0">✦</span>
              <p className="text-[#7A5C44] text-xs leading-relaxed">
                Front and back views let our AI perfectly replicate the neckline, sleeve cut, back print, and hem length on the customer.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={handleSubmit}
              disabled={!allUploaded}
              className={[
                "w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-3",
                allUploaded
                  ? "bg-[#2C1A0E] text-[#FAF6F0] hover:bg-[#3D2517] active:scale-[0.98] shadow-lg shadow-[#2C1A0E]/20"
                  : "bg-[#2C1A0E]/20 text-[#7A5C44] cursor-not-allowed",
              ].join(" ")}
            >
              <SparkleIcon active={!!allUploaded} />
              Visualize Fitting
            </button>

            {!allUploaded && (
              <p className="text-center text-[11px] text-[#7A5C44]/60 -mt-3">
                {[
                  !customerImage && "your photo",
                  !kurtiFront    && "kurti front",
                  !kurtiBack     && "kurti back",
                ]
                  .filter(Boolean)
                  .join(" · ")
                  .replace(/^./, (c) => "Still needed: " + c.toUpperCase())}
              </p>
            )}
          </>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#C9A96E]/15 py-3 text-center">
        <p className="text-[9px] text-[#7A5C44]/50 tracking-[0.2em] uppercase">
          NAKSHA · Powered by Gemini AI
        </p>
      </footer>
    </div>
  );
}

// ─── UploadStep wrapper ────────────────────────────────────────────────────────
function UploadStep({
  step,
  label,
  sublabel,
  done,
  children,
}: {
  step: number;
  label: string;
  sublabel: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <div
          className={[
            "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-200",
            done
              ? "bg-[#2C1A0E] text-[#C9A96E]"
              : "border-2 border-[#C9A96E]/40 text-[#C9A96E]",
          ].join(" ")}
        >
          {done ? "✓" : step}
        </div>
        <div className="min-w-0">
          <p className="text-[#2C1A0E] text-xs font-semibold leading-snug">{label}</p>
          <p className="text-[#7A5C44] text-[10px] mt-0.5">{sublabel}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
function NakshaLogoMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
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
function KurtiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.86l.58-3.57a2 2 0 0 0-1.34-2.23z" />
      <path d="M12 10v8M9 13h6" />
    </svg>
  );
}
function KurtiBackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.86l.58-3.57a2 2 0 0 0-1.34-2.23z" />
      <path d="M9 14c1 1 4 1 6 0" />
    </svg>
  );
}
function SparkleIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "#C9A96E" : "#7A5C44"}>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

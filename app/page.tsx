"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ImageDropZone from "./components/ImageDropZone";
import LoadingSpinner from "./components/LoadingSpinner";
import ResultView from "./components/ResultView";

// ─── Types ────────────────────────────────────────────────────────────────────
type AppState = "idle" | "processing" | "result";

interface TryOnResult {
  imageResult: string | null;
  imageError: string | null;
  tripoTaskId: string | null;
  tripoError: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  // Upload state
  const [customerImage,  setCustomerImage]  = useState<File | null>(null);
  const [garmentFront,   setGarmentFront]   = useState<File | null>(null);
  const [garmentBack,    setGarmentBack]    = useState<File | null>(null);
  const [garmentLeft,    setGarmentLeft]    = useState<File | null>(null);
  const [garmentRight,   setGarmentRight]   = useState<File | null>(null);

  // App state
  const [appState, setAppState] = useState<AppState>("idle");

  // Engine A state
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [imageError,  setImageError]  = useState<string | null>(null);
  const [geminiDone,  setGeminiDone]  = useState(false);

  // Engine B state
  const [modelUrl,       setModelUrl]       = useState<string | null>(null);
  const [modelError,     setModelError]     = useState<string | null>(null);
  const [modelLoading,   setModelLoading]   = useState(false);
  const [modelProgress,  setModelProgress]  = useState(0);
  const [tripoDone,      setTripoDone]      = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allUploaded =
    customerImage && garmentFront && garmentBack && garmentLeft && garmentRight;

  // ─── Poll Tripo3D status ────────────────────────────────────────────────────
  const startPolling = useCallback((taskId: string) => {
    setModelLoading(true);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/tryon/status?task_id=${taskId}`);
        const data = await res.json();

        if (data.progress) setModelProgress(data.progress);

        if (data.status === "success" && data.model_url) {
          clearInterval(pollRef.current!);
          setModelUrl(data.model_url);
          setModelLoading(false);
          setTripoDone(true);
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setModelError(data.error ?? "3D mesh generation failed.");
          setModelLoading(false);
          setTripoDone(true);
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 6000);
  }, []);

  // Clean up on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!allUploaded) return;

    setAppState("processing");
    setImageResult(null);
    setImageError(null);
    setModelUrl(null);
    setModelError(null);
    setModelLoading(false);
    setModelProgress(0);
    setGeminiDone(false);
    setTripoDone(false);

    try {
      const form = new FormData();
      form.append("customer_image", customerImage);
      form.append("garment_front",  garmentFront);
      form.append("garment_back",   garmentBack);
      form.append("garment_left",   garmentLeft);
      form.append("garment_right",  garmentRight);

      const res  = await fetch("/api/tryon", { method: "POST", body: form });
      const data: TryOnResult = await res.json();

      // Engine A result
      setImageResult(data.imageResult ?? null);
      setImageError(data.imageError   ?? null);
      setGeminiDone(true);

      // Engine B — kick off client-side polling
      if (data.tripoTaskId) {
        startPolling(data.tripoTaskId);
      } else {
        setModelError(data.tripoError ?? "3D task was not submitted.");
        setTripoDone(true);
      }

      setAppState("result");
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Network error. Please retry.");
      setGeminiDone(true);
      setTripoDone(true);
      setAppState("result");
    }
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setAppState("idle");
    setImageResult(null);
    setImageError(null);
    setModelUrl(null);
    setModelError(null);
    setModelLoading(false);
    setModelProgress(0);
    setGeminiDone(false);
    setTripoDone(false);
  };

  const handleFullReset = () => {
    handleReset();
    setCustomerImage(null);
    setGarmentFront(null);
    setGarmentBack(null);
    setGarmentLeft(null);
    setGarmentRight(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--cream)" }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-20 border-b border-[#C9A96E]/20 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(250,246,240,0.93)" }}
      >
        <div className="max-w-md mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1
              className="text-[#2C1A0E] font-bold leading-none"
              style={{ fontSize: "1rem", fontFamily: "Georgia, serif" }}
            >
              360° Hybrid Try-On Room
            </h1>
            <p className="text-[#7A5C44] text-[9px] font-semibold tracking-widest uppercase mt-0.5">
              Gemini · Tripo3D · Dual Engine
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#2C1A0E] flex items-center justify-center">
            <TriangleIcon />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 py-5 flex flex-col gap-5 pb-12">

        {/* PROCESSING STATE */}
        {appState === "processing" && (
          <div className="rounded-2xl bg-white/70 border border-[#C9A96E]/15 p-5 shadow-sm">
            <LoadingSpinner
              engines={[
                {
                  label: "Engine A — Fit & Vibe",
                  sublabel: "Gemini AI generating 2D try-on image…",
                  done: geminiDone,
                  error: imageError,
                },
                {
                  label: "Engine B — 360° Fabric Mesh",
                  sublabel: "Tripo3D submitting 4-view 3D task…",
                  done: tripoDone,
                  error: modelError,
                },
              ]}
            />
          </div>
        )}

        {/* RESULT STATE */}
        {appState === "result" && (
          <>
            <ResultView
              imageResult={imageResult}
              imageError={imageError}
              modelUrl={modelUrl}
              modelError={modelError}
              modelLoading={modelLoading}
              modelProgress={modelProgress}
              onReset={handleReset}
            />
            <button
              onClick={handleFullReset}
              className="text-center text-xs text-[#7A5C44] underline underline-offset-2 hover:text-[#2C1A0E] transition-colors"
            >
              Start fresh with new photos
            </button>
          </>
        )}

        {/* IDLE / UPLOAD STATE */}
        {appState === "idle" && (
          <>
            {/* Hero copy */}
            <div className="pt-1">
              <h2
                className="text-[#2C1A0E] font-semibold text-xl leading-snug"
                style={{ fontFamily: "Georgia, serif" }}
              >
                See the outfit.
                <br />
                Feel the drape.
                <br />
                <span className="text-[#C9A96E]">From every angle.</span>
              </h2>
              <p className="text-[#7A5C44] text-sm mt-2 leading-relaxed">
                Upload 5 photos — we generate a luxury palace try-on image <em>and</em> a spinnable 3D fabric mesh.
              </p>
            </div>

            {/* Step indicator */}
            <StepDivider label="Step 1 — Customer" />

            {/* BOX 1: Customer Photo */}
            <ImageDropZone
              label="Customer Photo"
              sublabel="Full body, front-facing, plain background"
              icon={<PersonIcon size={22} />}
              value={customerImage}
              onChange={setCustomerImage}
            />

            {/* Step indicator */}
            <StepDivider label="Step 2 — Garment Views (4 angles)" />

            {/* BOX 2 + 3: Front / Back */}
            <div className="grid grid-cols-2 gap-3">
              <ImageDropZone
                label="Front View"
                sublabel="Flat-lay or hanger"
                icon={<ShirtIcon />}
                value={garmentFront}
                onChange={setGarmentFront}
                compact
              />
              <ImageDropZone
                label="Back View"
                sublabel="Reverse side"
                icon={<BackIcon />}
                value={garmentBack}
                onChange={setGarmentBack}
                compact
              />
            </div>

            {/* BOX 4 + 5: Left / Right */}
            <div className="grid grid-cols-2 gap-3">
              <ImageDropZone
                label="Left Profile"
                sublabel="Left side panel"
                icon={<ArrowLeftIcon />}
                value={garmentLeft}
                onChange={setGarmentLeft}
                compact
              />
              <ImageDropZone
                label="Right Profile"
                sublabel="Right side panel"
                icon={<ArrowRightIcon />}
                value={garmentRight}
                onChange={setGarmentRight}
                compact
              />
            </div>

            {/* Upload progress pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Customer",  done: !!customerImage },
                { label: "Front",     done: !!garmentFront  },
                { label: "Back",      done: !!garmentBack   },
                { label: "Left",      done: !!garmentLeft   },
                { label: "Right",     done: !!garmentRight  },
              ].map((item) => (
                <span
                  key={item.label}
                  className={[
                    "text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all duration-200",
                    item.done
                      ? "bg-[#2C1A0E] text-[#C9A96E] border-[#2C1A0E]"
                      : "text-[#7A5C44]/60 border-[#C9A96E]/20",
                  ].join(" ")}
                >
                  {item.done ? "✓ " : ""}{item.label}
                </span>
              ))}
            </div>

            {/* Tip card */}
            <div className="flex items-start gap-2.5 bg-[#C9A96E]/8 rounded-xl px-4 py-3 border border-[#C9A96E]/15">
              <span className="text-[#C9A96E] text-sm mt-0.5 flex-shrink-0">✦</span>
              <p className="text-[#7A5C44] text-xs leading-relaxed">
                Two AI engines run in parallel. Your fit image appears in ~30 s. The 3D mesh arrives in 2 – 4 min — swipe to spin the outfit and inspect every panel.
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
              Execute 360° Try-On
            </button>

            {!allUploaded && (
              <p className="text-center text-[11px] text-[#7A5C44]/60 -mt-3">
                {[
                  !customerImage && "customer photo",
                  !garmentFront  && "front view",
                  !garmentBack   && "back view",
                  !garmentLeft   && "left profile",
                  !garmentRight  && "right profile",
                ]
                  .filter(Boolean)
                  .join(", ")
                  .replace(/,([^,]*)$/, " & $1")
                  .replace(/^./, (c) => "Missing: " + c.toUpperCase())}
              </p>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#C9A96E]/15 py-3 text-center">
        <p className="text-[9px] text-[#7A5C44]/50 tracking-widest uppercase">
          Gemini AI · Tripo3D · 360° Fabric Intelligence
        </p>
      </footer>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function StepDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[#C9A96E]/20" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#C9A96E]">{label}</span>
      <div className="flex-1 h-px bg-[#C9A96E]/20" />
    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function TriangleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 19.5h20L12 2z" />
    </svg>
  );
}
function PersonIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  );
}
function ShirtIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.86l.58-3.57a2 2 0 0 0-1.34-2.23z" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 7h6M9 12h6M9 17h4" />
    </svg>
  );
}
function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
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

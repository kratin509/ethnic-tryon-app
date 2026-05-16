"use client";

interface ResultViewProps {
  imageResult: string;
  onReset: () => void;
}

export default function ResultView({ imageResult, onReset }: ResultViewProps) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageResult;
    a.download = `naksha-fitting-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="fade-in-up flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C9A96E]">
            NAKSHA
          </p>
          <h2
            className="text-[#2C1A0E] font-bold text-lg leading-tight mt-0.5"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Your Fitting
          </h2>
          <p className="text-[#7A5C44] text-[11px] mt-0.5">
            Gemini AI · High-fidelity 2D composite
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-[#7A5C44] underline underline-offset-2 hover:text-[#2C1A0E] transition-colors mt-1"
        >
          Try another
        </button>
      </div>

      {/* Result image card */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-[#C9A96E]/15">
        <img
          src={imageResult}
          alt="Kurti fitting result"
          className="w-full h-auto object-cover"
          style={{ maxHeight: "75vh" }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 py-3.5 bg-[#2C1A0E] text-[#FAF6F0] rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-[#3D2517] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#2C1A0E]/15"
        >
          <DownloadIcon /> Save Image
        </button>
        <button
          onClick={onReset}
          className="px-5 py-3.5 border border-[#C9A96E]/35 text-[#7A5C44] rounded-xl text-xs font-bold tracking-widest uppercase hover:border-[#C9A96E] hover:text-[#2C1A0E] active:scale-[0.98] transition-all"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path
        d="M7.5 10L4 6.5M7.5 10L11 6.5M7.5 10V2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

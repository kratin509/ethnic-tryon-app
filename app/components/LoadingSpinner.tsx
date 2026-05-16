interface EngineStatus {
  label: string;
  sublabel: string;
  done: boolean;
  error?: string | null;
}

interface LoadingSpinnerProps {
  engines: EngineStatus[];
}

export default function LoadingSpinner({ engines }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Central spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-[#C9A96E]/12" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin-slow"
          style={{ borderTopColor: "#C9A96E" }}
        />
        <div
          className="absolute inset-2 rounded-full border border-transparent animate-spin-slow"
          style={{ borderBottomColor: "#C9A96E", animationDirection: "reverse", animationDuration: "2s" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-[#C9A96E]/30 animate-pulse" />
        </div>
      </div>

      {/* Engine status cards */}
      <div className="w-full flex flex-col gap-3">
        {engines.map((engine, i) => (
          <div
            key={i}
            className={[
              "flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-300",
              engine.error
                ? "bg-red-50 border-red-200"
                : engine.done
                ? "bg-[#C9A96E]/8 border-[#C9A96E]/25"
                : "bg-white/60 border-[#C9A96E]/15",
            ].join(" ")}
          >
            {/* Status indicator */}
            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
              {engine.error ? (
                <span className="text-red-400 text-lg">⚠</span>
              ) : engine.done ? (
                <span className="text-[#C9A96E] text-base">✓</span>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-[#C9A96E]/30 border-t-[#C9A96E] animate-spin" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#2C1A0E] text-xs font-semibold">{engine.label}</p>
              <p className="text-[#7A5C44] text-[11px] mt-0.5 truncate">
                {engine.error ?? engine.sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#7A5C44]/60 tracking-wide text-center">
        3D mesh generation takes 2 – 4 minutes. The fit image will appear first.
      </p>
    </div>
  );
}

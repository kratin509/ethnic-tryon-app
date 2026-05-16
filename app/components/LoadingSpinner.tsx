export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-6 py-10">
      {/* Layered gold spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-[#C9A96E]/15" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin-slow"
          style={{ borderTopColor: "#C9A96E" }}
        />
        <div
          className="absolute inset-2 rounded-full border border-transparent animate-spin-slow"
          style={{
            borderBottomColor: "#C9A96E",
            animationDirection: "reverse",
            animationDuration: "2s",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-[#C9A96E]/35 animate-pulse" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-[#2C1A0E] font-semibold text-sm tracking-wide">
          Visualizing your fitting…
        </p>
        <p className="text-[#7A5C44] text-xs mt-1.5 leading-relaxed">
          Draping kurti · Composing backdrop · Refining details
        </p>
        <p className="text-[#7A5C44]/55 text-[11px] mt-2">
          Usually ready in 20 – 40 seconds
        </p>
      </div>

      {/* Shimmer bars */}
      <div className="w-full max-w-xs flex flex-col gap-2 mt-1">
        <div className="shimmer h-2.5 rounded-full w-full opacity-50" />
        <div className="shimmer h-2.5 rounded-full w-4/5 opacity-35" />
        <div className="shimmer h-2.5 rounded-full w-3/5 opacity-25" />
      </div>
    </div>
  );
}

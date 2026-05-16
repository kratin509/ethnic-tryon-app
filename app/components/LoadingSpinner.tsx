export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10">
      {/* Layered spinner */}
      <div className="relative w-16 h-16">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-[#C9A96E]/15" />
        {/* Spinning arc */}
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C9A96E] animate-spin-slow"
          style={{ borderTopColor: "#C9A96E" }}
        />
        {/* Inner dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-[#C9A96E]/40 animate-pulse" />
        </div>
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-[#2C1A0E] font-semibold text-sm tracking-wide">
          Fitting your look…
        </p>
        <p className="text-[#7A5C44] text-xs mt-1 leading-relaxed">
          Aligning fabric, drape &amp; lighting
        </p>
      </div>

      {/* Shimmer placeholder bars */}
      <div className="w-full max-w-xs flex flex-col gap-2 mt-2">
        <div className="shimmer h-3 rounded-full w-full opacity-50" />
        <div className="shimmer h-3 rounded-full w-4/5 opacity-40" />
        <div className="shimmer h-3 rounded-full w-3/5 opacity-30" />
      </div>
    </div>
  );
}

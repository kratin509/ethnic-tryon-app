"use client";

const GARMENT_CATEGORIES = [
  { value: "auto", label: "Auto Detect", description: "Let AI determine garment type" },
  { value: "upper_body", label: "Upper Body", description: "Kurta, blouse, jacket, top" },
  { value: "lower_body", label: "Lower Body", description: "Lehenga skirt, palazzo, trousers" },
  { value: "full_body", label: "Full Dress", description: "Anarkali, saree drape, full suit" },
];

interface GarmentSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function GarmentSelect({ value, onChange }: GarmentSelectProps) {
  const selected = GARMENT_CATEGORIES.find((c) => c.value === value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-widest text-[#7A5C44]">
        Garment Category
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white/70 border border-[#C9A96E]/30 rounded-xl px-4 py-3.5 pr-10 text-sm font-medium text-[#2C1A0E] focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/40 focus:border-[#C9A96E]/60 cursor-pointer transition-all duration-150"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {GARMENT_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label} — {cat.description}
            </option>
          ))}
        </select>
        {/* Custom chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#C9A96E]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {selected && (
        <p className="text-[11px] text-[#7A5C44] pl-1">{selected.description}</p>
      )}
    </div>
  );
}

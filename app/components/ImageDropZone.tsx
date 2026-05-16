"use client";

import { useCallback, useRef, useState } from "react";

interface ImageDropZoneProps {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  value: File | null;
  onChange: (file: File | null) => void;
  compact?: boolean;
}

export default function ImageDropZone({
  label,
  sublabel,
  icon,
  value,
  onChange,
  compact = false,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      onChange(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={[
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden group",
        isDragging ? "dropzone-active" : "border-[#C9A96E]/40 hover:border-[#C9A96E]/70",
        value ? "bg-[#2C1A0E]/5" : "bg-white/60",
        compact ? "min-h-[130px]" : "min-h-[200px]",
      ].join(" ")}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {preview ? (
        <>
          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#2C1A0E]/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <span className="text-[#FAF6F0] text-xs font-medium tracking-wide">Tap to change</span>
          </div>
          <button
            onClick={handleClear}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#2C1A0E]/80 text-[#FAF6F0] flex items-center justify-center text-[10px] hover:bg-[#2C1A0E] transition-colors z-10"
          >
            ✕
          </button>
          <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold uppercase tracking-widest bg-[#2C1A0E]/75 text-[#C9A96E] px-1.5 py-0.5 rounded-md">
            {label}
          </span>
        </>
      ) : (
        <div className={["flex flex-col items-center justify-center text-center pointer-events-none", compact ? "gap-2 px-2 py-4" : "gap-3 px-4 py-8"].join(" ")}>
          <div className={["rounded-full bg-[#C9A96E]/10 flex items-center justify-center text-[#C9A96E]", compact ? "w-9 h-9" : "w-12 h-12"].join(" ")}>
            {icon}
          </div>
          <div>
            <p className={["text-[#2C1A0E] font-semibold tracking-wide", compact ? "text-[11px]" : "text-sm"].join(" ")}>
              {label}
            </p>
            <p className={["text-[#7A5C44] mt-0.5 leading-relaxed", compact ? "text-[9px]" : "text-xs"].join(" ")}>
              {sublabel}
            </p>
          </div>
          {!compact && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C9A96E] border border-[#C9A96E]/30 rounded-full px-3 py-1">
              Tap or Drop
            </span>
          )}
        </div>
      )}
    </div>
  );
}

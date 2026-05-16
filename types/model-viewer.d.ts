// TypeScript declarations for the <model-viewer> web component
declare namespace JSX {
  interface IntrinsicElements {
    "model-viewer": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        poster?: string;
        "auto-rotate"?: boolean | string;
        "camera-controls"?: boolean | string;
        "touch-action"?: string;
        ar?: boolean | string;
        "ar-modes"?: string;
        "shadow-intensity"?: string;
        exposure?: string;
        style?: React.CSSProperties;
        loading?: "auto" | "lazy" | "eager";
      },
      HTMLElement
    >;
  }
}

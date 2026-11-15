export function PatchworkBrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Outer stitched quilt square */}
      <rect x="2" y="2" width="28" height="28" rx="5" fill="#2A1D14" stroke="#FACC15" strokeWidth="1.4" />
      {/* Top-left dark green swatch */}
      <path d="M2 7C2 4.23858 4.23858 2 7 2H16V16H2V7Z" fill="#192B1D" />
      {/* Top-right olive swatch */}
      <path d="M16 2H25C27.7614 2 30 4.23858 30 7V16H16V2Z" fill="#6F7739" />
      {/* Bottom-left chocolate brown swatch */}
      <path d="M2 16H16V30H7C4.23858 30 2 27.7614 2 25V16Z" fill="#3B2818" />
      {/* Bottom-right muted green swatch */}
      <path d="M16 16H30V25C30 27.7614 27.7614 30 25 30H16V16Z" fill="#4B6542" />
      {/* Central bright tangerine/yellow ember diamond */}
      <polygon
        points="16,7 24,16 16,25 8,16"
        fill="#F97316"
        stroke="#F3E868"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <polygon points="16,11.5 20,16 16,20.5 12,16" fill="#FACC15" />
      {/* Running stitch cross seams */}
      <line
        x1="16"
        y1="3.5"
        x2="16"
        y2="28.5"
        stroke="#F3E868"
        strokeWidth="0.9"
        strokeDasharray="2 2"
        strokeOpacity="0.85"
      />
      <line
        x1="3.5"
        y1="16"
        x2="28.5"
        y2="16"
        stroke="#F3E868"
        strokeWidth="0.9"
        strokeDasharray="2 2"
        strokeOpacity="0.85"
      />
      <rect x="2" y="2" width="28" height="28" rx="5" stroke="#FACC15" strokeOpacity="0.65" strokeWidth="1.2" />
    </svg>
  );
}

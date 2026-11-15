import { FirmsSourceMeta } from '../types/firms';

interface FeedShapeIconProps {
  shape: FirmsSourceMeta['shape'];
  color: string;
  size?: number;
}

export function FeedShapeIcon({ shape, color, size = 12 }: FeedShapeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="shrink-0"
    >
      {shape === 'circle' && (
        <circle cx="8" cy="8" r="5.5" fill={color} stroke="#0D0C09" strokeWidth="1.5" />
      )}
      {shape === 'diamond' && (
        <polygon
          points="8,1.5 14.5,8 8,14.5 1.5,8"
          fill={color}
          stroke="#0D0C09"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
      {shape === 'triangle' && (
        <polygon
          points="8,2 14.5,13.5 1.5,13.5"
          fill={color}
          stroke="#0D0C09"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
      {shape === 'square' && (
        <rect
          x="2.5"
          y="2.5"
          width="11"
          height="11"
          fill={color}
          stroke="#0D0C09"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

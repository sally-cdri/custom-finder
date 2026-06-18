import type { NodeType } from "../core/types";

/** 타입별 SVG 아이콘 (이모지 미사용). */
export function TypeIcon({ type, size = 40 }: { type: NodeType; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "folder":
      return (
        <svg {...common} className="icon icon-folder">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "link":
      return (
        <svg {...common} className="icon icon-link">
          <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
          <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
        </svg>
      );
    case "image":
      return (
        <svg {...common} className="icon icon-image">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="M21 16l-5-5L5 20" />
        </svg>
      );
    case "text":
      return (
        <svg {...common} className="icon icon-text">
          <path d="M6 3h9l5 5v13a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h7M9 17h7" />
        </svg>
      );
    case "file":
    default:
      return (
        <svg {...common} className="icon icon-file">
          <path d="M6 3h9l5 5v13H6z" />
          <path d="M14 3v5h5" />
        </svg>
      );
  }
}

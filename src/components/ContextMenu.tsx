import { useEffect, useRef } from "react";

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 메뉴 바깥에서 누르면 닫는다. mousedown 을 쓰는 이유:
    // 상위 div 의 onClick stopPropagation 이 click 의 window 전파를 막기 때문.
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onCtx(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onScroll() {
      onClose();
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("contextmenu", onCtx);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ctxmenu" style={{ left: x, top: y }}>
      {items.map((it, i) => (
        <button
          key={i}
          className={`ctxmenu__item ${it.danger ? "ctxmenu__item--danger" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            it.onClick();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

import { useEffect } from "react";

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
  useEffect(() => {
    function close() {
      onClose();
    }
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [onClose]);

  return (
    <div className="ctxmenu" style={{ left: x, top: y }}>
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

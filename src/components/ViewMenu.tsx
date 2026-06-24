import { useEffect, useRef, useState } from "react";
import type { ViewMode } from "../core/view";

interface Props {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

const OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "card", label: "카드" },
  { key: "list", label: "리스트" },
];

/** 보기 형식(카드/리스트) 선택 드롭다운. AddMenu 와 같은 패턴. */
export function ViewMenu({ view, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(v: ViewMode) {
    setOpen(false);
    onChange(v);
  }

  return (
    <div className="addmenu" ref={ref}>
      <button
        className="btn btn--toggle"
        title="보기 형식"
        onClick={() => setOpen((o) => !o)}
      >
        {view === "list" ? "≣" : "▦"} 보기 ▾
      </button>
      {open && (
        <div className="addmenu__list">
          {OPTIONS.map((o) => (
            <button key={o.key} onClick={() => pick(o.key)}>
              {view === o.key ? "✓ " : "  "}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

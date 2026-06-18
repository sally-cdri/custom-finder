import { useEffect, useRef, useState } from "react";

interface Props {
  onAddFolder: () => void;
  onAddLink: () => void;
  onAddText: () => void;
  onAddFiles: () => void;
  onAddImages: () => void;
}

export function AddMenu({
  onAddFolder,
  onAddLink,
  onAddText,
  onAddFiles,
  onAddImages,
}: Props) {
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

  function pick(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div className="addmenu" ref={ref}>
      <button className="btn btn--primary" onClick={() => setOpen((o) => !o)}>
        + 추가
      </button>
      {open && (
        <div className="addmenu__list">
          <button onClick={() => pick(onAddFolder)}>새 폴더</button>
          <button onClick={() => pick(onAddLink)}>링크</button>
          <button onClick={() => pick(onAddText)}>텍스트 메모</button>
          <div className="addmenu__sep" />
          <button onClick={() => pick(onAddFiles)}>파일 선택…</button>
          <button onClick={() => pick(onAddImages)}>이미지 선택…</button>
        </div>
      )}
    </div>
  );
}

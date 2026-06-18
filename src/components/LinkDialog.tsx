import { useState } from "react";

interface Props {
  onSubmit: (url: string, name: string) => void;
  onClose: () => void;
}

export function LinkDialog({ onSubmit, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  function submit() {
    const u = url.trim();
    if (!u) return;
    const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `https://${u}`;
    onSubmit(normalized, name.trim() || normalized);
    onClose();
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="dialog__title">링크 추가</h3>
        <label className="dialog__field">
          <span>URL</span>
          <input
            autoFocus
            value={url}
            placeholder="https://..."
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        <label className="dialog__field">
          <span>이름 (선택)</span>
          <input
            value={name}
            placeholder="표시할 이름"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>
        <div className="editor__actions">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn--primary" onClick={submit}>
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { TextNode } from "../core/types";

interface Props {
  node: TextNode;
  onSave: (id: string, name: string, content: string) => void;
  onClose: () => void;
}

export function TextEditor({ node, onSave, onClose }: Props) {
  const [name, setName] = useState(node.name);
  const [content, setContent] = useState(node.content);

  useEffect(() => {
    setName(node.name);
    setContent(node.content);
  }, [node.id]);

  function save() {
    onSave(node.id, name.trim() || "메모", content);
    onClose();
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="editor" onMouseDown={(e) => e.stopPropagation()}>
        <input
          className="editor__title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="제목"
        />
        <textarea
          className="editor__body"
          value={content}
          autoFocus
          onChange={(e) => setContent(e.target.value)}
          placeholder="메모 내용을 입력하세요"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="editor__actions">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn--primary" onClick={save}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

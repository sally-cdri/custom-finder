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
    onSave(node.id, name, content);
    onClose();
  }

  return (
    <div className="overlay" onMouseDown={save}>
      <div className="editor" onMouseDown={(e) => e.stopPropagation()}>
        <input
          className="editor__title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="제목 (비우면 첫 줄에서 자동)"
          onKeyDown={(e) => {
            if (e.key === "Escape") save();
          }}
        />
        <textarea
          className="editor__body editor__body--note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메모를 입력하세요…"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
            if (e.key === "Escape") save();
          }}
        />
        <div className="editor__actions">
          <button className="btn btn--primary" onClick={save}>
            완료
          </button>
        </div>
      </div>
    </div>
  );
}

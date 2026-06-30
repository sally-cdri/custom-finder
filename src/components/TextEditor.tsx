import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import type { TextNode } from "../core/types";
import { toEditorHtml } from "../core/text";

// 글자색 팔레트
const TEXT_COLORS = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#9c36b5", "#212529"];
// 배경색(하이라이트) 팔레트
const HL_COLORS = ["#ffec99", "#b2f2bb", "#a5d8ff", "#ffc9c9", "#eebefa", "#dee2e6"];

interface Props {
  node: TextNode;
  onSave: (id: string, name: string, content: string) => void;
  onClose: () => void;
}

export function TextEditor({ node, onSave, onClose }: Props) {
  const [name, setName] = useState(node.name);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: toEditorHtml(node.content),
  });

  function save() {
    // 에디터가 아직 초기화되지 않았으면(마운트 직후 백드롭 클릭 등) 저장하지 않고 닫는다 — 기존 내용 보존
    if (!editor) {
      onClose();
      return;
    }
    const content = editor.isEmpty ? "" : editor.getHTML();
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
        <Toolbar editor={editor} />
        <EditorContent
          className="editor__body editor__body--rich"
          editor={editor}
          onKeyDown={(e) => {
            if (e.key === "Escape") save();
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
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

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      className={"tb__btn" + (active ? " tb__btn--on" : "")}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );

  function setLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="editor__toolbar">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "굵게")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "기울임")}
      {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "밑줄")}
      {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "취소선")}
      <span className="tb__sep" />
      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3")}
      <span className="tb__sep" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• 목록")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. 목록")}
      {btn(editor.isActive("taskList"), () => editor.chain().focus().toggleTaskList().run(), "☑ 체크")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "인용")}
      {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "코드")}
      <span className="tb__sep" />
      {btn(editor.isActive("link"), setLink, "링크")}
      <span className="tb__sep" />
      <ColorPopover
        label="글자색"
        colors={TEXT_COLORS}
        onPick={(c) => editor.chain().focus().setColor(c).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
      />
      <ColorPopover
        label="배경색"
        colors={HL_COLORS}
        onPick={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
        onClear={() => editor.chain().focus().unsetHighlight().run()}
      />
    </div>
  );
}

// 색 스와치 팝오버 컴포넌트
function ColorPopover({
  label,
  colors,
  onPick,
  onClear,
}: {
  label: string;
  colors: string[];
  onPick: (color: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="tb__color">
      <button
        type="button"
        className="tb__btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {label} ▾
      </button>
      {open && (
        <div className="tb__swatches" onMouseDown={(e) => e.preventDefault()}>
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              className="tb__swatch"
              style={{ background: c }}
              onClick={() => {
                onPick(c);
                setOpen(false);
              }}
            />
          ))}
          <button
            type="button"
            className="tb__swatch tb__swatch--clear"
            title="지우기"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            ✕
          </button>
        </div>
      )}
    </span>
  );
}

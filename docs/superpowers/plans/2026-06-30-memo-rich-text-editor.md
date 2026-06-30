# 메모 리치 텍스트 에디터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단순 텍스트 메모를 서식(문서형 + 글자색/배경색)을 입힐 수 있는 리치 텍스트 에디터로 교체한다.

**Architecture:** `TextNode.content`에 HTML 문자열을 저장한다(스키마 변경 없음). 본문 편집은 Tiptap(ProseMirror) 에디터로 하고, 제목·미리보기·검색은 HTML에서 plain text를 추출하는 순수 함수 `htmlToPlainText`를 단일 경유지로 사용한다. 기존 plain text 메모는 로드 시 HTML로 변환해 호환한다.

**Tech Stack:** React 19, TypeScript, Tiptap v2, Tauri v2, Vitest.

## Global Constraints

- 커밋/PR에 Claude 작성 표기를 넣지 않는다.
- 라벨/심각도 등은 이모티콘 대신 한글 단어를 쓴다.
- 테스트는 node 환경(vitest 기본)에서 돈다. jsdom 미설치 → 코어 헬퍼는 DOM API(`DOMParser` 등) 없이 순수 문자열/정규식으로 구현한다.
- 패키지 매니저는 npm(`package-lock.json`). 명령은 `npm run …`.
- 기존 코드 스타일을 따른다: 한글 주석, 2-space 들여쓰기, 큰따옴표.

---

### Task 1: `htmlToPlainText` / `toEditorHtml` 코어 헬퍼

HTML↔plain text 변환 헬퍼를 추가한다. 순수 함수라 단위 테스트로 검증한다.

**Files:**
- Modify: `src/core/text.ts`
- Test: `src/core/text.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `htmlToPlainText(html: string): string` — HTML에서 plain text 추출(태그 제거·블록 경계 줄바꿈·엔티티 디코드). 태그 없는 legacy plain text는 그대로 통과.
  - `toEditorHtml(content: string): string` — 에디터 초기 콘텐츠용. 이미 HTML이면 그대로, plain text면 줄바꿈을 보존해 `<p>`로 감싼 HTML로 변환. 빈 문자열은 빈 문자열.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/core/text.test.ts` 끝에 추가:

```ts
import { deriveTitle, previewBody, middleEllipsis, htmlToPlainText, toEditorHtml } from "./text";

describe("htmlToPlainText", () => {
  it("태그를 제거하고 텍스트만 남긴다", () => {
    expect(htmlToPlainText("<p>안녕 <strong>세상</strong></p>")).toBe("안녕 세상");
  });
  it("블록 경계를 줄바꿈으로 바꾼다", () => {
    expect(htmlToPlainText("<p>첫 줄</p><p>둘째 줄</p>")).toBe("첫 줄\n둘째 줄");
  });
  it("<br>을 줄바꿈으로 바꾼다", () => {
    expect(htmlToPlainText("a<br>b")).toBe("a\nb");
  });
  it("엔티티를 디코드한다", () => {
    expect(htmlToPlainText("<p>a &amp; b &lt;c&gt;</p>")).toBe("a & b <c>");
  });
  it("태그 없는 legacy plain text는 그대로 통과", () => {
    expect(htmlToPlainText("그냥 메모\n둘째 줄")).toBe("그냥 메모\n둘째 줄");
  });
  it("빈 입력은 빈 문자열", () => {
    expect(htmlToPlainText("")).toBe("");
  });
});

describe("toEditorHtml", () => {
  it("이미 HTML이면 그대로 반환", () => {
    expect(toEditorHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
  it("plain text는 줄 단위로 <p>로 감싼다", () => {
    expect(toEditorHtml("첫 줄\n둘째 줄")).toBe("<p>첫 줄</p><p>둘째 줄</p>");
  });
  it("plain text의 < > & 는 이스케이프", () => {
    expect(toEditorHtml("a < b & c")).toBe("<p>a &lt; b &amp; c</p>");
  });
  it("빈 입력은 빈 문자열", () => {
    expect(toEditorHtml("")).toBe("");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- text`
Expected: FAIL — `htmlToPlainText`, `toEditorHtml` is not exported / not a function

- [ ] **Step 3: 구현 추가**

`src/core/text.ts` 끝에 추가:

```ts
/** 문자열이 HTML 태그를 포함하는지 (느슨한 판별). */
function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}

/**
 * HTML 본문에서 검색·제목·미리보기에 쓸 plain text를 뽑는다.
 * 태그가 없는 legacy plain text는 그대로 통과시킨다.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (!looksLikeHtml(html)) return html;
  let s = html;
  // 블록 닫는 태그와 <br>을 줄바꿈으로
  s = s.replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // 나머지 태그 제거
  s = s.replace(/<[^>]+>/g, "");
  // 자주 쓰는 엔티티 디코드
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  // 과한 빈 줄 정리
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** plain text를 줄바꿈 보존하며 에디터용 HTML로 변환한다. */
function plainTextToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<p>${escaped}</p>`;
    })
    .join("");
}

/** 에디터 초기 콘텐츠. 이미 HTML이면 그대로, plain text면 HTML로 변환. */
export function toEditorHtml(content: string): string {
  if (!content) return "";
  return looksLikeHtml(content) ? content : plainTextToHtml(content);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- text`
Expected: PASS (기존 deriveTitle/previewBody/middleEllipsis 포함 전부 통과)

- [ ] **Step 5: 커밋**

```bash
git add src/core/text.ts src/core/text.test.ts
git commit -m "feat: HTML↔plain text 변환 헬퍼(htmlToPlainText, toEditorHtml) 추가"
```

---

### Task 2: 검색·제목·미리보기를 plain text 추출 경유로 전환

HTML `content`를 쓰는 소비처(검색, 제목 자동 추출, 카드 미리보기)가 태그에 오염되지 않도록 `htmlToPlainText`를 거치게 한다.

**Files:**
- Modify: `src/core/search.ts:7`
- Modify: `src/App.tsx` (`handleSaveText`, line 481 부근)
- Modify: `src/components/ItemCard.tsx` (NotePreview 호출부, line 197)
- Test: `src/core/search.test.ts`

**Interfaces:**
- Consumes: `htmlToPlainText` (Task 1)
- Produces: 없음(동작 보존, 입력 포맷만 HTML 허용)

- [ ] **Step 1: 실패하는 검색 테스트 작성**

`src/core/search.test.ts` 끝에 추가(파일 상단 import에 맞춰 `searchNodes`는 이미 import되어 있다고 가정. 없으면 추가):

```ts
it("HTML 메모 본문도 텍스트로 검색된다", () => {
  const nodes = [
    {
      id: "t1", type: "text", name: "회의록", parentId: null, order: 0,
      createdAt: 0, updatedAt: 0,
      content: "<p>예산 <strong>승인</strong> 건</p>",
    },
  ] as any;
  const hit = searchNodes(nodes, "승인");
  expect(hit.map((n: any) => n.id)).toEqual(["t1"]);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- search`
Expected: FAIL — "승인"이 `<strong>승인</strong>` 안에 붙어있어도 매칭돼야 하는데, 현재는 `node.content`를 그대로 쓰므로 "승인"은 매칭되지만 태그가 섞인 경우(예: `<p>승인</p>`에서 "p>승인" 같은 인접 검색)를 방지. 실제로는 본문이 raw HTML이라 태그 잡음이 검색에 포함되는 문제를 잡는 테스트. (이 케이스 자체는 통과할 수 있으나, 아래 추가 케이스로 실패를 강제)

추가 테스트(태그 잡음이 검색되면 안 됨):

```ts
it("HTML 태그 이름은 검색에 잡히지 않는다", () => {
  const nodes = [
    {
      id: "t2", type: "text", name: "메모", parentId: null, order: 0,
      createdAt: 0, updatedAt: 0,
      content: "<strong>본문</strong>",
    },
  ] as any;
  expect(searchNodes(nodes, "strong")).toEqual([]);
});
```

Run: `npm run test -- search`
Expected: FAIL — 현재 `node.content`("<strong>본문</strong>")에 "strong"이 포함되어 잘못 매칭됨

- [ ] **Step 3: search.ts 수정**

`src/core/search.ts` 상단 import에 추가하고 line 7 교체:

```ts
import type { FinderNode } from "./types";
import { htmlToPlainText } from "./text";
```

```ts
  if (node.type === "text") parts.push(htmlToPlainText(node.content));
```

- [ ] **Step 4: 검색 테스트 통과 확인**

Run: `npm run test -- search`
Expected: PASS

- [ ] **Step 5: 제목 자동 추출 경유 수정 (App.tsx)**

`src/App.tsx`의 `handleSaveText`에서 `deriveTitle` 호출을 plain text 기준으로 바꾼다. import에 `htmlToPlainText` 추가:

```ts
import { deriveTitle, htmlToPlainText } from "./core/text";
```

`handleSaveText` 본문(line 481 부근):

```ts
  const handleSaveText = useCallback(
    (id: string, name: string, content: string) => {
      // 제목을 비우면 아이폰 메모처럼 첫 줄에서 자동 추출 (HTML이면 텍스트로 변환 후)
      const title = name.trim() || deriveTitle(htmlToPlainText(content));
      setNodes((prev) => updateNode(prev, id, { name: title, content }));
    },
    [],
  );
```

- [ ] **Step 6: 카드 미리보기 경유 수정 (ItemCard.tsx)**

`src/components/ItemCard.tsx` 상단 import에 `htmlToPlainText` 추가:

```ts
import { middleEllipsis, htmlToPlainText } from "../core/text";
```

line 197 NotePreview 호출부 교체:

```tsx
          <NotePreview title={node.name} body={htmlToPlainText(node.content)} />
```

- [ ] **Step 7: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npm run test`
Expected: 타입 에러 없음, 전체 테스트 PASS

- [ ] **Step 8: 커밋**

```bash
git add src/core/search.ts src/core/search.test.ts src/App.tsx src/components/ItemCard.tsx
git commit -m "feat: 검색·제목·미리보기를 HTML→텍스트 추출 경유로 전환"
```

---

### Task 3: Tiptap 리치 에디터로 본문 교체 (문서형 서식)

`TextEditor`의 `<textarea>`를 Tiptap 에디터 + 툴바로 교체한다. 색은 다음 Task에서 추가. UI라 단위 테스트 대신 빌드 + 앱 실행으로 검증한다(코드베이스에 컴포넌트 테스트 없음, jsdom 미설치).

**Files:**
- Modify: `package.json` (의존성)
- Rewrite: `src/components/TextEditor.tsx`
- Modify: `src/App.css` (툴바·본문 서식 스타일 추가)

**Interfaces:**
- Consumes: `toEditorHtml` (Task 1), `TextNode` 타입, `onSave(id, name, content)` (변경 없음)
- Produces: 없음(Props 시그니처 유지)

- [ ] **Step 1: 의존성 설치**

```bash
npm install @tiptap/react@^2 @tiptap/pm@^2 @tiptap/starter-kit@^2 @tiptap/extension-underline@^2 @tiptap/extension-link@^2 @tiptap/extension-task-list@^2 @tiptap/extension-task-item@^2
```

Expected: `package.json` dependencies에 위 패키지들이 추가됨

- [ ] **Step 2: TextEditor 재작성**

`src/components/TextEditor.tsx` 전체 교체:

```tsx
import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type { TextNode } from "../core/types";
import { toEditorHtml } from "../core/text";

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
    ],
    content: toEditorHtml(node.content),
  });

  useEffect(() => {
    setName(node.name);
    editor?.commands.setContent(toEditorHtml(node.content));
    // node가 바뀔 때만 재설정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, editor]);

  function save() {
    const content = !editor || editor.isEmpty ? "" : editor.getHTML();
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
        <EditorContent className="editor__body editor__body--rich" editor={editor} />
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
    </div>
  );
}
```

- [ ] **Step 3: CSS 추가**

`src/App.css`의 `.editor__body:focus { … }` 규칙(line 953 부근) 뒤에 추가:

```css
/* 리치 에디터 툴바 */
.editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.tb__btn {
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  line-height: 1;
}

.tb__btn:hover {
  background: var(--hover, #f2f2f2);
}

.tb__btn--on {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.tb__sep {
  width: 1px;
  align-self: stretch;
  background: var(--border);
  margin: 0 4px;
}

/* 리치 본문 영역 */
.editor__body--rich {
  min-height: 240px;
  max-height: 50vh;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
}

.editor__body--rich .ProseMirror {
  outline: none;
  min-height: 220px;
}

.editor__body--rich .ProseMirror h1 { font-size: 1.5em; font-weight: 700; margin: 0.4em 0; }
.editor__body--rich .ProseMirror h2 { font-size: 1.3em; font-weight: 700; margin: 0.4em 0; }
.editor__body--rich .ProseMirror h3 { font-size: 1.1em; font-weight: 700; margin: 0.4em 0; }
.editor__body--rich .ProseMirror p { margin: 0.3em 0; }
.editor__body--rich .ProseMirror ul,
.editor__body--rich .ProseMirror ol { padding-left: 1.4em; margin: 0.3em 0; }
.editor__body--rich .ProseMirror blockquote {
  border-left: 3px solid var(--border);
  padding-left: 10px;
  color: #666;
  margin: 0.4em 0;
}
.editor__body--rich .ProseMirror pre {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  overflow-x: auto;
}
.editor__body--rich .ProseMirror code {
  background: #f0f0f0;
  border-radius: 4px;
  padding: 1px 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
}
.editor__body--rich .ProseMirror a {
  color: var(--accent);
  text-decoration: underline;
}
/* 체크리스트 */
.editor__body--rich .ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0.2em;
}
.editor__body--rich .ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.editor__body--rich .ProseMirror ul[data-type="taskList"] li > label {
  margin-top: 2px;
}
.editor__body--rich .ProseMirror ul[data-type="taskList"] li > div {
  flex: 1;
}
```

- [ ] **Step 4: 타입체크 + 빌드**

Run: `npm run build`
Expected: tsc + vite build 성공(타입 에러 없음)

- [ ] **Step 5: 앱에서 수동 검증**

Run: `npm run tauri dev`
확인 항목:
1. 메모 추가 → 에디터가 열리고 툴바가 보인다.
2. 굵게/기울임/밑줄/취소선, H1~H3, 목록/번호/체크/인용/코드, 링크가 동작한다.
3. 완료/Esc/바깥 클릭으로 닫으면 저장되고, 다시 열면 서식이 유지된다.
4. 카드 미리보기에 태그 없이 텍스트만 보인다.
5. 기존(plain text) 메모를 열면 줄바꿈이 보존된 채 표시된다.

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json src/components/TextEditor.tsx src/App.css
git commit -m "feat: 메모 본문을 Tiptap 리치 에디터로 교체 (문서형 서식)"
```

---

### Task 4: 글자색·글자 배경색(하이라이트) 추가

Tiptap에 color/highlight 확장을 추가하고 툴바에 색 스와치 팝오버를 단다.

**Files:**
- Modify: `package.json` (의존성)
- Modify: `src/components/TextEditor.tsx` (확장 + 툴바 색 버튼)
- Modify: `src/App.css` (스와치 팝오버 스타일)

**Interfaces:**
- Consumes: Task 3의 Tiptap 에디터(`editor` 인스턴스, `Toolbar`)
- Produces: 없음

- [ ] **Step 1: 의존성 설치**

```bash
npm install @tiptap/extension-text-style@^2 @tiptap/extension-color@^2 @tiptap/extension-highlight@^2
```

- [ ] **Step 2: 확장 등록**

`src/components/TextEditor.tsx` import에 추가:

```tsx
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { useState } from "react";
```

`useEditor`의 `extensions` 배열에 추가(StarterKit 등 기존 뒤에):

```tsx
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
```

- [ ] **Step 3: 색 스와치 팝오버를 Toolbar에 추가**

`Toolbar` 함수 안, 마지막 링크 버튼 뒤(닫는 `</div>` 직전)에 추가하고, 필요한 상수/상태를 `Toolbar` 상단에 선언:

```tsx
  const TEXT_COLORS = ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#9c36b5", "#212529"];
  const HL_COLORS = ["#ffec99", "#b2f2bb", "#a5d8ff", "#ffc9c9", "#eebefa", "#dee2e6"];
```

(위 두 줄은 `if (!editor) return null;` 다음, `btn` 정의 부근에 둔다.)

`<span className="tb__sep" />` 뒤, `</div>` 직전:

```tsx
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
```

파일 하단(컴포넌트 밖)에 `ColorPopover` 추가:

```tsx
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
```

- [ ] **Step 4: 스와치 CSS 추가**

`src/App.css`의 Task 3에서 추가한 툴바 스타일 뒤에 추가:

```css
.tb__color {
  position: relative;
  display: inline-flex;
}

.tb__swatches {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  display: grid;
  grid-template-columns: repeat(4, 20px);
  gap: 6px;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  z-index: 60;
}

.tb__swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
  padding: 0;
}

.tb__swatch--clear {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #888;
}
```

- [ ] **Step 5: 타입체크 + 빌드**

Run: `npm run build`
Expected: 성공

- [ ] **Step 6: 앱에서 수동 검증**

Run: `npm run tauri dev`
확인 항목:
1. "글자색" 버튼 → 스와치 팝오버 → 색 선택 시 선택 텍스트 색 변경, ✕로 해제.
2. "배경색" 버튼 → 하이라이트 적용/해제.
3. 색을 입힌 메모를 닫았다 열면 색이 유지된다.
4. 카드 미리보기·검색에는 색 태그가 새어나오지 않는다(텍스트만).

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json src/components/TextEditor.tsx src/App.css
git commit -m "feat: 메모 에디터에 글자색·배경색(하이라이트) 추가"
```

---

## Self-Review 결과

**Spec coverage:**
- 데이터 모델 변경 없음(content에 HTML) → 전 Task 공통, Task 1~2에서 보장. ✅
- 의존성(Tiptap + 확장) → Task 3(문서형), Task 4(색). ✅
- `htmlToPlainText` 헬퍼 → Task 1. ✅
- 검색/제목/미리보기 텍스트 추출 경유 → Task 2. ✅
- 에디터 UI(모달 유지 + 툴바, getHTML 저장, legacy 변환) → Task 3. ✅
- 글자색·배경색 → Task 4. ✅
- XSS: HTML은 Tiptap 안에서만 렌더, 미리보기는 텍스트 → dangerouslySetInnerHTML 미사용(Task 2·3). ✅
- 테스트(text.test.ts, search.test.ts) → Task 1·2. ✅

**Placeholder scan:** TODO/TBD/"적절히 처리" 없음. 모든 코드 step에 실제 코드 포함. ✅

**Type consistency:** `htmlToPlainText`/`toEditorHtml` 시그니처가 정의(Task 1)와 사용처(Task 2·3)에서 일치. `onSave(id, name, content)` 유지. `Editor` 타입은 `@tiptap/react`에서 import. ✅

비고: 에디터는 UI라 단위 테스트 대신 `npm run build` + `npm run tauri dev` 수동 검증으로 확인한다(코드베이스에 컴포넌트 테스트가 없고 jsdom 미설치 — 기존 패턴을 따름).

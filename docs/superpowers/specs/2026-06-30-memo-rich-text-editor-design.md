# 메모 리치 텍스트 에디터 설계

날짜: 2026-06-30

## 배경

현재 메모(`TextNode`)는 단순 텍스트다. `TextEditor`는 제목 `<input>`과
본문 `<textarea>`로 구성되며, 본문은 plain text로 `content` 필드에 저장된다.
제목은 본문 첫 줄에서 자동 추출하고(`deriveTitle`), 카드 미리보기
(`NotePreview`)와 검색(`search.ts`)이 모두 plain text `content`에 의존한다.

목표는 본문에 **서식(스타일)을 입힐 수 있는 편집 에디터**를 추가하는 것이다.
필요한 서식 범위는 문서형 서식 + **글자색 / 글자 배경색(하이라이트)**이다.

## 결정 사항

- **에디터 기술**: Tiptap v2 (ProseMirror 기반, React 19 호환).
- **저장 포맷**: HTML 문자열을 기존 `content` 필드에 그대로 저장. 스키마 변경·
  별도 마이그레이션 없음.
- **기존 plain text 메모**: 저장된 값에 HTML 태그가 없으면 plain text로 간주하여
  에디터 로드 시 줄바꿈을 보존해 변환한다. 한 번 리치 에디터로 저장하면 그때부터
  HTML로 굳어진다.

## 서식 범위

- 인라인: 굵게, 기울임, 밑줄, 취소선
- 블록: 제목 H1·H2·H3, 글머리 목록, 번호 목록, 체크리스트, 인용구, 코드블록
- 링크: 추가 / 제거
- 색: **글자색**, **글자 배경색(하이라이트, multicolor)** — 프리셋 스와치 + 지우기

명시적 비범위(YAGNI): 표, 인라인 이미지 삽입, 폰트/크기 선택, 정렬.

## 아키텍처

### 1. 데이터 모델 — 변경 없음

`TextNode.content: string`가 이제 HTML 문자열을 담는다. `core/types.ts` 수정 없음.

### 2. 의존성 (package.json)

Tiptap v2 + 필요한 확장만 추가한다:

- `@tiptap/react`, `@tiptap/pm`
- `@tiptap/starter-kit` — 굵게·기울임·취소선·제목·글머리/번호 목록·인용구·코드블록 포함
- `@tiptap/extension-underline` — 밑줄
- `@tiptap/extension-link` — 링크
- `@tiptap/extension-text-style` + `@tiptap/extension-color` — 글자색
- `@tiptap/extension-highlight` — 글자 배경색 (multicolor)
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — 체크리스트

### 3. plain-text 추출 헬퍼 (`core/text.ts`)

새 함수 `htmlToPlainText(html: string): string`를 추가한다.

- HTML 태그를 제거하고 엔티티를 디코드한다.
- 블록 경계(`</p>`, `<br>`, `</div>`, `<li>` 등)는 줄바꿈으로 변환한다.
- HTML 태그가 없는 legacy plain text는 그대로 통과시킨다(패스스루).
- 빈 입력은 빈 문자열을 반환한다.

이 한 함수를 단일 경유지로 삼아 텍스트가 필요한 모든 곳에서 호출한다.

- `deriveTitle`의 호출부(`App.tsx`)는 `htmlToPlainText(content)` 결과를 넘긴다.
  `deriveTitle` 자체 시그니처(plain text 입력)는 유지한다.
- `previewBody` / 카드 미리보기는 텍스트로 변환 후 표시한다.
- `search.ts`의 `node.content` 인덱싱을 `htmlToPlainText(node.content)`로 교체한다.

→ 검색·제목·미리보기가 HTML 태그에 오염되지 않는다.

### 4. 에디터 UI (`TextEditor.tsx`)

기존 구조를 유지한다: 모달 오버레이, 제목 `<input>`, 닫을 때 저장(`save()`),
Esc / ⌘+Enter 단축키.

변경:

- 본문 `<textarea>`를 Tiptap `EditorContent`로 교체한다.
- 상단에 **툴바** 추가: 굵게 / 기울임 / 밑줄 / 취소선, 제목 H1·H2·H3,
  글머리·번호·체크 목록, 인용구, 코드블록, 링크 추가/제거,
  글자색·배경색(프리셋 색 스와치 팝오버 + 지우기).
- `useEditor`를 `node.content`로 초기화한다. legacy plain text면 줄바꿈을
  보존해 초기 문서를 구성한다.
- `node.id` 변경 시 에디터 내용을 갱신한다(`setContent`).
- 저장 시 `editor.getHTML()`을 `onSave`의 `content`로 넘긴다. 빈 문서면 빈
  문자열을 넘긴다.

`onSave` 시그니처(`(id, name, content) => void`)와 `handleSaveText`는 그대로
재사용한다.

### 5. 카드 미리보기 / 안전성

`NotePreview`(`ItemCard.tsx`)는 계속 **텍스트만** 렌더한다. 본문은
`htmlToPlainText`로 추출한다. HTML 원문은 사용자가 직접 작성하며 Tiptap 스키마
안에서만 렌더되므로 `dangerouslySetInnerHTML`을 쓰지 않는다 → XSS 표면 없음.

### 6. CSS (`App.css`)

- `.editor__toolbar` — 버튼 그룹 스타일.
- 색 스와치 팝오버.
- `.ProseMirror` 본문 서식 스타일: 제목/목록/인용구/코드블록/체크박스/하이라이트.
- 기존 `.editor` / `.overlay` / `.note` 규칙은 재사용한다.

## 데이터 흐름

1. 카드 더블클릭 → `editingText` 설정 → `TextEditor` 오픈.
2. `useEditor`가 `content`(HTML 또는 legacy plain text)로 초기화.
3. 사용자가 툴바·단축키로 서식 적용.
4. 닫기/완료 → `editor.getHTML()` → `handleSaveText` → `deriveTitle`은
   `htmlToPlainText` 결과로 제목 산출 → `updateNode`로 저장 → `finder.json` 기록.
5. 카드 미리보기·검색은 `htmlToPlainText(content)`로 텍스트 추출.

## 테스트

- `core/text.test.ts`:
  - `htmlToPlainText`: 태그 제거, 블록 경계 줄바꿈, 엔티티 디코드, 빈 입력,
    legacy plain text 패스스루.
  - `deriveTitle`: HTML에서 추출한 텍스트로 제목 산출.
- `core/search.test.ts`: HTML `content`를 가진 텍스트 노드가 본문 텍스트로
  검색되는지.

## 영향 범위

- `package.json` — 의존성 추가.
- `src/components/TextEditor.tsx` — 리치 에디터로 교체.
- `src/core/text.ts` — `htmlToPlainText` 추가.
- `src/core/search.ts` — 인덱싱 시 텍스트 추출.
- `src/components/ItemCard.tsx` — 미리보기 텍스트 추출.
- `src/App.tsx` — `deriveTitle` 호출부에서 텍스트 추출.
- `src/App.css` — 툴바·본문 서식 스타일.
- 테스트 2종.

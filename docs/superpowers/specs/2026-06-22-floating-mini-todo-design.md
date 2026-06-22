# 플로팅 미니 할 일 창 설계

작성일: 2026-06-22

## 목표

항상 위에 떠 있는 작은(always-on-top) 할 일 창을 추가한다. 메인 창의 '할 일'
탭 헤더 버튼으로 토글하며, 미완료 목록 보기 · 완료 토글 · 빠른 추가를 지원한다.
메인 창과 실시간으로 동기화된다.

## 비범위 (YAGNI)

- 미니 창 위치/크기 기억
- 미니 창에서 마감일/메모 편집 (메인에서만)
- 전역 단축키, 메뉴바(트레이)

## 창 생성/토글 — `src/app/miniWindow.ts` (신규)

```ts
toggleMiniWindow(): Promise<void>
```

- `WebviewWindow.getByLabel("mini")`로 존재하면 `close()`, 없으면 생성.
- 생성 옵션: `url: "index.html?mini=1"`, `title: "할 일"`, `width: 300`,
  `height: 440`, `alwaysOnTop: true`, `resizable: true`.

## 진입 분기 — `src/main.tsx`

`new URLSearchParams(window.location.search).has("mini")`가 true면 `<MiniTodo/>`,
아니면 기존 `<App/>`를 렌더.

## 미니 UI — `src/components/MiniTodo.tsx` (신규)

- 상단: 빠른 추가 입력칸(Enter로 추가).
- 본문: **미완료** 할 일 목록(체크박스 + 제목). 체크하면 완료 처리되어 목록에서
  사라진다(미완료만 표시).
- 자체적으로 `loadTodos`로 초기화하고, 변경 시 `saveTodos`로 저장.
- 마감일/메모 편집 UI는 없음.

## 실시간 동기화 — `src/app/todoSync.ts` (신규)

Tauri 이벤트(`@tauri-apps/api/event`)로 창 간 브로드캐스트:

```ts
emitTodosChanged(todos: TodoItem[], sender: string): void   // emit("todos:changed", {todos, sender})
onTodosChanged(self: string, cb: (todos: TodoItem[]) => void): Promise<UnlistenFn>
```

- 페이로드에 `sender`("main" | "mini") 포함. 수신 시 `payload.sender === self`이면
  무시(자기 에코·루프 방지).

**App·MiniTodo 공통 동기화 패턴:**

- 외부 이벤트 적용 여부를 `externalRef`(useRef<boolean>)로 표시.
- 수신 콜백: `externalRef.current = true; setTodos(payload)`.
- 디바운스 저장 effect(todos 변경 시 300ms):
  - effect 진입 시 `const wasExternal = externalRef.current; externalRef.current = false;`
  - 타임아웃에서 `saveTodos(todos)` 실행.
  - `wasExternal`가 false(로컬 변경)일 때만 `emitTodosChanged(todos, self)`.
- 결과: 로컬 변경 → 저장 + emit. 외부 변경 → 저장만(emit 안 함) → 상대 창이 다시
  emit하지 않으므로 루프 없음.

## 권한 — `src-tauri/capabilities/default.json`

- `windows`에 `"mini"` 추가(권한이 미니 창에도 적용되도록).
- 권한 추가: 창 생성(`core:webview:allow-create-webview-window`), 창 닫기,
  이벤트 emit/listen. 정확한 식별자는 구현 중 런타임 에러로 검증·보정한다.

## 메인 버튼 — `src/components/TodoPanel.tsx`, `src/App.tsx`

- TodoPanel 헤더("할 일" 옆)에 `미니 창` 버튼 추가, `onToggleMini` prop.
- App에서 `onToggleMini={() => toggleMiniWindow()}` 연결.

## 변경 파일 요약

| 파일 | 변경 |
|------|------|
| `src/main.tsx` | `?mini` 분기 |
| `src/components/MiniTodo.tsx` | 신규 — 미니 UI + 동기화 |
| `src/app/miniWindow.ts` | 신규 — 창 토글 |
| `src/app/todoSync.ts` | 신규 — emit/listen 헬퍼 |
| `src/App.tsx` | 동기화 배선 + 미니 버튼 핸들러 |
| `src/components/TodoPanel.tsx` | 헤더에 `미니 창` 버튼 |
| `src/App.css` | 미니 창·버튼 스타일 |
| `src-tauri/capabilities/default.json` | mini 창 + 권한 |

## 테스트

- 동기화 헬퍼/창 토글은 Tauri 런타임 의존이라 단위 테스트보다 수동 검증 중심.
- 검증: 빌드/타입체크 통과 → 미니 창 열기/닫기, 빠른 추가·완료가 메인과 양방향
  실시간 반영, 재시작 후 `todos.json` 유지.

# Todo 탭 설계

작성일: 2026-06-22

## 목표

SallyFinder 사이드바에 "내 폴더"와 나란히 "할 일" 탭을 추가하고, 마감일과
메모를 가진 체크리스트(Todo)를 관리할 수 있게 한다. Todo 데이터는 기존 finder
노드와 분리해 별도 파일(`todos.json`)에 저장한다.

## 비범위 (YAGNI)

- 우선순위
- 검색/필터/정렬 옵션
- finder 노드와의 연동
- Todo 번들 export/import

이번 작업에서는 위 기능을 넣지 않는다.

## 데이터 모델 — `src/core/todo.ts`

```ts
export interface TodoItem {
  id: string;
  title: string;
  note?: string;            // 메모/설명 (없으면 생략)
  dueAt?: number | null;    // 마감일 (epoch ms), 없으면 null
  done: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null; // done 전환 시점, 미완료면 null
}
```

순수 로직 함수 (vitest로 TDD):

- `addTodo(todos, { title, note?, dueAt? }, now, newId)` → 새 항목을 끝에 추가한 배열
- `toggleTodo(todos, id, now)` → `done` 토글, `completedAt` 갱신, `updatedAt` 갱신
- `updateTodo(todos, id, patch, now)` → `title`/`note`/`dueAt` 부분 수정, `updatedAt` 갱신
- `deleteTodo(todos, id)` → 해당 항목 제거
- `sortTodos(todos)` → 미완료를 위, 완료를 아래로 분리. 각 그룹 내에서는 `createdAt` 오름차순(추가순).

모든 함수는 입력 배열을 변경하지 않고 새 배열을 반환한다 (기존 `core/tree.ts` 등과 동일한 순수 함수 규약).

## 저장

### Rust — `src-tauri/src/lib.rs`

finder의 `load_store`/`save_store`와 동일한 패턴으로 커맨드 2개 추가:

- `todos_path(app)` → data dir의 `todos.json` 경로
- `load_todos(app) -> serde_json::Value` : 파일 없으면 빈 배열 반환
- `save_todos(app, todos: serde_json::Value)` : `todos.json`에 기록

`run()`의 `invoke_handler` 목록에 `load_todos`, `save_todos` 등록.
→ **src-tauri 재빌드 필요.**

### 프론트 — `src/app/todoStore.ts`

```ts
export async function loadTodos(): Promise<TodoItem[]>;  // invoke("load_todos")
export async function saveTodos(todos: TodoItem[]): Promise<void>; // invoke("save_todos", { todos })
```

`store.ts`와 동일하게 배열이 아니면 `[]`로 방어.

## 상태 (App.tsx)

- `const [view, setView] = useState<"folders" | "todo">("folders")` — 현재 활성 탭
- `const [todos, setTodos] = useState<TodoItem[]>([])`
- 마운트 시 `loadTodos()`로 초기화 (finder `loadStore`와 함께)
- `todos` 변경 시 finder 노드와 동일하게 300ms 디바운스 후 `saveTodos` 저장
- Todo 조작 핸들러: `handleAddTodo`, `handleToggleTodo`, `handleUpdateTodo`, `handleDeleteTodo` — 각각 core 함수를 `setTodos`로 적용

## UI

### Sidebar 상단 탭 스트립

`Sidebar.tsx` 최상단에 탭 스트립 추가:

```
[ 내 폴더 | 할 일 ]
```

- `view` prop과 `onChangeView(view)` prop 추가
- 활성 탭은 `tab--active` 표시
- `view === "folders"`일 때만 기존 폴더 트리(루트 라벨 + FolderRow) 렌더, `view === "todo"`면 트리 숨김

라벨은 한글 "할 일"로 통일 (기존 "내 폴더"와 결 맞춤).

### TodoPanel — `src/components/TodoPanel.tsx`

`App.tsx`의 main-wrap 영역에서 `view === "todo"`일 때 `MainPanel` 대신 렌더.

Props: `todos`, `onAdd`, `onToggle`, `onUpdate`, `onDelete`.

구성:

- **입력 영역**: 할 일 제목 입력창 + 추가 버튼. Enter로도 추가. 빈 제목은 무시.
- **목록**: `sortTodos(todos)` 결과를 미완료/완료 그룹으로 표시.
  - 각 행: 체크박스(`onToggle`) · 제목 · 마감일 배지(있을 때). 완료 항목은 흐림 + 취소선.
  - 마감일이 오늘보다 이전이고 미완료면 마감일 배지를 강조(지남) 표시.
  - **행 클릭 시 인라인 편집 영역 펼침**: 제목 input, 마감일 `<input type="date">`, 메모 textarea, 삭제 버튼. 제목/메모는 blur 또는 Enter 시 `onUpdate`로 반영, 마감일은 변경(onChange) 즉시 반영. 삭제는 `onDelete`.

### CSS — `App.css`

- `.tabs`, `.tab`, `.tab--active` (사이드바 탭 스트립)
- `.todo-*` (입력창, 행, 체크박스, 마감일 배지, 펼친 편집 영역). 기존 디자인 토큰/색을 재사용.

## 테스트

- `src/core/todo.test.ts`: add/toggle/update/delete/sort 동작을 vitest로 검증 (TDD — 구현 전에 작성).
- UI는 수동 확인: `pnpm tauri dev`로 탭 전환, 추가/완료/편집/삭제, 재시작 후 `todos.json` 유지 확인.

## 변경 파일 요약

| 파일 | 변경 |
|------|------|
| `src/core/todo.ts` | 신규 — 타입 + 순수 로직 |
| `src/core/todo.test.ts` | 신규 — 단위 테스트 |
| `src/app/todoStore.ts` | 신규 — load/save 래퍼 |
| `src/components/TodoPanel.tsx` | 신규 — Todo UI |
| `src/components/Sidebar.tsx` | 탭 스트립 추가, view 분기 |
| `src/App.tsx` | view/todos 상태 + 핸들러 + TodoPanel 분기 |
| `src/App.css` | 탭/Todo 스타일 |
| `src-tauri/src/lib.rs` | load_todos/save_todos 커맨드 + 등록 |

# 마감일 있는 할 일을 캘린더에 표시 설계

작성일: 2026-06-25

## 배경

캘린더 탭은 독립 이벤트(`events.json`)만 보여준다. 할 일(todo)에는 마감일
`dueAt`(epoch ms)이 있으므로, **마감일이 있는 미완료 할 일**을 같은 날짜 칸에
함께 얹어 한눈에 보이게 한다.

## 목표

- 캘린더 월간 뷰의 각 날짜 셀에 그날 마감인 할 일을 칩으로 표시.
- 이벤트 칩과 시각적으로 구분(색/테두리, 이모지 미사용).

## 비목표 / 결정

- **완료된 할 일은 숨김** (미완료 + dueAt 있는 것만).
- 할 일 칩은 **읽기 전용** — 클릭 동작 없음(셀의 새-이벤트 추가도 막음).
- 캘린더에서 할 일의 마감일 수정·완료 토글은 하지 않음(할 일 탭에서 그대로).

## 데이터

`src/core/event.ts`에 순수 헬퍼 추가(단위 테스트):

```ts
import type { TodoItem } from "./todo";

/** 미완료 + dueAt 있는 할 일을 로컬 날짜키별로 묶는다. 같은 날은 제목순. */
export function todosByDueDay(todos: TodoItem[]): Map<string, TodoItem[]>
```

- 필터: `!t.done && t.dueAt != null`.
- 키: `dayKey(new Date(t.dueAt))` (로컬 날짜).
- 정렬: 제목 오름차순, 같으면 createdAt.

## UI

### CalendarPanel.tsx

- prop `todos: TodoItem[]` 추가.
- 렌더 시 `byDay`(이벤트)와 `todosByDueDay(todos)`를 모두 조회.
- 각 셀: 이벤트 칩(기존) 다음에 할 일 칩. 합산이 `MAX_CHIPS`를 넘으면 `+N`.
  - 이벤트 칩: 기존 `.cal__chip` (클릭 → 편집).
  - 할 일 칩: `.cal__chip .cal__chip--todo`, `<div>`로 읽기 전용. `onClick`에서
    `stopPropagation()`만 호출(셀 클릭의 새-이벤트 추가 방지), 그 외 동작 없음.

### App.tsx

- `<CalendarPanel ... todos={todos} />` 로 기존 todos 상태 전달.

### App.css

- `.cal__chip--todo` — 이벤트(파랑 톤)와 구분되는 색/왼쪽 액센트.

## 테스트·검증

- 단위: `event.test.ts`에 `todosByDueDay` 케이스(완료 제외, dueAt null 제외, 날짜별 그룹·정렬).
- 수동: 마감일 있는 할 일 추가 → 해당 날짜에 칩, 완료 시 사라짐, 칩 클릭 무반응.
- `npm test` + `npm run build` 통과.

# 이벤트 라벨(work/me) + 색상 설계

작성일: 2026-06-26

## 배경

캘린더 이벤트를 용도별로 색 구분하고 싶다. 라벨은 고정 2개(**work**, **me**)이며
각각 색을 가진다. 색은 앱에서 이미 쓰는 색(파랑 accent, 빨강 danger, 주황 할 일 칩)을
피해 미사용 색으로 정한다.

## 목표

- 이벤트에 라벨(work/me) **필수** 지정. 새 이벤트는 기본값으로 시작.
- 캘린더 칩을 라벨 색으로 표시. 상단에 색 범례.

## 결정 / 색

- 라벨 고정 2개: `work`, `me`.
- 색(앱 미사용):
  - **work = violet** `#7c3aed` (칩 배경 `#ede9fe`, 글자 `#6d28d9`)
  - **me = teal** `#0d9488` (칩 배경 `#ccfbf1`, 글자 `#0f766e`)
- 새 이벤트 기본 라벨: `work`.
- 할 일 칩(주황, 읽기 전용)은 그대로 — 라벨 색과 겹치지 않음.

## 비목표

- 라벨 추가/이름·색 변경/삭제(사용자 관리) — 범위 밖(고정 2개).
- 할 일에는 라벨 없음(이벤트 전용).

## 모델 (core/event.ts)

```ts
export type EventLabel = "work" | "me";

export const EVENT_LABELS: { key: EventLabel; name: string; color: string }[] = [
  { key: "work", name: "Work", color: "#7c3aed" },
  { key: "me", name: "Me", color: "#0d9488" },
];

export const DEFAULT_LABEL: EventLabel = "work";

/** 라벨 없던 기존 데이터 호환: 없으면 기본 라벨. */
export function labelOf(e: CalendarEvent): EventLabel;
```

- `CalendarEvent.label?: EventLabel` (저장형은 optional — 기존 events.json 호환). 표시·로직은 `labelOf()`로 항상 보정.
- `NewEvent.label: EventLabel` (필수). `addEvent`/`updateEvent`가 저장.

## UI

### EventDialog.tsx

- 라벨 선택 필드 추가: work/me 색 스와치 버튼(현재 선택 강조).
- 새 이벤트: `DEFAULT_LABEL`(work). 편집: `labelOf(initial)` 프리필.
- `onSubmit` 입력에 `label` 포함.

### CalendarPanel.tsx

- 이벤트 칩 className에 `cal__chip--${labelOf(e)}` 추가(라벨 색).
- 상단 바에 범례: `● Work  ● Me` (각 색 점 + 이름).
- 할 일 칩은 기존 `cal__chip--todo` 유지.

### App.css

- `.cal__chip--work`, `.cal__chip--me` (배경/글자색), 범례(`.cal__legend`, `.cal__legend-dot`), 다이얼로그 스와치(`.label-pick`, `.label-swatch`).

## 테스트·검증

- 단위: `labelOf`(기본값·기존 라벨 없는 이벤트), `addEvent`가 label 저장, `EVENT_LABELS` 키.
- 기존 `event.test.ts`의 `addEvent` 호출에 `label` 추가.
- 수동: 라벨별 색 칩, 범례, 편집 시 라벨 유지, 기존 이벤트가 기본색으로 표시.
- `npm test` + `npm run build` 통과.

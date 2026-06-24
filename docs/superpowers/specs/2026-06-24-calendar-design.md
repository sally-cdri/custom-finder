# 캘린더(로컬 독립 이벤트) 설계

작성일: 2026-06-24

## 배경

사이드바는 `내 폴더 / 할 일` 탭으로 메인 패널을 전환한다. 여기에 **캘린더** 탭을
추가해, 할 일과 별개인 **독립 이벤트**를 월간 그리드로 관리한다.

구글 캘린더 연동은 이번 범위에서 제외하고, 본 로컬 캘린더를 토대로 이후 별도
spec(먼저 읽기 전용, 이후 양방향)으로 다룬다.

## 목표

1. 사이드바 세 번째 탭 **캘린더**.
2. 월간 뷰: 6주 x 7일 그리드, 이전/다음 달 이동, 오늘 강조, `오늘` 버튼.
3. **하루 종일 이벤트** CRUD: 제목 + 날짜 + 메모. 날짜 셀 클릭으로 추가, 칩 클릭으로 편집/삭제.
4. todo와 동일한 저장 패턴(`events.json`)으로 영구 저장.

## 비목표

- 시간(시작/종료), 여러 날 걸치는 이벤트, 반복 일정 — 범위 밖.
- 주/일 보기, 구글 등 외부 연동 — 범위 밖.
- 캘린더 탭의 사이드바 본문(다가오는 일정 미리보기 등) — MVP에서 비움.

## 데이터 모델

`src/core/event.ts` (신규, 순수 — 단위 테스트):

```ts
interface CalendarEvent {
  id: string;
  title: string;
  note?: string;
  date: string;       // "YYYY-MM-DD" (로컬 날짜). all-day 라 문자열로 저장 — TZ 드리프트 없음
  createdAt: number;
  updatedAt: number;
}
```

순수 헬퍼:
- `addEvent(events, { title, note, date }, now, newId)`
- `updateEvent(events, id, patch, now)` — title/note/date 부분 수정
- `deleteEvent(events, id)`
- `eventsByDay(events): Map<string, CalendarEvent[]>` — 날짜키 → 그날 이벤트(제목순/생성순)
- `monthMatrix(year, month): string[][]` — 해당 월을 포함하는 6주 x 7일의 "YYYY-MM-DD" 배열(주 시작=일요일, 앞뒤 달 날짜 채움)
- `dayKey(d: Date): string`, `todayKey(now?): string`

날짜 문자열 ↔ Date 변환은 로컬 자정 기준(`new Date(y, m-1, d)`)으로 통일.

## 저장소 (todo 패턴 미러링)

- `src-tauri/src/lib.rs`:
  - `events_path(app) -> data_dir/events.json`
  - `load_events` (없으면 `[]`, 파싱 실패 시 `.bak` 백업 후 `[]`)
  - `save_events` (pretty JSON 기록)
  - `invoke_handler`에 `load_events, save_events` 등록
- `src/app/eventStore.ts`: `loadEvents()`, `saveEvents(events)` — `invoke` 래퍼
- `src/App.tsx`: `events` 상태 + 초기 로드 + 변경 시 300ms 디바운스 저장(노드/할 일과 동일)

## UI

### Sidebar.tsx

- 탭 버튼에 `캘린더` 추가. `SidebarView = "folders" | "todo" | "calendar"`.
- 캘린더 탭일 때 사이드바 본문은 비움(폴더 트리는 폴더 탭에서만).

### CalendarPanel.tsx (신규)

- 상단 바: `‹  YYYY년 M월  ›` 이동 버튼 + `오늘`(현재 월로 점프) 버튼.
- 요일 헤더(일~토) + `monthMatrix`로 6주 렌더.
- 날짜 셀: 날짜 숫자, 이번 달이 아니면 흐리게(`--muted`), 오늘이면 강조(`--today`).
  - 셀 빈 곳 클릭 → 그 날짜로 새 이벤트(EventDialog, date 프리필).
  - 그날 이벤트는 칩으로 나열, 칩 클릭 → 편집(EventDialog). 칩이 많으면 `+N` 처리.
- 표시 월 상태(year/month)는 CalendarPanel 내부 `useState`(기본 오늘 기준).

### EventDialog.tsx (신규)

- `LinkDialog`와 동일한 `.overlay`/`.dialog` 패턴.
- 필드: 제목(필수), 날짜(`<input type="date">`), 메모(textarea).
- 편집 모드면 `삭제` 버튼 포함. `[취소] [저장]`.
- props: `initial?: CalendarEvent`, `defaultDate?: string`, `onSubmit`, `onDelete?`, `onClose`.

### App.tsx 핸들러

- `handleAddEvent`, `handleUpdateEvent`, `handleDeleteEvent` — core/event 헬퍼 호출.
- `view === "calendar"`면 메인에 `CalendarPanel` 렌더(기존 todo 분기 옆).

## 스타일 (App.css)

- `.cal`(컨테이너), `.cal__bar`, `.cal__grid`(7열), `.cal__dow`, `.cal__cell`,
  `.cal__cell--muted`/`--today`, `.cal__chip`. 기존 색·둥근모서리 톤 재사용.

## 테스트·검증

- 단위: `event.test.ts` — `monthMatrix`(6주=42칸, 첫칸 일요일, 앞뒤 달 채움), CRUD, `eventsByDay`, `dayKey`/`todayKey`.
- 수동: 탭 전환, 월 이동/오늘, 날짜 클릭 추가, 칩 편집·삭제, 재실행 후 유지.
- `npm test` + `npm run build` 통과. Rust 변경은 `tauri build` 시 컴파일 확인.

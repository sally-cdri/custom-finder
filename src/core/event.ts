import type { TodoItem } from "./todo";

export type EventLabel = "work" | "me";

/** 라벨 정의(색은 앱 미사용 색). */
export const EVENT_LABELS: { key: EventLabel; name: string; color: string }[] = [
  { key: "work", name: "Work", color: "#7c3aed" }, // violet
  { key: "me", name: "Me", color: "#0d9488" }, // teal
];

export const DEFAULT_LABEL: EventLabel = "work";

export interface CalendarEvent {
  id: string;
  title: string;
  /** 메모 (없으면 생략) */
  note?: string;
  /** "YYYY-MM-DD" 로컬 날짜. 하루 종일 이벤트라 문자열로 저장(TZ 드리프트 없음). */
  date: string;
  /** 라벨. 기존 데이터 호환을 위해 optional — 읽을 땐 labelOf 로 보정. */
  label?: EventLabel;
  createdAt: number;
  updatedAt: number;
}

export interface NewEvent {
  title: string;
  note?: string;
  date: string;
  label: EventLabel;
}

/** 이벤트의 라벨(없던 기존 데이터는 기본 라벨로 보정). */
export function labelOf(e: CalendarEvent): EventLabel {
  return e.label ?? DEFAULT_LABEL;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Date → "YYYY-MM-DD" (로컬). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 오늘의 날짜키. */
export function todayKey(now: number = Date.now()): string {
  return dayKey(new Date(now));
}

/** 새 이벤트를 추가한 새 배열을 반환한다. */
export function addEvent(
  events: CalendarEvent[],
  input: NewEvent,
  now: number,
  newId: () => string,
): CalendarEvent[] {
  const item: CalendarEvent = {
    id: newId(),
    title: input.title,
    note: input.note,
    date: input.date,
    label: input.label,
    createdAt: now,
    updatedAt: now,
  };
  return [...events, item];
}

/** title/note/date/label 을 부분 수정한 새 배열을 반환한다. */
export function updateEvent(
  events: CalendarEvent[],
  id: string,
  patch: Partial<Pick<CalendarEvent, "title" | "note" | "date" | "label">>,
  now: number,
): CalendarEvent[] {
  return events.map((e) =>
    e.id === id ? { ...e, ...patch, updatedAt: now } : e,
  );
}

/** 해당 이벤트를 제거한 새 배열을 반환한다. */
export function deleteEvent(
  events: CalendarEvent[],
  id: string,
): CalendarEvent[] {
  return events.filter((e) => e.id !== id);
}

/** 날짜키 → 그날 이벤트 목록(제목 오름차순, 같으면 생성순). */
export function eventsByDay(
  events: CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = map.get(e.date) ?? [];
    arr.push(e);
    map.set(e.date, arr);
  }
  for (const arr of map.values()) {
    arr.sort(
      (a, b) => a.title.localeCompare(b.title) || a.createdAt - b.createdAt,
    );
  }
  return map;
}

/** 미완료 + dueAt 있는 할 일을 로컬 날짜키별로 묶는다. 같은 날은 제목순. */
export function todosByDueDay(todos: TodoItem[]): Map<string, TodoItem[]> {
  const map = new Map<string, TodoItem[]>();
  for (const t of todos) {
    if (t.done || t.dueAt == null) continue;
    const key = dayKey(new Date(t.dueAt));
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  for (const arr of map.values()) {
    arr.sort(
      (a, b) => a.title.localeCompare(b.title) || a.createdAt - b.createdAt,
    );
  }
  return map;
}

/**
 * 해당 월을 포함하는 6주 x 7일의 날짜키 행렬.
 * 주 시작은 일요일이며, 첫째 주 앞과 마지막 주 뒤는 인접 달 날짜로 채운다.
 * @param year 연도, @param month 0-based (0=1월)
 */
export function monthMatrix(year: number, month: number): string[][] {
  const first = new Date(year, month, 1);
  // 그리드 시작 = 그 달 1일이 속한 주의 일요일
  const start = new Date(year, month, 1 - first.getDay());
  const weeks: string[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(dayKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

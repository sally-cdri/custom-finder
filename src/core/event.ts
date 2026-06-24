export interface CalendarEvent {
  id: string;
  title: string;
  /** 메모 (없으면 생략) */
  note?: string;
  /** "YYYY-MM-DD" 로컬 날짜. 하루 종일 이벤트라 문자열로 저장(TZ 드리프트 없음). */
  date: string;
  createdAt: number;
  updatedAt: number;
}

export interface NewEvent {
  title: string;
  note?: string;
  date: string;
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
    createdAt: now,
    updatedAt: now,
  };
  return [...events, item];
}

/** title/note/date 를 부분 수정한 새 배열을 반환한다. */
export function updateEvent(
  events: CalendarEvent[],
  id: string,
  patch: Partial<Pick<CalendarEvent, "title" | "note" | "date">>,
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

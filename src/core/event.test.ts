import { describe, it, expect } from "vitest";
import {
  addEvent,
  updateEvent,
  deleteEvent,
  eventsByDay,
  monthMatrix,
  dayKey,
  todayKey,
  type CalendarEvent,
} from "./event";

let n = 0;
const ids = () => `e${++n}`;

function sample(): CalendarEvent[] {
  return [
    { id: "a", title: "치과", date: "2026-06-10", createdAt: 1, updatedAt: 1 },
    { id: "b", title: "회의", date: "2026-06-10", createdAt: 2, updatedAt: 2 },
    { id: "c", title: "여행", date: "2026-06-20", createdAt: 3, updatedAt: 3 },
  ];
}

describe("dayKey / todayKey", () => {
  it("로컬 날짜를 YYYY-MM-DD 로", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
  it("todayKey 는 주어진 now 기준", () => {
    expect(todayKey(new Date(2026, 5, 24).getTime())).toBe("2026-06-24");
  });
});

describe("addEvent / updateEvent / deleteEvent", () => {
  it("이벤트를 추가한다", () => {
    n = 0;
    const next = addEvent([], { title: "약속", date: "2026-06-01" }, 100, ids);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "e1", title: "약속", date: "2026-06-01" });
  });
  it("부분 수정하고 updatedAt 갱신", () => {
    const next = updateEvent(sample(), "a", { date: "2026-06-11" }, 99);
    const a = next.find((e) => e.id === "a")!;
    expect(a.date).toBe("2026-06-11");
    expect(a.updatedAt).toBe(99);
  });
  it("삭제한다", () => {
    expect(deleteEvent(sample(), "b").map((e) => e.id)).toEqual(["a", "c"]);
  });
});

describe("eventsByDay", () => {
  it("날짜별로 묶고 제목순 정렬", () => {
    const map = eventsByDay(sample());
    expect(map.get("2026-06-10")!.map((e) => e.id)).toEqual(["a", "b"]); // 치과 < 회의 (ㅊ<ㅎ)
    expect(map.get("2026-06-20")!.map((e) => e.id)).toEqual(["c"]);
    expect(map.has("2026-06-15")).toBe(false);
  });
});

describe("monthMatrix", () => {
  it("6주 x 7일 = 42칸", () => {
    const m = monthMatrix(2026, 5); // 2026-06
    expect(m).toHaveLength(6);
    expect(m.every((w) => w.length === 7)).toBe(true);
  });
  it("첫 칸은 1일이 속한 주의 일요일", () => {
    // 2026-06-01 은 월요일 → 그리드 첫 칸은 2026-05-31(일)
    expect(monthMatrix(2026, 5)[0][0]).toBe("2026-05-31");
  });
  it("앞뒤 달 날짜로 채운다", () => {
    const m = monthMatrix(2026, 5).flat();
    expect(m[0]).toBe("2026-05-31"); // 이전 달
    expect(m).toContain("2026-06-01");
    expect(m).toContain("2026-06-30");
    expect(m[m.length - 1] > "2026-06-30").toBe(true); // 다음 달로 넘어감
  });
});

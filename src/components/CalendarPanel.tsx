import { useState } from "react";
import {
  type CalendarEvent,
  type NewEvent,
  eventsByDay,
  todosByDueDay,
  monthMatrix,
  todayKey,
  labelOf,
  EVENT_LABELS,
} from "../core/event";
import type { TodoItem } from "../core/todo";
import { EventDialog } from "./EventDialog";

interface Props {
  events: CalendarEvent[];
  /** 마감일이 있는 할 일(미완료)을 날짜 칸에 함께 표시 */
  todos: TodoItem[];
  onAdd: (input: NewEvent) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<CalendarEvent, "title" | "note" | "date" | "label">>,
  ) => void;
  onDelete: (id: string) => void;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHIPS = 3;

type Dialog =
  | { mode: "new"; date: string }
  | { mode: "edit"; event: CalendarEvent }
  | null;

export function CalendarPanel({ events, todos, onAdd, onUpdate, onDelete }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [dialog, setDialog] = useState<Dialog>(null);

  const weeks = monthMatrix(year, month);
  const byDay = eventsByDay(events);
  const todoByDay = todosByDueDay(todos);
  const today = todayKey();

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <section className="cal">
      <header className="cal__bar">
        <div className="cal__nav">
          <button className="btn" onClick={() => shift(-1)} title="이전 달">
            ‹
          </button>
          <span className="cal__title">
            {year}년 {month + 1}월
          </span>
          <button className="btn" onClick={() => shift(1)} title="다음 달">
            ›
          </button>
        </div>
        <div className="cal__legend">
          {EVENT_LABELS.map((l) => (
            <span key={l.key} className="cal__legend-item">
              <span className="cal__legend-dot" style={{ background: l.color }} />
              {l.name}
            </span>
          ))}
          <button className="btn" onClick={goToday}>
            오늘
          </button>
        </div>
      </header>

      <div className="cal__grid cal__dow-row">
        {DOW.map((d) => (
          <div key={d} className="cal__dow">
            {d}
          </div>
        ))}
      </div>

      <div className="cal__body">
        {weeks.map((week, wi) => (
          <div key={wi} className="cal__grid cal__week">
            {week.map((key) => {
              const inMonth =
                key.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`;
              const dayNum = Number(key.slice(8, 10));
              const dayEvents = byDay.get(key) ?? [];
              const dayTodos = todoByDay.get(key) ?? [];
              const total = dayEvents.length + dayTodos.length;
              // 이벤트 먼저, 그 다음 할 일 순으로 MAX_CHIPS 까지만 표시
              const shownEvents = dayEvents.slice(0, MAX_CHIPS);
              const shownTodos = dayTodos.slice(
                0,
                Math.max(0, MAX_CHIPS - shownEvents.length),
              );
              return (
                <div
                  key={key}
                  className={[
                    "cal__cell",
                    inMonth ? "" : "cal__cell--muted",
                    key === today ? "cal__cell--today" : "",
                  ].join(" ")}
                  onClick={() => setDialog({ mode: "new", date: key })}
                >
                  <div className="cal__daynum">{dayNum}</div>
                  <div className="cal__chips">
                    {shownEvents.map((e) => (
                      <button
                        key={e.id}
                        className={`cal__chip cal__chip--${labelOf(e)}`}
                        title={e.title}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDialog({ mode: "edit", event: e });
                        }}
                      >
                        {e.title}
                      </button>
                    ))}
                    {shownTodos.map((t) => (
                      // 할 일 칩은 읽기 전용. 클릭은 셀의 새-이벤트 추가만 막는다.
                      <div
                        key={t.id}
                        className="cal__chip cal__chip--todo"
                        title={`할 일: ${t.title}`}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        {t.title}
                      </div>
                    ))}
                    {total > MAX_CHIPS && (
                      <div className="cal__more">+{total - MAX_CHIPS}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {dialog && dialog.mode === "new" && (
        <EventDialog
          defaultDate={dialog.date}
          onSubmit={onAdd}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog && dialog.mode === "edit" && (
        <EventDialog
          initial={dialog.event}
          onSubmit={(input) => onUpdate(dialog.event.id, input)}
          onDelete={() => onDelete(dialog.event.id)}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}

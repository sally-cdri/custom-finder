import { useState } from "react";
import {
  type CalendarEvent,
  type NewEvent,
  eventsByDay,
  monthMatrix,
  todayKey,
} from "../core/event";
import { EventDialog } from "./EventDialog";

interface Props {
  events: CalendarEvent[];
  onAdd: (input: NewEvent) => void;
  onUpdate: (id: string, patch: Partial<Pick<CalendarEvent, "title" | "note" | "date">>) => void;
  onDelete: (id: string) => void;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHIPS = 3;

type Dialog =
  | { mode: "new"; date: string }
  | { mode: "edit"; event: CalendarEvent }
  | null;

export function CalendarPanel({ events, onAdd, onUpdate, onDelete }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [dialog, setDialog] = useState<Dialog>(null);

  const weeks = monthMatrix(year, month);
  const byDay = eventsByDay(events);
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
        <button className="btn" onClick={goToday}>
          오늘
        </button>
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
                    {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                      <button
                        key={e.id}
                        className="cal__chip"
                        title={e.title}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDialog({ mode: "edit", event: e });
                        }}
                      >
                        {e.title}
                      </button>
                    ))}
                    {dayEvents.length > MAX_CHIPS && (
                      <div className="cal__more">
                        +{dayEvents.length - MAX_CHIPS}
                      </div>
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

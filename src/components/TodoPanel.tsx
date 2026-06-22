import { useEffect, useRef, useState } from "react";
import type { TodoItem } from "../core/todo";
import { sortTodos } from "../core/todo";

interface Props {
  todos: TodoItem[];
  /** 사이드바에서 선택해 펼쳐 보여줄 항목 id (변경 시 해당 행을 열고 스크롤) */
  focusedId?: string | null;
  onToggleMini: () => void;
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<TodoItem, "title" | "note" | "dueAt">>,
  ) => void;
  onDelete: (id: string) => void;
}

/** epoch ms → <input type="date"> 값("YYYY-MM-DD", 로컬). 없으면 빈 문자열. */
function msToDateInput(ms?: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD"(로컬) → 그날 자정 epoch ms. 빈 문자열이면 null. */
function dateInputToMs(s: string): number | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** 마감일 표시 문자열. */
function formatDue(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function isOverdue(ms: number): boolean {
  const today = new Date();
  const todayMid = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  return ms < todayMid;
}

function TodoRow({ todo, open, onToggleOpen, onToggle, onUpdate, onDelete }: {
  todo: TodoItem;
  open: boolean;
  onToggleOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdate: Props["onUpdate"];
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [note, setNote] = useState(todo.note ?? "");

  function commitTitle() {
    const t = title.trim();
    if (t && t !== todo.title) onUpdate(todo.id, { title: t });
    else setTitle(todo.title);
  }

  function commitNote() {
    if (note !== (todo.note ?? "")) onUpdate(todo.id, { note });
  }

  return (
    <div
      className={`todo-row ${todo.done ? "todo-row--done" : ""}`}
      data-todo-id={todo.id}
    >
      <div className="todo-row__main">
        <input
          type="checkbox"
          className="todo-check"
          checked={todo.done}
          onChange={() => onToggle(todo.id)}
        />
        <span
          className="todo-title"
          title={todo.title}
          onClick={() => onToggleOpen(todo.id)}
        >
          {todo.title}
        </span>
        {todo.dueAt != null && (
          <span
            className={`todo-due ${
              !todo.done && isOverdue(todo.dueAt) ? "todo-due--over" : ""
            }`}
          >
            {formatDue(todo.dueAt)}
          </span>
        )}
      </div>

      {open && (
        <div className="todo-edit">
          <input
            className="todo-edit__title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setTitle(todo.title);
            }}
          />
          <label className="todo-edit__field">
            <span>마감일</span>
            <input
              type="date"
              value={msToDateInput(todo.dueAt)}
              onChange={(e) =>
                onUpdate(todo.id, { dueAt: dateInputToMs(e.target.value) })
              }
            />
          </label>
          <textarea
            className="todo-edit__note"
            placeholder="메모"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={commitNote}
          />
          <button
            className="todo-edit__delete"
            onClick={() => onDelete(todo.id)}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export function TodoPanel({
  todos,
  focusedId,
  onToggleMini,
  onAdd,
  onToggle,
  onUpdate,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sorted = sortTodos(todos);
  const active = sorted.filter((t) => !t.done);
  const done = sorted.filter((t) => t.done);

  // 사이드바에서 항목을 고르면 해당 행을 열고 화면 안으로 스크롤
  useEffect(() => {
    if (!focusedId) return;
    setOpenId(focusedId);
    listRef.current
      ?.querySelector(`[data-todo-id="${focusedId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [focusedId]);

  const toggleOpen = (id: string) => setOpenId((o) => (o === id ? null : id));

  function add() {
    const t = draft.trim();
    if (!t) return;
    onAdd(t);
    setDraft("");
  }

  return (
    <section className="main todo-panel">
      <header className="main__toolbar">
        <h2 className="todo-heading">할 일</h2>
        <button className="todo-mini-btn" onClick={onToggleMini}>
          미니 창
        </button>
      </header>

      <div className="todo-add">
        <input
          className="todo-add__input"
          placeholder="할 일을 입력하고 Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button className="todo-add__btn" onClick={add}>
          추가
        </button>
      </div>

      <div className="todo-list" ref={listRef}>
        {active.length === 0 && done.length === 0 && (
          <p className="todo-empty">할 일이 없습니다.</p>
        )}
        {active.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            open={openId === t.id}
            onToggleOpen={toggleOpen}
            onToggle={onToggle}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
        {done.length > 0 && (
          <div className="todo-done-label">완료 {done.length}</div>
        )}
        {done.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            open={openId === t.id}
            onToggleOpen={toggleOpen}
            onToggle={onToggle}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

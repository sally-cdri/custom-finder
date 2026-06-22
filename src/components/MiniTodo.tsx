import { useEffect, useRef, useState } from "react";
import type { TodoItem } from "../core/todo";
import { addTodo, toggleTodo, sortTodos } from "../core/todo";
import { loadTodos, saveTodos } from "../app/todoStore";
import { emitTodosChanged, onTodosChanged } from "../app/todoSync";
import { newId } from "../app/import";
import "../App.css";

const SELF = "mini";

export function MiniTodo() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  // 외부(다른 창) 이벤트로 들어온 변경인지 표시 — true면 저장만 하고 다시 emit 안 함
  const externalRef = useRef(false);

  // 초기 로드
  useEffect(() => {
    loadTodos()
      .then(setTodos)
      .finally(() => setLoaded(true));
  }, []);

  // 다른 창의 변경 수신
  useEffect(() => {
    const un = onTodosChanged(SELF, (next) => {
      externalRef.current = true;
      setTodos(next);
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  // 변경 시 디바운스 저장 (+ 로컬 변경이면 다른 창에 알림)
  useEffect(() => {
    if (!loaded) return;
    const wasExternal = externalRef.current;
    externalRef.current = false;
    const t = setTimeout(() => {
      saveTodos(todos).catch(() => {});
      if (!wasExternal) emitTodosChanged(todos, SELF);
    }, 300);
    return () => clearTimeout(t);
  }, [todos, loaded]);

  function add() {
    const t = draft.trim();
    if (!t) return;
    setTodos((prev) => addTodo(prev, { title: t }, Date.now(), newId));
    setDraft("");
  }

  const active = sortTodos(todos).filter((t) => !t.done);

  return (
    <div className="mini">
      <div className="mini__add">
        <input
          className="mini__input"
          placeholder="할 일 추가 후 Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          autoFocus
        />
      </div>
      <div className="mini__list">
        {active.length === 0 ? (
          <p className="mini__empty">할 일이 없습니다.</p>
        ) : (
          active.map((t) => (
            <label key={t.id} className="mini__row">
              <input
                type="checkbox"
                className="mini__check"
                checked={t.done}
                onChange={() =>
                  setTodos((prev) => toggleTodo(prev, t.id, Date.now()))
                }
              />
              <span className="mini__title" title={t.title}>
                {t.title}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

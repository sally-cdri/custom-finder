export interface TodoItem {
  id: string;
  title: string;
  /** 메모/설명 (없으면 생략) */
  note?: string;
  /** 마감일 (epoch ms), 없으면 null */
  dueAt?: number | null;
  done: boolean;
  createdAt: number;
  updatedAt: number;
  /** done 전환 시점, 미완료면 null */
  completedAt?: number | null;
}

export interface NewTodo {
  title: string;
  note?: string;
  dueAt?: number | null;
}

/** 새 할 일을 배열 끝에 추가한 새 배열을 반환한다. */
export function addTodo(
  todos: TodoItem[],
  input: NewTodo,
  now: number,
  newId: () => string,
): TodoItem[] {
  const item: TodoItem = {
    id: newId(),
    title: input.title,
    note: input.note,
    dueAt: input.dueAt ?? null,
    done: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  return [...todos, item];
}

/** done 을 토글하고 completedAt/updatedAt 을 갱신한다. */
export function toggleTodo(todos: TodoItem[], id: string, now: number): TodoItem[] {
  return todos.map((t) =>
    t.id === id
      ? { ...t, done: !t.done, completedAt: t.done ? null : now, updatedAt: now }
      : t,
  );
}

/** title/note/dueAt 을 부분 수정한 새 배열을 반환한다. */
export function updateTodo(
  todos: TodoItem[],
  id: string,
  patch: Partial<Pick<TodoItem, "title" | "note" | "dueAt">>,
  now: number,
): TodoItem[] {
  return todos.map((t) =>
    t.id === id ? { ...t, ...patch, updatedAt: now } : t,
  );
}

/** 해당 할 일을 제거한 새 배열을 반환한다. */
export function deleteTodo(todos: TodoItem[], id: string): TodoItem[] {
  return todos.filter((t) => t.id !== id);
}

/** 미완료를 위, 완료를 아래로 두고 각 그룹 내에서는 createdAt 오름차순. */
export function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.createdAt - b.createdAt;
  });
}

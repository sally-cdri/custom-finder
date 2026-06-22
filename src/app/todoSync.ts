import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { TodoItem } from "../core/todo";

const EVENT = "todos:changed";

interface Payload {
  todos: TodoItem[];
  sender: string;
}

/** 다른 창에 할 일 변경을 알린다. */
export function emitTodosChanged(todos: TodoItem[], sender: string): void {
  void emit(EVENT, { todos, sender } satisfies Payload);
}

/** 다른 창의 변경을 수신한다. 자기 자신이 보낸 것은 무시한다. */
export function onTodosChanged(
  self: string,
  cb: (todos: TodoItem[]) => void,
): Promise<UnlistenFn> {
  return listen<Payload>(EVENT, (e) => {
    if (e.payload.sender !== self) cb(e.payload.todos);
  });
}

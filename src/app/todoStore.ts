import { invoke } from "@tauri-apps/api/core";
import type { TodoItem } from "../core/todo";

/** todos.json 에서 할 일 배열을 읽는다. */
export async function loadTodos(): Promise<TodoItem[]> {
  const todos = await invoke<TodoItem[]>("load_todos");
  return Array.isArray(todos) ? todos : [];
}

/** 할 일 배열을 todos.json 에 저장한다. */
export async function saveTodos(todos: TodoItem[]): Promise<void> {
  await invoke("save_todos", { todos });
}

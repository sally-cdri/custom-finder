import { describe, it, expect } from "vitest";
import type { TodoItem } from "./todo";
import {
  addTodo,
  toggleTodo,
  updateTodo,
  deleteTodo,
  sortTodos,
} from "./todo";

let counter = 0;
const newId = () => `id${++counter}`;

function reset() {
  counter = 0;
}

describe("addTodo", () => {
  it("새 항목을 끝에 추가하고 기본값을 채운다", () => {
    reset();
    const r = addTodo([], { title: "우유 사기" }, 100, newId);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      id: "id1",
      title: "우유 사기",
      done: false,
      dueAt: null,
      createdAt: 100,
      updatedAt: 100,
      completedAt: null,
    });
  });

  it("note 와 dueAt 을 함께 저장한다", () => {
    reset();
    const r = addTodo([], { title: "보고서", note: "초안", dueAt: 500 }, 100, newId);
    expect(r[0].note).toBe("초안");
    expect(r[0].dueAt).toBe(500);
  });

  it("기존 배열을 변경하지 않는다", () => {
    reset();
    const base: TodoItem[] = [];
    addTodo(base, { title: "x" }, 100, newId);
    expect(base).toHaveLength(0);
  });
});

describe("toggleTodo", () => {
  it("done 을 토글하고 completedAt 을 채운다", () => {
    reset();
    const base = addTodo([], { title: "x" }, 100, newId);
    const r = toggleTodo(base, "id1", 200);
    expect(r[0].done).toBe(true);
    expect(r[0].completedAt).toBe(200);
    expect(r[0].updatedAt).toBe(200);
  });

  it("다시 토글하면 completedAt 을 비운다", () => {
    reset();
    const base = toggleTodo(addTodo([], { title: "x" }, 100, newId), "id1", 200);
    const r = toggleTodo(base, "id1", 300);
    expect(r[0].done).toBe(false);
    expect(r[0].completedAt).toBeNull();
  });
});

describe("updateTodo", () => {
  it("title/note/dueAt 을 부분 수정한다", () => {
    reset();
    const base = addTodo([], { title: "x" }, 100, newId);
    const r = updateTodo(base, "id1", { title: "y", note: "메모", dueAt: 999 }, 200);
    expect(r[0]).toMatchObject({ title: "y", note: "메모", dueAt: 999, updatedAt: 200 });
  });

  it("patch 에 없는 필드는 유지한다", () => {
    reset();
    const base = addTodo([], { title: "x", note: "keep" }, 100, newId);
    const r = updateTodo(base, "id1", { dueAt: 1 }, 200);
    expect(r[0].note).toBe("keep");
    expect(r[0].title).toBe("x");
  });
});

describe("deleteTodo", () => {
  it("해당 항목을 제거한다", () => {
    reset();
    let base = addTodo([], { title: "a" }, 100, newId);
    base = addTodo(base, { title: "b" }, 100, newId);
    const r = deleteTodo(base, "id1");
    expect(r.map((t) => t.id)).toEqual(["id2"]);
  });
});

describe("sortTodos", () => {
  it("미완료를 위, 완료를 아래로 두고 각 그룹은 createdAt 오름차순", () => {
    const todos: TodoItem[] = [
      { id: "a", title: "a", done: true, dueAt: null, createdAt: 10, updatedAt: 10, completedAt: 50 },
      { id: "b", title: "b", done: false, dueAt: null, createdAt: 30, updatedAt: 30, completedAt: null },
      { id: "c", title: "c", done: false, dueAt: null, createdAt: 20, updatedAt: 20, completedAt: null },
      { id: "d", title: "d", done: true, dueAt: null, createdAt: 5, updatedAt: 5, completedAt: 40 },
    ];
    const r = sortTodos(todos).map((t) => t.id);
    expect(r).toEqual(["c", "b", "d", "a"]); // 미완료(20,30) → 완료(5,10)
  });

  it("입력 배열을 변경하지 않는다", () => {
    const todos: TodoItem[] = [
      { id: "a", title: "a", done: true, dueAt: null, createdAt: 10, updatedAt: 10, completedAt: 50 },
      { id: "b", title: "b", done: false, dueAt: null, createdAt: 30, updatedAt: 30, completedAt: null },
    ];
    const before = todos.map((t) => t.id);
    sortTodos(todos);
    expect(todos.map((t) => t.id)).toEqual(before);
  });
});

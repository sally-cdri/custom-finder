import { describe, it, expect } from "vitest";
import type { FinderNode } from "./types";
import { sortNodes, filterByName } from "./sort";

function n(
  id: string,
  type: FinderNode["type"],
  name: string,
  created: number,
  order = 0,
): FinderNode {
  return { id, type, name, parentId: null, order, createdAt: created, updatedAt: created } as FinderNode;
}

const items: FinderNode[] = [
  n("z", "file", "zebra", 30, 2),
  n("a", "file", "apple", 10, 0),
  n("d", "folder", "docs", 20, 1),
  n("m", "folder", "movies", 5, 3),
];

describe("sortNodes", () => {
  it("폴더가 항상 먼저, 그 안에서 이름 오름차순", () => {
    const r = sortNodes(items, "name", "asc").map((x) => x.id);
    expect(r).toEqual(["d", "m", "a", "z"]); // docs, movies(폴더) → apple, zebra
  });
  it("내림차순도 폴더 우선 유지", () => {
    const r = sortNodes(items, "name", "desc").map((x) => x.id);
    expect(r).toEqual(["m", "d", "z", "a"]); // movies, docs → zebra, apple
  });
  it("추가일 오름차순", () => {
    const r = sortNodes(items, "created", "asc").map((x) => x.id);
    expect(r).toEqual(["m", "d", "a", "z"]); // 폴더(5,20) → 파일(10,30)
  });
  it("manual 은 order 기준", () => {
    const r = sortNodes(items, "manual", "asc").map((x) => x.id);
    expect(r).toEqual(["d", "m", "a", "z"]); // 폴더 먼저(order 1,3) → 파일(order 0,2)
  });
});

describe("filterByName", () => {
  it("이름 부분일치(대소문자 무시)", () => {
    expect(filterByName(items, "O").map((x) => x.id).sort()).toEqual(["d", "m"]); // docs, movies
  });
  it("빈 값은 전체", () => {
    expect(filterByName(items, "  ").length).toBe(4);
  });
});

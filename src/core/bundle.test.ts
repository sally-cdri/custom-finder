import { describe, it, expect } from "vitest";
import type { FinderNode } from "./types";
import { prepareImport } from "./bundle";

function nodes(): FinderNode[] {
  return [
    { id: "f", type: "folder", name: "공유폴더", parentId: "old-parent", order: 0, createdAt: 1, updatedAt: 1 },
    { id: "img", type: "image", name: "a.png", parentId: "f", order: 0, createdAt: 1, updatedAt: 1, storedName: "img.png", originalName: "a.png", mime: "image/png" },
    { id: "t", type: "text", name: "메모", parentId: "f", order: 1, createdAt: 1, updatedAt: 1, content: "hi" },
  ];
}

describe("prepareImport", () => {
  let i = 0;
  const gen = () => `new-${i++}`;

  it("새 id 부여 + 루트는 targetParentId 아래로", () => {
    i = 0;
    const out = prepareImport(nodes(), { "img.png": "imp-1.png" }, "target", 99, gen);
    const folder = out.find((n) => n.name === "공유폴더")!;
    expect(folder.id).toBe("new-0");
    expect(folder.parentId).toBe("target"); // 루트는 현재 폴더로 재지정
    expect(folder.updatedAt).toBe(99);
  });

  it("내부 부모 관계는 새 id 로 유지", () => {
    i = 0;
    const out = prepareImport(nodes(), {}, "target", 99, gen);
    const folder = out.find((n) => n.name === "공유폴더")!;
    const img = out.find((n) => n.name === "a.png")!;
    expect(img.parentId).toBe(folder.id); // 새 id 로 연결
  });

  it("storedName 은 rename 매핑으로 교체", () => {
    i = 0;
    const out = prepareImport(nodes(), { "img.png": "imp-1.png" }, null, 99, gen);
    const img = out.find((n) => n.name === "a.png")!;
    expect(img.type === "image" && img.storedName).toBe("imp-1.png");
  });

  it("매핑 없으면 storedName 유지", () => {
    i = 0;
    const out = prepareImport(nodes(), {}, null, 99, gen);
    const img = out.find((n) => n.name === "a.png")!;
    expect(img.type === "image" && img.storedName).toBe("img.png");
  });
});

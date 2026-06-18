import { describe, it, expect } from "vitest";
import type { FinderNode } from "./types";
import {
  countChildren,
  nextOrder,
  addNode,
  updateNode,
  renameNode,
  moveNode,
  deleteNode,
  collectSubtreeIds,
  getChildren,
  getPath,
  isDescendant,
  reorderWithin,
} from "./tree";

function folder(id: string, parentId: string | null, order = 0): FinderNode {
  return {
    id,
    type: "folder",
    name: id,
    parentId,
    order,
    createdAt: 0,
    updatedAt: 0,
  };
}

function link(id: string, parentId: string | null, order = 0): FinderNode {
  return {
    id,
    type: "link",
    name: id,
    parentId,
    order,
    createdAt: 0,
    updatedAt: 0,
    url: "https://example.com",
  };
}

// 트리:  work(folder) ─ doc(folder) ─ memo(link)
//                    └ note(text-ish link)
function sample(): FinderNode[] {
  return [
    folder("work", null, 0),
    folder("doc", "work", 0),
    link("note", "work", 1),
    link("memo", "doc", 0),
  ];
}

describe("getChildren", () => {
  it("부모 id 의 자식만 order 순으로 반환", () => {
    const nodes = sample();
    const kids = getChildren(nodes, "work");
    expect(kids.map((n) => n.id)).toEqual(["doc", "note"]);
  });

  it("최상위는 parentId null", () => {
    expect(getChildren(sample(), null).map((n) => n.id)).toEqual(["work"]);
  });

  it("order 오름차순 정렬", () => {
    const nodes = [link("b", null, 5), link("a", null, 2)];
    expect(getChildren(nodes, null).map((n) => n.id)).toEqual(["a", "b"]);
  });
});

describe("countChildren", () => {
  it("하위 폴더 수와 항목 수를 센다", () => {
    // work 아래: doc(folder), note(link) → 폴더 1, 항목 1
    expect(countChildren(sample(), "work")).toEqual({ folders: 1, items: 1 });
  });
  it("최상위 카운트", () => {
    expect(countChildren(sample(), null)).toEqual({ folders: 1, items: 0 });
  });
  it("빈 폴더는 0/0", () => {
    expect(countChildren(sample(), "doc-empty")).toEqual({ folders: 0, items: 0 });
  });
});

describe("nextOrder", () => {
  it("폴더 내 가장 큰 order + 1", () => {
    expect(nextOrder(sample(), "work")).toBe(2);
  });
  it("빈 폴더는 0", () => {
    expect(nextOrder(sample(), "doc-empty")).toBe(0);
  });
});

describe("addNode", () => {
  it("노드를 추가한다", () => {
    const next = addNode(sample(), link("new", "work", 2));
    expect(next).toHaveLength(5);
    expect(getChildren(next, "work").map((n) => n.id)).toEqual([
      "doc",
      "note",
      "new",
    ]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const nodes = sample();
    addNode(nodes, link("new", "work", 2));
    expect(nodes).toHaveLength(4);
  });
});

describe("updateNode / renameNode", () => {
  it("필드를 갱신하고 updatedAt 을 바꾼다", () => {
    const next = updateNode(sample(), "memo", { url: "https://new.com" }, 999);
    const memo = next.find((n) => n.id === "memo");
    expect(memo).toMatchObject({ url: "https://new.com", updatedAt: 999 });
  });

  it("renameNode 는 name 을 바꾼다", () => {
    const next = renameNode(sample(), "doc", "문서", 5);
    expect(next.find((n) => n.id === "doc")?.name).toBe("문서");
  });
});

describe("isDescendant", () => {
  it("자손이면 true", () => {
    expect(isDescendant(sample(), "work", "memo")).toBe(true);
  });
  it("자손이 아니면 false", () => {
    expect(isDescendant(sample(), "doc", "note")).toBe(false);
  });
  it("자기 자신은 false", () => {
    expect(isDescendant(sample(), "work", "work")).toBe(false);
  });
});

describe("moveNode", () => {
  it("부모를 바꾸고 대상 폴더 끝 order 로 보낸다", () => {
    const next = moveNode(sample(), "memo", "work", 10);
    const memo = next.find((n) => n.id === "memo")!;
    expect(memo.parentId).toBe("work");
    expect(memo.order).toBe(2);
    expect(memo.updatedAt).toBe(10);
  });

  it("자기 자신 안으로는 이동하지 않는다", () => {
    const next = moveNode(sample(), "work", "work", 1);
    expect(next.find((n) => n.id === "work")?.parentId).toBe(null);
  });

  it("자기 자손 안으로는 이동하지 않는다 (사이클 방지)", () => {
    const next = moveNode(sample(), "work", "doc", 1);
    expect(next.find((n) => n.id === "work")?.parentId).toBe(null);
  });

  it("최상위(null)로 이동할 수 있다", () => {
    const next = moveNode(sample(), "memo", null, 1);
    expect(next.find((n) => n.id === "memo")?.parentId).toBe(null);
  });
});

describe("collectSubtreeIds / deleteNode", () => {
  it("자신과 모든 자손 id 를 모은다", () => {
    const ids = collectSubtreeIds(sample(), "work");
    expect([...ids].sort()).toEqual(["doc", "memo", "note", "work"]);
  });

  it("노드와 하위 전체를 삭제한다 (cascade)", () => {
    const next = deleteNode(sample(), "work");
    expect(next).toHaveLength(0);
  });

  it("리프 하나만 삭제", () => {
    const next = deleteNode(sample(), "memo");
    expect(next.map((n) => n.id).sort()).toEqual(["doc", "note", "work"]);
  });
});

describe("getPath", () => {
  it("root 부터 대상까지 경로 반환", () => {
    expect(getPath(sample(), "memo").map((n) => n.id)).toEqual([
      "work",
      "doc",
      "memo",
    ]);
  });
  it("최상위 노드는 자기 자신만", () => {
    expect(getPath(sample(), "work").map((n) => n.id)).toEqual(["work"]);
  });
});

describe("reorderWithin", () => {
  it("주어진 순서대로 order 를 재할당한다", () => {
    const next = reorderWithin(sample(), "work", ["note", "doc"], 7);
    expect(getChildren(next, "work").map((n) => n.id)).toEqual(["note", "doc"]);
  });
});

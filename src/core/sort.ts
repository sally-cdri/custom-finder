import type { FinderNode } from "./types";

export type SortKey = "name" | "created" | "updated" | "type" | "manual";
export type SortDir = "asc" | "desc";

const TYPE_ORDER: Record<string, number> = {
  folder: 0,
  link: 1,
  text: 2,
  image: 3,
  file: 4,
};

/** 현재 폴더 항목을 정렬한다. 폴더는 항상 맨 위. manual 은 사용자 지정 order. */
export function sortNodes(
  nodes: FinderNode[],
  key: SortKey,
  dir: SortDir,
): FinderNode[] {
  const mul = dir === "asc" ? 1 : -1;
  const arr = [...nodes];
  arr.sort((a, b) => {
    // 폴더 우선 (방향과 무관)
    const af = a.type === "folder" ? 0 : 1;
    const bf = b.type === "folder" ? 0 : 1;
    if (af !== bf) return af - bf;

    let c = 0;
    switch (key) {
      case "name":
        c = a.name.localeCompare(b.name, "ko");
        break;
      case "created":
        c = a.createdAt - b.createdAt;
        break;
      case "updated":
        c = a.updatedAt - b.updatedAt;
        break;
      case "type":
        c = (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
        break;
      case "manual":
        c = a.order - b.order;
        break;
    }
    if (c === 0) c = a.name.localeCompare(b.name, "ko");
    return c * mul;
  });
  return arr;
}

/** 현재 폴더 항목을 이름으로 필터링 (대소문자 무시, 공백 무시 시 전체). */
export function filterByName(nodes: FinderNode[], text: string): FinderNode[] {
  const q = text.trim().toLowerCase();
  if (!q) return nodes;
  return nodes.filter((n) => n.name.toLowerCase().includes(q));
}

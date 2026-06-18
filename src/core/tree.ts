import type { FinderNode } from "./types";

/** 같은 부모를 가진 자식들을 order 오름차순으로 반환한다. */
export function getChildren(
  nodes: FinderNode[],
  parentId: string | null,
): FinderNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

/** 폴더 내 다음 order 값(가장 큰 order + 1, 비어있으면 0). */
export function nextOrder(
  nodes: FinderNode[],
  parentId: string | null,
): number {
  const kids = nodes.filter((n) => n.parentId === parentId);
  if (kids.length === 0) return 0;
  return Math.max(...kids.map((n) => n.order)) + 1;
}

/** 노드를 추가한 새 배열을 반환한다 (원본 불변). */
export function addNode(nodes: FinderNode[], node: FinderNode): FinderNode[] {
  return [...nodes, node];
}

/** 특정 노드의 필드를 patch 하고 updatedAt 을 갱신한다. */
export function updateNode(
  nodes: FinderNode[],
  id: string,
  patch: Partial<FinderNode>,
  now: number = Date.now(),
): FinderNode[] {
  return nodes.map((n) =>
    n.id === id ? ({ ...n, ...patch, id: n.id, updatedAt: now } as FinderNode) : n,
  );
}

/** 이름 변경. */
export function renameNode(
  nodes: FinderNode[],
  id: string,
  name: string,
  now: number = Date.now(),
): FinderNode[] {
  return updateNode(nodes, id, { name }, now);
}

/** ancestorId 의 서브트리 안에 nodeId 가 들어있는지(자기 자신 제외). */
export function isDescendant(
  nodes: FinderNode[],
  ancestorId: string,
  nodeId: string,
): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let cur = byId.get(nodeId);
  while (cur && cur.parentId !== null) {
    if (cur.parentId === ancestorId) return true;
    cur = byId.get(cur.parentId) ?? undefined;
  }
  return false;
}

/** 노드를 다른 폴더로 이동한다. 사이클(자기 자신/자손 안으로)은 무시. */
export function moveNode(
  nodes: FinderNode[],
  id: string,
  newParentId: string | null,
  now: number = Date.now(),
): FinderNode[] {
  if (id === newParentId) return nodes;
  if (newParentId !== null && isDescendant(nodes, id, newParentId)) return nodes;
  const order = nextOrder(nodes, newParentId);
  return updateNode(nodes, id, { parentId: newParentId, order }, now);
}

/** id 의 서브트리에 속한 모든 노드 id(자기 자신 포함). */
export function collectSubtreeIds(
  nodes: FinderNode[],
  id: string,
): Set<string> {
  const childrenOf = new Map<string | null, string[]>();
  for (const n of nodes) {
    const arr = childrenOf.get(n.parentId) ?? [];
    arr.push(n.id);
    childrenOf.set(n.parentId, arr);
  }
  const result = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    result.add(cur);
    for (const child of childrenOf.get(cur) ?? []) stack.push(child);
  }
  return result;
}

/** 노드와 모든 자손을 삭제한 새 배열을 반환한다. */
export function deleteNode(nodes: FinderNode[], id: string): FinderNode[] {
  const remove = collectSubtreeIds(nodes, id);
  return nodes.filter((n) => !remove.has(n.id));
}

/** root 부터 대상 노드까지의 경로(breadcrumb). */
export function getPath(nodes: FinderNode[], id: string): FinderNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: FinderNode[] = [];
  let cur = byId.get(id);
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId !== null ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/** 한 폴더 내 자식들을 orderedIds 순서대로 order 재할당한다. */
export function reorderWithin(
  nodes: FinderNode[],
  parentId: string | null,
  orderedIds: string[],
  now: number = Date.now(),
): FinderNode[] {
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  return nodes.map((n) =>
    n.parentId === parentId && rank.has(n.id)
      ? { ...n, order: rank.get(n.id)!, updatedAt: now }
      : n,
  );
}

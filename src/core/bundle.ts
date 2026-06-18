import type { FinderNode } from "./types";

/**
 * 가져온 번들 노드들을 새 id 로 재매핑해 현재 폴더 아래에 붙일 수 있게 만든다.
 * - 모든 노드에 새 id 부여 (genId), parentId 도 새 id 로 치환
 * - 번들 안에 부모가 없는 노드(루트)는 targetParentId 아래로
 * - file/image 의 storedName 은 rename 매핑으로 교체
 * - createdAt/updatedAt 은 now 로 갱신
 */
export function prepareImport(
  bundleNodes: FinderNode[],
  rename: Record<string, string>,
  targetParentId: string | null,
  now: number,
  genId: () => string,
): FinderNode[] {
  const ids = new Set(bundleNodes.map((n) => n.id));
  const idMap = new Map<string, string>();
  for (const n of bundleNodes) idMap.set(n.id, genId());

  return bundleNodes.map((n) => {
    const isRoot = n.parentId === null || !ids.has(n.parentId);
    const newParentId = isRoot ? targetParentId : idMap.get(n.parentId as string)!;
    const copy = {
      ...n,
      id: idMap.get(n.id)!,
      parentId: newParentId,
      createdAt: now,
      updatedAt: now,
    } as FinderNode;
    if (
      (copy.type === "file" || copy.type === "image") &&
      rename[copy.storedName]
    ) {
      copy.storedName = rename[copy.storedName];
    }
    return copy;
  });
}

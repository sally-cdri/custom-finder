import { useMemo, useState } from "react";
import type { FinderNode } from "../core/types";
import { getChildren, collectSubtreeIds } from "../core/tree";

interface Props {
  nodes: FinderNode[];
  /** 이동할 노드 id 들 */
  movingIds: string[];
  /** 선택한 폴더로 이동 (null = 최상위) */
  onMove: (folderId: string | null) => void;
  onClose: () => void;
}

/**
 * 이동 대상 폴더를 트리에서 라디오로 고르는 모달.
 * - 옮기는 폴더 자신과 그 하위는 무효(사이클) → 비활성화
 * - 모든 대상이 이미 같은 부모면 그 부모도 무효(변화 없음)
 */
export function MoveDialog({ nodes, movingIds, onMove, onClose }: Props) {
  // 무효 폴더 id 집합: 옮기는 노드가 폴더면 자기+하위 전체
  const blocked = useMemo(() => {
    const set = new Set<string>();
    for (const id of movingIds) {
      const node = nodes.find((n) => n.id === id);
      if (node?.type === "folder") {
        for (const sid of collectSubtreeIds(nodes, id)) set.add(sid);
      }
    }
    return set;
  }, [nodes, movingIds]);

  // 모든 대상이 같은 부모를 공유하면 그 부모는 "변화 없음"이라 비활성화
  const sharedParent = useMemo(() => {
    const parents = new Set(
      movingIds
        .map((id) => nodes.find((n) => n.id === id))
        .filter((n): n is FinderNode => n !== undefined)
        .map((n) => n.parentId),
    );
    return parents.size === 1 ? [...parents][0] : undefined;
  }, [nodes, movingIds]);

  const [selected, setSelected] = useState<string | null>(null);
  const [chosen, setChosen] = useState(false);

  function isDisabled(folderId: string | null): boolean {
    if (folderId !== null && blocked.has(folderId)) return true;
    if (sharedParent !== undefined && folderId === sharedParent) return true;
    return false;
  }

  function choose(folderId: string | null) {
    if (isDisabled(folderId)) return;
    setSelected(folderId);
    setChosen(true);
  }

  function renderFolders(parentId: string | null, depth: number) {
    return getChildren(nodes, parentId)
      .filter((n) => n.type === "folder")
      .map((f) => {
        const disabled = isDisabled(f.id);
        return (
          <div key={f.id}>
            <button
              type="button"
              className={[
                "move-tree__row",
                disabled ? "move-tree__row--disabled" : "",
                chosen && selected === f.id ? "move-tree__row--on" : "",
              ].join(" ")}
              style={{ paddingLeft: 10 + depth * 16 }}
              disabled={disabled}
              onClick={() => choose(f.id)}
            >
              <span className="move-tree__radio" />
              <span className="move-tree__label" title={f.name}>
                {f.name}
              </span>
            </button>
            {renderFolders(f.id, depth + 1)}
          </div>
        );
      });
  }

  const rootDisabled = isDisabled(null);

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="dialog__title">
          이동 위치 선택
          {movingIds.length > 1 ? ` (${movingIds.length}개)` : ""}
        </h3>

        <div className="move-tree">
          <button
            type="button"
            className={[
              "move-tree__row",
              rootDisabled ? "move-tree__row--disabled" : "",
              chosen && selected === null ? "move-tree__row--on" : "",
            ].join(" ")}
            style={{ paddingLeft: 10 }}
            disabled={rootDisabled}
            onClick={() => choose(null)}
          >
            <span className="move-tree__radio" />
            <span className="move-tree__label">내 폴더 (최상위)</span>
          </button>
          {renderFolders(null, 1)}
        </div>

        <div className="editor__actions">
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button
            className="btn btn--primary"
            disabled={!chosen}
            onClick={() => {
              onMove(selected);
              onClose();
            }}
          >
            이동
          </button>
        </div>
      </div>
    </div>
  );
}

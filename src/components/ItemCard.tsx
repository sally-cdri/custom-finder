import { useEffect, useRef, useState } from "react";
import type { FinderNode } from "../core/types";
import { assetSrc, storedFileExists } from "../app/import";
import { middleEllipsis } from "../core/text";
import { TypeIcon } from "./icons";
import { serviceIcon } from "./services";
import { DRAG_MIME, setDragIds, getDragIds } from "./dnd";

/** 텍스트 메모 카드의 미리보기 (제목 + 본문, 아이폰 메모 스타일). */
function NotePreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="note">
      <div className="note__title">{title || "새 메모"}</div>
      <div className="note__body">{body.trim() || "추가 텍스트 없음"}</div>
    </div>
  );
}

interface Props {
  node: FinderNode;
  selected: boolean;
  /** 현재 선택된 모든 노드 id (다중 드래그용) */
  selectedIds: string[];
  /** 부모가 이 카드를 이름 편집 모드로 둘지 */
  renaming: boolean;
  /** 검색 결과 등에서 경로를 함께 보여줄 때 */
  subtitle?: string;
  onSelect: (id: string, additive: boolean, range: boolean) => void;
  onOpen: (node: FinderNode) => void;
  onStartRename: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onContextMenu: (e: React.MouseEvent, node: FinderNode) => void;
  /** 노드들을 folderId 로 이동 */
  onMoveInto: (ids: string[], folderId: string) => void;
}

export function ItemCard({
  node,
  selected,
  selectedIds,
  renaming,
  subtitle,
  onSelect,
  onOpen,
  onStartRename,
  onRename,
  onCancelRename,
  onContextMenu,
  onMoveInto,
}: Props) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const [dropHover, setDropHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasFile = node.type === "image" || node.type === "file";

  useEffect(() => {
    let alive = true;
    if (hasFile) {
      const storedName = (node as { storedName: string }).storedName;
      storedFileExists(storedName).then((exists) => {
        if (!alive) return;
        setMissing(!exists);
        if (exists && node.type === "image") {
          assetSrc(storedName).then((src) => alive && setThumb(src));
        }
      });
    }
    return () => {
      alive = false;
    };
  }, [node, hasFile]);

  useEffect(() => {
    if (renaming) {
      setDraft(node.name);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming, node.name]);

  function commitRename() {
    const name = draft.trim();
    if (name && name !== node.name) onRename(node.id, name);
    else onCancelRename();
  }

  return (
    <div
      className={[
        "card",
        selected ? "card--selected" : "",
        dropHover ? "card--drophover" : "",
        missing ? "card--missing" : "",
      ].join(" ")}
      tabIndex={0}
      data-id={node.id}
      draggable={!renaming}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id, e.metaKey || e.ctrlKey, e.shiftKey);
      }}
      onDoubleClick={() => !renaming && onOpen(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
      onDragStart={(e) => {
        // 드래그한 카드가 선택에 포함돼 있으면 선택 전체를, 아니면 이 카드만
        const ids =
          selected && selectedIds.length > 1 ? selectedIds : [node.id];
        setDragIds(e.dataTransfer, ids);
      }}
      onDragOver={(e) => {
        if (
          node.type === "folder" &&
          e.dataTransfer.types.includes(DRAG_MIME)
        ) {
          e.preventDefault();
          setDropHover(true);
        }
      }}
      onDragLeave={() => setDropHover(false)}
      onDrop={(e) => {
        setDropHover(false);
        if (node.type !== "folder") return;
        const ids = getDragIds(e.dataTransfer).filter((id) => id !== node.id);
        if (ids.length) {
          e.preventDefault();
          onMoveInto(ids, node.id);
        }
      }}
    >
      <div className="card__thumb">
        {node.type === "image" && thumb && !missing ? (
          <img src={thumb} alt={node.name} className="card__img" />
        ) : node.type === "text" ? (
          <NotePreview title={node.name} body={node.content} />
        ) : node.type === "link" && serviceIcon(node.service) ? (
          <img
            src={serviceIcon(node.service)!}
            alt={node.service}
            className="card__service-icon"
          />
        ) : (
          <TypeIcon type={node.type} />
        )}
      </div>

      {renaming ? (
        <input
          ref={inputRef}
          className="card__rename"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") onCancelRename();
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="card__name"
          title={node.name}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartRename(node.id);
          }}
        >
          {middleEllipsis(node.name)}
        </div>
      )}

      {missing && <div className="card__badge">파일 없음</div>}
      {subtitle && <div className="card__subtitle">{subtitle}</div>}
    </div>
  );
}

import { useRef, useState } from "react";
import type { FinderNode } from "../core/types";
import type { SortKey, SortDir } from "../core/sort";
import { ItemCard } from "./ItemCard";
import { AddMenu } from "./AddMenu";

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "manual", label: "기본 순서" },
  { key: "name", label: "이름" },
  { key: "created", label: "추가한 날짜" },
  { key: "updated", label: "수정한 날짜" },
  { key: "type", label: "종류" },
];

export interface DisplayItem {
  node: FinderNode;
  subtitle?: string;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Props {
  path: FinderNode[];
  items: DisplayItem[];
  query: string;
  searching: boolean;
  selectedIds: string[];
  renamingId: string | null;
  filterText: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onFilterChange: (t: string) => void;
  onSortKeyChange: (k: SortKey) => void;
  onSortDirToggle: () => void;
  onQueryChange: (q: string) => void;
  onNavigate: (folderId: string | null) => void;
  onSelect: (id: string, additive: boolean, range: boolean) => void;
  onSelectMany: (ids: string[]) => void;
  onClearSelection: () => void;
  onOpen: (node: FinderNode) => void;
  onStartRename: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onContextMenu: (e: React.MouseEvent, node: FinderNode) => void;
  onMoveInto: (id: string, folderId: string) => void;
  onAddFolder: () => void;
  onAddLink: () => void;
  onAddText: () => void;
  onAddFiles: () => void;
  onAddImages: () => void;
  onImport: () => void;
}

function intersects(a: Rect, b: DOMRect): boolean {
  return !(
    a.left > b.right ||
    a.left + a.width < b.left ||
    a.top > b.bottom ||
    a.top + a.height < b.top
  );
}

export function MainPanel(props: Props) {
  const {
    path,
    items,
    query,
    searching,
    selectedIds,
    renamingId,
    filterText,
    sortKey,
    sortDir,
    onFilterChange,
    onSortKeyChange,
    onSortDirToggle,
    onQueryChange,
    onNavigate,
    onSelectMany,
    onClearSelection,
  } = props;

  const gridRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);

  // 빈 영역에서 마우스 드래그 → 러버밴드 선택
  function onGridMouseDown(e: React.MouseEvent) {
    if (e.button !== 0 || e.target !== gridRef.current) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    function rectFrom(x: number, y: number): Rect {
      return {
        left: Math.min(startX, x),
        top: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY),
      };
    }

    function onMove(ev: MouseEvent) {
      const r = rectFrom(ev.clientX, ev.clientY);
      if (r.width > 3 || r.height > 3) moved = true;
      setMarquee(r);
      if (!gridRef.current) return;
      const hit: string[] = [];
      gridRef.current.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => {
        if (intersects(r, el.getBoundingClientRect())) {
          const id = el.dataset.id;
          if (id) hit.push(id);
        }
      });
      onSelectMany(hit);
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setMarquee(null);
      if (!moved) onClearSelection();
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <section className="main">
      <header className="main__toolbar">
        <nav className="breadcrumb">
          <button className="crumb" onClick={() => onNavigate(null)}>
            내 폴더
          </button>
          {!searching &&
            path.map((p) => (
              <span key={p.id} className="crumb-wrap">
                <span className="crumb-sep">›</span>
                <button className="crumb" onClick={() => onNavigate(p.id)}>
                  {p.name}
                </button>
              </span>
            ))}
          {searching && <span className="crumb-sep">› 검색 결과</span>}
        </nav>

        <div className="main__actions">
          <input
            className="search"
            type="search"
            placeholder="전체 검색"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <AddMenu
            onAddFolder={props.onAddFolder}
            onAddLink={props.onAddLink}
            onAddText={props.onAddText}
            onAddFiles={props.onAddFiles}
            onAddImages={props.onAddImages}
            onImport={props.onImport}
          />
        </div>
      </header>

      {!searching && (
        <div className="subbar">
          <input
            className="filter"
            type="search"
            placeholder="이 폴더에서 필터"
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
          />
          <div className="sort">
            <label className="sort__label">정렬</label>
            <select
              className="sort__select"
              value={sortKey}
              onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
            >
              {SORT_LABELS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              className="sort__dir"
              title={sortDir === "asc" ? "오름차순" : "내림차순"}
              onClick={onSortDirToggle}
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      )}

      <div className="grid" ref={gridRef} onMouseDown={onGridMouseDown}>
        {items.length === 0 ? (
          <div className="empty">
            {searching
              ? "검색 결과가 없습니다."
              : "비어 있습니다. 파일을 끌어다 놓거나 + 추가를 눌러보세요."}
          </div>
        ) : (
          items.map(({ node, subtitle }) => (
            <ItemCard
              key={node.id}
              node={node}
              selected={selectedIds.includes(node.id)}
              renaming={renamingId === node.id}
              subtitle={subtitle}
              onSelect={props.onSelect}
              onOpen={props.onOpen}
              onStartRename={props.onStartRename}
              onRename={props.onRename}
              onCancelRename={props.onCancelRename}
              onContextMenu={props.onContextMenu}
              onMoveInto={props.onMoveInto}
            />
          ))
        )}
      </div>

      {marquee && (
        <div
          className="marquee"
          style={{
            left: marquee.left,
            top: marquee.top,
            width: marquee.width,
            height: marquee.height,
          }}
        />
      )}
    </section>
  );
}

import { useRef, useState } from "react";
import type { FinderNode, LinkService } from "../core/types";
import type { SortKey, SortDir } from "../core/sort";
import { ItemCard } from "./ItemCard";
import { AddMenu } from "./AddMenu";
import { ViewMenu } from "./ViewMenu";
import { SERVICES } from "./services";
import { DRAG_MIME, getDragIds } from "./dnd";
import type { ViewMode } from "../core/view";

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
  serviceFilter: LinkService | "all";
  sortKey: SortKey;
  sortDir: SortDir;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onServiceFilterChange: (s: LinkService | "all") => void;
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
  onMoveInto: (ids: string[], folderId: string | null) => void;
  onAddFolder: () => void;
  onAddLink: () => void;
  onAddText: () => void;
  onAddFiles: () => void;
  onAddImages: () => void;
  onImport: () => void;
}

interface Edges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function intersects(a: Rect, b: Edges): boolean {
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
    serviceFilter,
    sortKey,
    sortDir,
    onServiceFilterChange,
    onFilterChange,
    onSortKeyChange,
    onSortDirToggle,
    onQueryChange,
    onNavigate,
    onSelectMany,
    onClearSelection,
    onMoveInto,
    view,
    onViewChange,
  } = props;

  const gridRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [showControls, setShowControls] = useState(false);
  // 드래그가 올라온 브레드크럼 ("__root__" = 내 폴더, 그 외 폴더 id)
  const [dropCrumb, setDropCrumb] = useState<string | null>(null);

  // 브레드크럼 크럼을 드롭 대상으로 만드는 핸들러
  function crumbDnd(key: string, folderId: string | null) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          setDropCrumb(key);
        }
      },
      onDragLeave: (e: React.DragEvent) => {
        // 자식 엘리먼트로 옮겨가는 경우는 떠난 게 아니다 (하이라이트 깜빡임 방지)
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDropCrumb((c) => (c === key ? null : c));
      },
      onDrop: (e: React.DragEvent) => {
        setDropCrumb(null);
        const ids = getDragIds(e.dataTransfer);
        if (ids.length) {
          e.preventDefault();
          onMoveInto(ids, folderId);
        }
      },
    };
  }

  const controlsActive =
    filterText.trim() !== "" || serviceFilter !== "all" || sortKey !== "manual";

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
      // 리스트 보기의 sticky 헤더에 가려진 영역은 hit-test 에서 제외 (헤더 아래로 클램프)
      const head = gridRef.current.querySelector(".list__head");
      const topLimit = head ? head.getBoundingClientRect().bottom : -Infinity;
      const hit: string[] = [];
      gridRef.current.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => {
        const b = el.getBoundingClientRect();
        const top = Math.max(b.top, topLimit);
        if (
          top < b.bottom &&
          intersects(r, { left: b.left, right: b.right, top, bottom: b.bottom })
        ) {
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
          <button
            className={`crumb ${dropCrumb === "__root__" ? "crumb--drophover" : ""}`}
            onClick={() => onNavigate(null)}
            {...crumbDnd("__root__", null)}
          >
            내 폴더
          </button>
          {!searching &&
            path.map((p) => (
              <span key={p.id} className="crumb-wrap">
                <span className="crumb-sep">›</span>
                <button
                  className={`crumb ${dropCrumb === p.id ? "crumb--drophover" : ""}`}
                  onClick={() => onNavigate(p.id)}
                  {...crumbDnd(p.id, p.id)}
                >
                  {p.name}
                </button>
              </span>
            ))}
          {searching && <span className="crumb-sep">› 검색 결과</span>}
        </nav>

        <div className="main__actions">
          <ViewMenu view={view} onChange={onViewChange} />
          {!searching && (
            <button
              className={`btn btn--toggle ${showControls ? "btn--toggle-on" : ""}`}
              onClick={() => setShowControls((v) => !v)}
              title="필터·정렬"
            >
              필터·정렬{controlsActive ? " ●" : ""} {showControls ? "▴" : "▾"}
            </button>
          )}
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

      {!searching && showControls && (
        <div className="subbar">
          <input
            className="filter"
            type="search"
            placeholder="이 폴더에서 필터"
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
          />

          <div className="svc-filter">
            <button
              className={`svc-chip ${serviceFilter === "all" ? "svc-chip--on" : ""}`}
              onClick={() => onServiceFilterChange("all")}
            >
              전체
            </button>
            {SERVICES.filter((s) => s.icon).map((s) => (
              <button
                key={s.key}
                className={`svc-chip ${serviceFilter === s.key ? "svc-chip--on" : ""}`}
                title={s.label}
                onClick={() => onServiceFilterChange(s.key)}
              >
                <img src={s.icon!} alt="" className="svc-chip__icon" />
                {s.label}
              </button>
            ))}
          </div>

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

      <div
        className={view === "list" ? "list" : "grid"}
        ref={gridRef}
        onMouseDown={onGridMouseDown}
      >
        {items.length === 0 ? (
          <div className="empty">
            {searching
              ? "검색 결과가 없습니다."
              : "비어 있습니다. 파일을 끌어다 놓거나 + 추가를 눌러보세요."}
          </div>
        ) : (
          <>
            {view === "list" && (
              <div className="list__head">
                <span className="list__head-name">이름</span>
                <span className="list__head-type">종류</span>
                <span className="list__head-date">수정한 날짜</span>
              </div>
            )}
            {items.map(({ node, subtitle }) => (
            <ItemCard
              key={node.id}
              node={node}
              view={view}
              selected={selectedIds.includes(node.id)}
              selectedIds={selectedIds}
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
            ))}
          </>
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

import type { FinderNode } from "../core/types";
import { ItemCard } from "./ItemCard";
import { AddMenu } from "./AddMenu";

export interface DisplayItem {
  node: FinderNode;
  subtitle?: string;
}

interface Props {
  path: FinderNode[];
  items: DisplayItem[];
  query: string;
  searching: boolean;
  selectedId: string | null;
  renamingId: string | null;
  onQueryChange: (q: string) => void;
  onNavigate: (folderId: string | null) => void;
  onSelect: (id: string) => void;
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
}

export function MainPanel(props: Props) {
  const {
    path,
    items,
    query,
    searching,
    selectedId,
    renamingId,
    onQueryChange,
    onNavigate,
  } = props;

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
          />
        </div>
      </header>

      <div className="grid">
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
              selected={selectedId === node.id}
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
    </section>
  );
}

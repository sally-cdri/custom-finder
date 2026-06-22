import { useEffect, useRef, useState } from "react";
import type { FinderNode } from "../core/types";
import { getChildren, countChildren } from "../core/tree";

export type SidebarView = "folders" | "todo";

interface Props {
  nodes: FinderNode[];
  currentFolderId: string | null;
  renamingId: string | null;
  onSelectFolder: (id: string | null) => void;
  onMoveInto: (id: string, folderId: string | null) => void;
  onContextMenu: (e: React.MouseEvent, node: FinderNode) => void;
  onStartRename: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCancelRename: () => void;
}

function FolderRow({
  node,
  depth,
  nodes,
  currentFolderId,
  renamingId,
  onSelectFolder,
  onMoveInto,
  onContextMenu,
  onStartRename,
  onRename,
  onCancelRename,
}: {
  node: FinderNode;
  depth: number;
} & Props) {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const renaming = renamingId === node.id;

  const childFolders = getChildren(nodes, node.id).filter(
    (n) => n.type === "folder",
  );
  const counts = countChildren(nodes, node.id);
  const countParts = [
    counts.folders ? `폴더 ${counts.folders}` : "",
    counts.items ? `파일 ${counts.items}` : "",
  ].filter(Boolean);

  useEffect(() => {
    if (renaming) {
      setDraft(node.name);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming, node.name]);

  function commit() {
    const name = draft.trim();
    if (name && name !== node.name) onRename(node.id, name);
    else onCancelRename();
  }

  return (
    <div>
      <div
        className={[
          "tree-row",
          currentFolderId === node.id ? "tree-row--active" : "",
          hover ? "tree-row--drophover" : "",
        ].join(" ")}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => !renaming && onSelectFolder(node.id)}
        onContextMenu={(e) => onContextMenu(e, node)}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-finder-node")) {
            e.preventDefault();
            setHover(true);
          }
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          setHover(false);
          const dragged = e.dataTransfer.getData("application/x-finder-node");
          if (dragged && dragged !== node.id) {
            e.preventDefault();
            onMoveInto(dragged, node.id);
          }
        }}
      >
        <span
          className={`tree-caret ${childFolders.length ? "" : "tree-caret--empty"}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          {childFolders.length ? (open ? "▾" : "▸") : ""}
        </span>
        {renaming ? (
          <input
            ref={inputRef}
            className="tree-rename"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") onCancelRename();
            }}
          />
        ) : (
          <span
            className="tree-label"
            title={node.name}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartRename(node.id);
            }}
          >
            {node.name}
          </span>
        )}
        {!renaming && countParts.length > 0 && (
          <span className="tree-count" title={countParts.join(" · ")}>
            {countParts.join(" · ")}
          </span>
        )}
      </div>
      {open &&
        childFolders.map((c) => (
          <FolderRow
            key={c.id}
            node={c}
            depth={depth + 1}
            nodes={nodes}
            currentFolderId={currentFolderId}
            renamingId={renamingId}
            onSelectFolder={onSelectFolder}
            onMoveInto={onMoveInto}
            onContextMenu={onContextMenu}
            onStartRename={onStartRename}
            onRename={onRename}
            onCancelRename={onCancelRename}
          />
        ))}
    </div>
  );
}

interface SidebarProps extends Props {
  view: SidebarView;
  onChangeView: (view: SidebarView) => void;
}

export function Sidebar(props: SidebarProps) {
  const { nodes, currentFolderId, onSelectFolder, onMoveInto, view, onChangeView } = props;
  const rootFolders = getChildren(nodes, null).filter(
    (n) => n.type === "folder",
  );
  const [rootHover, setRootHover] = useState(false);

  return (
    <nav className="sidebar">
      <div className="tabs">
        <button
          className={`tab ${view === "folders" ? "tab--active" : ""}`}
          onClick={() => onChangeView("folders")}
        >
          내 폴더
        </button>
        <button
          className={`tab ${view === "todo" ? "tab--active" : ""}`}
          onClick={() => onChangeView("todo")}
        >
          할 일
        </button>
      </div>
      {view === "todo" ? null : (
      <>
      <div
        className={[
          "tree-row tree-root",
          currentFolderId === null ? "tree-row--active" : "",
          rootHover ? "tree-row--drophover" : "",
        ].join(" ")}
        onClick={() => onSelectFolder(null)}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-finder-node")) {
            e.preventDefault();
            setRootHover(true);
          }
        }}
        onDragLeave={() => setRootHover(false)}
        onDrop={(e) => {
          setRootHover(false);
          const dragged = e.dataTransfer.getData("application/x-finder-node");
          if (dragged) {
            e.preventDefault();
            onMoveInto(dragged, null);
          }
        }}
      >
        <span className="tree-label tree-label--root">내 폴더</span>
      </div>
      {rootFolders.map((f) => (
        <FolderRow key={f.id} node={f} depth={1} {...props} />
      ))}
      </>
      )}
    </nav>
  );
}

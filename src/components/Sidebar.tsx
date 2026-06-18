import { useState } from "react";
import type { FinderNode } from "../core/types";
import { getChildren } from "../core/tree";

interface Props {
  nodes: FinderNode[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onMoveInto: (id: string, folderId: string | null) => void;
  onContextMenu: (e: React.MouseEvent, node: FinderNode) => void;
}

function FolderRow({
  node,
  depth,
  nodes,
  currentFolderId,
  onSelectFolder,
  onMoveInto,
  onContextMenu,
}: {
  node: FinderNode;
  depth: number;
} & Props) {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState(false);
  const childFolders = getChildren(nodes, node.id).filter(
    (n) => n.type === "folder",
  );

  return (
    <div>
      <div
        className={[
          "tree-row",
          currentFolderId === node.id ? "tree-row--active" : "",
          hover ? "tree-row--drophover" : "",
        ].join(" ")}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSelectFolder(node.id)}
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
        <span className="tree-label" title={node.name}>
          {node.name}
        </span>
      </div>
      {open &&
        childFolders.map((c) => (
          <FolderRow
            key={c.id}
            node={c}
            depth={depth + 1}
            nodes={nodes}
            currentFolderId={currentFolderId}
            onSelectFolder={onSelectFolder}
            onMoveInto={onMoveInto}
            onContextMenu={onContextMenu}
          />
        ))}
    </div>
  );
}

export function Sidebar(props: Props) {
  const { nodes, currentFolderId, onSelectFolder, onMoveInto } = props;
  const rootFolders = getChildren(nodes, null).filter(
    (n) => n.type === "folder",
  );
  const [rootHover, setRootHover] = useState(false);

  return (
    <nav className="sidebar">
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
    </nav>
  );
}

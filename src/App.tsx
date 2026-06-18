import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type {
  FinderNode,
  FolderNode,
  ImageNode,
  LinkNode,
  TextNode,
} from "./core/types";
import {
  addNode,
  collectSubtreeIds,
  deleteNode,
  getChildren,
  getPath,
  moveNode,
  nextOrder,
  renameNode,
  updateNode,
} from "./core/tree";
import { searchNodes } from "./core/search";
import { deriveTitle } from "./core/text";
import { loadStore, saveStore } from "./app/store";
import {
  deleteStoredFile,
  importFromPath,
  newId,
  openFile,
  openLink,
  pickFiles,
  saveBytes,
  storedAbsPath,
} from "./app/import";
import { Sidebar } from "./components/Sidebar";
import { MainPanel, type DisplayItem } from "./components/MainPanel";
import { TextEditor } from "./components/TextEditor";
import { ImageViewer } from "./components/ImageViewer";
import { LinkDialog } from "./components/LinkDialog";
import { ContextMenu, type MenuItem } from "./components/ContextMenu";
import "./App.css";

const EXT_BY_IMAGE_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
};

function looksLikeUrl(s: string): boolean {
  return /^(https?:\/\/|www\.)\S+$/i.test(s.trim());
}

export default function App() {
  const [nodes, setNodes] = useState<FinderNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingText, setEditingText] = useState<TextNode | null>(null);
  const [viewingImage, setViewingImage] = useState<ImageNode | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; node: FinderNode } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentFolderRef = useRef<string | null>(null);
  currentFolderRef.current = currentFolderId;

  // 초기 로드
  useEffect(() => {
    loadStore()
      .then(setNodes)
      .catch((e) => setNotice(String(e)))
      .finally(() => setLoaded(true));
  }, []);

  // 변경 시 디바운스 저장
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveStore(nodes).catch((e) => setNotice(`저장 실패: ${e}`));
    }, 300);
    return () => clearTimeout(t);
  }, [nodes, loaded]);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }, []);

  // ── 노드 추가 헬퍼 ──────────────────────────────────────────────
  const baseFields = useCallback(
    (parentId: string | null) => {
      const now = Date.now();
      return {
        id: newId(),
        parentId,
        order: 0, // addNode 직전에 보정
        createdAt: now,
        updatedAt: now,
      };
    },
    [],
  );

  const appendNode = useCallback((node: FinderNode) => {
    setNodes((prev) => addNode(prev, { ...node, order: nextOrder(prev, node.parentId) }));
  }, []);

  // ── 추가 동작 ──────────────────────────────────────────────────
  const handleAddFolder = useCallback(() => {
    const node: FolderNode = {
      ...baseFields(currentFolderId),
      type: "folder",
      name: "새 폴더",
    };
    appendNode(node);
    setSelectedId(node.id);
    setRenamingId(node.id);
  }, [appendNode, baseFields, currentFolderId]);

  const handleAddText = useCallback(() => {
    const node: TextNode = {
      ...baseFields(currentFolderId),
      type: "text",
      name: "",
      content: "",
    };
    appendNode(node);
    setEditingText(node);
  }, [appendNode, baseFields, currentFolderId]);

  const handleAddLink = useCallback(
    (url: string, name: string) => {
      const node: LinkNode = {
        ...baseFields(currentFolderId),
        type: "link",
        name,
        url,
      };
      appendNode(node);
    },
    [appendNode, baseFields, currentFolderId],
  );

  const handleAddFiles = useCallback(
    async (images: boolean) => {
      try {
        const paths = await pickFiles(images);
        for (const p of paths) {
          const id = newId();
          const fields = await importFromPath(p, id);
          const now = Date.now();
          appendNode({
            ...fields,
            parentId: currentFolderRef.current,
            order: 0,
            createdAt: now,
            updatedAt: now,
          } as FinderNode);
        }
      } catch (e) {
        flash(`가져오기 실패: ${e}`);
      }
    },
    [appendNode, flash],
  );

  // ── 열기 ────────────────────────────────────────────────────────
  const handleOpen = useCallback(async (node: FinderNode) => {
    switch (node.type) {
      case "folder":
        setCurrentFolderId(node.id);
        setQuery("");
        break;
      case "link":
        openLink(node.url).catch((e) => flash(`열기 실패: ${e}`));
        break;
      case "text":
        setEditingText(node);
        break;
      case "image":
        setViewingImage(node);
        break;
      case "file": {
        const abs = await storedAbsPath(node.storedName);
        openFile(abs).catch((e) => flash(`열기 실패: ${e}`));
        break;
      }
    }
  }, [flash]);

  // ── 이름변경 / 이동 / 삭제 ─────────────────────────────────────
  const handleRename = useCallback((id: string, name: string) => {
    setNodes((prev) => renameNode(prev, id, name));
    setRenamingId(null);
  }, []);

  const handleMove = useCallback((id: string, folderId: string | null) => {
    setNodes((prev) => moveNode(prev, id, folderId));
  }, []);

  const handleDelete = useCallback((node: FinderNode) => {
    setNodes((prev) => {
      const ids = collectSubtreeIds(prev, node.id);
      // 복사본 파일 삭제
      for (const n of prev) {
        if (ids.has(n.id) && (n.type === "file" || n.type === "image")) {
          deleteStoredFile(n.storedName).catch(() => {});
        }
      }
      return deleteNode(prev, node.id);
    });
    if (currentFolderRef.current && collectSubtreeIds(nodes, node.id).has(currentFolderRef.current)) {
      setCurrentFolderId(null);
    }
    setSelectedId(null);
  }, [nodes]);

  const handleSaveText = useCallback(
    (id: string, name: string, content: string) => {
      // 제목을 비우면 아이폰 메모처럼 첫 줄에서 자동 추출
      const title = name.trim() || deriveTitle(content);
      setNodes((prev) => updateNode(prev, id, { name: title, content }));
    },
    [],
  );

  // ── 컨텍스트 메뉴 ──────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, node: FinderNode) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(node.id);
    setCtx({ x: e.clientX, y: e.clientY, node });
  }, []);

  const ctxItems: MenuItem[] = ctx
    ? [
        { label: "열기", onClick: () => handleOpen(ctx.node) },
        { label: "이름 변경", onClick: () => setRenamingId(ctx.node.id) },
        { label: "삭제", danger: true, onClick: () => handleDelete(ctx.node) },
      ]
    : [];

  // ── OS 파일 드래그&드롭 ────────────────────────────────────────
  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent(async (event) => {
      if (event.payload.type !== "drop") return;
      const paths = event.payload.paths ?? [];
      for (const p of paths) {
        try {
          const id = newId();
          const fields = await importFromPath(p, id);
          const now = Date.now();
          setNodes((prev) =>
            addNode(prev, {
              ...fields,
              parentId: currentFolderRef.current,
              order: nextOrder(prev, currentFolderRef.current),
              createdAt: now,
              updatedAt: now,
            } as FinderNode),
          );
        } catch (e) {
          flash(`가져오기 실패: ${e}`);
        }
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [flash]);

  // ── 클립보드 붙여넣기 ──────────────────────────────────────────
  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return; // 편집 중엔 기본 동작
      const data = e.clipboardData;
      if (!data) return;
      const parentId = currentFolderRef.current;
      const now = Date.now();

      // 이미지 우선
      for (const item of Array.from(data.items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          const buf = new Uint8Array(await file.arrayBuffer());
          const ext = EXT_BY_IMAGE_MIME[item.type] ?? "png";
          const id = newId();
          const storedName = await saveBytes(buf, id, ext);
          setNodes((prev) =>
            addNode(prev, {
              id,
              type: "image",
              name: `붙여넣은 이미지.${ext}`,
              parentId,
              order: nextOrder(prev, parentId),
              createdAt: now,
              updatedAt: now,
              storedName,
              originalName: `clipboard.${ext}`,
              mime: item.type,
            } as ImageNode),
          );
          return;
        }
      }

      // 텍스트 / URL
      const text = data.getData("text/plain").trim();
      if (text) {
        e.preventDefault();
        const id = newId();
        if (looksLikeUrl(text)) {
          const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
          setNodes((prev) =>
            addNode(prev, {
              id,
              type: "link",
              name: text,
              parentId,
              order: nextOrder(prev, parentId),
              createdAt: now,
              updatedAt: now,
              url,
            } as LinkNode),
          );
        } else {
          setNodes((prev) =>
            addNode(prev, {
              id,
              type: "text",
              name: text.slice(0, 20) || "메모",
              parentId,
              order: nextOrder(prev, parentId),
              createdAt: now,
              updatedAt: now,
              content: text,
            } as TextNode),
          );
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  // ── Delete 키 삭제 ─────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
        const node = nodes.find((n) => n.id === selectedId);
        if (node) {
          e.preventDefault();
          handleDelete(node);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, nodes, handleDelete]);

  // ── 표시 항목 계산 ─────────────────────────────────────────────
  const searching = query.trim().length > 0;
  let items: DisplayItem[];
  if (searching) {
    items = searchNodes(nodes, query).map((node) => ({
      node,
      subtitle:
        getPath(nodes, node.id)
          .slice(0, -1)
          .map((p) => p.name)
          .join(" / ") || "내 폴더",
    }));
  } else {
    items = getChildren(nodes, currentFolderId).map((node) => ({ node }));
  }

  const path = currentFolderId ? getPath(nodes, currentFolderId) : [];

  return (
    <div className="app" onClick={() => setSelectedId(null)}>
      <Sidebar
        nodes={nodes}
        currentFolderId={currentFolderId}
        onSelectFolder={(id) => {
          setCurrentFolderId(id);
          setQuery("");
        }}
        onMoveInto={handleMove}
        onContextMenu={handleContextMenu}
      />
      <div onClick={(e) => e.stopPropagation()} className="main-wrap">
        <MainPanel
          path={path}
          items={items}
          query={query}
          searching={searching}
          selectedId={selectedId}
          renamingId={renamingId}
          onQueryChange={setQuery}
          onNavigate={(id) => {
            setCurrentFolderId(id);
            setQuery("");
          }}
          onSelect={setSelectedId}
          onOpen={handleOpen}
          onStartRename={setRenamingId}
          onRename={handleRename}
          onCancelRename={() => setRenamingId(null)}
          onContextMenu={handleContextMenu}
          onMoveInto={handleMove}
          onAddFolder={handleAddFolder}
          onAddLink={() => setLinkOpen(true)}
          onAddText={handleAddText}
          onAddFiles={() => handleAddFiles(false)}
          onAddImages={() => handleAddFiles(true)}
        />
      </div>

      {editingText && (
        <TextEditor
          node={editingText}
          onSave={handleSaveText}
          onClose={() => setEditingText(null)}
        />
      )}
      {viewingImage && (
        <ImageViewer node={viewingImage} onClose={() => setViewingImage(null)} />
      )}
      {linkOpen && (
        <LinkDialog onSubmit={handleAddLink} onClose={() => setLinkOpen(false)} />
      )}
      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          items={ctxItems}
          onClose={() => setCtx(null)}
        />
      )}
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

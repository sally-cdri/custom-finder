import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import type {
  FinderNode,
  FolderNode,
  ImageNode,
  LinkNode,
  LinkService,
  TextNode,
} from "./core/types";
import {
  addNode,
  collectSubtreeIds,
  deleteNode,
  getChildren,
  getPath,
  moveNode,
  moveMany,
  nextOrder,
  renameNode,
  updateNode,
} from "./core/tree";
import { searchNodes } from "./core/search";
import { deriveTitle, htmlToPlainText } from "./core/text";
import { isEditingTarget } from "./core/dom";
import { detectService } from "./core/links";
import { prepareImport } from "./core/bundle";
import {
  sortNodes,
  filterByName,
  filterByService,
  type SortKey,
  type SortDir,
} from "./core/sort";
import type { ViewMode } from "./core/view";
import {
  type CalendarEvent,
  type NewEvent,
  addEvent,
  updateEvent,
  deleteEvent,
} from "./core/event";
import { loadEvents, saveEvents } from "./app/eventStore";
import { loadStore, saveStore } from "./app/store";
import { loadTodos, saveTodos } from "./app/todoStore";
import { emitTodosChanged, onTodosChanged } from "./app/todoSync";
import { toggleMiniWindow } from "./app/miniWindow";
import type { TodoItem } from "./core/todo";
import { addTodo, toggleTodo, updateTodo, deleteTodo } from "./core/todo";
import {
  copyText,
  deleteStoredFile,
  exportBundle,
  importBundle,
  importFromPath,
  newId,
  openFile,
  openLink,
  pickBundle,
  pickFiles,
  pickSavePath,
  saveBytes,
  storedAbsPath,
} from "./app/import";
import { Sidebar, type SidebarView } from "./components/Sidebar";
import { MainPanel, type DisplayItem } from "./components/MainPanel";
import { TodoPanel } from "./components/TodoPanel";
import { CalendarPanel } from "./components/CalendarPanel";
import { TextEditor } from "./components/TextEditor";
import { ImageViewer } from "./components/ImageViewer";
import { LinkDialog } from "./components/LinkDialog";
import { ContextMenu, type MenuItem } from "./components/ContextMenu";
import { MoveDialog } from "./components/MoveDialog";
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
  const [view, setView] = useState<SidebarView>("folders");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todosLoaded, setTodosLoaded] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [focusedTodoId, setFocusedTodoId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // 이름 변경 대상 + 어디서(사이드바/메인) 시작했는지 — 같은 폴더가 양쪽에 떠도 한 곳만 편집
  const [rename, setRename] = useState<{ id: string; where: "sidebar" | "main" } | null>(null);
  const sidebarRenamingId = rename?.where === "sidebar" ? rename.id : null;
  const mainRenamingId = rename?.where === "main" ? rename.id : null;
  const [query, setQuery] = useState("");
  const [filterText, setFilterText] = useState("");
  const [serviceFilter, setServiceFilter] = useState<LinkService | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("manual");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    localStorage.getItem("cf.view") === "list" ? "list" : "card",
  );
  const [editingText, setEditingText] = useState<TextNode | null>(null);
  const [viewingImage, setViewingImage] = useState<ImageNode | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  // 이동 위치 선택 모달: 이동할 노드 id 목록 (null = 닫힘)
  const [moveTargets, setMoveTargets] = useState<string[] | null>(null);
  const [ctx, setCtx] = useState<{
    x: number;
    y: number;
    node: FinderNode;
    where: "sidebar" | "main";
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 미니 창에서 들어온 할 일 변경인지 표시 — true면 저장만 하고 다시 emit 안 함
  const todosExternalRef = useRef(false);

  const currentFolderRef = useRef<string | null>(null);
  currentFolderRef.current = currentFolderId;

  // 다중 선택용: 범위 선택 기준점 + 현재 표시 중인 항목 순서
  const anchorRef = useRef<string | null>(null);
  const displayedIdsRef = useRef<string[]>([]);

  // 선택 헬퍼
  const selectSingle = useCallback((id: string) => {
    anchorRef.current = id;
    setSelectedIds([id]);
  }, []);

  // 이름 변경을 항상 false→true 전환으로 (재)트리거해 입력창 포커스를 보장한다
  const startRename = useCallback(
    (id: string, where: "sidebar" | "main") => {
      setRename(null);
      setTimeout(() => setRename({ id, where }), 0);
    },
    [],
  );

  const clearSelection = useCallback(() => {
    anchorRef.current = null;
    setSelectedIds([]);
  }, []);

  /** 클릭 선택: range(shift) = 기준점부터 범위, additive(⌘) = 토글, 그 외 단일 */
  const handleSelect = useCallback(
    (id: string, additive: boolean, range: boolean) => {
      if (range && anchorRef.current) {
        const ids = displayedIdsRef.current;
        const a = ids.indexOf(anchorRef.current);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          setSelectedIds(ids.slice(lo, hi + 1));
          return;
        }
      }
      if (additive) {
        anchorRef.current = id;
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
        return;
      }
      selectSingle(id);
    },
    [selectSingle],
  );

  /** 러버밴드(마우스 드래그) 선택 결과 적용 */
  const handleSelectMany = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

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

  // 할 일 초기 로드
  useEffect(() => {
    loadTodos()
      .then(setTodos)
      .catch((e) => setNotice(String(e)))
      .finally(() => setTodosLoaded(true));
  }, []);

  // 캘린더 이벤트 초기 로드
  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch((e) => setNotice(String(e)))
      .finally(() => setEventsLoaded(true));
  }, []);

  // 이벤트 변경 시 디바운스 저장
  useEffect(() => {
    if (!eventsLoaded) return;
    const t = setTimeout(() => {
      saveEvents(events).catch((e) => setNotice(`저장 실패: ${e}`));
    }, 300);
    return () => clearTimeout(t);
  }, [events, eventsLoaded]);

  // 다른 창(미니)의 할 일 변경 수신
  useEffect(() => {
    const un = onTodosChanged("main", (next) => {
      todosExternalRef.current = true;
      setTodos(next);
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  // 할 일 변경 시 디바운스 저장 (+ 로컬 변경이면 다른 창에 알림)
  useEffect(() => {
    if (!todosLoaded) return;
    const wasExternal = todosExternalRef.current;
    todosExternalRef.current = false;
    const t = setTimeout(() => {
      saveTodos(todos).catch((e) => setNotice(`저장 실패: ${e}`));
      if (!wasExternal) emitTodosChanged(todos, "main");
    }, 300);
    return () => clearTimeout(t);
  }, [todos, todosLoaded]);

  const handleViewChange = useCallback((v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem("cf.view", v);
  }, []);

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
    selectSingle(node.id);
    startRename(node.id, "main");
  }, [appendNode, baseFields, currentFolderId, selectSingle, startRename]);

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
    (url: string, name: string, service: LinkService) => {
      const node: LinkNode = {
        ...baseFields(currentFolderId),
        type: "link",
        name,
        url,
        service,
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
        setFilterText("");
        setServiceFilter("all");
        break;
      case "link":
        openLink(node.url).catch((e) => flash(`열기 실패: ${e}`));
        // 링크는 외부 브라우저로 열리므로 선택을 남기지 않는다
        clearSelection();
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
  }, [flash, clearSelection]);

  // ── 이름변경 / 이동 / 삭제 ─────────────────────────────────────
  const handleRename = useCallback((id: string, name: string) => {
    setNodes((prev) => renameNode(prev, id, name));
    setRename(null);
  }, []);

  const handleMoveMany = useCallback(
    (ids: string[], folderId: string | null) => {
      if (ids.length === 0) return;
      setNodes((prev) => moveMany(prev, ids, folderId));
    },
    [],
  );

  /** 각 노드를 자신의 부모(상위 폴더)로 꺼낸다. */
  const handleMoveToParent = useCallback(
    (ids: string[]) => {
      setNodes((prev) => {
        let next = prev;
        for (const id of ids) {
          const node = next.find((n) => n.id === id);
          if (node && node.parentId !== null) {
            const parent = next.find((n) => n.id === node.parentId);
            next = moveNode(next, id, parent ? parent.parentId : null);
          }
        }
        return next;
      });
    },
    [],
  );

  /** 주어진 노드 id 목록(과 각 하위 전체)을 삭제한다. */
  const deleteIds = useCallback((targetIds: string[]) => {
    if (targetIds.length === 0) return;
    setNodes((prev) => {
      let next = prev;
      for (const id of targetIds) {
        const ids = collectSubtreeIds(next, id);
        // 현재 폴더가 삭제 범위에 들어가면 최상위로
        if (
          currentFolderRef.current &&
          ids.has(currentFolderRef.current)
        ) {
          setCurrentFolderId(null);
        }
        for (const n of next) {
          if (ids.has(n.id) && (n.type === "file" || n.type === "image")) {
            deleteStoredFile(n.storedName).catch(() => {});
          }
        }
        next = deleteNode(next, id);
      }
      return next;
    });
    clearSelection();
  }, [clearSelection]);

  /** 컨텍스트 메뉴/키보드 삭제: 선택된 항목이 있으면 선택 전체, 없으면 해당 노드 */
  const handleDelete = useCallback(
    (node: FinderNode) => {
      const targets = selectedIds.includes(node.id) ? selectedIds : [node.id];
      deleteIds(targets);
    },
    [selectedIds, deleteIds],
  );

  /** 번들 내보내기: 대상(선택 전체 또는 해당 노드)과 하위를 .zip 으로 */
  const handleExport = useCallback(
    async (node: FinderNode) => {
      const roots = selectedIds.includes(node.id) ? selectedIds : [node.id];
      const subtree = new Set<string>();
      for (const id of roots) {
        for (const sid of collectSubtreeIds(nodes, id)) subtree.add(sid);
      }
      const payload = nodes.filter((n) => subtree.has(n.id));
      const defaultName =
        roots.length === 1 ? `${node.name}.zip` : `SallyFinder-${roots.length}개.zip`;
      try {
        const dest = await pickSavePath(defaultName);
        if (!dest) return;
        await exportBundle(payload, dest);
        flash("내보내기 완료");
      } catch (e) {
        flash(`내보내기 실패: ${e}`);
      }
    },
    [nodes, selectedIds, flash],
  );

  /** 번들 가져오기: .zip 을 현재 폴더 아래로 복원 */
  const handleImport = useCallback(async () => {
    try {
      const src = await pickBundle();
      if (!src) return;
      const { nodes: bundleNodes, rename } = await importBundle(src);
      const target = currentFolderRef.current;
      const prepared = prepareImport(bundleNodes, rename, target, Date.now(), newId);
      setNodes((prev) => {
        // 루트로 들어오는 노드들의 order 를 현재 폴더 끝에 이어 붙인다
        let base = nextOrder(prev, target);
        const fixed = prepared.map((n) =>
          n.parentId === target ? { ...n, order: base++ } : n,
        );
        return [...prev, ...fixed];
      });
      flash("가져오기 완료");
    } catch (e) {
      flash(`가져오기 실패: ${e}`);
    }
  }, [flash]);

  const handleSaveText = useCallback(
    (id: string, name: string, content: string) => {
      // 제목을 비우면 아이폰 메모처럼 첫 줄에서 자동 추출 (HTML이면 텍스트로 변환 후)
      const title = name.trim() || deriveTitle(htmlToPlainText(content));
      setNodes((prev) => updateNode(prev, id, { name: title, content }));
    },
    [],
  );

  // ── 할 일 ──────────────────────────────────────────────────────
  const handleAddTodo = useCallback((title: string) => {
    setTodos((prev) => addTodo(prev, { title }, Date.now(), newId));
  }, []);

  const handleToggleTodo = useCallback((id: string) => {
    setTodos((prev) => toggleTodo(prev, id, Date.now()));
  }, []);

  const handleUpdateTodo = useCallback(
    (id: string, patch: Partial<Pick<TodoItem, "title" | "note" | "dueAt">>) => {
      setTodos((prev) => updateTodo(prev, id, patch, Date.now()));
    },
    [],
  );

  const handleDeleteTodo = useCallback((id: string) => {
    setTodos((prev) => deleteTodo(prev, id));
  }, []);

  // ── 캘린더 이벤트 ──────────────────────────────────────────────
  const handleAddEvent = useCallback((input: NewEvent) => {
    setEvents((prev) => addEvent(prev, input, Date.now(), newId));
  }, []);

  const handleUpdateEvent = useCallback(
    (
      id: string,
      patch: Partial<Pick<CalendarEvent, "title" | "note" | "date" | "label">>,
    ) => {
      setEvents((prev) => updateEvent(prev, id, patch, Date.now()));
    },
    [],
  );

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents((prev) => deleteEvent(prev, id));
  }, []);

  /** 링크 URL 을 클립보드로 복사 */
  const handleCopyLink = useCallback(
    (node: FinderNode) => {
      if (node.type !== "link") return;
      copyText(node.url)
        .then(() => flash("링크 복사됨"))
        .catch(() => flash("복사 실패"));
    },
    [flash],
  );

  // ── 컨텍스트 메뉴 ──────────────────────────────────────────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: FinderNode, where: "sidebar" | "main") => {
      e.preventDefault();
      e.stopPropagation();
      // 우클릭한 항목이 선택에 없으면 그 항목만 선택 (선택 유지 시 그대로)
      setSelectedIds((prev) => (prev.includes(node.id) ? prev : [node.id]));
      anchorRef.current = node.id;
      setCtx({ x: e.clientX, y: e.clientY, node, where });
    },
    [],
  );

  const multi = ctx ? selectedIds.length > 1 && selectedIds.includes(ctx.node.id) : false;
  const ctxItems: MenuItem[] = ctx
    ? multi
      ? [
          {
            label: `이동 위치 선택… (${selectedIds.length}개)`,
            onClick: () => setMoveTargets(selectedIds),
          },
          {
            label: `내보내기… (${selectedIds.length}개)`,
            onClick: () => handleExport(ctx.node),
          },
          {
            label: `삭제 (${selectedIds.length}개)`,
            danger: true,
            onClick: () => handleDelete(ctx.node),
          },
        ]
      : [
          { label: "열기", onClick: () => handleOpen(ctx.node) },
          ...(ctx.node.type === "link"
            ? [{ label: "링크 복사", onClick: () => handleCopyLink(ctx.node) }]
            : []),
          { label: "이름 변경", onClick: () => startRename(ctx.node.id, ctx.where) },
          { label: "이동 위치 선택…", onClick: () => setMoveTargets([ctx.node.id]) },
          ...(ctx.node.parentId !== null
            ? [
                {
                  label: "상위로 꺼내기",
                  onClick: () => handleMoveToParent([ctx.node.id]),
                },
              ]
            : []),
          { label: "내보내기…", onClick: () => handleExport(ctx.node) },
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
      // 편집 중(input/textarea/리치 에디터의 contentEditable)이면 기본 동작에 맡긴다
      if (isEditingTarget(document.activeElement as HTMLElement | null)) return;
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
              service: detectService(url),
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
      // 편집 중(input/textarea/리치 에디터의 contentEditable)이면 카드 삭제 단축키를 무시
      if (isEditingTarget(document.activeElement as HTMLElement | null)) return;
      if ((e.key === "Backspace" || e.key === "Delete") && selectedIds.length) {
        e.preventDefault();
        deleteIds(selectedIds);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedIds, deleteIds]);

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
    let children = filterByName(getChildren(nodes, currentFolderId), filterText);
    children = filterByService(children, serviceFilter);
    items = sortNodes(children, sortKey, sortDir).map((node) => ({ node }));
  }

  const path = currentFolderId ? getPath(nodes, currentFolderId) : [];
  displayedIdsRef.current = items.map((i) => i.node.id);

  return (
    <div className="app" onClick={clearSelection}>
      <Sidebar
        nodes={nodes}
        currentFolderId={currentFolderId}
        renamingId={sidebarRenamingId}
        view={view}
        onChangeView={setView}
        todos={todos}
        onToggleTodo={handleToggleTodo}
        onSelectTodo={setFocusedTodoId}
        onSelectFolder={(id) => {
          setCurrentFolderId(id);
          setQuery("");
          setFilterText("");
          setServiceFilter("all");
        }}
        onMoveInto={handleMoveMany}
        onContextMenu={(e, node) => handleContextMenu(e, node, "sidebar")}
        onStartRename={(id) => startRename(id, "sidebar")}
        onRename={handleRename}
        onCancelRename={() => setRename(null)}
      />
      <div onClick={(e) => e.stopPropagation()} className="main-wrap">
        {view === "calendar" ? (
          <CalendarPanel
            events={events}
            todos={todos}
            onAdd={handleAddEvent}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEvent}
          />
        ) : view === "todo" ? (
          <TodoPanel
            todos={todos}
            focusedId={focusedTodoId}
            onToggleMini={toggleMiniWindow}
            onAdd={handleAddTodo}
            onToggle={handleToggleTodo}
            onUpdate={handleUpdateTodo}
            onDelete={handleDeleteTodo}
          />
        ) : (
        <MainPanel
          path={path}
          items={items}
          query={query}
          searching={searching}
          selectedIds={selectedIds}
          renamingId={mainRenamingId}
          filterText={filterText}
          serviceFilter={serviceFilter}
          sortKey={sortKey}
          sortDir={sortDir}
          view={viewMode}
          onViewChange={handleViewChange}
          onServiceFilterChange={setServiceFilter}
          onFilterChange={setFilterText}
          onSortKeyChange={setSortKey}
          onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          onQueryChange={setQuery}
          onNavigate={(id) => {
            setCurrentFolderId(id);
            setQuery("");
            setFilterText("");
            setServiceFilter("all");
          }}
          onSelect={handleSelect}
          onSelectMany={handleSelectMany}
          onClearSelection={clearSelection}
          onOpen={handleOpen}
          onStartRename={(id) => startRename(id, "main")}
          onRename={handleRename}
          onCancelRename={() => setRename(null)}
          onContextMenu={(e, node) => handleContextMenu(e, node, "main")}
          onMoveInto={handleMoveMany}
          onAddFolder={handleAddFolder}
          onAddLink={() => setLinkOpen(true)}
          onAddText={handleAddText}
          onAddFiles={() => handleAddFiles(false)}
          onAddImages={() => handleAddFiles(true)}
          onImport={handleImport}
        />
        )}
      </div>

      {editingText && (
        <TextEditor
          key={editingText.id}
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
      {moveTargets && (
        <MoveDialog
          nodes={nodes}
          movingIds={moveTargets}
          onMove={(folderId) => handleMoveMany(moveTargets, folderId)}
          onClose={() => setMoveTargets(null)}
        />
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

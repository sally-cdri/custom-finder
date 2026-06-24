/** 노드 드래그&드롭에 쓰는 dataTransfer 키와 직렬화 헬퍼. */
export const DRAG_MIME = "application/x-finder-node";

/** 드래그 시작 시 이동할 노드 id 들을 dataTransfer 에 싣는다. */
export function setDragIds(dt: DataTransfer, ids: string[]): void {
  dt.setData(DRAG_MIME, JSON.stringify(ids));
  dt.effectAllowed = "move";
}

/** 드롭 시 노드 id 배열을 읽는다. 형식이 깨졌으면 빈 배열. */
export function getDragIds(dt: DataTransfer): string[] {
  const raw = dt.getData(DRAG_MIME);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
  } catch {
    // 알 수 없는 형식 → 무시
  }
  return [];
}

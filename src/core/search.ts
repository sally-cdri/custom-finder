import type { FinderNode } from "./types";
import { htmlToPlainText } from "./text";

/** 노드 하나에서 검색 대상이 되는 텍스트들을 모은다. */
function haystack(node: FinderNode): string {
  const parts = [node.name];
  if (node.type === "link") parts.push(node.url);
  if (node.type === "text") parts.push(htmlToPlainText(node.content));
  if (node.type === "file" || node.type === "image") parts.push(node.originalName);
  return parts.join(" ").toLowerCase();
}

/**
 * 전체 노드에서 이름·메모 본문·링크 url 을 대소문자 무시로 매칭한다.
 * 공백뿐이거나 빈 질의는 빈 배열을 반환한다.
 */
export function searchNodes(nodes: FinderNode[], query: string): FinderNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return nodes.filter((n) => haystack(n).includes(q));
}

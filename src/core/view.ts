import type { NodeType } from "./types";

export type ViewMode = "card" | "list";

const TYPE_LABEL: Record<NodeType, string> = {
  folder: "폴더",
  link: "링크",
  file: "파일",
  image: "이미지",
  text: "텍스트",
};

/** 노드 타입의 한글 라벨. */
export function typeLabel(type: NodeType): string {
  return TYPE_LABEL[type] ?? "파일";
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 수정한 날짜 표기. 올해면 MM-DD, 다른 해면 YYYY-MM-DD. */
export function formatShortDate(ts: number, now: number = Date.now()): string {
  const d = new Date(ts);
  const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return d.getFullYear() === new Date(now).getFullYear()
    ? md
    : `${d.getFullYear()}-${md}`;
}

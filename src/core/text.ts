/** 메모 본문의 첫 비어있지 않은 줄을 제목으로 쓴다 (아이폰 메모 방식). */
export function deriveTitle(content: string): string {
  const firstLine = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return "새 메모";
  return firstLine.length > 60 ? firstLine.slice(0, 60) : firstLine;
}

/** 카드 미리보기에 쓸 본문(제목 줄 제외 나머지). 없으면 빈 문자열. */
export function previewBody(content: string): string {
  const lines = content.split("\n");
  // 첫 비어있지 않은 줄(제목) 이후의 텍스트
  let started = false;
  const rest: string[] = [];
  for (const line of lines) {
    if (!started) {
      if (line.trim().length > 0) started = true;
      continue;
    }
    rest.push(line);
  }
  return rest.join("\n").trim();
}

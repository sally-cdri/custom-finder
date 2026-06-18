/** 메모 본문의 첫 비어있지 않은 줄을 제목으로 쓴다 (아이폰 메모 방식). */
export function deriveTitle(content: string): string {
  const firstLine = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return "새 메모";
  return firstLine.length > 60 ? firstLine.slice(0, 60) : firstLine;
}

/**
 * 이름이 max 자보다 길면 가운데를 …로 줄인다 (확장자는 보존).
 * 예) "AAA…DDD.png"
 */
export function middleEllipsis(name: string, max = 24): string {
  if (name.length <= max) return name;

  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const base = dot > 0 ? name.slice(0, dot) : name;
  const keep = max - ext.length - 1; // …(1자) + 확장자 제외하고 남길 길이

  if (keep < 4) {
    // 확장자가 너무 길면 전체 기준으로 단순 가운데 생략
    const head = Math.ceil((max - 1) / 2);
    const tail = Math.floor((max - 1) / 2);
    return name.slice(0, head) + "…" + name.slice(name.length - tail);
  }

  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return base.slice(0, head) + "…" + base.slice(base.length - tail) + ext;
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

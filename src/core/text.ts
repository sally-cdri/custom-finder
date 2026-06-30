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

/** 문자열이 HTML 태그를 포함하는지 (느슨한 판별). */
function looksLikeHtml(s: string): boolean {
  return /<[a-z][^>]*>/i.test(s);
}

/**
 * HTML 본문에서 검색·제목·미리보기에 쓸 plain text를 뽑는다.
 * 태그가 없는 legacy plain text는 그대로 통과시킨다.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (!looksLikeHtml(html)) return html;
  let s = html;
  // 블록 닫는 태그와 <br>을 줄바꿈으로
  s = s.replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  // 나머지 태그 제거
  s = s.replace(/<[^>]+>/g, "");
  // 자주 쓰는 엔티티 디코드
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  // 과한 빈 줄 정리
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** plain text를 줄바꿈 보존하며 에디터용 HTML로 변환한다. */
function plainTextToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<p>${escaped}</p>`;
    })
    .join("");
}

/** 에디터 초기 콘텐츠. 이미 HTML이면 그대로, plain text면 HTML로 변환. */
export function toEditorHtml(content: string): string {
  if (!content) return "";
  return looksLikeHtml(content) ? content : plainTextToHtml(content);
}

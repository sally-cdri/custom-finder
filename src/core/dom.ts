/**
 * 활성 요소가 텍스트 편집 중인지 판단한다.
 * 전역 붙여넣기·단축키 핸들러가 편집 중에 끼어들지 않도록 쓰인다.
 * input/textarea뿐 아니라 contentEditable(예: 리치 텍스트 에디터)도 편집 대상으로 본다.
 */
export function isEditingTarget(
  el: { tagName: string; isContentEditable: boolean } | null,
): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  return el.isContentEditable === true;
}

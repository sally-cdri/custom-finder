import { describe, it, expect } from "vitest";
import { deriveTitle, previewBody, middleEllipsis } from "./text";

describe("middleEllipsis", () => {
  it("짧으면 그대로", () => {
    expect(middleEllipsis("short.png", 24)).toBe("short.png");
  });
  it("길면 가운데를 줄이고 확장자 보존", () => {
    const r = middleEllipsis("A".repeat(40) + ".png", 24);
    expect(r).toContain("…");
    expect(r.endsWith(".png")).toBe(true);
    expect(r.length).toBeLessThanOrEqual(24);
  });
  it("확장자 없는 긴 이름도 가운데 생략", () => {
    const r = middleEllipsis("B".repeat(40), 21);
    expect(r).toContain("…");
    expect(r.length).toBeLessThanOrEqual(21);
  });
});

describe("deriveTitle", () => {
  it("첫 줄을 제목으로", () => {
    expect(deriveTitle("장보기 목록\n우유\n계란")).toBe("장보기 목록");
  });
  it("앞쪽 빈 줄은 건너뛴다", () => {
    expect(deriveTitle("\n\n  진짜 제목  \n내용")).toBe("진짜 제목");
  });
  it("비어있으면 기본값", () => {
    expect(deriveTitle("")).toBe("새 메모");
    expect(deriveTitle("   \n  ")).toBe("새 메모");
  });
  it("아주 긴 줄은 잘라낸다", () => {
    expect(deriveTitle("a".repeat(100)).length).toBe(60);
  });
});

describe("previewBody", () => {
  it("제목 줄 이후 텍스트", () => {
    expect(previewBody("제목\n첫 줄\n둘째 줄")).toBe("첫 줄\n둘째 줄");
  });
  it("제목만 있으면 빈 문자열", () => {
    expect(previewBody("제목만")).toBe("");
  });
  it("앞 빈 줄 무시 후 본문", () => {
    expect(previewBody("\n제목\n본문")).toBe("본문");
  });
});

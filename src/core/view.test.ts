import { describe, it, expect } from "vitest";
import { typeLabel, formatShortDate } from "./view";

describe("typeLabel", () => {
  it("타입별 한글 라벨", () => {
    expect(typeLabel("folder")).toBe("폴더");
    expect(typeLabel("link")).toBe("링크");
    expect(typeLabel("file")).toBe("파일");
    expect(typeLabel("image")).toBe("이미지");
    expect(typeLabel("text")).toBe("텍스트");
  });
});

describe("formatShortDate", () => {
  const now = new Date(2026, 5, 24).getTime(); // 2026-06-24

  it("같은 해면 MM-DD", () => {
    const ts = new Date(2026, 0, 5).getTime(); // 2026-01-05
    expect(formatShortDate(ts, now)).toBe("01-05");
  });

  it("다른 해면 YYYY-MM-DD", () => {
    const ts = new Date(2025, 11, 31).getTime(); // 2025-12-31
    expect(formatShortDate(ts, now)).toBe("2025-12-31");
  });
});

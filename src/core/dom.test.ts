import { describe, it, expect } from "vitest";
import { isEditingTarget } from "./dom";

describe("isEditingTarget", () => {
  it("input은 편집 대상", () => {
    expect(isEditingTarget({ tagName: "INPUT", isContentEditable: false })).toBe(true);
  });
  it("textarea는 편집 대상", () => {
    expect(isEditingTarget({ tagName: "TEXTAREA", isContentEditable: false })).toBe(true);
  });
  it("contentEditable div(리치 텍스트 에디터)는 편집 대상", () => {
    expect(isEditingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });
  it("일반 div는 편집 대상 아님", () => {
    expect(isEditingTarget({ tagName: "DIV", isContentEditable: false })).toBe(false);
  });
  it("null은 편집 대상 아님", () => {
    expect(isEditingTarget(null)).toBe(false);
  });
});

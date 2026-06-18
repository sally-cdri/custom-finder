import { describe, it, expect } from "vitest";
import type { FinderNode } from "./types";
import { searchNodes } from "./search";

const nodes: FinderNode[] = [
  { id: "f", type: "folder", name: "여행 사진", parentId: null, order: 0, createdAt: 0, updatedAt: 0 },
  { id: "l", type: "link", name: "블로그", parentId: "f", order: 0, createdAt: 0, updatedAt: 0, url: "https://travel.example.com" },
  { id: "t", type: "text", name: "메모", parentId: "f", order: 1, createdAt: 0, updatedAt: 0, content: "제주도 여행 계획" },
  { id: "i", type: "image", name: "노을.jpg", parentId: null, order: 1, createdAt: 0, updatedAt: 0, storedName: "i.jpg", originalName: "sunset.jpg", mime: "image/jpeg" },
];

describe("searchNodes", () => {
  it("이름·본문에서 매칭", () => {
    // "여행"은 폴더명("여행 사진")과 메모 본문("제주도 여행 계획") 모두에 있다
    expect(searchNodes(nodes, "여행").map((n) => n.id).sort()).toEqual(["f", "t"]);
  });

  it("이름만 매칭", () => {
    expect(searchNodes(nodes, "사진").map((n) => n.id)).toEqual(["f"]);
  });

  it("텍스트 메모 본문으로 매칭", () => {
    expect(searchNodes(nodes, "제주").map((n) => n.id)).toEqual(["t"]);
  });

  it("링크 url 로 매칭", () => {
    expect(searchNodes(nodes, "travel.example").map((n) => n.id)).toEqual(["l"]);
  });

  it("공백/빈 질의는 빈 배열", () => {
    expect(searchNodes(nodes, "   ")).toEqual([]);
    expect(searchNodes(nodes, "")).toEqual([]);
  });

  it("매칭 없으면 빈 배열", () => {
    expect(searchNodes(nodes, "zzz")).toEqual([]);
  });

  it("대소문자 무시 매칭", () => {
    expect(searchNodes(nodes, "TRAVEL").map((n) => n.id)).toEqual(["l"]);
  });
});

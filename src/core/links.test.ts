import { describe, it, expect } from "vitest";
import { detectService } from "./links";

describe("detectService", () => {
  it("notion", () => {
    expect(detectService("https://www.notion.so/abc")).toBe("notion");
    expect(detectService("https://team.notion.site/x")).toBe("notion");
  });
  it("slack", () => {
    expect(detectService("https://myteam.slack.com/archives/C1")).toBe("slack");
  });
  it("jira", () => {
    expect(detectService("https://cdri.atlassian.net/browse/ABC-1")).toBe("jira");
    expect(detectService("https://jira.example.com/x")).toBe("jira");
  });
  it("figma", () => {
    expect(detectService("https://www.figma.com/file/xyz")).toBe("figma");
  });
  it("github", () => {
    expect(detectService("https://github.com/sally-cdri/custom-finder")).toBe("github");
  });
  it("기타는 other", () => {
    expect(detectService("https://google.com")).toBe("other");
    expect(detectService("")).toBe("other");
  });
});

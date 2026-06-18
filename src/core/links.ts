import type { LinkService } from "./types";

/** URL 로부터 서비스 종류를 추정한다. 모르면 "other". */
export function detectService(url: string): LinkService {
  const u = url.toLowerCase();
  if (u.includes("notion.so") || u.includes("notion.site")) return "notion";
  if (u.includes("slack.com")) return "slack";
  if (u.includes("atlassian.net") || u.includes("jira")) return "jira";
  if (u.includes("figma.com")) return "figma";
  return "other";
}

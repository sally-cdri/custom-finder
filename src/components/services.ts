import type { LinkService } from "../core/types";
import notionIcon from "../assets/services/notion.svg";
import slackIcon from "../assets/services/slack.svg";
import jiraIcon from "../assets/services/jira.svg";
import figmaIcon from "../assets/services/figma.svg";
import githubIcon from "../assets/services/github.svg";

export interface ServiceDef {
  key: LinkService;
  label: string;
  /** 서비스 아이콘 URL. "other" 는 아이콘이 없어 null. */
  icon: string | null;
}

export const SERVICES: ServiceDef[] = [
  { key: "notion", label: "Notion", icon: notionIcon },
  { key: "slack", label: "Slack", icon: slackIcon },
  { key: "jira", label: "Jira", icon: jiraIcon },
  { key: "figma", label: "Figma", icon: figmaIcon },
  { key: "github", label: "GitHub", icon: githubIcon },
  { key: "other", label: "기타", icon: null },
];

const BY_KEY = new Map(SERVICES.map((s) => [s.key, s]));

export function serviceIcon(service: LinkService | undefined): string | null {
  if (!service) return null;
  return BY_KEY.get(service)?.icon ?? null;
}

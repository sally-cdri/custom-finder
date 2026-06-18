export type NodeType = "folder" | "link" | "file" | "image" | "text";

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  /** null = 최상위(root) */
  parentId: string | null;
  /** 같은 폴더 내 정렬 순서 */
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface FolderNode extends BaseNode {
  type: "folder";
}

export type LinkService =
  | "notion"
  | "slack"
  | "jira"
  | "figma"
  | "github"
  | "other";

export interface LinkNode extends BaseNode {
  type: "link";
  url: string;
  /** 링크가 가리키는 서비스 (아이콘 표시용). 없으면 "other" */
  service?: LinkService;
}

export interface TextNode extends BaseNode {
  type: "text";
  content: string;
}

export interface FileNode extends BaseNode {
  type: "file";
  /** app_data_dir/files 내 저장 파일명 */
  storedName: string;
  originalName: string;
  mime: string;
}

export interface ImageNode extends BaseNode {
  type: "image";
  storedName: string;
  originalName: string;
  mime: string;
}

export type FinderNode =
  | FolderNode
  | LinkNode
  | TextNode
  | FileNode
  | ImageNode;

export function isContainer(node: FinderNode): node is FolderNode {
  return node.type === "folder";
}

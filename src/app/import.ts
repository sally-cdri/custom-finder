import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { openUrl, openPath } from "@tauri-apps/plugin-opener";
import type { FileNode, FinderNode, ImageNode } from "../core/types";

const IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "heic", "tiff", "avif",
]);

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  txt: "text/plain",
  json: "application/json",
};

export function newId(): string {
  return crypto.randomUUID();
}

export function extOf(path: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(path);
  return m ? m[1].toLowerCase() : "";
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

export function isImageExt(ext: string): boolean {
  return IMAGE_EXTS.has(ext.toLowerCase());
}

export function mimeOf(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

/** 항목 type 을 확장자로 판단 (image vs file). */
export function typeForExt(ext: string): "image" | "file" {
  return isImageExt(ext) ? "image" : "file";
}

/** 디스크의 파일을 앱 저장소로 복사하고 file/image 노드용 필드를 만든다. */
export async function importFromPath(
  srcPath: string,
  id: string = newId(),
): Promise<
  Pick<FileNode | ImageNode, "id" | "type" | "name" | "storedName" | "originalName" | "mime">
> {
  const ext = extOf(srcPath);
  const originalName = baseName(srcPath);
  const storedName = await invoke<string>("import_file", { srcPath, id });
  return {
    id,
    type: typeForExt(ext),
    name: originalName,
    storedName,
    originalName,
    mime: mimeOf(ext),
  };
}

/** 바이트(클립보드 이미지 등)를 앱 저장소에 저장하고 파일명을 반환한다. */
export async function saveBytes(
  bytes: Uint8Array,
  id: string,
  ext: string,
): Promise<string> {
  return invoke<string>("save_bytes", { bytes: Array.from(bytes), id, ext });
}

/** 복사본 파일을 삭제한다. */
export async function deleteStoredFile(storedName: string): Promise<void> {
  await invoke("delete_file", { storedName });
}

/** 복사본 파일의 실제 존재 여부. */
export async function storedFileExists(storedName: string): Promise<boolean> {
  return invoke<boolean>("file_exists", { storedName });
}

let cachedFilesDir: string | null = null;

/** <img src> 등에 쓸 asset URL 을 만든다. */
export async function assetSrc(storedName: string): Promise<string> {
  if (cachedFilesDir === null) {
    cachedFilesDir = await invoke<string>("files_dir");
  }
  return convertFileSrc(`${cachedFilesDir}/${storedName}`);
}

/** OS 파일 선택 다이얼로그. images=true 면 이미지만. */
export async function pickFiles(images: boolean): Promise<string[]> {
  const selected = await openDialog({
    multiple: true,
    directory: false,
    filters: images
      ? [{ name: "이미지", extensions: [...IMAGE_EXTS] }]
      : undefined,
  });
  if (selected === null) return [];
  return Array.isArray(selected) ? selected : [selected];
}

/** 기본 브라우저로 링크 열기. */
export async function openLink(url: string): Promise<void> {
  await openUrl(url);
}

/** 기본 앱으로 파일 열기. */
export async function openFile(absPath: string): Promise<void> {
  await openPath(absPath);
}

/** files/ 안의 저장 파일 절대경로. */
export async function storedAbsPath(storedName: string): Promise<string> {
  if (cachedFilesDir === null) {
    cachedFilesDir = await invoke<string>("files_dir");
  }
  return `${cachedFilesDir}/${storedName}`;
}

/** 노드(하위 포함)와 참조 파일을 .zip 번들로 내보낸다. */
export async function exportBundle(
  nodes: FinderNode[],
  destPath: string,
): Promise<void> {
  await invoke("export_bundle", { nodes, destPath });
}

/** .zip 번들을 읽어 manifest 노드와 파일 이름 매핑을 반환한다. */
export async function importBundle(
  srcPath: string,
): Promise<{ nodes: FinderNode[]; rename: Record<string, string> }> {
  return invoke("import_bundle", { srcPath });
}

/** 번들 저장 위치 선택 다이얼로그. */
export async function pickSavePath(defaultName: string): Promise<string | null> {
  const p = await saveDialog({
    defaultPath: defaultName,
    filters: [{ name: "SallyFinder 번들", extensions: ["zip"] }],
  });
  return p ?? null;
}

/** 가져올 번들(.zip) 선택 다이얼로그. */
export async function pickBundle(): Promise<string | null> {
  const sel = await openDialog({
    multiple: false,
    directory: false,
    filters: [{ name: "SallyFinder 번들", extensions: ["zip"] }],
  });
  return Array.isArray(sel) ? (sel[0] ?? null) : sel;
}

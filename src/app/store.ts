import { invoke } from "@tauri-apps/api/core";
import type { FinderNode } from "../core/types";

/** finder.json 에서 노드 배열을 읽는다. */
export async function loadStore(): Promise<FinderNode[]> {
  const nodes = await invoke<FinderNode[]>("load_store");
  return Array.isArray(nodes) ? nodes : [];
}

/** 노드 배열을 finder.json 에 저장한다. */
export async function saveStore(nodes: FinderNode[]): Promise<void> {
  await invoke("save_store", { nodes });
}

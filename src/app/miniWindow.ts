import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

const LABEL = "mini";

/** 플로팅 미니 할 일 창을 토글한다. 떠 있으면 닫고, 없으면 생성한다. */
export async function toggleMiniWindow(): Promise<void> {
  const existing = await WebviewWindow.getByLabel(LABEL);
  if (existing) {
    await existing.close();
    return;
  }
  new WebviewWindow(LABEL, {
    url: "index.html?mini=1",
    title: "할 일",
    width: 300,
    height: 440,
    alwaysOnTop: true,
    resizable: true,
  });
}

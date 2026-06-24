import { invoke } from "@tauri-apps/api/core";
import type { CalendarEvent } from "../core/event";

/** events.json 에서 이벤트 배열을 읽는다. */
export async function loadEvents(): Promise<CalendarEvent[]> {
  const events = await invoke<CalendarEvent[]>("load_events");
  return Array.isArray(events) ? events : [];
}

/** 이벤트 배열을 events.json 에 저장한다. */
export async function saveEvents(events: CalendarEvent[]): Promise<void> {
  await invoke("save_events", { events });
}

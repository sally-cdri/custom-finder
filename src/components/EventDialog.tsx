import { useState } from "react";
import type { CalendarEvent, NewEvent } from "../core/event";

interface Props {
  /** 편집 대상 (없으면 새 이벤트) */
  initial?: CalendarEvent;
  /** 새 이벤트일 때 미리 채울 날짜("YYYY-MM-DD") */
  defaultDate?: string;
  onSubmit: (input: NewEvent) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** 일정 추가/편집 다이얼로그. LinkDialog 와 같은 모달 패턴. */
export function EventDialog({
  initial,
  defaultDate,
  onSubmit,
  onDelete,
  onClose,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  function submit() {
    const t = title.trim();
    if (!t || !date) return;
    onSubmit({ title: t, date, note: note.trim() || undefined });
    onClose();
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="dialog__title">{initial ? "일정 편집" : "일정 추가"}</h3>

        <label className="dialog__field">
          <span>제목</span>
          <input
            autoFocus
            value={title}
            placeholder="일정 제목"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>

        <label className="dialog__field">
          <span>날짜</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="dialog__field">
          <span>메모 (선택)</span>
          <textarea
            className="dialog__note"
            value={note}
            placeholder="메모"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="editor__actions">
          {initial && onDelete && (
            <button
              className="btn btn--danger"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              삭제
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn--primary" onClick={submit}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

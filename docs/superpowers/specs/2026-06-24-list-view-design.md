# 리스트 보기(목록 형식) 추가 설계

작성일: 2026-06-24

## 배경

메인 패널은 항목을 카드 그리드(`.grid` + `ItemCard`)로만 보여준다. 정보량이 많은
파일 탐색을 위해 **리스트(목록) 보기**를 추가하고, 브레드크럼 오른쪽 아이콘으로
보기 형식을 고를 수 있게 한다.

## 목표

1. **보기 메뉴** — 툴바 우측에 아이콘 드롭다운. `카드 / 리스트` 선택, 현재 모드 체크 표시.
2. **리스트 보기** — 한 줄에 `타입 아이콘 · 이름 · 종류 · 수정한 날짜`. 상단 컬럼 헤더.
3. **지속성** — 선택한 보기 모드를 전역 적용하고 `localStorage`에 저장(재실행 유지).

## 비목표

- 컬럼 정렬 클릭(헤더 클릭 정렬)·컬럼 너비 조절은 범위 밖. 정렬은 기존 필터·정렬 바 사용.
- 카드 보기의 기존 동작(썸네일·메모 미리보기 등)은 그대로 유지.

## 상호작용 (중요)

리스트 행도 카드와 **완전히 동일한 상호작용**을 가진다:
선택(클릭·⌘·Shift·러버밴드), 더블클릭 열기, 우클릭 메뉴, 인라인 이름변경,
드래그 시작(다중 포함), 폴더 행으로 드롭(이동). 이를 위해 별도 행 컴포넌트를
만들지 않고 **`ItemCard`에 `view` prop을 추가**해 바깥 래퍼(`data-id`, `draggable`,
모든 이벤트 핸들러)는 공유하고 내부 마크업만 분기한다. 러버밴드 선택이 그대로
동작하도록 행도 `data-id`를 유지한다.

## 컴포넌트·데이터

### core/view.ts (신규, 순수 — 단위 테스트)

- `export type ViewMode = "card" | "list";`
- `typeLabel(type: NodeType): string` — 폴더/링크/파일/이미지/텍스트
- `formatShortDate(ts: number, now?: number): string` — 같은 해면 `MM-DD`, 아니면 `YYYY-MM-DD`

### components/ViewMenu.tsx (신규)

- `AddMenu`와 동일한 드롭다운 패턴(open 상태 + 바깥 클릭 닫기).
- 아이콘 버튼(`btn btn--toggle`) → `카드 / 리스트` 항목. 현재 모드에 체크(✓).
- props: `view: ViewMode`, `onChange: (v: ViewMode) => void`.

### components/ItemCard.tsx

- prop `view: ViewMode` 추가.
- `view === "list"`: 래퍼 className `row`, 내부에 작은 `TypeIcon`(또는 서비스/썸네일)
  + 이름 + 종류 + 날짜. 인라인 이름변경 입력은 동일 로직 재사용.
- `view === "card"`: 기존 마크업 그대로.
- 이미지 썸네일 로딩 로직은 두 모드 공통(리스트에선 작은 썸네일).

### components/MainPanel.tsx

- props `view`, `onViewChange` 추가. `.main__actions`에서 필터·정렬 버튼 **왼쪽**에 `ViewMenu`.
- 컨테이너 className을 `view === "list" ? "list" : "grid"`로.
- 리스트일 때 항목 위에 컬럼 헤더 행(`이름 / 종류 / 수정한 날짜`). 빈/검색 처리는 동일.
- 검색 결과의 경로(subtitle)는 리스트에선 이름 아래 흐리게.

### App.tsx

- `const [view, setView] = useState<ViewMode>(() => localStorage 값 ?? "card")`.
- `view` 변경 시 `localStorage.setItem("cf.view", view)` (useEffect).
- `MainPanel`에 `view`/`onViewChange` 전달.

## 스타일 (App.css)

- `.list`(세로 flex), `.list__head`(컬럼 헤더), `.row`(행: flex, hover/선택/드롭hover 재사용),
  `.row__name/__type/__date`, 작은 썸네일/아이콘 크기. 기존 `.grid`/`.card`는 불변.

## 테스트·검증

- 단위: `view.test.ts` — `typeLabel`, `formatShortDate`(올해/다른 해).
- 수동: 메뉴 전환, 리스트에서 선택·드래그·우클릭·이름변경·열기, 재실행 후 모드 유지.
- `npm test` + `npm run build` 통과.

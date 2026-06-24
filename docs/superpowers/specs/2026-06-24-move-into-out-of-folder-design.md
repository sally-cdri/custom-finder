# 항목 이동(폴더에 넣기 / 밖으로 꺼내기) 설계

작성일: 2026-06-24

## 배경

파일·메모·링크·이미지를 폴더 안으로 넣거나 폴더 밖으로 꺼내는 이동 동작을 보강한다.
드래그로 "폴더에 넣기"는 이미 동작한다:

- `ItemCard`: 폴더 카드 위로 드롭 → `onMoveInto`
- `Sidebar`: 폴더 행 / "내 폴더" 루트 위로 드롭 → `onMoveInto`
- 코어 `moveNode()`가 사이클(자기 자신·자손 안으로 이동)을 막는다

따라서 이번 작업의 핵심은 **꺼내기 경로 보강 + 우클릭 이동 메뉴 + 다중 선택 이동**이다.

## 목표

1. **우클릭 "이동" 메뉴** — 단일·다중 모두에서
   - `이동 위치 선택…` → 폴더 트리 모달
   - `상위로 꺼내기` → 부모(`parentId`)로 한 번에 이동. 최상위(`parentId === null`)이면 항목 숨김
2. **폴더 트리 모달**(`MoveDialog`) — 라디오로 대상 폴더 선택, `내 폴더(최상위)` 포함
   - 무효 대상 비활성화: ① 옮기는 항목 자신과 그 하위 폴더(폴더 이동 시) ② 모든 대상이 이미 있는 현재 부모
3. **브레드크럼 드롭** — 상단 경로의 각 크럼을 드롭 대상으로. `내 폴더`에 드롭하면 최상위로
4. **다중 선택 이동** — 선택된 노드 전체를 드래그/메뉴로 한 번에 이동

## 비목표

- 폴더 간 정렬 순서 드래그(reorder)는 범위 밖. 이동 후 대상 폴더 끝(`nextOrder`)에 붙인다.
- OS 파일 드래그&드롭(가져오기)은 기존 동작 유지.

## 데이터·코어

`src/core/tree.ts`:

- `moveNode(nodes, id, newParentId)` 재사용. 다중 이동은 id 목록에 대해 순차 적용.
- `moveMany(nodes, ids, newParentId)` 추가 — `ids.reduce`로 `moveNode` 연속 적용한 순수 함수.
- `collectSubtreeIds(nodes, id)` 재사용 — 모달에서 무효(자기+하위) 폴더 계산.

순수 함수는 vitest로 단위 테스트한다(`moveMany`: 다중 이동, 사이클 무시, 순서 부여).

## 드래그 데이터 포맷

- 기존: `dataTransfer.setData("application/x-finder-node", node.id)` (단일 id 문자열)
- 변경: 같은 키에 **JSON 배열 문자열** `JSON.stringify(ids)`.
  - `onDragStart`: 드래그 노드가 현재 선택에 포함되면 `selectedIds` 전체, 아니면 `[node.id]`.
  - 받는 쪽(`ItemCard`/`Sidebar`/브레드크럼): `JSON.parse` 후 각 id에 이동 적용.
  - 하위 호환: 파싱 실패 시 단일 문자열로 간주.

## 컴포넌트

### MoveDialog (신규, `src/components/MoveDialog.tsx`)

- props: `nodes`, `movingIds: string[]`, `onMove(folderId: string | null)`, `onClose()`
- `.overlay` + `.dialog` 패턴(`LinkDialog`와 동일).
- 루트부터 폴더만 재귀 렌더, 라디오 단일 선택. `내 폴더(최상위)` = `null` 선택지.
- 무효 비활성화:
  - 옮기는 노드 중 폴더가 있으면 그 폴더의 `collectSubtreeIds` 합집합에 속한 폴더 disabled
  - 모든 `movingIds`의 `parentId`가 같고 그 값과 동일한 대상 disabled(변화 없음)
- `[취소] [이동]`. 이동 시 `onMove(selected)` 후 닫기.

### ItemCard / Sidebar

- `onDragStart`를 다중 선택 반영하도록 변경.
- 드롭 핸들러는 파싱된 id 배열을 `onMoveMany`로 넘김.

### MainPanel (브레드크럼)

- 각 `.crumb`(`내 폴더` 포함)에 `onDragOver`/`onDrop` 추가, 드롭 시 해당 folderId(루트는 `null`)로 `onMoveMany`.
- 드래그 오버 하이라이트 클래스 `crumb--drophover`.

### App.tsx

- `handleMove(id, folderId)` → `handleMoveMany(ids, folderId)`로 확장(기존 `onMoveInto` 호출부도 배열 경유).
- `handleMoveToParent(node)` — 대상이 다중 선택이면 선택 전체, 단일이면 그 노드. 각 노드의 `parentId`로 이동.
- `moveDialog` 상태: `string[] | null`(이동할 id들). 메뉴에서 열기.
- 컨텍스트 메뉴(`ctxItems`):
  - 단일: `열기 / [링크 복사] / 이름 변경 / 이동 위치 선택… / [상위로 꺼내기] / 내보내기… / 삭제`
  - 다중: `이동 위치 선택…(N개) / 내보내기…(N개) / 삭제(N개)`
  - `상위로 꺼내기`는 `node.parentId !== null`일 때만 노출.

## 스타일(App.css)

- `.crumb--drophover` — 드롭 대상 강조(기존 `--drophover` 톤 재사용).
- `.move-tree`, `.move-tree__row`, `.move-tree__row--disabled` 등 모달 트리 스타일(사이드바 `tree-*` 톤 재사용).

## 테스트·검증

- 단위: `tree.test.ts`에 `moveMany` 케이스 추가.
- 수동: 드래그로 폴더에 넣기/브레드크럼으로 꺼내기, 우클릭 이동 모달, 상위로 꺼내기, 다중 선택 이동, 사이클 시도(무효 처리).
- `npm test` + `npm run build` 통과.

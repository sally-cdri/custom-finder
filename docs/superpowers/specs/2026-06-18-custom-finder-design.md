# custom-finder 설계

내 맘대로 폴더를 만들고 링크·파일·이미지·텍스트를 한곳에서 관리하는 개인용 데스크톱 Finder 앱.

## 스택

- Tauri 2 + React 19 + Vite + TypeScript, 테스트는 Vitest
- 순수 React + CSS (UI 프레임워크 없음), **라이트 테마** 단일 디자인
- 데이터는 Rust 백엔드가 `app_data_dir`에 JSON + 복사 파일로 저장 (기존 `sally-copy-paste` 패턴)

## 데이터 모델

모든 항목을 하나의 노드로 다루고, 평평한 배열로 저장한다. 트리는 `parentId`로 표현한다.

```ts
type NodeType = 'folder' | 'link' | 'file' | 'image' | 'text'

interface BaseNode {
  id: string
  type: NodeType
  name: string              // 표시 이름
  parentId: string | null   // null = 최상위(root)
  order: number             // 같은 폴더 내 정렬 순서
  createdAt: number
  updatedAt: number
}
```

타입별 추가 필드:

- `folder` — 없음
- `link` — `url: string`
- `text` — `content: string` (메모 본문, JSON에 그대로 저장)
- `file` — `storedName: string`, `originalName: string`, `mime: string`
- `image` — `file`과 동일 (표시만 미리보기/썸네일)

## 저장 방식

- `app_data_dir/finder.json` — 전체 노드 배열 (폴더·링크·텍스트·파일 메타데이터)
- `app_data_dir/files/{id}.{ext}` — 드롭/붙여넣기/선택한 파일·이미지 **원본을 복사**해서 보관
- 이미지 표시는 Tauri asset 프로토콜(`convertFileSrc`)로 `<img src>` 직접 연결

데이터는 앱이 온전히 소유한다(복사 방식). 원본을 옮기거나 지워도 영향 없음.

## 백엔드 (Tauri 커맨드)

파일시스템·열기만 담당하고, 트리 로직은 프론트에서 처리한다.

| 커맨드 | 역할 |
|---|---|
| `load_store()` | `finder.json` 읽어 노드 배열 반환 (없으면 빈 배열) |
| `save_store(nodes)` | 노드 배열을 `finder.json`에 저장 (실패 시 기존 파일 `.bak` 백업) |
| `import_file(srcPath, id)` | 원본을 `files/{id}.{ext}`로 복사, 저장된 파일명 반환 |
| `save_bytes(bytes, id, ext)` | 클립보드 이미지 등 바이트를 파일로 저장, 파일명 반환 |
| `delete_file(storedName)` | 복사본 삭제 (노드 삭제 시) |
| `files_dir()` | `files/` 절대경로 반환 (convertFileSrc 조합용) |
| `open_path(path)` / `open_url(url)` | 기본 앱/브라우저로 열기 (opener 플러그인) |

## 프론트 구조

```
src/
  core/
    types.ts        # 노드 타입
    tree.ts         # 순수 트리 로직 (테스트 대상)
    tree.test.ts
    search.ts       # 전체 검색 (이름+메모+링크)
    search.test.ts
  app/
    store.ts        # invoke 래퍼 (load/save)
    import.ts       # 파일 import·클립보드·열기 glue
  components/
    Sidebar.tsx     # 폴더 트리
    MainPanel.tsx   # 현재 폴더의 항목 그리드
    ItemCard.tsx    # 항목 1개 카드 (타입별 아이콘/썸네일)
    AddMenu.tsx     # [+추가] 메뉴
    TextEditor.tsx  # 텍스트 메모 편집
    ImageViewer.tsx # 이미지 미리보기 오버레이
  App.tsx           # 상태 조합 (현재 폴더, 선택, 검색어)
```

`tree.ts` 순수 함수(테스트 대상): `getChildren`, `addNode`, `renameNode`, `moveNode`, `deleteNode`(하위까지 cascade), `reorder`, `getPath`(breadcrumb).

상태는 App에서 노드 배열 하나로 관리하고, 변경 시마다 `save_store` 호출(디바운스). 외부 상태 라이브러리 없이 `useState`/`useReducer`.

## 레이아웃 & 동작

사이드바(폴더 트리) + 메인 패널(현재 폴더 항목 그리드).

**더블클릭 동작**

- 폴더 → 진입 (사이드바 선택 + 메인에 하위 표시)
- 링크 → 기본 브라우저로 열기
- 파일 → 기본 앱으로 열기
- 이미지 → 미리보기 오버레이
- 텍스트 → 인라인 편집기에서 메모 열기/수정

**공통 조작:** 우클릭 컨텍스트 메뉴(이름 변경 / 삭제 / 열기), `Delete` 키 삭제, 인라인 이름 변경, 다른 폴더로 드래그해서 이동.

**추가 방법 (4종)**

- `[+추가]` 버튼 → 메뉴(폴더 / 링크 / 텍스트 메모 / 파일… / 이미지…). 파일·이미지는 OS 파일 선택 다이얼로그
- macOS Finder에서 드래그&드롭 → 현재 폴더로 복사 (mime으로 이미지/파일 자동 구분)
- Cmd+V → 클립보드의 이미지/텍스트/URL을 현재 폴더에 항목으로 추가

**검색:** 검색창 입력 시 전체 노드에서 이름·메모 본문·링크 URL 매칭 → 메인 패널에 결과를 플랫 리스트로, 각 항목의 경로(breadcrumb)와 함께 표시. 검색어를 지우면 원래 폴더 뷰로 복귀.

## 에러 처리

- 복사본 파일 누락(`files/`에 없음) → 카드에 "파일 없음" 표시, 열기 비활성
- import 실패 → 인라인 알림, 노드 추가 안 함
- 잘못된 URL → 그래도 저장(열 때 OS가 처리), 빈 URL만 거부
- `finder.json` 파싱 실패 → 빈 배열로 시작하되 기존 파일은 `.bak`으로 백업

## 테스트

- `tree.ts`: 추가/이동/삭제 cascade/순서/경로 단위 테스트 (Vitest)
- `search.ts`: 매칭 단위 테스트
- Rust: import/delete 경로 정도만 가볍게

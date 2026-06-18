# custom-finder

내 맘대로 폴더를 만들고 링크·파일·이미지·텍스트를 한곳에서 관리하는 개인용 데스크톱 Finder 앱.

## 스택

- Tauri 2 + React 19 + Vite + TypeScript
- 데이터는 `app_data_dir/finder.json` + `app_data_dir/files/` (앱이 데이터를 복사해 소유)
- 라이트 테마

## 개발

```bash
npm install
npm run tauri dev   # 앱 실행
npm test            # 핵심 로직 단위 테스트 (Vitest)
npm run build       # 프론트엔드 타입체크 + 빌드
```

## 기능

- 폴더를 자유롭게 만들고 중첩 (사이드바 트리 + 메인 그리드)
- 항목 타입: 폴더 / 링크 / 파일 / 이미지 / 텍스트 메모
- 추가 방법
  - `+ 추가` 버튼 (폴더·링크·텍스트·파일·이미지)
  - macOS Finder에서 **드래그 & 드롭** (현재 폴더로 복사)
  - **Cmd+V** 클립보드 붙여넣기 (이미지 / 텍스트 / URL)
- 더블클릭: 폴더 진입 · 링크 브라우저 열기 · 파일 기본 앱 열기 · 이미지 미리보기 · 텍스트 편집
- 우클릭 메뉴(열기 / 이름 변경 / 삭제), `Delete` 키 삭제, 드래그로 폴더 이동
- **전체 검색**: 이름·메모 본문·링크 URL 매칭

설계 문서: [docs/superpowers/specs/2026-06-18-custom-finder-design.md](docs/superpowers/specs/2026-06-18-custom-finder-design.md)

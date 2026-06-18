#!/usr/bin/env bash
# 릴리스 자동화: 버전 올리기 → 커밋 → 유니버설 빌드(.dmg)
#   → (원격이 있으면) push → 태그 → GitHub Release
# 사용:
#   bash scripts/release.sh <x.y.z> ["변경 내용 한 줄"]
#   npm run release -- <x.y.z> ["변경 내용 한 줄"]
set -euo pipefail

VERSION="${1:-}"
NOTE="${2:-}"
APP="custom-finder"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "사용법: bash scripts/release.sh <x.y.z> [\"변경 내용\"]" >&2
  exit 1
fi

# 저장소 루트로 이동
cd "$(dirname "$0")/.."
# cargo PATH 확보(있으면)
# shellcheck disable=SC1091
source "$HOME/.cargo/env" 2>/dev/null || true

TAG="v$VERSION"

# 안전장치: 커밋 안 된 변경 / 중복 태그 확인
if [[ -n "$(git status --porcelain)" ]]; then
  echo "작업트리에 커밋되지 않은 변경이 있습니다. 먼저 정리한 뒤 다시 실행하세요." >&2
  git status --short >&2
  exit 1
fi
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "태그 $TAG 가 이미 존재합니다." >&2
  exit 1
fi

# 유니버설 빌드용 타깃 확보
echo "▶ rust 타깃 확인"
rustup target add x86_64-apple-darwin aarch64-apple-darwin >/dev/null 2>&1 || true

echo "▶ 버전 $VERSION 으로 변경"
node -e '
const fs = require("fs");
const v = process.argv[1];
for (const f of ["package.json", "src-tauri/tauri.conf.json"]) {
  let t = fs.readFileSync(f, "utf8");
  t = t.replace(/("version":\s*")[0-9]+\.[0-9]+\.[0-9]+(")/, `$1${v}$2`);
  fs.writeFileSync(f, t);
}
' "$VERSION"

git add package.json src-tauri/tauri.conf.json
git commit -q -m "chore: 버전 $VERSION"

echo "▶ 유니버설 빌드 중… (몇 분 소요)"
npm run tauri build -- --target universal-apple-darwin

DMG="src-tauri/target/universal-apple-darwin/release/bundle/dmg/${APP}_${VERSION}_universal.dmg"
if [[ ! -f "$DMG" ]]; then
  echo "dmg 를 찾지 못했습니다: $DMG" >&2
  exit 1
fi
echo "✅ DMG 생성: $DMG"

# 원격이 없으면 로컬 빌드까지만
if ! git remote get-url origin >/dev/null 2>&1; then
  echo
  echo "ℹ️  git 원격(origin)이 없어 GitHub Release 는 건너뜁니다."
  echo "    DMG 를 그대로 배포하거나, 아래로 원격을 연결한 뒤 다시 실행하세요:"
  echo "      gh repo create sally-cdri/${APP} --private --source=. --remote=origin --push"
  echo "    버전 커밋은 로컬에 만들어졌습니다. 필요하면 푸시하세요."
  exit 0
fi

echo "▶ push + 태그 + Release 게시"
git push origin HEAD
git tag "$TAG"
git push origin "$TAG"

NOTES_FILE="$(mktemp)"
cat > "$NOTES_FILE" <<EOF
## 변경 사항
${NOTE:-- (변경 내용)}

## 설치
1. 아래 \`${APP}_${VERSION}_universal.dmg\` 다운로드 → 앱을 응용 프로그램으로 드래그
2. 첫 실행: **앱 우클릭 → 열기**(서명 안 된 앱이라 더블클릭은 막힘). 안 되면 터미널:
   \`xattr -dr com.apple.quarantine /Applications/${APP}.app\`

## 사용
- 폴더 자유 생성 · 링크/파일/이미지/텍스트 메모 관리
- 추가: \`+ 추가\` 버튼 · Finder에서 드래그&드롭 · \`Cmd+V\` 붙여넣기
- 더블클릭으로 열기 · 우클릭 메뉴(이름변경/삭제) · Delete 삭제 · 드래그로 폴더 이동 · 전체 검색
EOF

gh release create "$TAG" "$DMG" --title "${APP} $TAG" --notes-file "$NOTES_FILE"
echo "✅ 완료: $(gh release view "$TAG" --json url --jq .url)"

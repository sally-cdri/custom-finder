#!/usr/bin/env bash
# 유저별 이름으로 앱을 빌드한다 (Dock/Finder 이름·데이터 저장소까지 독립).
# tauri.conf.json 은 빌드 동안만 임시 치환하고 끝나면 원래대로 되돌린다.
#
# 사용:
#   bash scripts/build-named.sh <AppName>
#   npm run build:named -- <AppName>
# 예) npm run build:named -- JudyFinder
set -euo pipefail

APP_NAME="${1:-}"
if [[ -z "$APP_NAME" || ! "$APP_NAME" =~ ^[A-Za-z0-9]+$ ]]; then
  echo "사용법: bash scripts/build-named.sh <AppName>  (영문/숫자, 예: JudyFinder)" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
source "$HOME/.cargo/env" 2>/dev/null || true

CONF="src-tauri/tauri.conf.json"
VERSION="$(node -e 'console.log(require("./package.json").version)')"
LOWER="$(printf '%s' "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')"
IDENT="com.sally.$LOWER"

# 원본 백업 후 종료 시 무조건 복원
cp "$CONF" "$CONF.orig"
restore() { [[ -f "$CONF.orig" ]] && mv "$CONF.orig" "$CONF"; }
trap restore EXIT

# productName / 윈도우 title / identifier 임시 치환
node -e '
const fs = require("fs");
const f = "src-tauri/tauri.conf.json";
const [name, ident] = process.argv.slice(1);
const c = JSON.parse(fs.readFileSync(f, "utf8"));
c.productName = name;
c.identifier = ident;
if (c.app && Array.isArray(c.app.windows)) {
  for (const w of c.app.windows) w.title = name;
}
fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n");
' "$APP_NAME" "$IDENT"

echo "▶ rust 타깃 확인"
rustup target add x86_64-apple-darwin aarch64-apple-darwin >/dev/null 2>&1 || true

echo "▶ $APP_NAME ($IDENT) 유니버설 빌드 중… (몇 분 소요)"
npm run tauri build -- --target universal-apple-darwin

DMG="src-tauri/target/universal-apple-darwin/release/bundle/dmg/${APP_NAME}_${VERSION}_universal.dmg"
if [[ ! -f "$DMG" ]]; then
  echo "dmg 를 찾지 못했습니다: $DMG" >&2
  exit 1
fi
echo "✅ DMG 생성: $DMG"

# 같은 버전의 GitHub Release 가 있으면 자산으로 첨부
if command -v gh >/dev/null 2>&1 && gh release view "v$VERSION" >/dev/null 2>&1; then
  gh release upload "v$VERSION" "$DMG" --clobber
  echo "✅ v$VERSION 릴리스에 첨부 완료"
else
  echo "ℹ️  로컬 DMG 만 생성했습니다 (해당 버전 릴리스 없음 또는 gh 미설치)."
fi

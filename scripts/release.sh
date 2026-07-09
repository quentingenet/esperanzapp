#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Require a tag on HEAD
HEAD_TAG=$(git tag --points-at HEAD 2>/dev/null | head -1)
if [[ -z "$HEAD_TAG" ]]; then
  echo "Aucun tag sur HEAD. Crée le tag d'abord :"
  echo "  git tag v1.1.58"
  exit 1
fi

VERSION="${HEAD_TAG#v}"
echo "==> Release $HEAD_TAG (versionCode=$(node -e "
  const [maj,min,pat]='$VERSION'.split('.').map(Number);
  if(pat>=100){console.error('Patch >= 100 : collision versionCode');process.exit(1);}
  console.log(maj*10000+min*100+pat);
"))"

echo ""
echo "[1/3] Build JS..."
npm run build:release

echo ""
echo "[2/3] Capacitor sync..."
npx cap sync android

echo ""
echo "[3/3] Gradle bundleRelease..."
cd android
./gradlew clean bundleRelease

AAB="app/build/outputs/bundle/release/EsperanzApp-v${VERSION}-release.aab"
echo ""
if [[ -f "$AAB" ]]; then
  echo "AAB signé : android/$AAB"
  echo ""
  echo "Next step : Play Console > Production > Créer une version"
  echo "  https://play.google.com/console"
else
  echo "Erreur : AAB introuvable à android/$AAB"
  exit 1
fi

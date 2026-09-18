#!/bin/zsh
# Build the Chrome Web Store upload zip: dist/phocas-magic-<version>.zip
set -e
ROOT=${0:A:h}/..
cd $ROOT
VER=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")
# sanity checks before packaging
for f in extension/js/*.js; do node --check "$f"; done
python3 -c "import json;json.load(open('extension/manifest.json'))"
mkdir -p dist
OUT=dist/phocas-magic-$VER.zip
rm -f $OUT
(cd extension && zip -qr -X ../$OUT . -x '.*' -x '__MACOSX/*')
echo "$OUT ($(du -h $OUT | cut -f1))"

#!/usr/bin/env bash
set -e

echo "=== Building Flow Maze — Minimal Puzzle Android APK ==="
npm install
npm run build

if [ ! -d "android" ]; then
  npm install @capacitor/core @capacitor/cli @capacitor/android
  npx cap add android
fi

npx cap sync android
cd android
./gradlew assembleDebug

echo ""
echo "SUCCESS! Your Android APK is ready at:"
echo "android/app/build/outputs/apk/debug/app-debug.apk"

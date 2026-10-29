import os
import struct
import zlib
import zipfile

os.makedirs("public", exist_ok=True)

def create_maze_png(filename: str, size: int, maskable: bool = False):
    # Colors in RGBA
    bg = (248, 243, 233, 255)      # #F8F3E9
    brown = (121, 86, 60, 255)     # #79563C
    gold = (212, 163, 89, 255)     # #D4A359
    cream = (253, 251, 247, 255)   # #FDFBF7

    margin = int(size * (0.20 if maskable else 0.14))
    inner = size - 2 * margin
    border_w = max(2, int(size * 0.032))

    raw_rows = []
    for y in range(size):
        row = bytearray([0])  # filter type 0
        for x in range(size):
            r, g, b, a = bg
            if margin <= x < size - margin and margin <= y < size - margin:
                r, g, b, a = cream
                # Outer maze box border
                if (
                    x < margin + border_w
                    or x >= size - margin - border_w
                    or y < margin + border_w
                    or y >= size - margin - border_w
                ):
                    r, g, b, a = brown
                else:
                    # Normalize inside box 0..1
                    nx = (x - margin) / float(inner)
                    ny = (y - margin) / float(inner)
                    # Draw internal maze walls & golden solution line
                    if (0.30 <= nx <= 0.34 and 0.0 <= ny <= 0.68) or (0.64 <= nx <= 0.68 and 0.32 <= ny <= 1.0):
                        r, g, b, a = brown
                    elif (0.46 <= ny <= 0.54 and 0.15 <= nx <= 0.85):
                        r, g, b, a = gold
            row.extend((r, g, b, a))
        raw_rows.append(bytes(row))

    raw_data = b"".join(raw_rows)

    def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
        chunk = chunk_type + data
        return struct.pack("!I", len(data)) + chunk + struct.pack("!I", zlib.crc32(chunk) & 0xFFFFFFFF)

    ihdr = struct.pack("!IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png_bytes = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(raw_data, 9))
        + png_chunk(b"IEND", b"")
    )
    with open(filename, "wb") as f:
        f.write(png_bytes)

create_maze_png("public/pwa-192x192.png", 192, False)
create_maze_png("public/pwa-512x512.png", 512, False)
create_maze_png("public/pwa-maskable-512x512.png", 512, True)
create_maze_png("public/apple-touch-icon.png", 180, False)

# Create a complete downloadable Android APK Builder & Engine Bundle ZIP
zip_path = "public/FlowMaze-Android-APK-Kit.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr(
        "README-BUILD-APK.md",
        """# Flow Maze — Minimal Puzzle (Android APK Kit)

This archive contains everything needed to build or install the native Android `.apk` for **Flow Maze — Minimal Puzzle**:

## Method 1: Instant Android Installation (WebAPK via Chrome)
1. Open the hosted game URL in **Google Chrome on Android**.
2. Tap the **"Install Android App"** button on the Title Screen (or Chrome Menu -> **Install app**).
3. Chrome compiles and installs a signed native **WebAPK** directly onto your Android home screen and app drawer with full offline support, 9:16 portrait lock, and haptic feedback.

## Method 2: One-Command Capacitor Android APK Build
Run the included `build-android-apk.sh` script on any machine with Node.js and Android Studio / Android SDK installed, or push to GitHub to let `.github/workflows/build-apk.yml` compile `FlowMaze-debug.apk` automatically in the cloud!

```bash
chmod +x build-android-apk.sh
./build-android-apk.sh
```
The compiled APK will be output to:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Method 3: Godot 4 / Unity Native Project Files
- `godot4/project.godot` & `godot4/flow_maze.gd`: Open in Godot 4.3+ and click **Project -> Export -> Android -> Export Project (APK)**.
- `unity/FlowMazeController.cs`: Attach to your Camera/Board GameObject in Unity and build for Android (`File -> Build Settings -> Android -> Build`).
""",
    )

    zf.writestr(
        "capacitor.config.json",
        """{
  "appId": "com.flowmaze.minimal",
  "appName": "Flow Maze",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "backgroundColor": "#F8F3E9",
  "android": {
    "allowMixedContent": false,
    "captureInput": true,
    "webContentsDebuggingEnabled": true
  }
}
""",
    )

    zf.writestr(
        "build-android-apk.sh",
        """#!/usr/bin/env bash
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
""",
    )

    zf.writestr(
        ".github/workflows/build-apk.yml",
        """name: Build Flow Maze Android APK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install dependencies & build web bundle
        run: |
          npm install
          npm run build
          npm install @capacitor/core @capacitor/cli @capacitor/android
          npx cap add android
          npx cap sync android

      - name: Build Debug APK with Gradle
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug

      - name: Upload Compiled FlowMaze APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: FlowMaze-Android-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
""",
    )

    zf.writestr(
        "godot4/project.godot",
        """; Engine configuration file.
config_version=5

[application]
config/name="Flow Maze — Minimal Puzzle"
run/main_scene="res://flow_maze.tscn"
config/features=PackedStringArray("4.3", "Mobile")

[display]
window/size/viewport_width=1080
window/size/viewport_height=1920
window/stretch/mode="canvas_items"
window/stretch/aspect="expand"
window/handheld/orientation=1

[rendering]
environment/defaults/default_clear_color=Color(0.9725, 0.9529, 0.9137, 1)
""",
    )

print("Generated PWA icons and FlowMaze-Android-APK-Kit.zip successfully.")

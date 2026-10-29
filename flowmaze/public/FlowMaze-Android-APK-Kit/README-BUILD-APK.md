# Flow Maze — Minimal Puzzle (Android APK Kit)

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

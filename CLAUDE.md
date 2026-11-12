# Sprocket robot project

Sprocket is a DIY companion robot. Right now it is a single-page web app (`index.html`) that runs on a phone and acts as the robot's face and brain. Later it will run on a donor Android phone mounted as the head of a two-legged, wheel-footed balancing robot.

## Current state (Phase 1: phone brain, no hardware yet)
- One file: `index.html` (HTML + CSS + JS, no build step, no frameworks).
- Hosted on GitHub Pages from the `main` branch: https://seanmurfy.github.io/Robot/
- Tested on iPhone in Chrome (Safari speech recognition was blocked by iOS settings).

## What index.html does
- **Face:** animated orange eyes that blink and glance; emotions `happy`, `excited`, `sad`, `surprised`, `thinking`, `sleepy`, `neutral` (plus internal `asleep`) set via `setMood()` as CSS classes on `<body>`.
- **Sound:** `chirp()` plays a Web Audio "bweep" on happy/excited (signature sound).
- **Voice out:** browser `speechSynthesis`; voice, pitch and rate are user-selectable in settings.
- **Ears:** `webkitSpeechRecognition` (mic button) plus a typed-text fallback.
- **Brain:** `think()` calls OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) when an API key is set. The model must reply with JSON: `{"say", "emotion", "remember": []}`. With no key, `localBrain()` answers with offline regex rules.
- **Vision:** 👁 button opens a live camera preview (`openPreview()`); a `LOOK_RE` phrase ("what do you see", "look at this") opens it too and snaps right away. While open, anything said or typed goes to `think()` with the current frame (`grabFrame()`: max 512px, JPEG q0.7, sent as an `image_url` part); 📸 Snap sends "What do you see?". The eyes look down at the preview. Camera choice is `brain.camera` ("user"/"environment"), set in settings or with the 🔄 button, falling back to any camera if the chosen one is missing. ✕, 60 s of no activity, or hiding the page closes the preview and stops all tracks. Needs an API key and a vision-capable model. Images are never stored; history gets a text note "[showed Sprocket a photo]".
- **Sleep cycle:** after `brain.sleepAfter` idle minutes (setting: Never/2/5/10, default 2) Sprocket yawns and goes `sleepy`; 3 minutes later `asleep` (breathing line eyes, floating z's in a `pointer-events: none` layer). Never sleeps while listening, thinking, speaking, settings open, or camera preview open. Any tap/key wakes it (`wake()`): surprised → excited chirp + a wake line. The waking tap is swallowed so it doesn't also press a button; a typed message sent while asleep is answered after the wake line.
- **Face tracking (section 8):** "Follow faces" setting (`brain.followFaces`, off by default, not carried by backups or setup links). MediaPipe Tasks Vision `FaceDetector` (BlazeFace short range, VIDEO mode) from jsDelivr `@mediapipe/tasks-vision@0.10.14`, model from Google's mediapipe-models bucket. Hidden 320x240 front-camera stream, ~10 detections/s; when the live preview is open it detects on the preview's video instead (only one stream ever: `startCamera()` stops the tracking stream, `closePreview()` restarts it). Eyes glide (20%/frame) toward the biggest face, x mirrored, clamped to the glance range; eyes keep looking at the preview while it's open. New face after 10+ s → happy chirp + "Hi!" caption (no speech). No face for 30 s → random glancing again. Faces count as activity (`poke()`); while sleepy/asleep the eyes don't follow and detection slows to 1/s just to wake Sprocket when a face appears. Paused while the tab is hidden and during snapshots. Model or camera failure turns the setting off with a caption.
- **Setup link:** settings → "Copy setup link" puts key, model, voice, pitch, rate, camera and sleep setting in a `#setup=` URL hash (never sent to a server). Opening it on any origin (GitHub Pages, Live Server, a tunnel, a new phone) imports them and strips the hash. Each origin has separate localStorage, which is why settings seemed to "reset".
- **Memory:** everything lives in one object `brain`, saved to `localStorage` under `robotBrain.v2` (name, persona, memory facts, recent history, voice settings, API key). Backup/restore copies JSON without the key.

## Character: Sprocket
Loyal pet robot, excitable buddy (with a little cheek and wisdom). Short, punchy lines. Catchphrase "Let's roll!" when given a task. Rates things out of 10. Orange resting eyes; gold, sparkling, hopping eyes when excited.

## Rules
- Never put the OpenRouter API key (or any secret) in the code. The repo is public. The key is entered in the in-app settings and stored only in the browser.
- Bump `APP_VERSION` in `index.html` (shown top-left on screen) with every change, so it's clear which build the phone has loaded.
- Keep it a single self-contained `index.html` unless there's a strong reason to split.
- iPhone quirks: speech must start inside a tap/click handler (see `unlockSpeech()`); silent mode mutes browser speech; fixed-position overlays need explicit `z-index` so buttons stay tappable.
- Test locally with the Live Server extension (port 5500); test on the phone via VS Code port forwarding (public visibility).

## Roadmap
1. Phone brain (now): face, voice, AI, memory, camera snapshot + vision ("what do you see?").
2. Balancing base: ESP32-S3, 2x 2804 gimbal motors with SimpleFOC, BNO085 IMU, LQR balance.
3. Leg height: 2x Feetech STS3215 servos, linkage legs.
4. Head + link: pan/tilt neck, phone cradle, phone to ESP32 over USB serial (newline-delimited JSON commands like `{"cmd":"drive","v":0.3,"turn":0}`).
5. Claw arm: 3 small bus servos, vision-guided grab.
6. Learned skills: MuJoCo sim + RL (jumping, fall recovery).

Hardware commands from the AI become tool calls (`drive`, `look`, `set_height`, `grab`, `emote`, `remember`). Firmware enforces all safety limits; the AI never controls raw motor power.

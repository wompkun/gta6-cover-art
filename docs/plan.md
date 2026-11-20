# Plan — Neon Bay Cover Maker (gta6-cover-art-01)

## Goal
Offline web app under `app/` that turns a photo + caption into GTA-poster-style
multi-panel cover art and exports PNG in 1080x1080, 1080x1350, 1920x1080.

## Design (original, no Rockstar IP)
- Name: "Neon Bay Cover Maker". Fictional city "NEON BAY", sunset/neon grade.
- Cover layout: 3 panels — one hero panel + two smaller panels, separated by
  white diagonal divider strips, like a poster collage. Layout adapts per size:
  square 1080x1080 (hero top, two panels bottom), portrait 1080x1350 (hero top
  half, two panels below), landscape 1920x1080 (hero left ~60%, two stacked right).
- Each panel: own photo (upload or sample), crop/position via zoom slider +
  X/Y offset sliders + drag on the preview, plus "fill all panels" from one photo.
- Caption: title (2 lines max), subtitle, theme picker (Sunset / Neon / Midnight),
  bold outlined lettering drawn on canvas, system fonts only (no font files).
- Grade: per-panel sunset gradient overlay, vignette, subtle grain via canvas noise.

## Files
- `app/index.html` — editor shell, controls, preview canvas.
- `app/style.css` — dark neon editor UI.
- `app/src/cover.js` — pure cover renderer: `layoutPanels(size)`,
  `drawPanel(ctx, photo, view, rect, theme)`, `drawCaption(ctx, ...)`,
  `renderCover(canvas, state)`; also `exportCover(state, w, h)` returning a canvas.
- `app/src/main.js` — editor wiring: photo slots, drag/zoom, caption/theme/size
  controls, export via `toBlob`, `?shot=` scenes.
- `app/src/shots.js` — fixed scenes for screenshots (`editor`, `cover`).
- `app/samples/` — boulevard.jpg, pier.jpg (kit samples), street.jpg (AI-made).
- `main.ts` — copies app/ + screenshots/ to /output, writes dossier.json.
- `screenshots/` — 4 shots from the real app (see below).

## Tests (TDD, Playwright Chromium, tests/e2e.mjs)
1. App loads offline, no network requests, no console errors.
2. Load sample photo into hero panel, set caption, export each of the 3 sizes;
   assert downloads are valid PNGs with exact dimensions.
3. Fill-all-panels + theme switch re-renders without errors.
4. Screenshots script (tests/shots.mjs): editor with photo loaded (1440x900),
   exported covers 1920x1080 -> 1280x720, 1080x1080 -> 1024x1024,
   1080x1350 -> 1024x1280; each <=256 KiB, first by name is the cover.

## Verification
- `rm -rf out && MAKEFUN_OUTPUT_DIR=out node main.ts` exits 0; out/ has app/,
  screenshots/, dossier.json; dossier <= 1.5 MiB.
- `node cli/makefun.mjs check` from the kit dir (no submit).
- No `http`/`https` in reachable app files; no Rockstar logo/artwork/fonts.

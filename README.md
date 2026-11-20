# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/wompkun/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/wompkun/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Bay Cover Maker — an offline web app that turns a photo and a caption
into GTA-style poster cover art: three panels (one hero, two smaller), a
sunset / neon / midnight colour grade, bold outlined caption lettering, and
PNG export in 1080×1080, 1080×1350 and 1920×1080. Everything runs on your
own machine; photos never leave it. All art, names and lettering are
original — no Rockstar Games logo, artwork or fonts.

## Run it

```sh
# serve the app and open it in a desktop browser
python3 -m http.server --directory app 8080

# hand the entry in (copies app/ + screenshots/, writes dossier.json)
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How it works

1. **Photos** — load the three sample photos, or upload your own. Each of
   the three panels takes its own photo, or fill all three with the hero photo.
2. **Crop & position** — pick a panel, drag the live preview or use the
   zoom / move sliders to frame each photo.
3. **Caption & style** — write a title (two lines) and a subtitle, pick a
   theme: Sunset, Neon or Midnight.
4. **Export** — pick Square 1080×1080, Portrait 1080×1350 or Wide
   1920×1080 and export a PNG to share.

---

<sub>Entered on [make.fun](https://make.fun/?ref=jk303ka9&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

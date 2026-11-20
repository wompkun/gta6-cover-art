// Neon Bay Cover Maker — entry program (Node 22, standard library only).
//
// The app is plain static files in app/ and the screenshots in screenshots/.
// This program hands them in: it copies both folders to the output directory
// and writes /output/dossier.json with the vendored make.fun library, which
// the judge reads. It makes no network requests and is deterministic: two
// runs write the same bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 256 * 1024;

/** Refuses a build that would break the gate's app caps, before copying. */
function checkAppCaps(dir) {
  let files = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        files += 1;
        bytes += statSync(path).size;
      }
    }
  };
  walk(dir);
  if (files > APP_MAX_FILES) throw new Error(`neon-bay: app/ has ${files} files, over the ${APP_MAX_FILES} cap`);
  if (bytes > APP_MAX_BYTES) throw new Error(`neon-bay: app/ is ${bytes} bytes, over the 48 MiB cap`);
  return { files, bytes };
}

const appStats = checkAppCaps(join(here, 'app'));

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
    app_max_files: APP_MAX_FILES,
    app_max_bytes: APP_MAX_BYTES,
    app_path_max_bytes: 1000,
  }),
);

console.log(`neon-bay: wrote ${out} (app/ ${appStats.files} files, screenshots/ + dossier.json)`);

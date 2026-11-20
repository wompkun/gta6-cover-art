/**
 * Takes the entry's screenshots from the real app, driven by Playwright
 * Chromium. Run: node tests/shots.mjs
 *
 * 1-cover.jpg       exported wide cover (1920x1080 -> 1280x720)
 * 2-editor.jpg      editor with a photo loaded (1440x900 -> 1280x800)
 * 3-cover-square.jpg exported square cover, neon theme (1080x1080 -> 1024x1024)
 * 4-cover-portrait.jpg exported portrait cover, midnight theme (1080x1350 -> 1024x1280)
 *
 * Every screenshot is a JPEG at most 256 KiB, long side at most 1280,
 * short side at least 480. Covers are the app's own drawing, unedited.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const APP = new URL('../app/', import.meta.url).pathname;
const OUT = new URL('../screenshots/', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  try {
    const path = normalize(join(APP, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!path.startsWith(APP)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(path === APP ? join(APP, 'index.html') : path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function scale(src, dst, maxW, maxH, quality) {
  await run('python3', ['-c', `
from PIL import Image
im = Image.open(${JSON.stringify(src)}).convert('RGB')
im.thumbnail((${maxW}, ${maxH}), Image.LANCZOS)
im.save(${JSON.stringify(dst)}, quality=${quality})
import os; print(${JSON.stringify(dst)}, im.size, os.path.getsize(${JSON.stringify(dst)}))
`]);
}

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
try {
  // 1. Wide exported cover.
  let page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${base}/index.html?shot=cover&size=wide&theme=sunset&caption=${encodeURIComponent('MIDNIGHT\nHEIST')}&subtitle=${encodeURIComponent('NEON BAY')}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 10000 });
  await page.screenshot({ path: join(OUT, '1-cover.png') });
  await page.close();

  // 2. Editor with a photo loaded.
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/index.html?shot=editor&caption=${encodeURIComponent('MIDNIGHT\nHEIST')}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 10000 });
  await page.screenshot({ path: join(OUT, '2-editor.png') });
  await page.close();

  // 3. Square exported cover, neon theme.
  page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  await page.goto(`${base}/index.html?shot=cover&size=square&theme=neon&caption=${encodeURIComponent('NEON\nCHASE')}&subtitle=${encodeURIComponent('NEON BAY')}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 10000 });
  await page.screenshot({ path: join(OUT, '3-cover-square.png') });
  await page.close();

  // 4. Portrait exported cover, midnight theme.
  page = await browser.newPage({ viewport: { width: 1024, height: 1280 } });
  await page.goto(`${base}/index.html?shot=cover&size=portrait&theme=midnight&caption=${encodeURIComponent('CITY OF\nNEON')}&subtitle=${encodeURIComponent('NEON BAY')}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 10000 });
  await page.screenshot({ path: join(OUT, '4-cover-portrait.png') });
  await page.close();
} finally {
  await browser.close();
  server.close();
}

await scale(join(OUT, '1-cover.png'), join(OUT, '1-cover.jpg'), 1280, 720, 85);
await scale(join(OUT, '2-editor.png'), join(OUT, '2-editor.jpg'), 1280, 800, 82);
await scale(join(OUT, '3-cover-square.png'), join(OUT, '3-cover-square.jpg'), 1024, 1024, 85);
await scale(join(OUT, '4-cover-portrait.png'), join(OUT, '4-cover-portrait.jpg'), 1024, 1280, 85);
for (const f of ['1-cover.png', '2-editor.png', '3-cover-square.png', '4-cover-portrait.png']) {
  await unlink(join(OUT, f));
}
console.log('shots: done');

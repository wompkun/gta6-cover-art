/**
 * End-to-end test for the Neon Bay Cover Maker, driven by the Playwright
 * Chromium already on this VM. Serves app/ on localhost, opens the real
 * editor, and asserts behaviour a file read cannot prove.
 *
 * Run: node tests/e2e.mjs
 *
 * Playwright-core lives in the token-radar build's node_modules on this VM,
 * so run with NODE_PATH pointed there, e.g.:
 *   NODE_PATH=~/workspace/makefun-sponsor/token-radar-build/node_modules node tests/e2e.mjs
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const APP = new URL('../app/', import.meta.url).pathname;
const BUILD = new URL('../', import.meta.url).pathname;
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

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
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({
  executablePath: '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const outside = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => {
  const url = r.url();
  if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('blob:')) outside.push(url);
});

try {
  // 1. Editor loads with the sample photos and draws a non-blank cover.
  await page.goto(`${base}/index.html?shot=editor&caption=${encodeURIComponent('MIDNIGHT\nHEIST')}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 10000 });
  const drawn = await page.evaluate(() => {
    const c = document.getElementById('cover');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let varied = 0;
    for (let i = 0; i < data.length; i += 401) if (data[i] !== data[0]) varied++;
    return { width: c.width, height: c.height, varied };
  });
  assert.equal(drawn.width, 1080);
  assert.equal(drawn.height, 1080);
  assert.ok(drawn.varied > 100, 'preview canvas should show varied pixels');

  // 2. Uploading a photo into a panel works (any photo, from the machine).
  await page.setInputFiles('#upload', join(BUILD, 'app/samples/pier.jpg'));
  await page.waitForFunction(() => document.querySelector('.slot-state')?.textContent === 'pier.jpg', null, { timeout: 5000 });

  // 3. Caption edit + theme switch re-render without errors.
  await page.fill('#title', 'NEON\nCHASE');
  await page.click('[data-theme="neon"]');
  await page.waitForTimeout(200);

  // 4. Fill all panels with the hero photo.
  await page.click('#fillAll');
  await page.waitForFunction(() => {
    const states = [...document.querySelectorAll('.slot-state')].map((el) => el.textContent);
    return states.length === 3 && states[1].includes('(same photo)');
  }, null, { timeout: 5000 });

  // 5. Export each of the three sizes; check exact dimensions and PNG bytes.
  for (const [key, w, h] of [['square', 1080, 1080], ['portrait', 1080, 1350], ['wide', 1920, 1080]]) {
    const out = await page.evaluate((k) => window.__exportCover(k), key);
    assert.equal(out.width, w, `${key} width`);
    assert.equal(out.height, h, `${key} height`);
    assert.ok(out.bytes > 50000, `${key} export should hold real image bytes`);
    console.log(`export ${key}: ${out.width}x${out.height}, ${out.bytes} bytes`);
  }

  // 6. No console errors, no requests outside the local app.
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, []);
  console.log('e2e: all checks passed');
} finally {
  await browser.close();
  server.close();
}

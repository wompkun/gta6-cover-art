// Neon Bay Cover Maker — editor wiring.
//
// Owns the editor state (three photo panels, caption, theme, export size),
// redraws the live preview through cover.js, and exports PNGs. Photos are
// read on the person's own machine and never uploaded anywhere.
import { SIZES, THEMES, layoutPanels, renderCover, exportCover } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { file: 'boulevard.jpg', name: 'Boulevard' },
  { file: 'pier.jpg', name: 'Pier' },
  { file: 'street.jpg', name: 'Neon street' },
];

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const previewSize = document.getElementById('previewSize');
const slotsEl = document.getElementById('slots');

const state = {
  panels: SAMPLES.map(() => ({ img: null, view: { zoom: 1, ox: 0, oy: 0 }, name: 'Empty' })),
  picked: 0,
  title: titleInput.value,
  subtitle: subtitleInput.value,
  theme: 'sunset',
  sizeKey: 'square',
};

function redraw() {
  state.title = titleInput.value;
  state.subtitle = subtitleInput.value;
  renderCover(canvas, state);
  const size = SIZES[state.sizeKey];
  previewSize.textContent = `${size.width} × ${size.height}`;
  syncSliders();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function loadSample(index, file, name) {
  const img = await loadImage(`samples/${file}`);
  state.panels[index] = { img, view: { zoom: 1, ox: 0, oy: 0 }, name };
  renderSlots();
  redraw();
}

async function loadSamples() {
  for (let i = 0; i < SAMPLES.length; i++) {
    await loadSample(i, SAMPLES[i].file, SAMPLES[i].name);
  }
  statusEl.textContent = 'Sample photos loaded — pick a panel, then drag or slide to crop.';
}

function renderSlots() {
  slotsEl.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `slot${i === state.picked ? ' picked' : ''}`;
    slot.setAttribute('aria-label', `Panel ${i + 1}: ${panel.name}`);
    const thumb = document.createElement('img');
    thumb.alt = '';
    if (panel.img) thumb.src = panel.img.src;
    const name = document.createElement('span');
    name.className = 'slot-name';
    name.textContent = i === 0 ? 'Hero' : `Panel ${i + 1}`;
    const st = document.createElement('span');
    st.className = 'slot-state';
    st.textContent = panel.name;
    slot.append(thumb, name, st);
    slot.addEventListener('click', () => {
      state.picked = i;
      renderSlots();
      syncSliders();
    });
    slotsEl.append(slot);
  });
}

function syncSliders() {
  const view = state.panels[state.picked].view;
  const zoom = document.getElementById('zoom');
  const ox = document.getElementById('ox');
  const oy = document.getElementById('oy');
  zoom.value = view.zoom;
  ox.value = view.ox;
  oy.value = view.oy;
  document.getElementById('zoomVal').textContent = `${view.zoom.toFixed(2)}×`;
  document.getElementById('oxVal').textContent = view.ox.toFixed(2);
  document.getElementById('oyVal').textContent = view.oy.toFixed(2);
  document.querySelectorAll('#panelPick button').forEach((b) => {
    b.classList.toggle('picked', Number(b.dataset.panel) === state.picked);
  });
}

function bindSlider(id, key) {
  document.getElementById(id).addEventListener('input', (e) => {
    state.panels[state.picked].view[key] = Number(e.target.value);
    redraw();
  });
}

bindSlider('zoom', 'zoom');
bindSlider('ox', 'ox');
bindSlider('oy', 'oy');

document.querySelectorAll('#panelPick button').forEach((b) => {
  b.addEventListener('click', () => {
    state.picked = Number(b.dataset.panel);
    renderSlots();
    syncSliders();
  });
});

document.querySelectorAll('#themePick button').forEach((b) => {
  b.addEventListener('click', () => {
    state.theme = b.dataset.theme;
    document.querySelectorAll('#themePick button').forEach((x) => x.classList.toggle('picked', x === b));
    redraw();
  });
});

document.querySelectorAll('#sizePick button').forEach((b) => {
  b.addEventListener('click', () => {
    state.sizeKey = b.dataset.size;
    document.querySelectorAll('#sizePick button').forEach((x) => x.classList.toggle('picked', x === b));
    redraw();
  });
});

document.getElementById('fillAll').addEventListener('click', () => {
  const hero = state.panels[0];
  if (!hero.img) { statusEl.textContent = 'Load a hero photo first.'; return; }
  for (let i = 1; i < state.panels.length; i++) {
    state.panels[i] = { img: hero.img, view: { ...hero.view }, name: `${hero.name} (same photo)` };
  }
  renderSlots();
  redraw();
  statusEl.textContent = 'All three panels now show the hero photo — crop each one differently.';
});

document.getElementById('sampleBtn').addEventListener('click', () => {
  loadSamples().catch((err) => { statusEl.textContent = err.message; });
});

document.getElementById('upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    state.panels[state.picked] = { img, view: { zoom: 1, ox: 0, oy: 0 }, name: file.name };
    renderSlots();
    redraw();
    statusEl.textContent = `${file.name} is in panel ${state.picked + 1}.`;
  } catch {
    statusEl.textContent = 'That file could not be read as an image.';
  }
});

titleInput.addEventListener('input', redraw);
subtitleInput.addEventListener('input', redraw);

// Drag the preview to move the picked panel's photo.
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  dragging = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const view = state.panels[state.picked].view;
  view.ox += ((e.clientX - dragging.x) / rect.width) * 2;
  view.oy += ((e.clientY - dragging.y) / rect.height) * 2;
  view.ox = Math.max(-1, Math.min(1, view.ox));
  view.oy = Math.max(-1, Math.min(1, view.oy));
  dragging = { x: e.clientX, y: e.clientY };
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.sizeKey];
  const out = exportCover(state, state.sizeKey);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-bay-cover-${size.width}x${size.height}.png`;
    a.click();
    statusEl.textContent = `Saved neon-bay-cover-${size.width}x${size.height}.png`;
  }, 'image/png');
});

// Test hook: exports the current cover at any size and reports its PNG bytes.
window.__exportCover = async (sizeKey) => {
  const out = exportCover(state, sizeKey);
  const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
  return { width: out.width, height: out.height, bytes: blob.size };
};
window.__state = state;

// Fixed scenes for screenshots: ?shot=editor shows the editor with the
// samples loaded; ?shot=cover shows the cover alone at the requested size.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, loadSamples, redraw, { THEMES, SIZES });
} else {
  renderSlots();
  loadSamples().catch(() => { renderSlots(); redraw(); });
}

// Keep the layout helper referenced so tree-shakers and linters see it used.
void layoutPanels;

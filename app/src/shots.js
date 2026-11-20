// Fixed scenes for screenshots: ?shot=editor shows the editor with the
// sample photos loaded and a caption set; ?shot=cover shows the exported
// cover alone at the requested size and theme. window.__shotReady is set
// once the scene has painted, so a screenshot script can wait for it.
export async function runShot(shot, query, state, loadSamples, redraw) {
  const caption = query.get('caption');
  if (caption) {
    document.getElementById('title').value = caption;
  }
  const subtitle = query.get('subtitle');
  if (subtitle) document.getElementById('subtitle').value = subtitle;
  const theme = query.get('theme');
  if (theme && ['sunset', 'neon', 'midnight'].includes(theme)) {
    state.theme = theme;
    document.querySelectorAll('#themePick button').forEach((b) => {
      b.classList.toggle('picked', b.dataset.theme === theme);
    });
  }
  const sizeKey = query.get('size');
  if (sizeKey && ['square', 'portrait', 'wide'].includes(sizeKey)) {
    state.sizeKey = sizeKey;
    document.querySelectorAll('#sizePick button').forEach((b) => {
      b.classList.toggle('picked', b.dataset.size === sizeKey);
    });
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await loadSamples();
  // Give the panels distinct crops so the cover reads as a collage.
  state.panels[1].view = { zoom: 1.4, ox: 0.3, oy: -0.2 };
  state.panels[2].view = { zoom: 1.3, ox: -0.35, oy: 0.15 };
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

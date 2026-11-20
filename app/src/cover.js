// Neon Bay Cover Maker — cover renderer.
//
// Draws a multi-panel GTA-poster-style cover on a canvas: one hero panel plus
// two smaller panels, a sunset/neon colour grade, and bold outlined caption
// lettering. Everything is drawn with the canvas 2D API and system fonts —
// no images, fonts or network are loaded. Pure functions, no DOM state.

export const SIZES = {
  square: { width: 1080, height: 1080, label: '1080 x 1080' },
  portrait: { width: 1080, height: 1350, label: '1080 x 1350' },
  wide: { width: 1920, height: 1080, label: '1920 x 1080' },
};

export const THEMES = {
  sunset: {
    name: 'Sunset',
    sky: ['#ff9a3d', '#ff2e63', '#7b2ff7'],
    scrim: 'rgba(20, 4, 40, 0.72)',
    accent: '#ffd166',
    outline: '#2b0a3d',
    panelTint: ['rgba(255, 120, 60, 0.10)', 'rgba(180, 30, 120, 0.28)'],
  },
  neon: {
    name: 'Neon',
    sky: ['#00f5d4', '#ff00a8', '#7209b7'],
    scrim: 'rgba(4, 8, 32, 0.72)',
    accent: '#00f5d4',
    outline: '#0b1030',
    panelTint: ['rgba(0, 245, 212, 0.08)', 'rgba(255, 0, 168, 0.26)'],
  },
  midnight: {
    name: 'Midnight',
    sky: ['#3a0ca3', '#7209b7', '#ff2e63'],
    scrim: 'rgba(8, 6, 28, 0.74)',
    accent: '#f72585',
    outline: '#12082e',
    panelTint: ['rgba(58, 12, 163, 0.12)', 'rgba(247, 37, 133, 0.26)'],
  },
};

const GAP_FRACTION = 0.012;

/** Panel rectangles for a cover of size w x h. Returns { hero, a, b }. */
export function layoutPanels(w, h, sizeKey) {
  const g = Math.max(4, Math.round(w * GAP_FRACTION));
  if (sizeKey === 'wide') {
    const heroW = Math.round(w * 0.62);
    const rightW = w - heroW - g;
    const halfH = Math.round((h - g) / 2);
    return {
      hero: { x: 0, y: 0, w: heroW, h },
      a: { x: heroW + g, y: 0, w: rightW, h: halfH },
      b: { x: heroW + g, y: halfH + g, w: rightW, h: h - halfH - g },
    };
  }
  const heroH = sizeKey === 'portrait' ? Math.round(h * 0.55) : Math.round(h * 0.62);
  const bottomH = h - heroH - g;
  const halfW = Math.round((w - g) / 2);
  return {
    hero: { x: 0, y: 0, w, h: heroH },
    a: { x: 0, y: heroH + g, w: halfW, h: bottomH },
    b: { x: halfW + g, y: heroH + g, w: w - halfW - g, h: bottomH },
  };
}

/** Cover-fits `img` into `rect`, applying the panel view (zoom, offsets). */
export function drawPhotoInto(ctx, img, view, rect) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * (view.zoom || 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - pw) / 2 + (view.ox || 0) * rect.w * 0.25;
  const dy = rect.y + (rect.h - ph) / 2 + (view.oy || 0) * rect.h * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** Sunset/neon tint + vignette over one panel. */
export function gradePanel(ctx, rect, theme) {
  const tint = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  tint.addColorStop(0, theme.panelTint[0]);
  tint.addColorStop(1, theme.panelTint[1]);
  ctx.fillStyle = tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const vig = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** White divider strips between the panels. */
export function drawDividers(ctx, w, h, sizeKey) {
  ctx.fillStyle = '#ffffff';
  const g = Math.max(4, Math.round(w * GAP_FRACTION));
  const panels = layoutPanels(w, h, sizeKey);
  const edges = sizeKey === 'wide'
    ? [{ x: panels.hero.w, y: 0, w: g, h }, { x: panels.a.x, y: panels.a.h, w: panels.a.w, h: g }]
    : [{ x: 0, y: panels.hero.h, w, h: g }, { x: panels.a.w, y: panels.hero.h + g, w: g, h: panels.a.h }];
  for (const e of edges) ctx.fillRect(e.x, e.y, e.w, e.h);
}

/** Bold outlined caption lettering over the bottom of the cover. */
export function drawCaption(ctx, w, h, title, subtitle, theme) {
  const pad = Math.round(w * 0.045);
  const bandH = Math.round(h * 0.24);
  const bandY = h - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - bandH * 0.5, 0, h);
  scrim.addColorStop(0, 'rgba(10, 4, 24, 0)');
  scrim.addColorStop(1, theme.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - bandH * 0.5, w, bandH * 1.5);

  const lines = title.trim().toUpperCase().split('\n').slice(0, 2).filter(Boolean);
  let size = Math.round(w * 0.105);
  const family = '"Arial Black", "Archivo Black", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const fits = () => lines.every((line) => {
    ctx.font = `900 ${size}px ${family}`;
    return ctx.measureText(line).width <= w - pad * 2;
  });
  while (!fits() && size > 18) size -= 2;
  ctx.font = `900 ${size}px ${family}`;
  ctx.lineJoin = 'round';
  const lineH = size * 1.02;
  const totalH = lineH * lines.length;
  let y = h - pad - (subtitle.trim() ? Math.round(size * 0.52) + Math.round(size * 0.18) : 0) - (totalH - lineH);
  for (const line of lines) {
    ctx.lineWidth = Math.max(3, Math.round(size * 0.09));
    ctx.strokeStyle = theme.outline;
    ctx.strokeText(line, pad, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, pad, y);
    y += lineH;
  }
  const sub = subtitle.trim().toUpperCase();
  if (sub) {
    const subSize = Math.max(16, Math.round(size * 0.30));
    // Short accent bar above the subtitle, in the theme's accent colour.
    ctx.fillStyle = theme.accent;
    ctx.fillRect(pad, h - pad - Math.round(subSize * 0.2) - Math.round(subSize * 0.95), Math.round(w * 0.09), Math.max(3, Math.round(subSize * 0.12)));
    ctx.font = `800 ${subSize}px ${family}`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = theme.accent;
    ctx.fillText(sub, pad, h - pad - Math.round(subSize * 0.2));
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

/**
 * Renders the whole cover onto `canvas` at the size named by state.sizeKey.
 * state: { panels: [{ img, view } x3], title, subtitle, theme }.
 */
export function renderCover(canvas, state) {
  const size = SIZES[state.sizeKey] || SIZES.square;
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const theme = THEMES[state.theme] || THEMES.sunset;
  const panels = layoutPanels(w, h, state.sizeKey);
  const rects = [panels.hero, panels.a, panels.b];
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(0.55, theme.sky[1]);
  sky.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (panel && panel.img) drawPhotoInto(ctx, panel.img, panel.view || {}, rect);
    gradePanel(ctx, rect, theme);
  });
  drawDividers(ctx, w, h, state.sizeKey);
  drawCaption(ctx, w, h, state.title, state.subtitle, theme);
  return canvas;
}

/** Renders the cover at the export size and returns a fresh canvas. */
export function exportCover(state, sizeKey) {
  const canvas = document.createElement('canvas');
  return renderCover(canvas, { ...state, sizeKey });
}

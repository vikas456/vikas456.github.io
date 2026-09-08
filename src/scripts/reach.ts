import type { ReachNode } from '../data/content';

const BLUE = '110,139,255';
const GOLD = '255,184,107';

interface Pt { x: number; y: number }
type Align = 'left' | 'right' | 'center';

interface Placed {
  /** World coordinates — the layout is static; pan and zoom are applied at draw time. */
  x: number;
  y: number;
  r: number;
  label: string;
  align: Align;
  /** Vertical offset of the label from the node centre, in world units. */
  labelDy: number;
  colour: string;
  /** Rendered label width in screen px. Fixed font size, so zoom does not change it. */
  labelWidth: number;
  nodeIndex: number;
  /** null for a product, otherwise the index of the project within it. */
  childIndex: number | null;
}

/**
 * "Where my work lands": a static map of products and the projects behind them.
 *
 * Everything is visible at rest — nothing needs to be expanded to be found. The
 * layout is measured (labels included) and scaled to fit the canvas, so nodes
 * cannot drift off the edge. Pointer: hover previews, click pins, drag pans,
 * ctrl/cmd + wheel or the buttons zoom.
 */
export function initReachDiagram(nodes: ReachNode[]): void {
  const canvas = document.getElementById('reach-canvas') as HTMLCanvasElement | null;
  const tip = document.getElementById('reach-tip');
  const avatar = document.getElementById('avatar') as HTMLImageElement | null;
  if (!canvas || !tip) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0;
  let items: Placed[] = [];
  let core: Pt = { x: 0, y: 0 };
  let fit = 1, viewX = 0, viewY = 0, centreY = 0;
  let zoom = 1, panX = 0, panY = 0;
  let hovered: Placed | null = null;
  let pinned: Placed | null = null;
  let dragging = false, dragMoved = false, dragFrom: Pt = { x: 0, y: 0 }, panFrom: Pt = { x: 0, y: 0 };
  let t = 0;

  const particles = Array.from({ length: 26 }, (_, i) => ({
    n: i % nodes.length,
    p: Math.random(),
    sp: 0.0014 + Math.random() * 0.0018,
  }));

  const PRODUCT_FONT = '600 12px "Manrope Variable", Manrope, sans-serif';
  const CHILD_FONT = '600 11px "Manrope Variable", Manrope, sans-serif';

  /** Builds the static layout in world units. Called once, and again if fonts load late. */
  function layout(): void {
    items = [];
    core = { x: 0, y: 0 };

    // Products sit at the corners of a wide, flat diamond so the branches fan
    // out sideways, where there is the most room.
    const corners: Pt[] = [
      { x: -1, y: -0.58 },
      { x: 1, y: -0.58 },
      { x: -1, y: 0.58 },
      { x: 1, y: 0.58 },
    ];
    const SPREAD_X = 260, SPREAD_Y = 175;

    nodes.forEach((n, i) => {
      const c = corners[i % corners.length];
      const px = c.x * SPREAD_X;
      const py = c.y * SPREAD_Y;
      const colour = n.group === 'revenue' ? GOLD : BLUE;

      items.push({
        x: px, y: py, r: 26, label: n.label, align: 'center', labelDy: 42,
        colour, labelWidth: 0, nodeIndex: i, childIndex: null,
      });

      // Fan the projects away from the centre, flattened vertically.
      const outward = Math.atan2(py, px);
      const count = n.children.length;
      const spread = 1.5;
      n.children.forEach((child, ci) => {
        const offset = count === 1 ? 0 : (ci / (count - 1) - 0.5) * spread;
        const a = outward + offset;
        items.push({
          x: px + Math.cos(a) * 185,
          y: py + Math.sin(a) * 140,
          r: 7,
          label: child.label,
          align: Math.cos(a) < 0 ? 'right' : 'left',
          labelDy: 0,
          colour, labelWidth: 0, nodeIndex: i, childIndex: ci,
        });
      });
    });
  }

  function measureLabels(): void {
    for (const it of items) {
      ctx!.font = it.childIndex === null ? PRODUCT_FONT : CHILD_FONT;
      it.labelWidth = ctx!.measureText(it.label).width;
    }
  }

  /** Screen-space rectangle of an item's label, or null when it is not drawn. */
  function labelRect(it: Placed): { x0: number; y0: number; x1: number; y1: number } | null {
    if (it.childIndex !== null && !showChildLabels() && (hovered ?? pinned) !== it) return null;
    const p = toScreen(it);
    const lw = it.labelWidth;
    const pad = 5;
    if (it.align === 'center') {
      const ly = p.y + it.labelDy * k();
      return { x0: p.x - lw / 2 - pad, y0: ly - 9, x1: p.x + lw / 2 + pad, y1: ly + 9 };
    }
    const off = Math.max(6, (it.r * 1.5 + 10) * k());
    return it.align === 'right'
      ? { x0: p.x - off - lw - pad, y0: p.y - 9, x1: p.x - off + pad, y1: p.y + 9 }
      : { x0: p.x + off - pad, y0: p.y - 9, x1: p.x + off + lw + pad, y1: p.y + 9 };
  }

  /**
   * Scales and centres the layout so every node *and label* fits the canvas.
   *
   * Labels are drawn at a fixed pixel size rather than scaling with the layout,
   * so their width in world units is (measured px / fit) — which depends on the
   * very scale being solved for. A few iterations converge on it; assuming
   * fit === 1 instead lets the widest labels overhang the frame.
   */
  function computeFit(): void {
    // Solve twice: once reserving room for project labels, and — if the result
    // is small enough that those labels get hidden anyway — again without them,
    // so a phone spends its width on the diagram rather than on absent text.
    solve(true);
    if (fit <= CHILD_LABEL_MIN_SCALE) solve(false);
  }

  function solve(withChildLabels: boolean): void {
    let f = 1;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    const margin = 44;
    // The legend sits over the top-left of the canvas and the hint over the
    // bottom-right; keep the diagram clear of both rather than letting labels
    // run underneath them.
    const insetTop = w > 620 ? 62 : 52;
    const insetBottom = w > 620 ? 30 : 24;
    const usableH = h - insetTop - insetBottom;

    for (let pass = 0; pass < 4; pass++) {
      minX = -40; maxX = 40; minY = -40; maxY = 40;
      for (const it of items) {
        ctx!.font = it.childIndex === null ? PRODUCT_FONT : CHILD_FONT;
        const hideLabel = it.childIndex !== null && !withChildLabels;
        const tw = hideLabel ? 0 : ctx!.measureText(it.label).width / f;
        const pad = it.r * 1.5 + 10;
        const halo = it.childIndex === null ? it.r * 2.2 : it.r * 1.5;
        let lx0 = it.x, lx1 = it.x;
        if (it.align === 'center') { lx0 -= tw / 2; lx1 += tw / 2; }
        else if (it.align === 'left') { lx1 = it.x + pad + tw; lx0 = it.x - it.r; }
        else { lx0 = it.x - pad - tw; lx1 = it.x + it.r; }
        minX = Math.min(minX, lx0, it.x - halo);
        maxX = Math.max(maxX, lx1, it.x + halo);
        minY = Math.min(minY, it.y - halo - 8);
        maxY = Math.max(maxY, it.y + it.labelDy + 8, it.y + halo + 8);
      }
      f = Math.min((w - margin) / (maxX - minX), (usableH - margin) / (maxY - minY));
    }

    fit = f;
    viewX = (minX + maxX) / 2;
    viewY = (minY + maxY) / 2;
    centreY = insetTop + usableH / 2;
  }

  const k = () => fit * zoom;
  const toScreen = (p: Pt): Pt => ({
    x: (p.x - viewX) * k() + w / 2 + panX,
    y: (p.y - viewY) * k() + centreY + panY,
  });

  function resize(): void {
    const rect = canvas!.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    computeFit();
  }

  /** Below this scale project labels are dropped; the tooltip carries them. */
  const CHILD_LABEL_MIN_SCALE = 0.46;
  const showChildLabels = () => k() > CHILD_LABEL_MIN_SCALE;

  function draw(): void {
    t += 16;
    ctx!.clearRect(0, 0, w, h);
    const scale = k();
    const coreS = toScreen(core);
    const active = hovered ?? pinned;

    const screens = items.map(toScreen);

    // Trunks: centre -> product.
    items.forEach((it, i) => {
      if (it.childIndex !== null) return;
      const p = screens[i];
      const hot = active?.nodeIndex === it.nodeIndex;
      ctx!.beginPath();
      ctx!.moveTo(coreS.x, coreS.y);
      ctx!.lineTo(p.x, p.y);
      ctx!.strokeStyle = `rgba(${it.colour},${hot ? 0.55 : 0.18})`;
      ctx!.lineWidth = hot ? 1.8 : 1;
      ctx!.stroke();
    });

    // Branches: product -> project.
    items.forEach((it, i) => {
      if (it.childIndex === null) return;
      const parent = items.findIndex((o) => o.nodeIndex === it.nodeIndex && o.childIndex === null);
      const a = screens[parent], b = screens[i];
      const hot = active === it;
      const clusterHot = active?.nodeIndex === it.nodeIndex;
      ctx!.beginPath();
      ctx!.moveTo(a.x, a.y);
      ctx!.lineTo(b.x, b.y);
      ctx!.strokeStyle = `rgba(${it.colour},${hot ? 0.7 : clusterHot ? 0.4 : 0.2})`;
      ctx!.lineWidth = hot ? 1.6 : 1;
      ctx!.stroke();
    });

    // Particles drift along the trunks — the only motion, and it moves nothing
    // the pointer needs to hit.
    if (!reduce) {
      for (const pt of particles) {
        pt.p += pt.sp;
        if (pt.p > 1) pt.p = 0;
        const n = nodes[pt.n];
        const pi = items.findIndex((o) => o.nodeIndex === pt.n && o.childIndex === null);
        const p = screens[pi];
        const s = pt.p;
        ctx!.beginPath();
        ctx!.arc(
          coreS.x + (p.x - coreS.x) * s,
          coreS.y + (p.y - coreS.y) * s,
          1.6, 0, Math.PI * 2,
        );
        ctx!.fillStyle = `rgba(${n.group === 'revenue' ? GOLD : BLUE},${0.7 * Math.sin(s * Math.PI)})`;
        ctx!.fill();
      }
    }

    // Projects.
    items.forEach((it, i) => {
      if (it.childIndex === null) return;
      const p = screens[i];
      const hot = active === it;
      const clusterHot = active?.nodeIndex === it.nodeIndex;
      const r = it.r * scale * (hot ? 1.5 : 1);
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, Math.max(3, r), 0, Math.PI * 2);
      ctx!.fillStyle = hot ? `rgba(${it.colour},0.95)` : 'rgba(18,22,29,.95)';
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${it.colour},${hot ? 1 : clusterHot ? 0.85 : 0.55})`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();

      if (showChildLabels() || hot) {
        ctx!.font = CHILD_FONT;
        ctx!.textAlign = it.align === 'right' ? 'right' : 'left';
        ctx!.textBaseline = 'middle';
        ctx!.fillStyle = hot ? '#F4F7FB' : clusterHot ? 'rgba(215,224,238,.95)' : 'rgba(160,172,192,.85)';
        const off = Math.max(6, (it.r * 1.5 + 10) * scale);
        ctx!.fillText(it.label, p.x + (it.align === 'right' ? -off : off), p.y);
      }
    });

    // Centre portrait.
    const cr = Math.max(18, 30 * scale);
    ctx!.save();
    ctx!.beginPath();
    ctx!.arc(coreS.x, coreS.y, cr, 0, Math.PI * 2);
    ctx!.clip();
    if (avatar?.complete && avatar.naturalWidth) {
      ctx!.drawImage(avatar, coreS.x - cr, coreS.y - cr, cr * 2, cr * 2);
    } else {
      ctx!.fillStyle = '#1A1F29';
      ctx!.fillRect(coreS.x - cr, coreS.y - cr, cr * 2, cr * 2);
    }
    ctx!.restore();
    ctx!.beginPath();
    ctx!.arc(coreS.x, coreS.y, cr, 0, Math.PI * 2);
    ctx!.strokeStyle = 'rgba(244,247,251,.5)';
    ctx!.lineWidth = 1.4;
    ctx!.stroke();

    // Products, drawn above their branches.
    items.forEach((it, i) => {
      if (it.childIndex !== null) return;
      const p = screens[i];
      const hot = active?.nodeIndex === it.nodeIndex;
      const r = it.r * scale * (hot ? 1.08 : 1);

      const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
      g.addColorStop(0, `rgba(${it.colour},${hot ? 0.3 : 0.14})`);
      g.addColorStop(1, `rgba(${it.colour},0)`);
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
      ctx!.fillStyle = g;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx!.fillStyle = hot ? `rgba(${it.colour},.2)` : 'rgba(18,22,29,.95)';
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${it.colour},${hot ? 0.95 : 0.55})`;
      ctx!.lineWidth = hot ? 2 : 1.3;
      ctx!.stroke();

      if (pinned && pinned.nodeIndex === it.nodeIndex) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${it.colour},.4)`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }

      ctx!.font = PRODUCT_FONT;
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.fillStyle = hot ? '#F4F7FB' : 'rgba(205,215,231,.9)';
      ctx!.fillText(it.label, p.x, p.y + it.labelDy * scale);
    });

    requestAnimationFrame(draw);
  }

  function hitTest(mx: number, my: number): Placed | null {
    let best: Placed | null = null;
    let bestD = Infinity;
    items.forEach((it) => {
      const p = toScreen(it);
      const d = Math.hypot(mx - p.x, my - p.y);
      // Generous target for the small project dots.
      const reach = it.childIndex === null ? Math.max(20, it.r * k()) : Math.max(15, it.r * k() + 10);
      if (d < reach && d < bestD) { bestD = d; best = it; return; }

      // The label is part of the target — people aim at the words, not the dot.
      const rect = labelRect(it);
      if (!rect) return;
      if (mx >= rect.x0 && mx <= rect.x1 && my >= rect.y0 && my <= rect.y1) {
        const ld = Math.hypot(mx - (rect.x0 + rect.x1) / 2, my - (rect.y0 + rect.y1) / 2);
        if (ld < bestD) { bestD = ld; best = it; }
      }
    });
    return best;
  }

  function tipHtml(it: Placed): string {
    const n = nodes[it.nodeIndex];
    const col = n.group === 'revenue' ? '#FFB86B' : '#6E8BFF';
    if (it.childIndex === null) {
      return `<h4>${n.label}</h4><p>${n.did}</p>` +
        `<span class="metric" style="color:${col}">${n.metric}</span>` +
        `<span class="hint-more">${n.children.length} projects</span>`;
    }
    const c = n.children[it.childIndex];
    return `<h4>${c.label}</h4><p>${c.detail}</p>` +
      `<span class="metric" style="color:${col}">${n.label}</span>`;
  }

  function renderTip(it: Placed | null): void {
    if (!it) { tip!.classList.remove('on'); return; }
    tip!.innerHTML = tipHtml(it);
    const p = toScreen(it);
    const r = Math.max(10, it.r * k());
    const below = p.y - r < 130;
    tip!.style.left = `${Math.max(120, Math.min(w - 120, p.x))}px`;
    tip!.style.top = `${below ? p.y + r : p.y - r}px`;
    tip!.style.transform = below ? 'translate(-50%,14%)' : 'translate(-50%,-124%)';
    tip!.classList.add('on');
  }

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    if (dragging) {
      panX = panFrom.x + (e.clientX - dragFrom.x);
      panY = panFrom.y + (e.clientY - dragFrom.y);
      if (Math.hypot(e.clientX - dragFrom.x, e.clientY - dragFrom.y) > 4) dragMoved = true;
      renderTip(pinned);
      return;
    }

    const hit = hitTest(mx, my);
    if (hit === hovered) return;
    hovered = hit;
    canvas.style.cursor = hit ? 'pointer' : 'grab';
    // Hover always wins so the tooltip switches immediately; releasing the
    // pointer falls back to whatever is pinned.
    renderTip(hovered ?? pinned);
  });

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (e.pointerType !== 'mouse') { hovered = hit; renderTip(hit ?? pinned); }
    dragging = true;
    dragMoved = false;
    dragFrom = { x: e.clientX, y: e.clientY };
    panFrom = { x: panX, y: panY };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointerup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const wasDrag = dragMoved;
    dragging = false;
    canvas.releasePointerCapture?.(e.pointerId);
    if (wasDrag) { canvas.style.cursor = 'grab'; return; }

    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    pinned = hit && pinned !== hit ? hit : null;
    hovered = hit;
    renderTip(hovered ?? pinned);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
    if (hit) {
      document.dispatchEvent(new CustomEvent('reach:explore', {
        detail: { node: nodes[hit.nodeIndex].key },
      }));
    }
  });

  canvas.addEventListener('pointerleave', () => {
    if (dragging) return;
    hovered = null;
    canvas.style.cursor = 'grab';
    renderTip(pinned);
  });

  // ctrl/cmd + wheel, which is also what a trackpad pinch sends. Plain wheel is
  // left alone so the page still scrolls normally over the diagram.
  canvas.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
  }, { passive: false });

  function setZoom(next: number): void {
    zoom = Math.max(0.6, Math.min(3, next));
    renderTip(hovered ?? pinned);
  }

  function reset(): void {
    zoom = 1; panX = 0; panY = 0;
    pinned = null; hovered = null;
    tip!.classList.remove('on');
  }

  document.getElementById('reach-in')?.addEventListener('click', () => setZoom(zoom * 1.25));
  document.getElementById('reach-out')?.addEventListener('click', () => setZoom(zoom / 1.25));
  document.getElementById('reach-reset')?.addEventListener('click', reset);

  window.addEventListener('resize', resize);
  layout();
  measureLabels();
  resize();
  canvas.style.cursor = 'grab';
  // Re-measure once webfonts land, since the fit depends on label widths.
  document.fonts?.ready.then(() => { measureLabels(); computeFit(); });
  requestAnimationFrame(draw);
}

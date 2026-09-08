import type { ReachNode } from '../data/content';

const BLUE = '110,139,255';
const GOLD = '255,184,107';

interface Pt { x: number; y: number }

/**
 * "Where my work lands": a portrait at the centre, one node per product, and
 * each product's projects branching off it.
 *
 * Project labels stay hidden until their cluster is active, otherwise nineteen
 * labels collide. Hovering (or tapping) a product reveals its branches; the
 * text equivalent beside the canvas carries the same content for crawlers,
 * screen readers and anyone without a pointer.
 */
export function initReachDiagram(nodes: ReachNode[]): void {
  const canvas = document.getElementById('reach-canvas') as HTMLCanvasElement | null;
  const tip = document.getElementById('reach-tip');
  const avatar = document.getElementById('avatar') as HTMLImageElement | null;
  if (!canvas || !tip) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, cx = 0, cy = 0, rx = 0, ry = 0, scale = 1;
  let t = 0, px = 0, py = 0;
  /** Index of the hovered product, or the parent of the hovered project. */
  let activeNode: number | null = null;
  /** Index of the hovered project within the active product. */
  let activeChild: number | null = null;
  // Branch open/close is driven by wall clock rather than frame count, so
  // hit-testing stays consistent with what is drawn even if frames are dropped
  // or throttled (background tab, low-power mode).
  const OPEN_MS = 220;
  const anim = nodes.map(() => ({ from: 0, to: 0, at: 0 }));
  const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
  function openAmount(i: number): number {
    const a = anim[i];
    const p = Math.min(1, (performance.now() - a.at) / OPEN_MS);
    return a.from + (a.to - a.from) * (reduce ? 1 : easeOut(p));
  }
  function setOpen(i: number, to: number): void {
    const a = anim[i];
    if (a.to === to) return;
    a.from = openAmount(i);
    a.to = to;
    a.at = performance.now();
  }

  const particles = Array.from({ length: 26 }, (_, i) => ({
    n: i % nodes.length,
    p: Math.random(),
    sp: 0.0016 + Math.random() * 0.0022,
  }));

  function resize(): void {
    const rect = canvas!.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width; h = rect.height;
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = h / 2;
    // Elliptical orbit, deliberately flatter than it is wide. Nodes drift, so
    // every node eventually passes the top and bottom of the canvas; the
    // vertical radius is budgeted to leave room for a node's branches and their
    // labels rather than letting them clip against the edge.
    scale = Math.max(0.72, Math.min(1, w / 900));
    const branchReach = (86 + 14) * scale; // branch length + label height
    // Narrow canvases pull the orbit in so branches stay inside the frame.
    rx = Math.min(w * (w > 620 ? 0.30 : 0.24), 300);
    ry = Math.max(60, Math.min(h * 0.24, h / 2 - branchReach - 34 * scale));
  }

  function nodePos(n: ReachNode): Pt {
    const drift = reduce ? 0 : Math.sin(t * 0.00042 + n.angle * 2.1) * 0.035;
    const a = n.angle + (reduce ? 0 : t * 0.00004);
    const k = n.distance * (1 + drift);
    return {
      x: cx + Math.cos(a) * rx * k + px * 0.2,
      y: cy + Math.sin(a) * ry * k + py * 0.2,
    };
  }

  /** Projects fan out from their product, pointing away from the centre. */
  function childPos(n: ReachNode, i: number, parent: Pt, amount: number): Pt {
    const outward = Math.atan2(parent.y - cy, parent.x - cx);
    const count = n.children.length;
    const spread = 1.15;
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
    const a = outward + offset;
    const dist = (52 + 34 * amount) * scale;
    return { x: parent.x + Math.cos(a) * dist * 1.15, y: parent.y + Math.sin(a) * dist };
  }

  function placeTip(p: Pt, r: number): void {
    const below = p.y - r < 118;
    tip!.style.left = `${Math.max(110, Math.min(w - 110, p.x))}px`;
    tip!.style.top = `${below ? p.y + r : p.y - r}px`;
    tip!.style.transform = below ? 'translate(-50%,14%)' : 'translate(-50%,-124%)';
  }

  function showTip(html: string, p: Pt, r: number): void {
    tip!.innerHTML = html;
    placeTip(p, r);
    tip!.classList.add('on');
  }

  function draw(): void {
    t += 16;
    ctx!.clearRect(0, 0, w, h);
    const core = { x: cx + px * 0.06, y: cy + py * 0.06 };
    const pts = nodes.map(nodePos);

    // Trunk edges: centre -> product.
    nodes.forEach((n, i) => {
      const p = pts[i];
      const col = n.group === 'revenue' ? GOLD : BLUE;
      const hot = activeNode === i;
      ctx!.beginPath();
      ctx!.moveTo(core.x, core.y);
      ctx!.quadraticCurveTo(
        (core.x + p.x) / 2 + (p.y - core.y) * 0.11,
        (core.y + p.y) / 2 - (p.x - core.x) * 0.11,
        p.x, p.y,
      );
      ctx!.strokeStyle = `rgba(${col},${hot ? 0.6 : 0.17})`;
      ctx!.lineWidth = hot ? 1.8 : 1;
      ctx!.stroke();
    });

    // Particles along the trunks.
    if (!reduce) {
      for (const pt of particles) {
        pt.p += pt.sp;
        if (pt.p > 1) pt.p = 0;
        const n = nodes[pt.n];
        const p = pts[pt.n];
        const s = pt.p, u = 1 - s;
        const mx = (core.x + p.x) / 2 + (p.y - core.y) * 0.11;
        const my = (core.y + p.y) / 2 - (p.x - core.x) * 0.11;
        ctx!.beginPath();
        ctx!.arc(
          u * u * core.x + 2 * u * s * mx + s * s * p.x,
          u * u * core.y + 2 * u * s * my + s * s * p.y,
          1.6, 0, Math.PI * 2,
        );
        ctx!.fillStyle = `rgba(${n.group === 'revenue' ? GOLD : BLUE},${0.7 * Math.sin(s * Math.PI)})`;
        ctx!.fill();
      }
    }

    // Branches: product -> project.
    nodes.forEach((n, i) => {
      const amount = openAmount(i);
      if (amount < 0.02) return;
      const parent = pts[i];
      const col = n.group === 'revenue' ? GOLD : BLUE;
      n.children.forEach((child, ci) => {
        const c = childPos(n, ci, parent, amount);
        const isHot = activeNode === i && activeChild === ci;
        ctx!.beginPath();
        ctx!.moveTo(parent.x, parent.y);
        ctx!.lineTo(c.x, c.y);
        ctx!.strokeStyle = `rgba(${col},${0.32 * amount})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();

        const cr = (isHot ? 7.5 : 5.5) * scale * amount;
        ctx!.beginPath();
        ctx!.arc(c.x, c.y, cr, 0, Math.PI * 2);
        ctx!.fillStyle = isHot ? `rgba(${col},0.9)` : 'rgba(18,22,29,.95)';
        ctx!.fill();
        ctx!.strokeStyle = `rgba(${col},${(isHot ? 1 : 0.65) * amount})`;
        ctx!.lineWidth = 1.2;
        ctx!.stroke();

        // A narrow canvas has no room for four labels around a node, so there
        // only the hovered branch is named; the tooltip carries the rest.
        if (w > 620 || isHot) {
          ctx!.font = `600 ${10.5 * scale}px "Manrope Variable", Manrope, sans-serif`;
          ctx!.textAlign = c.x < parent.x ? 'right' : 'left';
          ctx!.textBaseline = 'middle';
          ctx!.fillStyle = isHot
            ? `rgba(244,247,251,${amount})`
            : `rgba(191,200,216,${0.8 * amount})`;
          ctx!.fillText(child.label, c.x + (c.x < parent.x ? -cr - 6 : cr + 6), c.y);
        }
      });
    });

    // Centre portrait.
    const cr = 28 * scale;
    ctx!.save();
    ctx!.beginPath();
    ctx!.arc(core.x, core.y, cr, 0, Math.PI * 2);
    ctx!.clip();
    if (avatar?.complete && avatar.naturalWidth) {
      ctx!.drawImage(avatar, core.x - cr, core.y - cr, cr * 2, cr * 2);
    } else {
      ctx!.fillStyle = '#1A1F29';
      ctx!.fillRect(core.x - cr, core.y - cr, cr * 2, cr * 2);
    }
    ctx!.restore();
    ctx!.beginPath();
    ctx!.arc(core.x, core.y, cr, 0, Math.PI * 2);
    ctx!.strokeStyle = 'rgba(244,247,251,.5)';
    ctx!.lineWidth = 1.4;
    ctx!.stroke();
    ctx!.beginPath();
    ctx!.arc(core.x, core.y, cr + 7 + (reduce ? 0 : Math.sin(t * 0.0013) * 2.2), 0, Math.PI * 2);
    ctx!.strokeStyle = 'rgba(110,139,255,.24)';
    ctx!.lineWidth = 1;
    ctx!.stroke();

    // Product nodes, drawn last so they sit above their branches.
    nodes.forEach((n, i) => {
      const p = pts[i];
      const hot = activeNode === i;
      const col = n.group === 'revenue' ? GOLD : BLUE;
      const r = n.radius * scale * (hot ? 1.1 : 1);

      const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.1);
      g.addColorStop(0, `rgba(${col},${hot ? 0.3 : 0.15})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r * 2.1, 0, Math.PI * 2);
      ctx!.fillStyle = g;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx!.fillStyle = hot ? `rgba(${col},.20)` : 'rgba(18,22,29,.95)';
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${hot ? 0.95 : 0.5})`;
      ctx!.lineWidth = hot ? 1.9 : 1.2;
      ctx!.stroke();

      ctx!.font = `600 ${11.5 * scale}px "Manrope Variable", Manrope, sans-serif`;
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.fillStyle = hot ? '#F4F7FB' : 'rgba(191,200,216,.82)';
      ctx!.fillText(n.label, p.x, p.y + r + 13 * scale);
    });

    requestAnimationFrame(draw);
  }

  /** Projects are hit-tested first — they are smaller and sit on top. */
  function hitTest(mx: number, my: number): { node: number | null; child: number | null } {
    if (activeNode !== null) {
      const n = nodes[activeNode];
      const parent = nodePos(n);
      const amount = openAmount(activeNode);
      for (let ci = 0; ci < n.children.length; ci++) {
        const c = childPos(n, ci, parent, amount);
        if (Math.hypot(mx - c.x, my - c.y) < 16 * scale) return { node: activeNode, child: ci };
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const p = nodePos(nodes[i]);
      if (Math.hypot(mx - p.x, my - p.y) < nodes[i].radius * scale + 10) return { node: i, child: null };
    }
    return { node: null, child: null };
  }

  function update(mx: number, my: number): void {
    const hit = hitTest(mx, my);
    // Keep a cluster open while the pointer travels over its branches.
    if (hit.node === null && activeNode !== null && openAmount(activeNode) > 0.4) {
      const parent = nodePos(nodes[activeNode]);
      if (Math.hypot(mx - parent.x, my - parent.y) < 150 * scale) return;
    }
    if (hit.node === activeNode && hit.child === activeChild) return;

    activeNode = hit.node;
    activeChild = hit.child;
    nodes.forEach((_, i) => setOpen(i, i === activeNode ? 1 : 0));

    if (activeNode === null) {
      tip!.classList.remove('on');
      return;
    }

    const n = nodes[activeNode];
    const col = n.group === 'revenue' ? '#FFB86B' : '#6E8BFF';
    if (activeChild !== null) {
      const c = n.children[activeChild];
      showTip(
        `<h4>${c.label}</h4><p>${c.detail}</p><span class="metric" style="color:${col}">${n.label}</span>`,
        childPos(n, activeChild, nodePos(n), openAmount(activeNode)),
        14,
      );
    } else {
      const more = n.children.length ? `<span class="hint-more">${n.children.length} projects — hover the branches</span>` : '';
      showTip(
        `<h4>${n.label}</h4><p>${n.did}</p><span class="metric" style="color:${col}">${n.metric}</span>${more}`,
        nodePos(n),
        n.radius * scale,
      );
      document.dispatchEvent(new CustomEvent('reach:explore', { detail: { node: n.key } }));
    }
  }

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    px = (mx - cx) * 0.07;
    py = (my - cy) * 0.07;
    update(mx, my);
  });

  // Touch: tapping a product opens it, tapping empty space closes it.
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    update(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener('pointerleave', () => {
    activeNode = null;
    activeChild = null;
    nodes.forEach((_, i) => setOpen(i, 0));
    px = 0;
    py = 0;
    tip.classList.remove('on');
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
}

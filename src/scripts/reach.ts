import type { ReachNode } from '../data/content';

const BLUE = '110,139,255';
const GOLD = '255,184,107';

/**
 * Draws the "where my work lands" constellation: a portrait at the centre with
 * one orbiting node per product, particles flowing outward along each edge, and
 * a tooltip on hover. Falls back to a single static frame when the visitor has
 * asked for reduced motion.
 */
export function initReachDiagram(nodes: ReachNode[]): void {
  const canvas = document.getElementById('reach-canvas') as HTMLCanvasElement | null;
  const tip = document.getElementById('reach-tip');
  const avatar = document.getElementById('avatar') as HTMLImageElement | null;
  if (!canvas || !tip) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, cx = 0, cy = 0, radius = 0;
  let t = 0, hover: number | null = null, px = 0, py = 0;

  const particles = Array.from({ length: 32 }, (_, i) => ({
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
    radius = Math.min(w * 0.36, h * 0.4);
  }

  function pos(n: ReachNode): { x: number; y: number } {
    const drift = reduce ? 0 : Math.sin(t * 0.00042 + n.angle * 2.1) * 0.045;
    const a = n.angle + (reduce ? 0 : t * 0.000055);
    const d = radius * n.distance * (1 + drift);
    return { x: cx + Math.cos(a) * d * 1.34 + px * 0.22, y: cy + Math.sin(a) * d + py * 0.22 };
  }

  function placeTip(p: { x: number; y: number }, n: ReachNode): void {
    const below = p.y - n.radius < 108;
    tip!.style.left = `${Math.max(96, Math.min(w - 96, p.x))}px`;
    tip!.style.top = `${below ? p.y + n.radius : p.y - n.radius}px`;
    tip!.style.transform = below ? 'translate(-50%,14%)' : 'translate(-50%,-124%)';
  }

  function draw(): void {
    t += 16;
    ctx!.clearRect(0, 0, w, h);
    const core = { x: cx + px * 0.06, y: cy + py * 0.06 };
    const pts = nodes.map(pos);

    nodes.forEach((n, i) => {
      const p = pts[i];
      const col = n.group === 'revenue' ? GOLD : BLUE;
      const hot = hover === i;
      ctx!.beginPath();
      ctx!.moveTo(core.x, core.y);
      ctx!.quadraticCurveTo(
        (core.x + p.x) / 2 + (p.y - core.y) * 0.11,
        (core.y + p.y) / 2 - (p.x - core.x) * 0.11,
        p.x, p.y,
      );
      ctx!.strokeStyle = `rgba(${col},${hot ? 0.55 : 0.17})`;
      ctx!.lineWidth = hot ? 1.7 : 1;
      ctx!.stroke();
    });

    if (!reduce) {
      for (const pt of particles) {
        pt.p += pt.sp;
        if (pt.p > 1) pt.p = 0;
        const n = nodes[pt.n];
        const p = pts[pt.n];
        const s = pt.p, u = 1 - s;
        const mx = (core.x + p.x) / 2 + (p.y - core.y) * 0.11;
        const my = (core.y + p.y) / 2 - (p.x - core.x) * 0.11;
        const x = u * u * core.x + 2 * u * s * mx + s * s * p.x;
        const y = u * u * core.y + 2 * u * s * my + s * s * p.y;
        ctx!.beginPath();
        ctx!.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${n.group === 'revenue' ? GOLD : BLUE},${0.75 * Math.sin(s * Math.PI)})`;
        ctx!.fill();
      }
    }

    const cr = 30;
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

    nodes.forEach((n, i) => {
      const p = pts[i];
      const hot = hover === i;
      const col = n.group === 'revenue' ? GOLD : BLUE;
      const r = n.radius * (hot ? 1.14 : 1);

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

      ctx!.font = '600 11.5px "Manrope Variable", Manrope, sans-serif';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.fillStyle = hot ? '#F4F7FB' : 'rgba(191,200,216,.82)';
      ctx!.fillText(n.label, p.x, p.y + r + 14);
    });

    requestAnimationFrame(draw);
  }

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    px = (mx - cx) * 0.09;
    py = (my - cy) * 0.09;

    let found: number | null = null;
    nodes.forEach((n, i) => {
      const p = pos(n);
      if (Math.hypot(mx - p.x, my - p.y) < n.radius + 9) found = i;
    });

    if (found !== hover) {
      hover = found;
      if (hover === null) {
        tip.classList.remove('on');
      } else {
        const n = nodes[hover];
        tip.innerHTML =
          `<h4>${n.label}</h4><p>${n.did}</p>` +
          `<span class="metric" style="color:${n.group === 'revenue' ? '#FFB86B' : '#6E8BFF'}">${n.metric}</span>`;
        placeTip(pos(n), n);
        tip.classList.add('on');
        document.dispatchEvent(new CustomEvent('reach:explore', { detail: { node: n.key } }));
      }
    } else if (hover !== null) {
      placeTip(pos(nodes[hover]), nodes[hover]);
    }
  });

  canvas.addEventListener('pointerleave', () => {
    hover = null;
    px = 0;
    py = 0;
    tip.classList.remove('on');
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
}

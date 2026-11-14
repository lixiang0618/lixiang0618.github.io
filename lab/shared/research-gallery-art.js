/* Shared, deterministic SVGs for the homepage and bilingual Lab gallery. */
'use strict';
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
function cchan(lang = 'en') {
  const zh = lang === 'zh';
  const node = (x, y, label, type, motion = '') => `<g transform="translate(${x} ${y})"><g class="coupling-node coupling-${type} ${motion}"><circle r="24"/><text text-anchor="middle" y="7">${label}</text></g></g>`;
  return `<svg class="coupling-story" viewBox="0 0 600 260" role="img" aria-label="${zh ? '耦合示意：先沿 P1-H-D′-P3 走出错误路径，H 与 D 融合后沿 P1-HD-P2 走出正确路径。' : 'Coupling illustration: reject P1–H–D′–P3, fuse H and D, then follow P1–HD–P2.'}">
  <defs><linearGradient id="coupling-hd-fill"><stop offset="0%" stop-color="var(--art-green)"/><stop offset="49%" stop-color="var(--art-green)"/><stop offset="51%" stop-color="var(--art-gold)"/><stop offset="100%" stop-color="var(--art-gold)"/></linearGradient></defs>
  <g class="coupling-raw-edges"><path d="M65 120H215L350 62H515M215 120L350 182H515"/></g>
  <g class="coupling-fused-edges"><path d="M65 120H295L515 62M295 120L350 182H515"/></g>
  <path class="coupling-route coupling-wrong" data-route="P1-H-Dprime-P3" pathLength="1" d="M65 120H215L350 182H515"/>
  <path class="coupling-route coupling-correct" data-route="P1-HD-P2" pathLength="1" d="M65 120H295L515 62"/>
  ${node(65, 120, 'P₁', 'patient')}${node(515, 62, 'P₂', 'patient')}${node(515, 182, 'P₃', 'patient')}
  ${node(215, 120, 'H', 'hospital', 'coupling-h')}${node(350, 62, 'D', 'diagnosis', 'coupling-d')}${node(350, 182, 'D′', 'diagnosis')}
  <g class="coupling-halo" transform="translate(295 120)"><circle r="45"/></g>
  <g class="coupling-hd" transform="translate(295 120)" data-members="H D"><rect x="-40" y="-25" width="80" height="50" rx="25" style="fill:url(#coupling-hd-fill)"/><text text-anchor="middle" y="8">HD</text></g>
  <g class="coupling-result coupling-cross" transform="translate(565 182)"><circle r="15"/><path d="M-5-5 5 5M5-5-5 5"/></g>
  <g class="coupling-result coupling-check" transform="translate(565 62)"><circle r="15"/><path d="m-6 0 4 5 9-10"/></g>
  <g class="coupling-phase coupling-phase-wrong"><text x="300" y="244" text-anchor="middle">P₁ → H → D′ → P₃</text></g>
  <g class="coupling-phase coupling-phase-merge"><text x="300" y="244" text-anchor="middle">H + D → HD</text></g>
  <g class="coupling-phase coupling-phase-correct"><text x="300" y="244" text-anchor="middle">P₁ → HD → P₂</text></g>
  </svg>`;
}
function sna(lang, data) {
  const zh = lang === 'zh';
  const cores = data.nodes.filter(n => n.core), periphery = data.nodes.filter(n => !n.core);
  // A compact core/periphery projection of the same source nodes and edges.
  // Layout is illustrative; membership and connectivity come from research data.
  const positions = new Map();
  cores.forEach((n, i) => {
    const a = i * Math.PI * 2 / cores.length - Math.PI / 2;
    positions.set(n.id, i === 0 ? [300, 119] : [300 + Math.cos(a) * (i % 3 === 0 ? 37 : 60), 119 + Math.sin(a) * (i % 3 === 0 ? 29 : 46)]);
  });
  periphery.forEach((n, i) => {
    const a = i * Math.PI * 2 / periphery.length - Math.PI / 2;
    const r = i % 2 ? 1 : .79;
    positions.set(n.id, [300 + Math.cos(a) * 246 * r, 119 + Math.sin(a) * 96 * r]);
  });
  const edges = [];
  for (let a = 0; a < data.nodes.length; a++) for (let b = a + 1; b < data.nodes.length; b++) {
    if (!data.binary[a][b] && !data.binary[b][a]) continue;
    const p = positions.get(data.nodes[a].id), q = positions.get(data.nodes[b].id);
    const core = data.nodes[a].core && data.nodes[b].core;
    edges.push(`<path class="sna-focus-edge${core ? ' sna-focus-core-edge' : ''}" data-source="${data.nodes[a].id}" data-target="${data.nodes[b].id}" d="M${p[0].toFixed(2)} ${p[1].toFixed(2)} ${q[0].toFixed(2)} ${q[1].toFixed(2)}"/>`);
  }
  const nodes = data.nodes.map(n => {
    const [x, y] = positions.get(n.id);
    return `<g class="sna-focus-node${n.core ? ' sna-focus-core' : ' sna-focus-periphery'}" data-school="${n.id}" data-core="${n.core}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><title>${escape(n.name[lang])}</title><circle r="${n.core ? 5 : 3.4}"/>${n.core ? `<text class="sna-core-code" y="-10" text-anchor="middle">${escape(n.code)}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="sna-focus-story" viewBox="0 0 600 260" role="img" aria-label="${zh ? `${data.nodes.length} 所高校的馆际网络：标出 ${cores.length} 所核心高校，推进核心特写，再回到全局。` : `${data.nodes.length}-university library network: identify ${cores.length} core universities, zoom into the core, return to the overview.`}">
  <defs><clipPath id="sna-focus-clip"><rect x="16" y="7" width="568" height="218" rx="6"/></clipPath></defs>
  <g clip-path="url(#sna-focus-clip)"><g class="sna-camera">
  <ellipse class="sna-focus-boundary" cx="300" cy="119" rx="78" ry="51"/>
  ${edges.join('')}${nodes}</g></g>
  <g class="sna-focus-label sna-label-overview"><text x="300" y="245" text-anchor="middle">${zh ? `${data.nodes.length} 所高校 · 全局网络` : `${data.nodes.length} universities · Overview`}</text></g>
  <g class="sna-focus-label sna-label-core"><text x="300" y="245" text-anchor="middle">${zh ? `${cores.length} 所核心高校` : `${cores.length} core universities`}</text></g>
  <g class="sna-focus-label sna-label-close"><text x="300" y="245" text-anchor="middle">${zh ? '核心特写' : 'Core · Close-up'}</text></g>
  </svg>`;
}
module.exports = {cchan, sna};

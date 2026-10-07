/* =========================================================================
   STREAMLY SIM — PROCEDURAL THUMBNAILS (v2)
   Flat-illustration thumbnails built live from SVG: lit backgrounds, a
   framed subject, a consistent cartoon creator per channel, style
   treatments (shock / funny / action / clean / gameplay) and a caption.

   thumbSVG({ seed, topic, style, title, face, guestFace, caption })
   faceSVG(seed)
   ========================================================================= */
(function(){
  const W = 160, H = 90;

  function hashStr(s){
    let h = 2166136261 >>> 0;
    s = String(s || 'x');
    for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed){
    let a = hashStr(seed);
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const f = n => Math.round(n * 10) / 10;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* Gradient factory — ids are namespaced per thumbnail so dozens can share a page. */
  function gradients(uid){
    const defs = [];
    return {
      defs,
      lin(stops, horiz){
        const id = uid + 'l' + defs.length;
        const body = stops.map((s, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${s[0]}"${s[1] !== undefined ? ` stop-opacity="${s[1]}"` : ''}/>`).join('');
        defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="${horiz ? 1 : 0}" y2="${horiz ? 0 : 1}">${body}</linearGradient>`);
        return `url(#${id})`;
      },
      rad(stops, cx, cy, rr){
        const id = uid + 'r' + defs.length;
        const body = stops.map((s, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${s[0]}" stop-opacity="${s[1]}"/>`).join('');
        defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${rr}">${body}</radialGradient>`);
        return `url(#${id})`;
      },
    };
  }

  /* ---------------- scenes ---------------- */
  /* Each scene marks its subject with FG ... EG. Covers with a face keep the subject on the
     left (the face takes the right); "clean" covers have no face, so the subject is slid to
     the middle of the frame. `cx` is the subject's horizontal centre. */
  const FG = '\u0001', EG = '\u0002';
  const SCENES = {
    gaming(r, G){
      const sets = [
        { sky: ['#1b1150', '#4b1d8f'], neon: '#39ffa8', pop: '#ff3d9a' },
        { sky: ['#06182e', '#0b5e8a'], neon: '#5ce1ff', pop: '#ffb800' },
        { sky: ['#2b0a24', '#7a1442'], neon: '#ff6b3d', pop: '#b8ff3d' },
      ];
      const S = pick(r, sets);
      let s = `<rect width="${W}" height="${H}" fill="${G.lin([[S.sky[0]], [S.sky[1]]])}"/>`;
      for (let i = 0; i < 20; i++) s += `<circle cx="${f(r() * W)}" cy="${f(r() * 46)}" r="${f(.4 + r() * .7)}" fill="#fff" opacity="${f(.25 + r() * .55)}"/>`;
      // skyline
      let x = -4;
      while (x < W){
        const w = 8 + r() * 12, h = 14 + r() * 26;
        s += `<rect x="${f(x)}" y="${f(58 - h)}" width="${f(w)}" height="${f(h + 6)}" fill="#000" opacity=".42"/>`;
        for (let wy = 0; wy < 3; wy++) if (r() < .5) s += `<rect x="${f(x + 2 + r() * (w - 6))}" y="${f(60 - h + wy * 6)}" width="2" height="2.4" fill="${S.neon}" opacity=".8"/>`;
        x += w + 2;
      }
      // floor + perspective grid
      s += `<rect y="58" width="${W}" height="32" fill="${G.lin([['#05030f'], [S.sky[1], .85]])}"/>`;
      for (let i = -6; i <= 6; i++) s += `<line x1="${f(80 + i * 10)}" y1="58" x2="${f(80 + i * 60)}" y2="90" stroke="${S.neon}" stroke-width=".6" opacity=".45"/>`;
      [60, 64, 70, 79].forEach(y => s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${S.neon}" stroke-width=".6" opacity=".4"/>`);
      // controller, lit from above
      const cx = 48, cy = 48;
      s += FG + `<ellipse cx="${cx}" cy="${cy + 20}" rx="30" ry="5" fill="#000" opacity=".35"/>`;
      s += `<g transform="rotate(${f(-10 + r() * 8)} ${cx} ${cy})">
        <rect x="${cx - 28}" y="${cy - 13}" width="56" height="26" rx="13" fill="${G.lin([['#33334a'], ['#14141f']])}" stroke="${S.neon}" stroke-width="1.4"/>
        <rect x="${cx - 24}" y="${cy - 10}" width="48" height="8" rx="4" fill="#fff" opacity=".12"/>
        <rect x="${cx - 19}" y="${cy - 1.5}" width="11" height="3.4" rx="1.4" fill="#e9e9f2"/><rect x="${cx - 15.2}" y="${cy - 5.4}" width="3.4" height="11" rx="1.4" fill="#e9e9f2"/>
        <circle cx="${cx + 12}" cy="${cy - 4}" r="2.8" fill="${S.pop}"/><circle cx="${cx + 19}" cy="${cy + 1}" r="2.8" fill="${S.neon}"/>
        <circle cx="${cx + 6}" cy="${cy + 3}" r="2.8" fill="#ffd23f"/><circle cx="${cx + 12.5}" cy="${cy + 8}" r="2.8" fill="#fff" opacity=".85"/>
      </g>` + EG;
      return { s, accent: S.pop, glow: S.neon, focus: [cx, cy], cx, dark: true };
    },

    tech(r, G){
      const sets = [
        { bg: ['#07293a', '#031720'], glow: '#4fd6ff', pop: '#ffcf3d', light: false },
        { bg: ['#1b1b2e', '#0c0c16'], glow: '#9dff6e', pop: '#ff6b4a', light: false },
        { bg: ['#f2f5f7', '#cfd9e0'], glow: '#2f6bff', pop: '#ff3d6e', light: true },
      ];
      const S = pick(r, sets);
      let s = `<rect width="${W}" height="${H}" fill="${G.lin([[S.bg[0]], [S.bg[1]]])}"/>`;
      s += `<rect y="70" width="${W}" height="20" fill="${S.light ? '#b9c5cd' : '#000'}" opacity="${S.light ? .8 : .45}"/>`;
      s += FG + `<circle cx="52" cy="44" r="46" fill="${G.rad([[S.glow, .38], [S.glow, 0]], .5, .5, .5)}"/>`;
      s += `<ellipse cx="52" cy="72" rx="34" ry="5" fill="#000" opacity=".3"/>`;
      if (r() < .5){
        s += `<g transform="rotate(-7 52 44)">
          <rect x="35" y="10" width="34" height="62" rx="7" fill="${G.lin([['#2a2a33'], ['#0d0d12']])}" stroke="#4a4a58" stroke-width="1"/>
          <rect x="38" y="15" width="28" height="52" rx="3" fill="${G.lin([[S.glow], ['#0b3550']])}"/>
          <rect x="41" y="19" width="9" height="9" rx="2.5" fill="#fff" opacity=".92"/><rect x="53" y="19" width="9" height="9" rx="2.5" fill="${S.pop}"/>
          <rect x="41" y="31" width="9" height="9" rx="2.5" fill="${S.pop}" opacity=".7"/><rect x="53" y="31" width="9" height="9" rx="2.5" fill="#fff" opacity=".8"/>
          <rect x="41" y="46" width="20" height="3" rx="1.5" fill="#fff" opacity=".75"/><rect x="41" y="52" width="13" height="3" rx="1.5" fill="#fff" opacity=".5"/>
          <rect x="44" y="12" width="16" height="2.4" rx="1.2" fill="#000" opacity=".5"/>
        </g>`;
      } else {
        s += `<rect x="18" y="20" width="68" height="42" rx="3" fill="${G.lin([['#23232c'], ['#0e0e14']])}" stroke="#4a4a58" stroke-width="1"/>
          <rect x="22" y="24" width="60" height="34" fill="${G.lin([[S.glow], ['#0a2c44']])}"/>
          <path d="M26 50 36 39 45 46 57 31 78 48" stroke="#08131c" stroke-width="2.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="M8 62h88l-7 9H15z" fill="${G.lin([['#9aa3ad'], ['#5d656e']])}"/>`;
      }
      s += `<path d="M96 14l2.4 6.6 6.6 2.4-6.6 2.4L96 32l-2.4-6.6L87 23l6.6-2.4z" fill="${S.pop}" opacity=".95"/>` + EG;
      return { s, accent: S.pop, glow: S.glow, focus: [52, 42], cx: 54, dark: !S.light };
    },

    lifestyle(r, G){
      const sets = [
        { sky: ['#ffd9a8', '#ff9e7a'], sun: '#fff3c4', leaf: '#3f8f5a', wall: '#f7ece0' },
        { sky: ['#bfe3f2', '#7fc1e3'], sun: '#fffbe8', leaf: '#2f7a4a', wall: '#eef4f7' },
        { sky: ['#f9c9d8', '#f79ab4'], sun: '#ffeec2', leaf: '#4c8c3f', wall: '#fbeef2' },
      ];
      const S = pick(r, sets);
      let s = `<rect width="${W}" height="${H}" fill="${S.wall}"/>`;
      // window with morning light
      s += FG + `<rect x="10" y="6" width="66" height="58" rx="3" fill="${G.lin([[S.sky[0]], [S.sky[1]]])}"/>
        <circle cx="42" cy="38" r="14" fill="${S.sun}"/>
        <path d="M10 64 L76 64 L76 46 L10 58z" fill="#fff" opacity=".25"/>
        <rect x="10" y="6" width="66" height="58" rx="3" fill="none" stroke="#fff" stroke-width="4"/>
        <line x1="43" y1="6" x2="43" y2="64" stroke="#fff" stroke-width="3"/><line x1="10" y1="35" x2="76" y2="35" stroke="#fff" stroke-width="3"/>`;
      // light spill on the wall
      s += `<path d="M76 20 L200 -3 L200 90 L76 64z" fill="${S.sun}" opacity=".18"/>` + EG;
      // desk
      s += `<rect y="66" width="${W}" height="24" fill="${G.lin([['#8a5e44'], ['#5d3c2a']])}"/><rect y="66" width="${W}" height="2" fill="#fff" opacity=".25"/>`;
      // plant
      s += FG + `<path d="M20 66h16l-2.4-15H22.4z" fill="#e2dbcf"/><path d="M20 66h16l-.6-4H20.6z" fill="#000" opacity=".12"/>`;
      for (let i = 0; i < 6; i++){
        const a = -70 + i * 28;
        s += `<ellipse cx="28" cy="40" rx="4" ry="12" fill="${S.leaf}" transform="rotate(${a} 28 51)" opacity="${f(.75 + r() * .25)}"/>`;
      }
      // mug with steam
      s += `<rect x="52" y="54" width="12" height="12" rx="2.5" fill="#fff"/><path d="M64 57a3.4 3.4 0 0 1 0 6.6" stroke="#fff" stroke-width="2" fill="none"/>
        <path d="M55 51q2.4-3.4 0-6.6M60 51q2.4-3.4 0-6.6" stroke="#fff" stroke-width="1.2" fill="none" opacity=".85" stroke-linecap="round"/>` + EG;
      return { s, accent: S.leaf, glow: S.sun, focus: [42, 38], cx: 43, dark: false };
    },

    comedy(r, G){
      const sets = [
        { bg: '#ffd23f', ray: '#ffb000', pop: '#ff2f63' },
        { bg: '#7ae0ff', ray: '#37bde8', pop: '#ff5a3c' },
        { bg: '#ff9ec2', ray: '#ff6fa0', pop: '#2b2bff' },
      ];
      const S = pick(r, sets);
      let s = `<rect width="${W}" height="${H}" fill="${S.bg}"/>`;
      const cx = 96, cy = 44;
      for (let i = 0; i < 18; i += 2){
        const a1 = (i / 18) * Math.PI * 2 + r() * .1, a2 = ((i + 1) / 18) * Math.PI * 2;
        s += `<polygon points="${cx},${cy} ${f(cx + Math.cos(a1) * 180)},${f(cy + Math.sin(a1) * 180)} ${f(cx + Math.cos(a2) * 180)},${f(cy + Math.sin(a2) * 180)}" fill="${S.ray}"/>`;
      }
      s += `<rect width="${W}" height="${H}" fill="${G.rad([['#fff', .18], ['#000', .22]], .4, .4, .75)}"/>`;
      // speech bubble
      s += FG + `<g transform="translate(10 40)"><path d="M0 9a9 9 0 0 1 9-9h33a9 9 0 0 1 9 9v13a9 9 0 0 1-9 9H20l-9 8 1.4-8H9a9 9 0 0 1-9-9z" fill="#fff" stroke="#14141a" stroke-width="1.8"/>
        <text x="25.5" y="21.5" text-anchor="middle" font-family="Inter, Arial Black, sans-serif" font-weight="800" font-size="11" fill="${S.pop}">${pick(r, ['?!', 'LOL', 'NO WAY', 'BRUH'])}</text></g>`;
      // banana peel prop
      s += `<g transform="translate(16 74) rotate(-6)"><path d="M0 0q16 11 34-4-3 12-19 12Q4 8 0 0z" fill="#ffe14d" stroke="#8a6d00" stroke-width="1.2"/><path d="M2 1q14 9 30-3" stroke="#fff" stroke-width="1.4" opacity=".6" fill="none"/></g>` + EG;
      return { s, accent: S.pop, glow: '#fff', focus: [34, 60], cx: 36, dark: false };
    },

    football(r, G){
      const sets = [['#2f9e52', '#257f42'], ['#23874a', '#1b6b3a'], ['#3fae60', '#2f8c4c']];
      const [g1, g2] = pick(r, sets);
      let s = `<rect width="${W}" height="${H}" fill="${G.lin([[g1], [g2]])}"/>`;
      for (let i = 0; i < 9; i += 2) s += `<rect x="${i * 18}" width="18" height="${H}" fill="#fff" opacity=".05"/>`;
      s += `<rect width="${W}" height="${H}" fill="${G.rad([['#fff', .16], ['#000', .3]], .4, .35, .8)}"/>`;
      // goal
      s += FG + `<rect x="16" y="14" width="72" height="38" fill="#000" opacity=".14"/>`;
      for (let i = 0; i <= 12; i++) s += `<line x1="${f(16 + i * 6)}" y1="14" x2="${f(16 + i * 6)}" y2="52" stroke="#fff" stroke-width=".45" opacity=".55"/>`;
      for (let i = 0; i <= 6; i++) s += `<line x1="16" y1="${f(14 + i * 6.3)}" x2="88" y2="${f(14 + i * 6.3)}" stroke="#fff" stroke-width=".45" opacity=".55"/>`;
      s += `<path d="M14 52V12h76v40" stroke="#fff" stroke-width="3" fill="none" stroke-linejoin="round"/>` + EG;
      s += `<path d="M0 64h${W}" stroke="#fff" stroke-width="1.4" opacity=".7"/><path d="M28 64a24 11 0 0 0 46 0" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7"/>`;
      // ball mid-flight with motion trail
      const bx = 40 + r() * 16, by = 30 + r() * 8;
      s += FG + `<path d="M${f(bx - 26)} ${f(by + 34)}q14-16 ${f(20)}-28" stroke="#fff" stroke-width="1.8" stroke-dasharray="2 3.4" fill="none" opacity=".75"/>
        <ellipse cx="${f(bx)}" cy="${f(by + 30)}" rx="8" ry="2.4" fill="#000" opacity=".25"/>
        <circle cx="${f(bx)}" cy="${f(by)}" r="9" fill="${G.lin([['#ffffff'], ['#cfd6db']])}" stroke="#12181c" stroke-width="1"/>
        <polygon points="${f(bx)},${f(by - 3.6)} ${f(bx + 3.4)},${f(by - 1.1)} ${f(bx + 2.1)},${f(by + 2.9)} ${f(bx - 2.1)},${f(by + 2.9)} ${f(bx - 3.4)},${f(by - 1.1)}" fill="#12181c"/>
        <path d="M${f(bx - 8.6)} ${f(by - 2)}l4 1.4M${f(bx + 8.6)} ${f(by - 2)}l-4 1.4M${f(bx)} ${f(by + 8.8)}v-3.4" stroke="#12181c" stroke-width="1"/>` + EG;
      return { s, accent: '#ffd23f', glow: '#fff', focus: [bx, by], cx: 52, dark: true };
    },

    cooking(r, G){
      const sets = [
        { wall: ['#f6e8cc', '#e3cfa8'], counter: '#b9422c', pan: '#26262b' },
        { wall: ['#dff0e6', '#b9d8c6'], counter: '#e0722a', pan: '#1d272b' },
        { wall: ['#ffe6c4', '#f2c48e'], counter: '#9e2f27', pan: '#2e2e32' },
      ];
      const S = pick(r, sets);
      let s = `<rect width="${W}" height="${H}" fill="${G.lin([[S.wall[0]], [S.wall[1]]])}"/>`;
      for (let y = 0; y < 58; y += 13) for (let x = (y / 13) % 2 ? 6.5 : 0; x < W; x += 13) s += `<rect x="${x}" y="${y}" width="12" height="12" rx="1.5" fill="#fff" opacity=".25"/>`;
      s += `<rect y="58" width="${W}" height="32" fill="${G.lin([[S.counter], ['#000']])}" opacity=".95"/><rect y="58" width="${W}" height="1.6" fill="#fff" opacity=".3"/>`;
      // hob flames
      s += FG;
      [28, 41, 54].forEach(x => s += `<path d="M${x} 70q-4.4-7.4 0-13 1.2 5.4 4.4 6.4 2.2-4.4 0-8.6 6.6 5.4 2.2 15.2z" fill="${G.lin([['#ffd23f'], ['#ff6a1f']])}"/>`);
      // pan
      s += `<ellipse cx="44" cy="58" rx="33" ry="5" fill="#000" opacity=".28"/>
        <ellipse cx="44" cy="53" rx="31" ry="9.5" fill="${S.pan}"/>
        <rect x="72" y="49" width="32" height="5.4" rx="2.7" fill="${S.pan}" transform="rotate(-9 72 51)"/>
        <ellipse cx="44" cy="51.4" rx="26" ry="7" fill="${G.lin([['#4a4a52'], ['#2b2b31']])}"/>`;
      if (r() < .5){
        s += `<ellipse cx="37" cy="50.5" rx="9.4" ry="4.6" fill="#fff"/><circle cx="37" cy="50" r="3.1" fill="#ffb300"/>
          <ellipse cx="52" cy="51.6" rx="7.4" ry="3.6" fill="#fff"/><circle cx="52" cy="51.2" r="2.5" fill="#ffb300"/>`;
      } else {
        s += `<circle cx="33" cy="50.6" r="3.6" fill="#e0392c"/><circle cx="43" cy="49.6" r="3.2" fill="#3f8f3a"/><circle cx="53" cy="51.4" r="3.6" fill="#e8a33a"/><circle cx="39" cy="53.4" r="2.8" fill="#7a3e20"/>`;
      }
      s += `<path d="M34 42q-4.4-6.6 0-13.2 4.4-6.6 0-13.2M46 42q-4.4-6.6 0-13.2 4.4-6.6 0-13.2" stroke="#fff" stroke-width="2.2" fill="none" opacity=".65" stroke-linecap="round"/>` + EG;
      return { s, accent: S.counter, glow: '#ffd23f', focus: [44, 50], cx: 52, dark: false };
    },
  };

  /* ---------------- creator faces ---------------- */
  const SKIN = [
    ['#f4cdaa', '#d9a883'], ['#e6b489', '#c7906a'], ['#c98c5e', '#a86f46'],
    ['#a06a42', '#7f5231'], ['#7a4a2c', '#5c3620'], ['#5a3520', '#412512'],
  ];
  const HAIR = ['#16161a', '#33220f', '#5e3a17', '#b57726', '#e3cf7d', '#a8342f', '#2b3f8f', '#6b3f8f'];
  const SHIRT = ['#ef4444', '#2f6bff', '#ffc93c', '#18181b', '#22c55e', '#ff7ac2', '#f4f4f5', '#8b5cf6'];

  function face(seed, cx, cy, sc, expr, flip, G){
    const r = rng('face:' + seed);
    const [skin, shade] = pick(r, SKIN);
    const hair = pick(r, HAIR), shirt = pick(r, SHIRT);
    const hairHi = '#fff';
    const style = Math.floor(r() * 5);
    const glasses = r() < .2;
    const shock = expr === 'shock', happy = expr === 'funny', fierce = expr === 'action';
    const ink = '#1a1a22';
    const skinFill = G ? G.lin([[skin], [shade]]) : skin;
    const shirtFill = G ? G.lin([[shirt], [shade === '#412512' ? shirt : shirt]]) : shirt;

    let s = `<g transform="translate(${f(cx)} ${f(cy)}) scale(${flip ? -sc : sc} ${sc})">`;
    // body: shoulders + t-shirt with a collar, cut off below the chest like a real thumbnail
    s += `<path d="M-30 46q2-22 30-22t30 22v10h-60z" fill="${shirt}" stroke="${ink}" stroke-width="1.4"/>`;
    s += `<path d="M-30 46q2-22 30-22v32h-30z" fill="#000" opacity=".1"/>`;
    s += `<path d="M-9 25q9 8 18 0" stroke="${ink}" stroke-width="1.2" fill="none"/>`;
    // neck
    s += `<path d="M-6 12h12v11q0 4-6 4t-6-4z" fill="${shade}" stroke="${ink}" stroke-width="1.1"/>`;
    // back hair
    if (style === 1) s += `<ellipse cx="0" cy="-3" rx="19" ry="20" fill="${hair}"/>`;
    if (style === 3) s += `<path d="M-17-6q-3 24-8 30h50q-5-6-8-30z" fill="${hair}"/>`;
    if (style === 4) s += `<path d="M-16-10q-7 12-4 24l5-5 4 7 4-8 4 8 4-7 5 5q3-12-4-24z" fill="${hair}"/>`;
    // ears
    s += `<ellipse cx="-14.5" cy="1.5" rx="3" ry="4.2" fill="${skin}" stroke="${ink}" stroke-width="1.1"/><ellipse cx="14.5" cy="1.5" rx="3" ry="4.2" fill="${skin}" stroke="${ink}" stroke-width="1.1"/>`;
    // head
    s += `<path d="M-14-6q0-13 14-13t14 13v6q0 15-14 16T-14 0z" fill="${skinFill}" stroke="${ink}" stroke-width="1.4"/>`;
    // fringe / hair styles with a highlight
    if (style === 0) s += `<path d="M-14.5-5q1-16 14.5-16t14.5 16q-9-8-29 0z" fill="${hair}"/><path d="M-6-15q6-3 12 0" stroke="${hairHi}" stroke-width="1.6" opacity=".35" fill="none" stroke-linecap="round"/>`;
    if (style === 1) s += `<path d="M-14.5-5q1-16 14.5-16t14.5 16q-6-6-14.5-5-8-1-14.5 5z" fill="${hair}"/><path d="M-8-14q7-4 15 0" stroke="${hairHi}" stroke-width="1.6" opacity=".3" fill="none" stroke-linecap="round"/>`;
    if (style === 2) s += `<path d="M-14-7l4-11 3 7 3-10 3 8 3-10 3 8 3-6 3 11q-13-6-25 3z" fill="${hair}"/>`;
    if (style === 3) s += `<path d="M-14.5-3q2-18 16-17 12 1 13 15-11-10-29 2z" fill="${hair}"/><path d="M-9-14q7-3 13 1" stroke="${hairHi}" stroke-width="1.6" opacity=".3" fill="none" stroke-linecap="round"/>`;
    if (style === 4) s += `<path d="M-14.5-6q3-14 14.5-14t14.5 14q-10-8-29 0z" fill="${hair}"/>`;
    // eyebrows: thick, expressive
    if (shock) s += `<path d="M-10.5-11q4-4 8-1" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M10.5-11q-4-4-8-1" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    else if (fierce) s += `<path d="M-10.5-8l8 2.5" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/><path d="M10.5-8l-8 2.5" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`;
    else s += `<path d="M-10.5-8.5q4-2.5 8-.5" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M10.5-8.5q-4-2.5-8-.5" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    // eyes: big white sclera with dark iris and a highlight — the cartoon-thumbnail look
    const eye = (ex, ry, look) => `<ellipse cx="${ex}" cy="-1.5" rx="4.6" ry="${ry}" fill="#fff" stroke="${ink}" stroke-width="1.2"/>
      <circle cx="${f(ex + look)}" cy="-1" r="${f(ry * .48)}" fill="${ink}"/><circle cx="${f(ex + look + 1)}" cy="-2.6" r="1" fill="#fff"/>`;
    if (shock) s += eye(-6, 5.6, .6) + eye(6, 5.6, .6);
    else if (happy) s += `<path d="M-10-1q4-5 8 0" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M2-1q4-5 8 0" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    else if (fierce) s += eye(-6, 3.6, .8) + eye(6, 3.6, .8) + `<path d="M-10.6-3.5h9.2M1.4-3.5h9.2" stroke="${ink}" stroke-width="1.4"/>`;
    else s += eye(-6, 4.6, .6) + eye(6, 4.6, .6);
    // nose
    s += `<path d="M0 1q2 3 0 5" stroke="${ink}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".7"/>`;
    // mouth
    if (shock) s += `<ellipse cx="0" cy="10.5" rx="4.6" ry="5.4" fill="#2a0a0a" stroke="${ink}" stroke-width="1.2"/><path d="M-3.4 7.4h6.8v1.8q-3.4 1.4-6.8 0z" fill="#fff"/><ellipse cx="0" cy="13.6" rx="2.4" ry="1.5" fill="#e05a5a"/>`;
    else if (happy) s += `<path d="M-8.5 6.5q8.5 12 17 0z" fill="#2a0a0a" stroke="${ink}" stroke-width="1.2"/><path d="M-6.8 7.2h13.6l-1 2.6h-11.6z" fill="#fff"/><ellipse cx="1.5" cy="12.6" rx="3" ry="1.6" fill="#e05a5a"/>`;
    else if (fierce) s += `<path d="M-6 9.5h12v2.6q-6 1.8-12 0z" fill="#fff" stroke="${ink}" stroke-width="1.2"/><path d="M-3 9.5v3.3M0 9.5v3.6M3 9.5v3.3" stroke="${ink}" stroke-width=".8"/>`;
    else s += `<path d="M-5.5 8.5q5.5 5 11 0" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    if (glasses) s += `<g fill="none" stroke="${ink}" stroke-width="1.4"><rect x="-11.5" y="-6" width="10.5" height="9" rx="3"/><rect x="1" y="-6" width="10.5" height="9" rx="3"/><path d="M-1-1.5h2M-11.5-2h-3M11.5-2h3"/></g>`;
    if (shock) s += `<path d="M-19 4q-5 8-1 16" stroke="${ink}" stroke-width="1.3" fill="none"/><ellipse cx="-19" cy="10" rx="4.4" ry="6.4" fill="${skin}" stroke="${ink}" stroke-width="1.3"/><ellipse cx="19" cy="10" rx="4.4" ry="6.4" fill="${skin}" stroke="${ink}" stroke-width="1.3"/>`;
    s += `</g>`;
    return s;
  }

  /* ---------------- style treatments ---------------- */
  function overlay(style, focus, accent, r, G){
    const [fx, fy] = focus;
    if (style === 'shock'){
      return `<circle cx="${f(fx)}" cy="${f(fy)}" r="19" fill="none" stroke="#ff2a1f" stroke-width="3.4" opacity=".95"/>
        <circle cx="${f(fx)}" cy="${f(fy)}" r="23" fill="none" stroke="#ff2a1f" stroke-width="1.2" opacity=".5"/>
        <g stroke="#ff2a1f" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M${f(fx + 46)} ${f(fy - 30)}L${f(fx + 22)} ${f(fy - 9)}"/>
          <path d="M${f(fx + 21)} ${f(fy - 21)}l-1 13 13-1"/>
        </g>`;
    }
    if (style === 'action'){
      let s = `<path d="M0 90 L160 56 L160 90z" fill="${accent}" opacity=".3"/>`;
      for (let i = 0; i < 8; i++){
        const y = 6 + i * 11 + r() * 4;
        s += `<path d="M${f(r() * 14)} ${f(y)}h${f(16 + r() * 30)}" stroke="#fff" stroke-width="${f(.9 + r() * 1.4)}" opacity="${f(.35 + r() * .35)}" stroke-linecap="round"/>`;
      }
      return s;
    }
    if (style === 'gameplay'){
      return `<g><rect x="6" y="6" width="40" height="6" rx="3" fill="#000" opacity=".55"/><rect x="7" y="7" width="${f(16 + r() * 22)}" height="4" rx="2" fill="#39ff8a"/>
        <rect x="6" y="14" width="28" height="4" rx="2" fill="#000" opacity=".55"/><rect x="7" y="14.7" width="${f(7 + r() * 18)}" height="2.6" rx="1.3" fill="#4fd6ff"/>
        <rect x="126" y="6" width="28" height="20" rx="3" fill="#000" opacity=".5" stroke="#fff" stroke-width=".6" opacity=".55"/>
        <circle cx="${f(131 + r() * 18)}" cy="${f(10 + r() * 12)}" r="1.6" fill="#ff4d4d"/>
        <path d="M${f(fx)} ${f(fy - 9)}v5M${f(fx)} ${f(fy + 4)}v5M${f(fx - 9)} ${f(fy)}h5M${f(fx + 4)} ${f(fy)}h5" stroke="#fff" stroke-width="1.4" opacity=".9"/>
        <circle cx="${f(fx)}" cy="${f(fy)}" r="7.5" fill="none" stroke="#fff" stroke-width="1" opacity=".55"/></g>`;
    }
    if (style === 'funny'){
      let pts = '';
      for (let i = 0; i < 26; i++){
        const a = (i / 26) * Math.PI * 2, rad = i % 2 ? 23 : 32;
        pts += `${f(120 + Math.cos(a) * rad)},${f(46 + Math.sin(a) * rad)} `;
      }
      return `<polygon points="${pts}" fill="#fff" opacity=".32"/>`;
    }
    return '';
  }

  /* ---------------- captions ---------------- */
  const STOP = new Set(['trying','tried','the','a','an','i','my','of','for','to','in','on','with','and','this','that','is','it','you','your','what','was','how','new','ft.','won\'t','believe','happened:','happened','only','as','at','be','from','day','days']);
  function captionWords(title, style, r){
    const clean = String(title || '').replace(/^Ft\.[^—]*—\s*/, '').replace(/[?!:"]/g, '');
    const words = clean.split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w.toLowerCase()));
    if (!words.length) return style === 'shock' ? 'WHAT?!' : '';
    let idx = 0, best = -1;
    words.forEach((w, i) => { const sc = w.length + r() * 3 + (/[0-9]/.test(w) ? 4 : 0); if (sc > best){ best = sc; idx = i; } });
    let cap = words[idx];
    if (style !== 'clean' && words[idx + 1] && (cap + words[idx + 1]).length <= 13) cap += ' ' + words[idx + 1];
    cap = cap.toUpperCase();
    if (style === 'shock') cap += '?!';
    if (style === 'funny' && r() < .5) cap += '!!';
    return cap.slice(0, 16);
  }

  function thumbSVG(o){
    o = o || {};
    const topic = SCENES[o.topic] ? o.topic : 'gaming';
    const style = o.style || 'clean';
    const key = String(o.seed) + ':' + topic + ':' + style;
    const r = rng(key);
    const G = gradients('t' + hashStr(key).toString(36));
    const scene = SCENES[topic](r, G);
    const dx = style === 'clean' && !o.guestFace && scene.cx != null ? Math.round(80 - scene.cx) : 0;
    let body = scene.s.replace(/\u0001([\s\S]*?)\u0002/g, (m, fg) => dx ? `<g transform="translate(${dx} 0)">${fg}</g>` : fg);

    // subject spotlight so the face reads against the scene
    if (style !== 'clean'){
      // soft scrim down the subject side so the face reads against any scene
      body += `<rect x="64" width="96" height="${H}" fill="${G.lin([['#000', 0], ['#000', .3]], true)}"/>`;
    }
    body += overlay(style, scene.focus, scene.accent, r, G);

    const expr = style;
    if (o.guestFace){
      body += face(o.face || o.seed, 94, 46, 1.35, expr === 'clean' || expr === 'gameplay' ? 'funny' : expr, false, G);
      body += face(o.guestFace, 137, 48, 1.3, 'funny', true, G);
      body += `<g transform="translate(10 80)"><rect x="-2" y="-10" width="36" height="14" rx="3" fill="#ff0033"/>
        <text x="16" y="0" text-anchor="middle" font-family="Inter, Arial Black, sans-serif" font-weight="800" font-size="9" fill="#fff">COLLAB</text></g>`;
    } else if (style === 'gameplay'){
      body += `<rect x="114" y="48" width="42" height="38" rx="3" fill="#000" opacity=".6"/>`;
      body += `<svg x="114" y="48" width="42" height="38" viewBox="-21 -19 42 38" overflow="hidden">${face(o.face || o.seed, 0, 1, .78, 'funny', false, G)}</svg>`;
      body += `<rect x="114" y="48" width="42" height="38" rx="3" fill="none" stroke="#fff" stroke-width="1" opacity=".7"/>`;
    } else if (style !== 'clean'){
      body += face(o.face || o.seed, 120, 46, 1.5, expr, r() < .5, G);
    }

    // caption with a legibility scrim
    const cap = o.caption !== undefined ? o.caption : captionWords(o.title, style, r);
    if (cap){
      const clean = style === 'clean';
      const size = clean ? 11 : cap.length > 11 ? 16 : 20;
      const x = clean ? 9 : 6, y = clean ? 82 : (style === 'gameplay' ? 34 : 84);
      const fill = clean ? '#fff' : pick(r, ['#fff', '#ffd23f', '#fff', '#fff']);
      if (clean) body += `<rect y="62" width="${W}" height="28" fill="${G.lin([['#000', 0], ['#000', .65]])}"/>`;
      const text = (dx, dy, extra) => `<text x="${x + dx}" y="${y + dy}" font-family="Inter, Arial Black, Impact, sans-serif" font-weight="800" font-size="${size}" letter-spacing="-.4" ${extra}>${esc(cap)}</text>`;
      const rot = clean ? '' : `transform="rotate(-2.5 ${x} ${y})"`;
      body += `<g ${rot}>
        ${clean ? '' : text(2, 2, `fill="#000" opacity=".55"`)}
        ${text(0, 0, `fill="${fill}" stroke="#14141a" stroke-width="${clean ? 2 : 4}" stroke-linejoin="round" paint-order="stroke"`)}
      </g>`;
    }

    // frame vignette, ties the whole thing together
    body += `<rect width="${W}" height="${H}" fill="${G.rad([['#000', 0], ['#000', .16]], .5, .5, .75)}"/>`;

    return `<svg class="thumb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${G.defs.join('')}</defs>${body}</svg>`;
  }

  function faceSVG(seed){
    const r = rng('bg:' + seed);
    const G = gradients('f' + hashStr(String(seed)).toString(36));
    const pairs = [['#3b82f6', '#1e40af'], ['#f59e0b', '#b45309'], ['#22c55e', '#15803d'], ['#a78bfa', '#6d28d9'], ['#ef4444', '#991b1b'], ['#06b6d4', '#0e7490']];
    const [c1, c2] = pick(r, pairs);
    const body = `<rect x="-20" y="-20" width="40" height="40" fill="${G.lin([[c1], [c2]])}"/><circle cx="0" cy="-2" r="16" fill="#fff" opacity=".08"/>${face(seed, 0, 6, 1.12, 'neutral', false, G)}`;
    return `<svg class="face-svg" viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${G.defs.join('')}</defs>${body}</svg>`;
  }

  const cache = new Map();
  function memo(fn, prefix){
    return function(o){
      const key = prefix + JSON.stringify(o);
      let out = cache.get(key);
      if (out === undefined){
        out = fn(o);
        if (cache.size > 600) cache.delete(cache.keys().next().value);
        cache.set(key, out);
      }
      return out;
    };
  }

  window.thumbSVG = memo(thumbSVG, 't:');
  window.faceSVG = memo(faceSVG, 'f:');
})();

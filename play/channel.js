/* =========================================================================
   STREAMLY SIM — YOUR CHANNEL + WEEKLY PLAN
   Your channel: profile picture (a face you build, or a logo), banner,
   about, category and upload schedule, all on Customization → Your
   channel. The face you build is also the face on your thumbnails.
   Banner styles and a few picture options unlock as you grow.

   Weekly plan: give each weekday a topic, "any topic", or a rest day.
   - Uploading what you planned: +5% views (consistency) and 4 less energy
     (you prepared it). "Any topic" days give +3%.
   - Every full week without missing a planned day adds +1% (up to +5%).
   - Rest days: energy comes back 50% faster until you upload that day,
     and your upload plan (Casual/Consistent/Aggressive) doesn't judge them.
   - A week with no day off at all slows energy recovery a little.
   Today's plan locks when the day starts; edits apply from next week.
   Missing a planned day only restarts the plan streak.
   Loaded before game.js; functions run only after the game has started.
   ========================================================================= */
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PLAN_TOPIC_BONUS = 5, PLAN_ANY_BONUS = 3, PLAN_WEEK_EXTRA_MAX = 5, PLAN_ENERGY_DISCOUNT = 4;
const PLAN_MAX_REST = 3, REST_REGEN_MULT = 1.5, GRIND_DAYS = 7, GRIND_REGEN_MULT = 0.85;
const CATEGORY_BONUS = 3;

function weekday(d){ return (((typeof d === 'number' ? d : clockDay()) % 7) + 7) % 7; }
function weekdayName(d, short){ return (short ? WEEKDAYS_SHORT : WEEKDAYS)[weekday(d)]; }
const chNum = (v, fallback) => (typeof v === 'number' && Number.isFinite(v)) ? v : fallback;
const chEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------- channel profile ---------------- */
const BANNER_PALETTES = {
  ocean:  { label: 'Ocean',  c: ['#06142e', '#1d4ed8', '#60a5fa'] },
  ember:  { label: 'Ember',  c: ['#1c0904', '#c2410c', '#fdba74'] },
  forest: { label: 'Forest', c: ['#03140c', '#15803d', '#86efac'] },
  violet: { label: 'Violet', c: ['#110a24', '#6d28d9', '#c4b5fd'] },
  rose:   { label: 'Rose',   c: ['#200610', '#be185d', '#f9a8d4'] },
  slate:  { label: 'Slate',  c: ['#0b0b0d', '#3f3f46', '#d4d4d8'] },
};
const BANNER_STYLES = {
  waves:    { label: 'Waves',    subs: 0 },
  grid:     { label: 'Horizon',  subs: 0 },
  blocks:   { label: 'Mosaic',   subs: 0 },
  halftone: { label: 'Halftone', subs: 100 },
  contours: { label: 'Contours', subs: 1000 },
  rays:     { label: 'Burst',    subs: 10000 },
  aurora:   { label: 'Aurora',   subs: 100000 },
  gilded:   { label: 'Gilded',   subs: 1000000 },
};
const LOGO_MARKS = {
  initials: { label: 'Initials', subs: 0 },
  play:     { label: 'Play',     subs: 0 },
  bolt:     { label: 'Bolt',     subs: 0 },
  star:     { label: 'Star',     subs: 0 },
  heart:    { label: 'Heart',    subs: 0 },
  crown:    { label: 'Crown',    subs: 1000000 },
};
const AV_BG_LOCK = { 8: 100000 };          // the gold background
const HAIR_STYLE_NAMES = ['Fringe', 'Curly', 'Spiky', 'Long', 'Locs', 'Buzz cut'];

function channelBook(){
  let c = state.channel;
  if (!c || typeof c !== 'object') c = state.channel = {};
  if (c.avatar && typeof c.avatar === 'object'){
    const a = c.avatar, P = window.FACE_PARTS || { skin: [0], hair: [0], shirt: [0], bg: [0] };
    const int = (x, max) => clamp(Math.floor(chNum(x, 0)), 0, max - 1);
    a.mode = a.mode === 'logo' ? 'logo' : 'face';
    a.skin = int(a.skin, P.skin.length); a.hair = int(a.hair, P.hair.length); a.style = int(a.style, 6);
    a.shirt = int(a.shirt, P.shirt.length); a.glasses = a.glasses ? 1 : 0; a.bg = int(a.bg, P.bg.length);
    if (!LOGO_MARKS[a.mark]) a.mark = 'initials';
  } else c.avatar = null;
  if (!c.banner || typeof c.banner !== 'object') c.banner = {};
  if (!BANNER_STYLES[c.banner.style]) c.banner.style = 'waves';
  if (!BANNER_PALETTES[c.banner.palette]) c.banner.palette = 'ocean';
  c.banner.showName = c.banner.showName !== false;
  c.about = typeof c.about === 'string' ? c.about.slice(0, 150) : '';
  if (c.category !== 'variety' && !TOPICS[c.category]) c.category = null;
  c.categoryDay = chNum(c.categoryDay, -99);
  if (!c.unlocked || typeof c.unlocked !== 'object') c.unlocked = {};
  return c;
}
/* Unlocks stay unlocked even if subscribers dip later. */
function chUnlocked(need){
  if (!need) return true;
  const c = channelBook();
  if (state.subs >= need) c.unlocked[need] = true;
  return !!c.unlocked[need];
}
/* New banner styles / picture options as you grow. The first check after loading is silent. */
function checkChannelUnlocks(){
  if (!state.channelName) return;
  const c = channelBook();
  const items = Object.values(BANNER_STYLES).map(b => [b.subs, `the ${b.label} banner`])
    .concat(Object.values(LOGO_MARKS).map(m => [m.subs, `the ${m.label} logo`]))
    .concat(Object.values(AV_BG_LOCK).map(n => [n, 'a gold picture background']))
    .filter(([n]) => n > 0);
  const fresh = [...new Set(items.map(i => i[0]))].filter(n => state.subs >= n && !c.unlocked[n]);
  if (!fresh.length){ c.unlockSeeded = true; return; }
  fresh.forEach(n => { c.unlocked[n] = true; });
  if (!c.unlockSeeded){ c.unlockSeeded = true; return; }
  const what = items.filter(([n]) => fresh.includes(n)).map(i => i[1]);
  const list = what.length > 1 ? what.slice(0, -1).join(', ') + ' and ' + what[what.length - 1] : what[0];
  const msg = ic('sparkle') + ` Unlocked ${list}. Find it in Customization → Your channel.`;
  if (offlineFastForward) pushNotification(msg); else showToast(msg, true);   // a toast also lands in notifications
}
function playerFaceSeed(){
  const a = state.channel && state.channel.avatar;
  return a ? `av:${a.skin}.${a.hair}.${a.style}.${a.shirt}.${a.glasses}.${a.bg}` : (state.channelName || 'me');
}
function avatarKey(){
  const a = state.channel && state.channel.avatar;
  return (state.channelName || '') + '|' + (a ? playerFaceSeed() + a.mode + a.mark : 'seed');
}
function channelInitials(){
  const words = String(state.channelName || 'Me').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'S';
  const cap = String(state.channelName).match(/[A-Z][a-z]+/g);
  if (words.length === 1 && cap && cap.length >= 2) return (cap[0][0] + cap[1][0]).toUpperCase();   // "CrashOutGaming" -> "CO"
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}
const LOGO_PATHS = {
  play:  '<path d="M-6-9v18l15-9z" fill="#fff"/>',
  bolt:  '<path d="M2-12-8 2h7l-2 10 10-14H0z" fill="#fff"/>',
  star:  '<path d="M0-11l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L0 5.5l-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#fff"/>',
  heart: '<path d="M0 10s-10-6-10-12.5A5.5 5.5 0 0 1 0-5.7a5.5 5.5 0 0 1 10 3.2C10 4 0 10 0 10z" fill="#fff"/>',
  crown: '<path d="M-11 7h22l2-14-7 5-6-8-6 8-7-5z" fill="#fff"/><rect x="-11" y="8.5" width="22" height="3" rx="1" fill="#fff"/>',
};
function logoSVG(a){
  const [c1, c2] = (window.FACE_PARTS ? window.FACE_PARTS.bg : [['#3b82f6', '#1e40af']])[a.bg] || ['#3b82f6', '#1e40af'];
  let mark;
  if (a.mark === 'initials' || !LOGO_PATHS[a.mark]){
    const t = chEsc(channelInitials());
    mark = `<text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="${t.length > 1 ? 17 : 21}" letter-spacing="-.6" fill="#fff">${t}</text>`;
  } else mark = LOGO_PATHS[a.mark];
  // flat two-tone (no gradient ids: this picture is on screen in several places at once)
  return `<svg class="face-svg logo-svg" viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="-20" y="-20" width="40" height="40" fill="${c1}"/><path d="M-20 8 20-6V20H-20z" fill="${c2}" opacity=".55"/>${mark}</svg>`;
}
/* The picture people see next to your name. */
function playerAvatarSVG(){
  const a = state.channel && state.channel.avatar;
  if (a && a.mode === 'logo') return logoSVG(a);
  return faceSVG(playerFaceSeed());
}

/* ---------------- banners ---------------- */
function bannerSVG(o){
  const style = BANNER_STYLES[o.style] ? o.style : 'waves';
  const pal = style === 'gilded' ? ['#0c0a06', '#8a6a1f', '#f3d27a'] : (BANNER_PALETTES[o.palette] || BANNER_PALETTES.ocean).c;
  const [c0, c1, c2] = pal;
  const W = 1200, H = 240, uid = 'bn' + (o.uid || 'x');
  let r = (() => { let a = 0; const s = String(o.seed || 'streamly'); for (let i = 0; i < s.length; i++) a = (a * 31 + s.charCodeAt(i)) | 0; return () => { a = (a * 1103515245 + 12345) | 0; return ((a >>> 8) & 0xffff) / 0x10000; }; })();
  let defs = '', body = '';
  const f = n => Math.round(n * 10) / 10;
  if (style === 'waves'){
    body += `<rect width="${W}" height="${H}" fill="${c0}"/>`;
    [[70, 26, .006, 0, c1, .55], [115, 22, .008, 1.7, c2, .28], [150, 30, .005, 3.1, c1, .85], [190, 18, .009, .6, c2, .5]].forEach(([base, amp, fr, ph, col, op]) => {
      let d = `M0 ${H}`;
      for (let x = 0; x <= W; x += 30) d += `L${x} ${f(base + amp * Math.sin(x * fr + ph) + amp * .4 * Math.sin(x * fr * 2.3 + ph * 2))}`;
      body += `<path d="${d}L${W} ${H}z" fill="${col}" opacity="${op}"/>`;
    });
  } else if (style === 'grid'){
    defs += `<linearGradient id="${uid}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset=".55" stop-color="${c1}"/><stop offset=".55" stop-color="${c0}"/></linearGradient>`;
    body += `<rect width="${W}" height="${H}" fill="url(#${uid}g)"/>`;
    body += `<circle cx="${W / 2}" cy="132" r="70" fill="${c2}" opacity=".9"/>`;
    for (let i = 0; i < 5; i++) body += `<rect x="${W / 2 - 75}" y="${96 + i * 8}" width="150" height="${1.5 + i * .8}" fill="${c1}"/>`;
    body += `<rect y="132" width="${W}" height="${H - 132}" fill="${c0}"/>`;
    for (let x = -1800; x <= W + 1800; x += 120) body += `<path d="M${W / 2} 132L${x} ${H}" stroke="${c2}" stroke-width="1.2" opacity=".45"/>`;
    for (let k = 1; k < 9; k++){ const y = 132 + Math.pow(k / 8, 1.8) * (H - 132); body += `<path d="M0 ${f(y)}H${W}" stroke="${c2}" stroke-width="1.2" opacity=".45"/>`; }
  } else if (style === 'blocks'){
    body += `<rect width="${W}" height="${H}" fill="${c0}"/>`;
    const s = 60;
    for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s){
      const v = r();
      if (v < .3) continue;
      const col = v < .62 ? c1 : v < .86 ? c0 : c2;
      const op = v < .62 ? f(.25 + r() * .6) : v < .86 ? 1 : f(.5 + r() * .5);
      const shape = r();
      if (shape < .55) body += `<rect x="${x + 2}" y="${y + 2}" width="${s - 4}" height="${s - 4}" rx="6" fill="${col}" opacity="${op}"/>`;
      else if (shape < .8) body += `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s / 2 - 3}" fill="${col}" opacity="${op}"/>`;
      else body += `<path d="M${x + 2} ${y + s - 2}L${x + s - 2} ${y + 2}V${y + s - 2}z" fill="${col}" opacity="${op}"/>`;
    }
  } else if (style === 'halftone'){
    body += `<rect width="${W}" height="${H}" fill="${c1}"/>`;
    for (let y = 10; y < H; y += 20) for (let x = 10 + (y / 20 % 2) * 10; x < W; x += 20){
      const t = clamp((x / W) * .9 + (y / H) * .25, 0, 1);
      body += `<circle cx="${x}" cy="${y}" r="${f(1 + t * 8.5)}" fill="${c0}"/>`;
    }
    body += `<circle cx="210" cy="120" r="92" fill="${c2}" opacity=".9"/><circle cx="210" cy="120" r="62" fill="${c1}"/>`;
  } else if (style === 'contours'){
    body += `<rect width="${W}" height="${H}" fill="${c0}"/>`;
    [[280, 160, 13], [900, 70, 11]].forEach(([cx, cy, rings], j) => {
      const ph = r() * 6;
      for (let i = 1; i <= rings; i++){
        const rad = i * 26;
        let d = '';
        for (let a = 0; a <= 64; a++){
          const t = a / 64 * Math.PI * 2;
          const w = rad * (1 + .14 * Math.sin(t * 3 + ph + i * .3) + .08 * Math.sin(t * 5 - ph));
          d += `${a ? 'L' : 'M'}${f(cx + Math.cos(t) * w * 1.6)} ${f(cy + Math.sin(t) * w)}`;
        }
        body += `<path d="${d}z" fill="none" stroke="${i % 4 === 0 ? c2 : c1}" stroke-width="${i % 4 === 0 ? 2 : 1.3}" opacity="${i % 4 === 0 ? .8 : .6}"/>`;
      }
    });
  } else if (style === 'rays'){
    body += `<rect width="${W}" height="${H}" fill="${c1}"/>`;
    const cx = W / 2, cy = 300, n = 36;
    for (let i = 0; i < n; i += 2){
      const a1 = Math.PI + (i / n) * Math.PI, a2 = Math.PI + ((i + 1) / n) * Math.PI;
      body += `<path d="M${cx} ${cy}L${f(cx + Math.cos(a1) * 1400)} ${f(cy + Math.sin(a1) * 1400)}L${f(cx + Math.cos(a2) * 1400)} ${f(cy + Math.sin(a2) * 1400)}z" fill="${c0}" opacity=".35"/>`;
    }
    body += `<circle cx="${cx}" cy="${cy}" r="150" fill="${c2}" opacity=".95"/><circle cx="${cx}" cy="${cy}" r="196" fill="none" stroke="${c2}" stroke-width="3" opacity=".5"/>`;
  } else if (style === 'aurora'){
    defs += `<filter id="${uid}b" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="38"/></filter>`;
    body += `<rect width="${W}" height="${H}" fill="${c0}"/>`;
    body += `<g filter="url(#${uid}b)"><ellipse cx="260" cy="150" rx="320" ry="70" fill="${c1}" opacity=".9"/><ellipse cx="700" cy="80" rx="360" ry="60" fill="${c2}" opacity=".55"/><ellipse cx="1040" cy="170" rx="260" ry="80" fill="${c1}" opacity=".75"/></g>`;
    for (let i = 0; i < 70; i++) body += `<circle cx="${f(r() * W)}" cy="${f(r() * H * .7)}" r="${f(.6 + r() * 1.3)}" fill="#fff" opacity="${f(.25 + r() * .6)}"/>`;
  } else if (style === 'gilded'){
    defs += `<linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a1f"/><stop offset=".5" stop-color="#f6dd8f"/><stop offset="1" stop-color="#8a6a1f"/></linearGradient>`;
    body += `<rect width="${W}" height="${H}" fill="${c0}"/>`;
    for (let x = -H; x < W; x += 18) body += `<path d="M${x} ${H}L${x + H} 0" stroke="#3a2d10" stroke-width="1"/>`;
    body += `<rect y="${H - 46}" width="${W}" height="10" fill="url(#${uid}g)"/><rect y="${H - 30}" width="${W}" height="2" fill="url(#${uid}g)" opacity=".7"/>`;
    body += `<rect y="34" width="${W}" height="2" fill="url(#${uid}g)" opacity=".7"/>`;
  }
  if (o.showName && o.name){
    const name = chEsc(String(o.name).slice(0, 24));
    const size = name.length > 16 ? 50 : 62;
    body += `<text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" dominant-baseline="central" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="${size}" letter-spacing="-1.5" fill="#000" opacity=".35" transform="translate(3 4)">${name}</text>`;
    body += `<text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" dominant-baseline="central" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="${size}" letter-spacing="-1.5" fill="#fff">${name}</text>`;
  }
  return `<svg class="banner-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}
function playerBannerSVG(uid){
  const b = channelBook().banner;
  return bannerSVG({ style: b.style, palette: b.palette, showName: b.showName, name: state.channelName, seed: state.channelName, uid: uid || 'main' });
}

/* ---------------- category ---------------- */
function categoryLabel(k){ return k === 'variety' ? 'Variety' : TOPICS[k] ? TOPICS[k].label : 'No category'; }
/* Streamly shows your videos to people browsing your category. Called from identityEffects. */
function categoryEffect(v, fx){
  const cat = state.channel && state.channel.category;
  if (!cat) return;
  if (cat === v.topic){ fx.algo += CATEGORY_BONUS; fx.notes.push({ good: true, text: `In your channel category (+${CATEGORY_BONUS})` }); }
  else if (cat === 'variety'){ fx.algo += 1; fx.notes.push({ good: true, text: 'Variety category (+1)' }); }
}
function setCategory(k){
  const c = channelBook();
  if (k !== 'variety' && !TOPICS[k]) return;
  if (c.category === k) return;
  if (c.category && c.categoryDay === clockDay()){ playErrorSound(); showToast(ic('calendar') + ' You can change your category again tomorrow.'); return; }
  c.category = k; c.categoryDay = clockDay();
  playClickSound();
  showToast(ic('check') + ` Category: ${categoryLabel(k)}. ${k === 'variety' ? 'Every upload gets a small push.' : `${categoryLabel(k)} uploads get pushed to people browsing it.`}`);
  renderChannelPage(true);
}

/* ---------------- weekly plan ---------------- */
function planTemplate(){
  if (!Array.isArray(state.weekPlan) || state.weekPlan.length !== 7) state.weekPlan = [null, null, null, null, null, null, null];
  const P = state.weekPlan;
  for (let i = 0; i < 7; i++) if (!(P[i] === 'rest' || P[i] === 'any' || TOPICS[P[i]])) P[i] = null;   // in place: callers hold this array
  return P;
}
function planBook(){
  planTemplate();
  state.planStreak = Math.max(0, Math.floor(chNum(state.planStreak, 0)));
  state.grindDays = Math.max(0, Math.floor(chNum(state.grindDays, 0)));
  if (!Array.isArray(state.planKept)) state.planKept = [];
  const today = clockDay();
  if (!state.planDay || typeof state.planDay !== 'object' || state.planDay.day !== today){
    state.planDay = { day: today, value: state.weekPlan[weekday(today)] };
  }
  const v = state.planDay.value;
  if (!(v === null || v === 'rest' || v === 'any' || TOPICS[v])) state.planDay.value = null;
  return state;
}
/* The plan for a day. Today uses the copy locked at midnight; other days use the weekly template. */
function planFor(d){
  if (typeof d !== 'number') d = clockDay();
  planBook();
  if (state.planDay.day === d) return state.planDay.value;
  return state.weekPlan[weekday(d)];
}
function planUploadDays(){ return planTemplate().filter(v => v && v !== 'rest').length; }
function planRestDays(){ return planTemplate().filter(v => v === 'rest').length; }
function planIsSet(){ return planTemplate().some(v => v); }
function uploadsOnDay(d){ return (state.uploadLog || []).filter(t => t <= state.totalTicks && clockDay(t) === d).length; }
function planLabel(v, long){
  if (v === 'rest') return long ? 'Rest day' : 'Rest';
  if (v === 'any') return long ? 'Any topic' : 'Any';
  if (TOPICS[v]) return long ? `${TOPICS[v].label} day` : TOPICS[v].label;
  return long ? 'No plan' : '—';
}
function planWeekExtra(){ return Math.min(PLAN_WEEK_EXTRA_MAX, Math.floor((state.planStreak || 0) / 7)); }
function planBonusPct(hit){ return hit === 'topic' ? PLAN_TOPIC_BONUS + planWeekExtra() : hit === 'any' ? PLAN_ANY_BONUS + planWeekExtra() : 0; }
/* Would this topic, going live on this day, be on plan? */
function planHitFor(topicKey, d){
  const p = planFor(d);
  if (p && p === topicKey) return 'topic';
  if (p === 'any') return 'any';
  return null;
}
/* Planned topics were prepared in advance: they cost less energy. */
function planEnergyDiscount(topicKey, at){
  const d = clockDay(typeof at === 'number' && at > state.totalTicks ? at : state.totalTicks);
  return planHitFor(topicKey, d) === 'topic' ? PLAN_ENERGY_DISCOUNT : 0;
}
function restDayActive(){ return planFor(clockDay()) === 'rest' && uploadsOnDay(clockDay()) === 0; }
function planRegenMult(){
  return (restDayActive() ? REST_REGEN_MULT : 1) * ((state.grindDays || 0) >= GRIND_DAYS ? GRIND_REGEN_MULT : 1);
}
/* Called from goLive: a video meets the plan of the day it actually lands on. */
function planOnLive(v){
  if (v.planChecked) return;
  v.planChecked = true;
  const d = typeof v.liveDay === 'number' ? v.liveDay : clockDay();
  const hit = planHitFor(v.topic, d);
  if (!hit) return;
  v.planHit = hit;
  v.planBonus = planBonusPct(hit) / 100;
  if (!state.planKept.includes(d)){
    state.planKept.push(d);
    if (state.planKept.length > 21) state.planKept = state.planKept.slice(-21);
    if (!offlineFastForward) showToast(ic('calendar') + ` On plan: ${weekdayName(d)}'s ${hit === 'topic' ? TOPICS[v.topic].label + ' upload' : 'upload'}. +${planBonusPct(hit)}% views from consistency.`);
  }
}
/* Once per in-game day crossed (from advanceGlobalStep): judge the day that just ended. */
function checkWeekPlan(d){
  planBook();
  const uploaded = uploadsOnDay(d) > 0;
  // a week with no day off at all
  const before = state.grindDays;
  state.grindDays = uploaded ? state.grindDays + 1 : 0;
  if (state.grindDays === GRIND_DAYS) pushNotification(ic('bolt') + ` ${GRIND_DAYS} days in a row without a day off. Energy recovers ${Math.round((1 - GRIND_REGEN_MULT) * 100)}% slower until you take one (a day with no uploads).`);
  if (before >= GRIND_DAYS && !uploaded) pushNotification(ic('bolt') + ' A day off. Your energy recovers at full speed again.');

  const val = state.planDay && state.planDay.day === d ? state.planDay.value : state.weekPlan[weekday(d)];
  if (planUploadDays() >= 2){
    if (val && val !== 'rest' && !state.planKept.includes(d)){
      if (state.planStreak >= 3) pushNotification(ic('calendar') + ` You missed ${weekdayName(d)}'s plan (${planLabel(val, true)}). Your ${state.planStreak}-day plan streak starts again. Nothing else is lost.`);
      state.planStreak = 0;
    } else {
      state.planStreak++;
      if (state.planStreak % 7 === 0){
        const weeks = state.planStreak / 7;
        state.algoRating = clamp(state.algoRating + 1.5, 0, 100);
        const msg = ic('calendar') + ` A full week on plan${weeks > 1 ? ` (${weeks} in a row)` : ''}. Your audience knows when to expect you: planned uploads now get +${PLAN_TOPIC_BONUS + planWeekExtra()}% views.`;
        if (offlineFastForward) pushNotification(msg); else showToast(msg, true);
      }
    }
  }
  state.planDay = { day: d + 1, value: state.weekPlan[weekday(d + 1)] };
}
function setPlanDay(i, value){
  const T = planTemplate();
  if (!(value === null || value === 'rest' || value === 'any' || TOPICS[value])) value = null;
  if (value === 'rest' && T[i] !== 'rest' && planRestDays() >= PLAN_MAX_REST){
    playErrorSound(); showToast(ic('calendar') + ` Up to ${PLAN_MAX_REST} rest days a week.`); return false;
  }
  T[i] = value;
  planBook();
  const today = clockDay();
  if (weekday(today) === i){
    if (state.planDay.value === null && uploadsOnDay(today) === 0) state.planDay.value = value;   // an open day can still be planned before you post
    else if (state.planDay.value !== value) showToast(ic('calendar') + ` Today's plan is already set, so this starts next ${WEEKDAYS[i]}.`);
  }
  playClickSound();
  calDirty = true;
  renderPlanEverywhere();
  return true;
}
/* A starting plan from what you actually make and how often you post. */
function suggestPlan(){
  const niche = (typeof playerNiche === 'function' && playerNiche()) || (state.channel && TOPICS[state.channel.category] && state.channel.category) || null;
  const rest = state.cadence === 'casual' ? [1, 3, 6] : state.cadence === 'aggressive' ? [6] : [3, 6];
  const plan = WEEKDAYS.map((_, i) => rest.includes(i) ? 'rest' : niche ? (i % 2 === 0 ? niche : 'any') : 'any');
  state.weekPlan = plan;
  planBook();
  if (state.planDay.value === null && uploadsOnDay(clockDay()) === 0) state.planDay.value = plan[weekday()];
  playClickSound();
  showToast(ic('calendar') + ' Plan filled in. Change any day you like.');
  calDirty = true;
  renderPlanEverywhere();
}
function scheduleSummary(){
  const T = planTemplate();
  const days = T.map((v, i) => v && v !== 'rest' ? WEEKDAYS_SHORT[i] : null).filter(Boolean);
  if (!days.length) return null;
  if (days.length === 7) return 'New videos every day';
  return 'New videos ' + (days.length > 1 ? days.slice(0, -1).join(', ') + ' and ' + days[days.length - 1] : days[0]);
}

/* The shared weekly-plan editor (Calendar and Your channel). */
function weekPlanEditorHTML(where){
  const T = planTemplate(), today = clockDay(), wd = weekday(today);
  const opts = v => [[null, 'No plan'], ['rest', 'Rest day'], ['any', 'Any topic']].concat(Object.keys(TOPICS).map(k => [k, TOPICS[k].label]))
    .map(([k, l]) => `<option value="${k || ''}" ${k === v ? 'selected' : ''}>${l}</option>`).join('');
  const cells = WEEKDAYS.map((name, i) => {
    const v = T[i];
    const locked = i === wd ? planFor(today) : undefined;
    return `<div class="wp-day${i === wd ? ' today' : ''} ${v === 'rest' ? 'p-rest' : v === 'any' ? 'p-any' : v ? 'p-topic' : 'p-none'}">
      <div class="wp-name">${WEEKDAYS_SHORT[i]}${i === wd ? '<i>Today</i>' : ''}</div>
      <select class="wp-sel" data-plan-day="${i}" aria-label="${name}">${opts(v)}</select>
      ${i === wd && locked !== v ? `<div class="wp-lock">Today: ${planLabel(locked)}</div>` : ''}
    </div>`;
  }).join('');
  const up = planUploadDays(), rest = planRestDays();
  const extra = planWeekExtra();
  return `<div class="wp-grid">${cells}</div>
    <div class="wp-foot">
      <div class="wp-facts">
        ${planIsSet() ? `<span><b>${up}</b> upload ${up === 1 ? 'day' : 'days'}</span><span><b>${rest}</b> rest ${rest === 1 ? 'day' : 'days'}</span><span>Plan streak <b>${state.planStreak || 0}</b> ${state.planStreak === 1 ? 'day' : 'days'}</span>`
          : `<span>Planned uploads get <b>+${PLAN_TOPIC_BONUS}% views</b> and cost <b>${PLAN_ENERGY_DISCOUNT} less energy</b>. Rest days recover energy 50% faster.</span>`}
      </div>
      <button class="mini-btn" type="button" data-plan-suggest="${where}">${planIsSet() ? 'Reset to a suggestion' : 'Suggest a plan'}</button>
    </div>
    ${planIsSet() ? `<div class="wp-rules">On-plan topic: <b>+${PLAN_TOPIC_BONUS + extra}% views</b>, ${PLAN_ENERGY_DISCOUNT} less energy · Any topic: <b>+${PLAN_ANY_BONUS + extra}%</b> · Rest day: energy back 50% faster until you upload${extra ? ` · includes +${extra}% for ${extra} perfect ${extra === 1 ? 'week' : 'weeks'}` : ' · every full week on plan adds +1%'}. Missing a day only restarts the streak.</div>` : ''}`;
}
function renderPlanEverywhere(){
  renderChannelPage(true);
  if (typeof renderCalendar === 'function') renderCalendar(true);
  renderPlanCheck();
  if (typeof renderStudioEnergy === 'function') renderStudioEnergy();
  try { GameSelect.sync(); } catch(e){}
}

/* ---------------- Studio: today's plan vs the trend vs waiting ---------------- */
function renderPlanCheck(){
  const el = document.getElementById('plan-check');
  if (!el) return;
  const at = typeof chosenPublishAt === 'function' ? chosenPublishAt() : null;
  const d = clockDay(at || state.totalTicks), today = clockDay();
  const p = planFor(d);
  const picks = typeof currentStudioPicks === 'function' ? currentStudioPicks() : {};
  const topic = picks.topicKey;
  const moods = typeof moodsForDay === 'function' ? moodsForDay(d) : ensureAudienceMood().moods;
  const [hot, hotVal] = Object.entries(moods).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const dayWord = d === today ? weekdayName(d) : `${weekdayName(d)} (when this goes live)`;
  const moodTxt = k => { const m = Math.round(moods[k] || 0); return `<span class="pc-mood ${m >= 10 ? 'up' : m < 0 ? 'down' : ''}">${m >= 0 ? '+' : ''}${m}%${d - today >= 2 ? ' forecast' : ''}</span>`; };

  // energy: upload now, or wait?
  const cost = typeof energyCostFor === 'function' && topic ? energyCostFor(picks.effortKey, picks.lengthKey, picks.formatKey, !!picks.abThumb, topic, typeof currentCtype === 'function' ? currentCtype(topic) : undefined, at) : 20;
  const e = Math.round(state.energy), after = state.energy - cost;
  const rate = ENERGY_REGEN_PER_TICK * (state.burnedOut ? ENERGY_BURNOUT_REGEN_MULT : 1) * cadence().energyRegen * planRegenMult();
  const need = Math.min(ENERGY_MAX, cost + ENERGY_FATIGUE_LINE);
  const waitTicks = after < ENERGY_FATIGUE_LINE ? Math.ceil((need - state.energy) / Math.max(rate, 0.01)) : 0;
  const waitRow = after < ENERGY_FATIGUE_LINE
    ? `<div class="pc-opt wait warn"><span class="pc-k">${ic('bolt')}Wait</span><span class="pc-v">Energy ${e}: this upload would be rushed. You're ready around <b>${calTime(state.totalTicks + waitTicks)}</b>${restDayActive() ? ', faster on a rest day' : ''}.</span></div>`
    : `<div class="pc-opt wait"><span class="pc-k">${ic('bolt')}Energy</span><span class="pc-v">${e} now, ${Math.max(0, Math.round(after))} after this upload.${restDayActive() ? ' Resting today: energy comes back 50% faster until you upload.' : ''}${(state.grindDays || 0) >= GRIND_DAYS ? ' No day off in a week: recovery is a little slower.' : ''}</span></div>`;

  const useBtn = (k, label) => topic === k ? `<span class="pc-sel">${ic('check')}Selected</span>` : `<button type="button" class="mini-btn" data-plan-use="${k}">${label || 'Use ' + TOPICS[k].label}</button>`;
  let head, rows = '';
  if (!p){
    head = `<div class="pc-head"><span class="pc-day">${dayWord}</span><b>No plan</b></div>`;
    rows = `<div class="pc-note">${planIsSet() ? `${weekdayName(d)} is open in your weekly plan.` : 'You haven\'t planned your week yet.'} Planned uploads get +${PLAN_TOPIC_BONUS}% views and cost ${PLAN_ENERGY_DISCOUNT} less energy.<button type="button" class="mini-btn" data-plan-open="1">Plan your week</button></div>`;
    if (hot && hotVal >= 10) rows += `<div class="pc-opt"><span class="pc-k">${ic('fire')}Trending</span><span class="pc-v">${TOPICS[hot].label} ${moodTxt(hot)}</span>${useBtn(hot)}</div>`;
  } else if (p === 'rest'){
    head = `<div class="pc-head"><span class="pc-day">${dayWord}</span><b>Rest day</b>${streakChip()}</div>`;
    rows = `<div class="pc-opt"><span class="pc-k">${ic('coffee')}Rest</span><span class="pc-v">${d === today && uploadsOnDay(today) > 0 ? 'You already posted today, so the rest is over. Your streak is safe.' : 'Energy recovers 50% faster while you don\'t upload. Your upload plan doesn\'t count today.'}</span></div>`;
    rows += `<div class="pc-opt"><span class="pc-k">${ic('upload')}Upload anyway</span><span class="pc-v">No plan bonus and the rest ends for the day. Your plan streak is safe.</span></div>`;
    if (hot && hotVal >= 10) rows += `<div class="pc-opt"><span class="pc-k">${ic('fire')}Trending</span><span class="pc-v">${TOPICS[hot].label} ${moodTxt(hot)}</span>${useBtn(hot)}</div>`;
  } else if (p === 'any'){
    const bonus = planBonusPct('any');
    head = `<div class="pc-head"><span class="pc-day">${dayWord}</span><b>Upload day, any topic</b>${streakChip()}</div>`;
    rows = `<div class="pc-opt good"><span class="pc-k">${ic('calendar')}On plan</span><span class="pc-v">Any topic counts today: <b>+${bonus}% views</b>.</span></div>`;
    if (hot && hotVal >= 10) rows += `<div class="pc-opt"><span class="pc-k">${ic('fire')}Ride the trend</span><span class="pc-v">${TOPICS[hot].label} ${moodTxt(hot)}, and it still counts for your plan</span>${useBtn(hot)}</div>`;
  } else {
    const bonus = planBonusPct('topic');
    head = `<div class="pc-head"><span class="pc-day">${dayWord}</span><b>${TOPICS[p].label} day</b>${streakChip()}</div>`;
    rows = `<div class="pc-opt ${topic === p ? 'good' : ''}"><span class="pc-k">${ic('calendar')}Stick to the plan</span><span class="pc-v">${TOPICS[p].label} ${moodTxt(p)} · <b>+${bonus}% views</b> · ${PLAN_ENERGY_DISCOUNT} less energy${hot === p && hotVal >= 10 ? ' · and it\'s trending' : ''}</span>${useBtn(p)}</div>`;
    if (hot && hot !== p && hotVal >= 10) rows += `<div class="pc-opt ${topic === hot ? 'warn' : ''}"><span class="pc-k">${ic('fire')}Chase the trend</span><span class="pc-v">${TOPICS[hot].label} ${moodTxt(hot)} · off plan: no consistency bonus</span>${useBtn(hot)}</div>`;
    else if (topic && topic !== p) rows += `<div class="pc-opt warn"><span class="pc-k">${ic('alert')}Off plan</span><span class="pc-v">${TOPICS[topic].label} ${moodTxt(topic)} · no consistency bonus, full energy cost</span></div>`;
  }
  const html = head + `<div class="pc-rows">${rows}${waitRow}</div>`;
  if (el._html !== html){ el.innerHTML = html; el._html = html; }
}
function streakChip(){ return (state.planStreak || 0) >= 2 ? `<span class="pc-streak">${ic('fire')}${state.planStreak}-day plan streak</span>` : ''; }

/* ---------------- Your channel page (Customization → Your channel) ---------------- */
let custView = 'channel';
let chRenderedAt = 0, chHtml = '';
function setCustView(v){
  custView = v === 'gear' ? 'gear' : 'channel';
  document.querySelectorAll('#cust-switch [data-cust]').forEach(b => b.classList.toggle('on', b.dataset.cust === custView));
  const ch = document.getElementById('cust-channel'), gear = document.getElementById('cust-gear');
  if (ch) ch.style.display = custView === 'channel' ? '' : 'none';
  if (gear) gear.style.display = custView === 'gear' ? '' : 'none';
  const sub = document.getElementById('shop-sub'); if (sub) sub.textContent = custView === 'channel' ? 'Your picture, banner, details and weekly schedule.' : 'Upgrade your gear and studio.';
  const bal = document.getElementById('shop-balance'); if (bal) bal.style.visibility = custView === 'gear' ? '' : 'hidden';
  if (custView === 'channel') renderChannelPage(true);
}
function openChannel(section){
  switchTab('shop');
  setCustView('channel');
  if (section){
    const el = document.getElementById('ch-' + section);
    if (el) setTimeout(() => { el.scrollIntoView({ block: 'start', behavior: REDUCE_MOTION ? 'auto' : 'smooth' }); el.classList.add('cal-flash'); setTimeout(() => el.classList.remove('cal-flash'), 2000); }, 60);
  }
}
function chSwatch(attr, i, color, on, locked, title){
  return `<button type="button" class="ch-sw${on ? ' on' : ''}${locked ? ' locked' : ''}" data-${attr}="${i}" style="--sw:${color}" ${locked ? `data-locked="${locked}"` : ''} aria-label="${chEsc(title || '')}" title="${chEsc(title || '')}">${locked ? ic('lock') : ''}</button>`;
}
function lockLabel(n){ return n >= 1e6 ? (n / 1e6) + 'M' : n >= 1e3 ? (n / 1e3) + 'K' : String(n); }
function currentAvatar(){
  const c = channelBook();
  if (c.avatar) return c.avatar;
  const p = window.faceParams ? window.faceParams(state.channelName || 'me') : { skin: 0, hair: 0, style: 0, shirt: 0, glasses: 0, bg: 0 };
  return Object.assign({ mode: 'face', mark: 'initials' }, p);
}
function editAvatar(change){
  const c = channelBook();
  c.avatar = Object.assign({}, currentAvatar(), change);
  channelBook();
  playClickSound();
  renderIdentity();
  renderChannelPage(true);
  safeRenderAll();
}
function renderChannelPage(force){
  const root = document.getElementById('channel-root');
  const tab = document.getElementById('tab-shop');
  if (!root || !tab || !tab.classList.contains('active') || custView !== 'channel') return;
  const act = document.activeElement;
  if (act && root.contains(act) && (act.tagName === 'INPUT' || act.tagName === 'TEXTAREA')) return;   // don't wipe what you're typing
  try { if (GameSelect.isOpen()) return; } catch(e){}
  if (!force){
    // the live tick only refreshes the numbers; the editor itself redraws when you change something
    if (Date.now() - chRenderedAt < 3000) return;
    chRenderedAt = Date.now();
    const line = root.querySelector('.ch-line');
    if (line){
      const n = (state.videos || []).filter(v => !v.isVod && (!v.publishPhase || v.publishPhase === 'live')).length;
      const t = `${typeof socialHandle === 'function' ? socialHandle() + ' · ' : ''}${fmt(state.subs)} ${state.subs === 1 ? 'subscriber' : 'subscribers'} · ${fmt(n)} ${n === 1 ? 'video' : 'videos'}`;
      if (line.textContent !== t) line.textContent = t;
      return;
    }
  }
  chRenderedAt = Date.now();
  const c = channelBook(), a = currentAvatar(), P = window.FACE_PARTS;
  const id = computeIdentity();   // fresh: saves from before archetypes have no leanings stored
  const arch = creatorArchetype(id);
  const vids = (state.videos || []).filter(v => !v.isVod && (!v.publishPhase || v.publishPhase === 'live'));
  const sched = scheduleSummary();

  const tags = [
    `<span class="ch-tag">${ic(c.category && TOPICS[c.category] ? TOPIC_ICONS[c.category] : 'sparkle')}${c.category ? categoryLabel(c.category) : 'No category yet'}</span>`,
    `<span class="ch-tag">${ic('calendar')}${sched || 'No upload schedule'}</span>`,
    arch && id.stage !== 'none' ? `<button type="button" class="ch-tag arch" data-ch-jump="archetype">${ic('star')}${arch.label}</button>` : '',
  ].join('');

  const hero = `
    <section class="ch-hero">
      <div class="ch-banner">${playerBannerSVG('hero')}</div>
      <div class="ch-id">
        <div class="ch-pfp face-avatar">${playerAvatarSVG()}</div>
        <div class="ch-meta">
          <h2 class="ch-name">${chEsc(state.channelName || 'My Channel')}</h2>
          <div class="ch-line">${typeof socialHandle === 'function' ? chEsc(socialHandle()) + ' · ' : ''}${fmt(state.subs)} ${state.subs === 1 ? 'subscriber' : 'subscribers'} · ${fmt(vids.length)} ${vids.length === 1 ? 'video' : 'videos'}</div>
          <div class="ch-about${c.about ? '' : ' empty'}">${c.about ? chEsc(c.about) : 'No description yet. Tell viewers what your channel is about below.'}</div>
          <div class="ch-tags">${tags}</div>
        </div>
      </div>
    </section>`;

  // profile picture
  const faceRows = `
    <div class="ch-row"><span class="ch-lbl">Skin</span><div class="ch-sws">${P.skin.map((s, i) => chSwatch('av-skin', i, s[0], a.skin === i, 0, 'Skin tone ' + (i + 1))).join('')}</div></div>
    <div class="ch-row"><span class="ch-lbl">Hair</span><div class="ch-styles">${HAIR_STYLE_NAMES.map((n, i) => `<button type="button" class="ch-face-opt${a.style === i ? ' on' : ''}" data-av-style="${i}" title="${n}"><span class="face-avatar">${faceSVG(`av:${a.skin}.${a.hair}.${i}.${a.shirt}.${a.glasses}.${a.bg}`)}</span><em>${n}</em></button>`).join('')}</div></div>
    <div class="ch-row"><span class="ch-lbl">Hair colour</span><div class="ch-sws">${P.hair.map((h, i) => chSwatch('av-hair', i, h, a.hair === i, 0, 'Hair colour ' + (i + 1))).join('')}</div></div>
    <div class="ch-row"><span class="ch-lbl">Shirt</span><div class="ch-sws">${P.shirt.map((h, i) => chSwatch('av-shirt', i, h, a.shirt === i, 0, 'Shirt colour ' + (i + 1))).join('')}</div></div>
    <div class="ch-row"><span class="ch-lbl">Glasses</span><div class="ch-chips"><button type="button" class="ch-chip${a.glasses ? '' : ' on'}" data-av-glasses="0">None</button><button type="button" class="ch-chip${a.glasses ? ' on' : ''}" data-av-glasses="1">Glasses</button></div></div>`;
  const logoRows = `
    <div class="ch-row"><span class="ch-lbl">Mark</span><div class="ch-styles">${Object.entries(LOGO_MARKS).map(([k, m]) => {
      const locked = !chUnlocked(m.subs);
      return `<button type="button" class="ch-face-opt${a.mark === k ? ' on' : ''}${locked ? ' locked' : ''}" data-av-mark="${k}" ${locked ? `data-locked="${m.subs}"` : ''}><span class="face-avatar">${logoSVG(Object.assign({}, a, { mark: k }))}</span><em>${locked ? ic('lock') + lockLabel(m.subs) : m.label}</em></button>`;
    }).join('')}</div></div>`;
  const bgRow = `<div class="ch-row"><span class="ch-lbl">Background</span><div class="ch-sws">${P.bg.map((b, i) => { const need = AV_BG_LOCK[i] || 0; const locked = !chUnlocked(need) ? need : 0; return chSwatch('av-bg', i, b[0], a.bg === i, locked, locked ? `Unlocks at ${lockLabel(need)} subscribers` : 'Background ' + (i + 1)); }).join('')}</div></div>`;
  const pfpPanel = `
    <div class="panel-box ch-panel" id="ch-picture">
      <div class="ch-ph"><h3>Profile picture</h3><div class="ch-seg"><button type="button" class="${a.mode === 'face' ? 'on' : ''}" data-av-mode="face">Face</button><button type="button" class="${a.mode === 'logo' ? 'on' : ''}" data-av-mode="logo">Logo</button></div></div>
      <div class="ch-pfp-preview"><span class="face-avatar big">${a.mode === 'logo' ? logoSVG(a) : faceSVG(`av:${a.skin}.${a.hair}.${a.style}.${a.shirt}.${a.glasses}.${a.bg}`)}</span>
        <div class="ch-hint">${a.mode === 'logo' ? 'A logo shows next to your name. Your thumbnails still use the face you build.' : 'This face is you: it also appears on your video thumbnails.'}<button type="button" class="mini-btn" data-av-random="1">Shuffle</button></div></div>
      ${a.mode === 'logo' ? logoRows : faceRows}
      ${bgRow}
    </div>`;

  // banner
  const b = c.banner;
  const bannerPanel = `
    <div class="panel-box ch-panel" id="ch-banner">
      <div class="ch-ph"><h3>Banner</h3><button type="button" class="ch-toggle${b.showName ? ' on' : ''}" data-bn-name="1" role="switch" aria-checked="${b.showName}"><i></i>Show name</button></div>
      <div class="ch-banners">${Object.entries(BANNER_STYLES).map(([k, s]) => {
        const locked = !chUnlocked(s.subs);
        return `<button type="button" class="ch-bn${b.style === k ? ' on' : ''}${locked ? ' locked' : ''}" data-bn-style="${k}" ${locked ? `data-locked="${s.subs}"` : ''}>
          <span class="ch-bn-art">${bannerSVG({ style: k, palette: b.palette, seed: state.channelName, uid: 'p' + k })}</span>
          <em>${locked ? ic('lock') + lockLabel(s.subs) + ' subs' : s.label}</em></button>`;
      }).join('')}</div>
      <div class="ch-row"><span class="ch-lbl">Colours</span><div class="ch-sws">${Object.entries(BANNER_PALETTES).map(([k, p]) => `<button type="button" class="ch-sw duo${b.palette === k ? ' on' : ''}${b.style === 'gilded' ? ' off' : ''}" data-bn-pal="${k}" style="--sw:${p.c[1]};--sw2:${p.c[2]}" title="${p.label}" aria-label="${p.label}"></button>`).join('')}</div></div>
      ${b.style === 'gilded' ? '<div class="ch-hint">Gilded is always gold.</div>' : ''}
    </div>`;

  // details
  const cats = ['variety'].concat(Object.keys(TOPICS));
  const canChange = !c.category || c.categoryDay !== clockDay();
  const detailsPanel = `
    <div class="panel-box ch-panel" id="ch-details">
      <h3>Details</h3>
      <label class="ch-field"><span class="ch-lbl">Channel name</span>
        <span class="ch-inline"><input class="setup-input small" id="ch-name-input" maxlength="24" value="${chEsc(state.channelName || '')}"><button class="mini-btn" type="button" data-ch-name="1">Save</button></span></label>
      <label class="ch-field"><span class="ch-lbl">About <em id="ch-about-count">${c.about.length}/150</em></span>
        <textarea class="setup-input ch-about-in" id="ch-about-input" maxlength="150" rows="3" placeholder="What viewers get from your channel, in a sentence or two.">${chEsc(c.about)}</textarea></label>
      <div class="ch-field"><span class="ch-lbl">Category</span>
        <div class="ch-chips">${cats.map(k => `<button type="button" class="ch-chip${c.category === k ? ' on' : ''}" data-ch-cat="${k}" ${!canChange && c.category !== k ? 'disabled' : ''}>${categoryLabel(k)}</button>`).join('')}</div>
        <div class="ch-hint">${c.category === 'variety' ? 'Every upload gets a small push (+1).' : c.category ? `${categoryLabel(c.category)} uploads get shown to people browsing ${categoryLabel(c.category)} (+${CATEGORY_BONUS}). Other topics are fine, they just don't get the push.` : `Pick what you mostly make: those uploads get shown to people browsing it (+${CATEGORY_BONUS}).`}${!canChange ? ' You can change it again tomorrow.' : ''}</div></div>
    </div>`;

  // schedule
  const schedPanel = `
    <div class="panel-box ch-panel ch-wide" id="ch-schedule">
      <div class="ch-ph"><h3>Upload schedule</h3><button type="button" class="mini-btn" data-plan-open="1">${ic('calendar')}Open Calendar</button></div>
      <div class="ch-hint top">Your weekly plan is your public schedule. Stick to it for a consistency bonus; rest days give your energy room to recover.</div>
      ${weekPlanEditorHTML('channel')}
    </div>`;

  // archetype
  const forming = id.stage === 'none';
  const topLean = Object.entries(id.lean || {}).sort((x, y) => y[1] - x[1])[0]?.[0];
  const archCards = ['specialist', 'variety', 'trend', 'evergreen'].map(k => {
    const A = CREATOR_ARCHETYPES[k], pct = Math.round(((id.lean || {})[k] || 0) * 100);
    const on = !forming && arch && (arch.key === k || (arch.focus === k && id.style));
    const primary = !forming && arch && arch.key === k;
    const leaning = forming && pct > 0 && k === topLean;
    return `<div class="ch-arch${primary ? ' primary' : on || leaning ? ' on' : ''}">
      <div class="ch-arch-top"><b>${A.label}</b>${primary ? '<span class="ch-arch-tag">You</span>' : on ? '<span class="ch-arch-tag soft">Also</span>' : leaning ? '<span class="ch-arch-tag soft">Leaning</span>' : ''}</div>
      <div class="ch-arch-line">${A.line}</div>
      <div class="meter-track"><div class="fill" style="width:${pct}%"></div></div>
      <div class="ch-arch-how">${A.how}</div>
    </div>`;
  }).join('');
  const fx = forming ? [] : identityEffectsList(id);
  const archPanel = `
    <div class="panel-box ch-panel ch-wide" id="ch-archetype">
      <div class="ch-ph"><h3>Creator archetype</h3><span class="ch-stage">${forming ? `Forming · ${Math.max(0, 15 - id.total)} uploads to go` : id.stage === 'emerging' ? 'Emerging · half strength' : 'Established'}</span></div>
      <div class="ch-hint top">You don't pick one. Your last 30 uploads move you toward an archetype, and changing what you make moves you again.</div>
      <div class="ch-archs">${archCards}</div>
      ${fx.length ? `<div class="id-fx-list">${fx.map(e => `<div class="idm-fx ${e.good ? 'good' : 'bad'}">${e.good ? '+' : '−'} ${e.text}</div>`).join('')}</div>` : ''}
    </div>`;

  const html = hero + `<div class="ch-grid"><div class="ch-col">${pfpPanel}</div><div class="ch-col">${bannerPanel}${detailsPanel}</div>${archPanel}${schedPanel}</div>`;
  if (html !== chHtml){ root.innerHTML = html; chHtml = html; try { GameSelect.sync(); } catch(e){} }
}

function initChannelUI(){
  const sw = document.getElementById('cust-switch');
  if (sw) sw.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cust]');
    if (!b) return;
    playClickSound(); setCustView(b.dataset.cust);
  });
  const av = document.getElementById('channel-avatar');
  if (av) av.addEventListener('click', () => { playClickSound(); openChannel(); });
  const setBtn = document.getElementById('set-customize');
  if (setBtn) setBtn.addEventListener('click', () => { playClickSound(); openChannel(); });

  // plan selects + suggestion + Open Calendar, wherever they are
  document.addEventListener('change', (e) => {
    const s = e.target.closest && e.target.closest('[data-plan-day]');
    if (!s) return;
    setPlanDay(+s.dataset.planDay, s.value || null);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest) return;
    const sug = e.target.closest('[data-plan-suggest]');
    if (sug){ suggestPlan(); return; }
    const op = e.target.closest('[data-plan-open]');
    if (op){ playClickSound(); switchTab('calendar'); setTimeout(() => { const w = document.getElementById('cal-weekplan'); if (w) w.scrollIntoView({ block: 'start', behavior: REDUCE_MOTION ? 'auto' : 'smooth' }); }, 60); return; }
    const use = e.target.closest('[data-plan-use]');
    if (use){
      const tile = document.querySelector(`#topic-tiles .topic-tile[data-value="${use.dataset.planUse}"]`);
      if (tile) tile.click();
      return;
    }
    const oc = e.target.closest('[data-open-channel]');
    if (oc){ playClickSound(); openChannel(oc.dataset.openChannel); return; }
  });

  const root = document.getElementById('channel-root');
  if (!root) return;
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.locked){ playErrorSound(); showToast(ic('lock') + ` Unlocks at ${lockLabel(+d.locked)} subscribers.`); return; }
    if (d.chJump){ openChannel(d.chJump); return; }
    if (d.avMode){ editAvatar({ mode: d.avMode }); return; }
    if (d.avSkin !== undefined){ editAvatar({ skin: +d.avSkin }); return; }
    if (d.avHair !== undefined){ editAvatar({ hair: +d.avHair }); return; }
    if (d.avStyle !== undefined){ editAvatar({ style: +d.avStyle }); return; }
    if (d.avShirt !== undefined){ editAvatar({ shirt: +d.avShirt }); return; }
    if (d.avGlasses !== undefined){ editAvatar({ glasses: +d.avGlasses }); return; }
    if (d.avBg !== undefined){ editAvatar({ bg: +d.avBg }); return; }
    if (d.avMark){ editAvatar({ mark: d.avMark }); return; }
    if (d.avRandom){
      const P = window.FACE_PARTS, ri = n => Math.floor(Math.random() * n);
      const bgs = P.bg.map((_, i) => i).filter(i => chUnlocked(AV_BG_LOCK[i] || 0));
      editAvatar({ skin: ri(P.skin.length), hair: ri(P.hair.length), style: ri(6), shirt: ri(P.shirt.length), glasses: Math.random() < .25 ? 1 : 0, bg: bgs[ri(bgs.length)] });
      return;
    }
    if (d.bnStyle){ channelBook().banner.style = d.bnStyle; playClickSound(); renderChannelPage(true); return; }
    if (d.bnPal){ channelBook().banner.palette = d.bnPal; playClickSound(); renderChannelPage(true); return; }
    if (d.bnName){ const bn = channelBook().banner; bn.showName = !bn.showName; playClickSound(); renderChannelPage(true); return; }
    if (d.chCat){ setCategory(d.chCat); return; }
    if (d.chName){
      const v = (document.getElementById('ch-name-input') || {}).value;
      const name = String(v || '').trim().slice(0, 24);
      if (!name){ playErrorSound(); return; }
      if (name === state.channelName) return;
      state.channelName = name;
      playCoinSound();
      showToast(ic('check') + ` Channel renamed to ${chEsc(name)}`);
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
      renderChannelPage(true); safeRenderAll();
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'ch-about-input') return;
    channelBook().about = e.target.value.replace(/\s+/g, ' ').slice(0, 150);
    const cnt = document.getElementById('ch-about-count'); if (cnt) cnt.textContent = `${e.target.value.length}/150`;
    const ab = root.querySelector('.ch-about');
    if (ab){ ab.textContent = channelBook().about || 'No description yet. Tell viewers what your channel is about below.'; ab.classList.toggle('empty', !channelBook().about); }
  });
  root.addEventListener('keydown', (e) => {
    if (e.target.id === 'ch-name-input' && e.key === 'Enter'){ const b = root.querySelector('[data-ch-name]'); if (b) b.click(); }
  });
  root.addEventListener('focusout', (e) => { if (e.target.id === 'ch-about-input') setTimeout(() => renderChannelPage(true), 0); });
  setCustView(custView);
}

/* Save compatibility: called while loading. Returns true when the save predates this feature. */
function ensureChannelState(){
  const isNew = !state.channel;
  channelBook();
  planBook();
  return isNew;
}

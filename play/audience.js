/* =========================================================================
   STREAMLY SIM — AUDIENCE (Analytics → Audience)
   Who's watching, kept readable. Everything here drifts a little every
   in-game hour toward where your last 30 videos point (weighted by views).

   - Age (13–17 ... 35+): from each video's topic, format and type. Older
     audiences are worth more to advertisers.
   - Viewer types: core fans, regulars, casual viewers. Retention, happy
     viewers, an upload streak, a clear niche, streams and memberships build
     fans; Shorts, viral hits and clickbait bring casuals. Fans lift a new
     upload's first day; casual audiences drift away faster in a break.
   - Countries: small channels are mostly local (Nigeria and neighbours);
     as you grow, and with Shorts, your topics pull in their global crowd.
     Countries set ad rates (a US or UK view earns far more than a local
     one) and, through time zones, WHEN your viewers are online.
   - Active hours: the hour-by-hour curve that replaces the fixed 6-10 PM
     prime time. Publishing and streaming at your audience's peak gets the
     best first day; a US-heavy channel peaks around 2-3 AM your time.
   - Devices, watch time from subscribers, and the channels your audience
     also watches (collabs with them land 20% better).
   Loaded before game.js; functions only run after the game starts.
   ========================================================================= */
const AGE_GROUPS = ['13–17', '18–24', '25–34', '35+'];
const AGE_BY_TOPIC = {
  gaming:    [0.30, 0.42, 0.20, 0.08],
  comedy:    [0.25, 0.40, 0.24, 0.11],
  football:  [0.15, 0.38, 0.30, 0.17],
  tech:      [0.08, 0.32, 0.36, 0.24],
  lifestyle: [0.12, 0.38, 0.32, 0.18],
  cooking:   [0.05, 0.22, 0.36, 0.37],
};
const AGE_ARCH_SHIFT = {
  news: [-0.04, -0.02, 0.03, 0.03], guide: [-0.03, 0, 0.02, 0.01], review: [-0.03, -0.01, 0.02, 0.02],
  comparison: [-0.03, -0.01, 0.02, 0.02], opinion: [-0.02, 0, 0.01, 0.01], reaction: [0.05, 0.03, -0.04, -0.04],
  challenge: [0.05, 0.02, -0.03, -0.04], unboxing: [0.02, 0.01, -0.01, -0.02], list: [0.02, 0.01, -0.01, -0.02], casual: [0, 0, 0, 0],
};
const AGE_AD_VALUE = [0.55, 0.9, 1.15, 1.35];   // what a view from each age group is worth to advertisers
const MIN_DEMO_VIEWS = 100;

/* tz = hours ahead of your in-game clock (which runs on Lagos time). rpm = ad value of a view from there. */
const COUNTRIES = {
  NG: { name: 'Nigeria',        tz: 0,    rpm: 0.45 },
  GH: { name: 'Ghana',          tz: -1,   rpm: 0.45 },
  KE: { name: 'Kenya',          tz: 2,    rpm: 0.5 },
  ZA: { name: 'South Africa',   tz: 1,    rpm: 0.75 },
  GB: { name: 'United Kingdom', tz: -1,   rpm: 1.7 },
  US: { name: 'United States',  tz: -6,   rpm: 2.0 },
  CA: { name: 'Canada',         tz: -6,   rpm: 1.7 },
  IN: { name: 'India',          tz: 4.5,  rpm: 0.4 },
  PH: { name: 'Philippines',    tz: 7,    rpm: 0.45 },
  BR: { name: 'Brazil',         tz: -4,   rpm: 0.6 },
};
const C_KEYS = Object.keys(COUNTRIES);
const LOCAL_MIX = { NG: 0.74, GH: 0.1, KE: 0.04, ZA: 0.05, GB: 0.04, US: 0.03 };
const GLOBAL_BY_TOPIC = {
  gaming:    { US: .30, PH: .14, BR: .12, IN: .12, GB: .08, CA: .05, NG: .10, ZA: .04, KE: .03, GH: .02 },
  comedy:    { NG: .30, US: .18, GH: .10, GB: .10, KE: .08, ZA: .07, IN: .07, CA: .04, PH: .03, BR: .03 },
  football:  { GB: .22, NG: .22, BR: .12, US: .08, GH: .08, KE: .07, ZA: .07, IN: .06, PH: .05, CA: .03 },
  tech:      { US: .30, IN: .22, GB: .10, NG: .10, CA: .06, PH: .06, ZA: .05, KE: .05, BR: .04, GH: .02 },
  lifestyle: { US: .25, NG: .16, GB: .14, IN: .08, PH: .08, CA: .07, ZA: .07, GH: .05, KE: .05, BR: .05 },
  cooking:   { NG: .26, US: .18, GB: .14, GH: .10, KE: .07, CA: .06, ZA: .06, IN: .06, PH: .04, BR: .03 },
};
/* How active people are at each LOCAL hour (0 = midnight): quiet overnight, lunch bump, evening peak around 8 PM. */
const LOCAL_ACTIVITY = [0.25, 0.15, 0.1, 0.08, 0.08, 0.12, 0.25, 0.4, 0.45, 0.45, 0.5, 0.55, 0.65, 0.6, 0.55, 0.55, 0.6, 0.7, 0.85, 0.95, 1.0, 0.95, 0.75, 0.45];
const DEVICES = [
  { key: 'mobile',   label: 'Phone' },
  { key: 'computer', label: 'Computer' },
  { key: 'tv',       label: 'TV' },
  { key: 'tablet',   label: 'Tablet' },
];
const DEVICE_ICON = {
  mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
  computer: '<rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M8.5 20h7M12 16v4"/>',
  tv: '<rect x="2.5" y="5" width="19" height="12.5" rx="1.8"/><path d="M8 21h8M9 2.5l3 2.5 3-2.5"/>',
  tablet: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><path d="M11 18.5h2"/>',
};

/* ---------------- per-video mixes ---------------- */
function videoAgeMix(v){
  let m = (AGE_BY_TOPIC[v.topic] || AGE_BY_TOPIC.gaming).slice();
  const add = s => { m = m.map((x, i) => x + s[i]); };
  if (v.format === 'shorts') add([0.07, 0.03, -0.05, -0.05]);
  if (v.ctArch && AGE_ARCH_SHIFT[v.ctArch]) add(AGE_ARCH_SHIFT[v.ctArch]);
  return normalize(m.map(x => Math.max(0.02, x)));
}
function videoDeviceMix(v){
  if (v.format === 'shorts') return [0.93, 0.03, 0.01, 0.03];
  let m = [0.62, 0.2, 0.1, 0.08];
  if (v.length === 'm15'){ m[0] -= 0.06; m[2] += 0.06; }
  if (v.length === 'm25'){ m[0] -= 0.1; m[1] -= 0.02; m[2] += 0.12; }
  if (v.isVod){ m[0] -= 0.1; m[1] += 0.1; }
  if (v.topic === 'gaming' || v.topic === 'tech'){ m[0] -= 0.06; m[1] += 0.06; }
  if (v.topic === 'cooking' || v.topic === 'football'){ m[0] -= 0.04; m[2] += 0.04; }
  return normalize(m.map(x => Math.max(0.01, x)));
}
function normalize(m){ const t = m.reduce((a, b) => a + b, 0) || 1; return m.map(x => x / t); }
function topAgeIndex(mix){ return mix.indexOf(Math.max(...mix)); }
function recentAudienceVideos(){ return state.videos.filter(v => (!v.publishPhase || v.publishPhase === 'live') && v.views > 0).slice(-30); }

/* Share of your recent views per topic (sqrt-weighted so one hit doesn't decide everything). */
function audienceTopicShares(vids){
  vids = vids || recentAudienceVideos();
  const w = v => Math.sqrt(v.views), sum = vids.reduce((a, v) => a + w(v), 0) || 1;
  const out = {};
  vids.forEach(v => { out[v.topic] = (out[v.topic] || 0) + w(v) / sum; });
  return out;
}

/* ---------------- where the audience is heading ---------------- */
function targetDemographics(){
  const vids = recentAudienceVideos();
  const totalViews = vids.reduce((a, v) => a + v.views, 0);
  if (!vids.length || totalViews < MIN_DEMO_VIEWS) return null;
  const weight = v => Math.sqrt(v.views);
  const wSum = vids.reduce((a, v) => a + weight(v), 0);
  const age = [0, 0, 0, 0], devices = [0, 0, 0, 0];
  vids.forEach(v => {
    videoAgeMix(v).forEach((x, i) => { age[i] += x * weight(v) / wSum; });
    videoDeviceMix(v).forEach((x, i) => { devices[i] += x * v.views / totalViews; });
  });

  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const share = fn => vids.filter(fn).reduce((a, v) => a + v.views, 0) / totalViews;
  const lf = vids.filter(v => v.format !== 'shorts');
  const avgRet = lf.length ? mean(lf.map(v => shownRetention(v))) / 100 : 0.3;
  const avgSat = mean(vids.map(v => v.satisfaction || 50)) / 100;
  const streak = Math.min(state.cadStreak || 0, 10) / 10;
  const id = state.identity;
  const niche = id && id.main === 'specialist' ? (id.stage === 'established' ? 1 : id.stage === 'emerging' ? 0.5 : 0) : 0;
  const streams = Math.min(1, state.videos.filter(v => v.isVod).slice(-10).length / 5);
  const bait = vids.filter(v => v.thumb === 'shock' || v.titleStyle === 'curiosity').length / vids.length;
  const shortsShare = share(v => v.format === 'shorts');
  let dedicated = 0.10 + avgRet * 0.35 + (avgSat - 0.5) * 0.4 + streak * 0.12 + niche * 0.08 + streams * 0.06 + (state.fanFunding ? 0.04 : 0)
    - shortsShare * 0.18 - share(v => v.outcomeType === 'viral' || v.breakout) * 0.15 - bait * 0.12;
  dedicated = clamp(dedicated, 0.06, 0.72);
  const core = dedicated * 0.45, regular = dedicated * 0.55 + 0.15;

  // countries: local while small, your topics' global crowd as you grow (Shorts travel further)
  const topics = audienceTopicShares(vids);
  const reach = clamp(Math.log10(state.subs + 10) / 6 + shortsShare * 0.15, 0.15, 0.92);
  const countries = normalize(C_KEYS.map(k => {
    const global = Object.entries(topics).reduce((a, [t, s]) => a + s * ((GLOBAL_BY_TOPIC[t] || {})[k] || 0), 0);
    return (LOCAL_MIX[k] || 0) * (1 - reach) + global * reach;
  }));
  return { age, core, regular, casual: 1 - core - regular, countries, devices };
}

/* ---------------- hourly: drift, and the moments worth telling the player about ---------------- */
let actCache = null, actKey = '';
function tickDemographics(){
  const t = targetDemographics();
  if (!t) return;
  let d = state.demo;
  if (!d || !Array.isArray(d.age) || d.age.length !== 4){
    state.demo = { age: t.age, core: t.core, regular: t.regular, casual: t.casual, topAge: topAgeIndex(t.age), coreMark: t.core >= 0.25 ? 2 : t.core >= 0.15 ? 1 : 0 };
    d = state.demo;
  }
  if (!Array.isArray(d.countries) || d.countries.length !== C_KEYS.length){ d.countries = t.countries; d.topCountry = topAgeIndex(t.countries); d.primeHour = primeHour(); }
  if (!Array.isArray(d.devices) || d.devices.length !== 4) d.devices = t.devices;
  d.age = d.age.map((x, i) => x + (t.age[i] - x) * 0.08);
  d.devices = d.devices.map((x, i) => x + (t.devices[i] - x) * 0.08);
  d.countries = d.countries.map((x, i) => x + (t.countries[i] - x) * 0.05);
  ['core', 'regular', 'casual'].forEach(k => { d[k] = d[k] + (t[k] - d[k]) * 0.05; });
  const moment = (m) => { if (!offlineFastForward && typeof showMoment === 'function') showMoment(m); };

  const top = topAgeIndex(d.age);
  if (top !== d.topAge && Math.abs(d.age[top] - d.age[d.topAge]) > 0.02){
    const older = top > d.topAge;
    d.topAge = top;
    pushNotification(ic('users') + ` ${AGE_GROUPS[top]} is now your biggest age group.`);
    moment({ tag: 'Audience shift', tone: older ? 'money' : 'good', title: `${AGE_GROUPS[top]} is now your biggest age group.`,
      lines: [older ? 'Older viewers are worth more to advertisers: your ad rates and sponsor offers go up.' : 'Younger viewers comment and share more, but they earn less per view.'], actions: [{ label: 'See your audience', tab: 'analytics' }] });
  }
  const mark = d.core >= 0.25 ? 2 : d.core >= 0.15 ? 1 : 0;
  if (mark > (d.coreMark || 0)){
    d.coreMark = mark;
    const line = mark === 2 ? 'A quarter of your viewers are core fans now.' : 'Your core fanbase is forming.';
    pushNotification(ic('heart') + ' ' + line + ' They show up on day one for every upload.');
    moment({ tag: 'Fanbase', tone: 'good', title: line, lines: ['Core fans watch everything you post, give new videos a bigger first day and stick around through quiet weeks.'], actions: [{ label: 'See your audience', tab: 'analytics' }] });
  }
  const topC = topAgeIndex(d.countries);
  if (topC !== d.topCountry && Math.abs(d.countries[topC] - d.countries[d.topCountry || 0]) > 0.02){
    d.topCountry = topC;
    const C = COUNTRIES[C_KEYS[topC]];
    pushNotification(ic('users') + ` ${C.name} is now your biggest country.`);
    moment({ tag: 'Going global', tone: C.rpm >= 1.5 ? 'money' : 'good', title: `Most of your viewers are now in ${C.name}.`,
      lines: [C.tz ? `They're online around ${hourLabel(countryPeakHour(C_KEYS[topC]))} your time.` : 'Your audience is closest to home.', C.rpm >= 1.5 ? 'Views from there earn some of the best ad rates on Streamly.' : 'Check Analytics to see when your audience is online now.'],
      actions: [{ label: 'See your audience', tab: 'analytics' }] });
  }
  const p = primeHour();
  if (typeof d.primeHour !== 'number') d.primeHour = p;
  else if (hourGap(p, d.primeHour) >= 2){
    d.primeHour = p;   // only moves once it has really shifted, so a wobble doesn't spam
    pushNotification(ic('calendar') + ` Your viewers' prime time has moved to ${primeLabel(p)}. Schedule uploads and streams for then.`);
  }
}
function hourGap(a, b){ const g = Math.abs(a - b) % 24; return Math.min(g, 24 - g); }

/* ---------------- active hours (on your in-game clock) ---------------- */
function audienceCountryMix(){ const d = state.demo; return d && Array.isArray(d.countries) ? d.countries : normalize(C_KEYS.map(k => LOCAL_MIX[k] || 0)); }
function localActivityAt(hour){
  const h = ((hour % 24) + 24) % 24, lo = Math.floor(h), f = h - lo;
  return LOCAL_ACTIVITY[lo] * (1 - f) + LOCAL_ACTIVITY[(lo + 1) % 24] * f;
}
/* 24 values, 0..1 (1 = your audience's busiest hour). */
function audienceActivity(){
  const mix = audienceCountryMix();
  const key = mix.map(x => x.toFixed(3)).join(',');
  if (actCache && key === actKey) return actCache;
  const raw = Array.from({ length: 24 }, (_, h) => C_KEYS.reduce((a, k, i) => a + mix[i] * localActivityAt(h + COUNTRIES[k].tz), 0));
  const max = Math.max(...raw);
  actCache = raw.map(x => x / max); actKey = key;
  return actCache;
}
/* Best hour to go live: the start of the busiest 3-hour stretch. */
function primeHour(){
  const a = audienceActivity();
  let best = 19, bestSum = -1;
  for (let h = 0; h < 24; h++){ const s = a[h] + a[(h + 1) % 24] + a[(h + 2) % 24]; if (s > bestSum + 1e-9){ bestSum = s; best = h; } }
  return best;
}
function hourLabel(h){ h = ((h % 24) + 24) % 24; return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`; }
function primeLabel(p){ return `${hourLabel(p)} – ${hourLabel(p + 3)}`; }
function countryPeakHour(k){ return Math.round(((20 - COUNTRIES[k].tz) % 24 + 24) % 24); }
function inPrime(h, p){ return ((h - p + 24) % 24) < 3; }

/* ---------------- what the audience does to the rest of the game ---------------- */
function demoAgeRpmMult(){ const d = state.demo; return d && d.age ? d.age.reduce((a, x, i) => a + x * AGE_AD_VALUE[i], 0) / 0.98 : 1; }
function demoCountryRpmMult(){
  const d = state.demo;
  if (!d || !Array.isArray(d.countries)) return 1;
  const raw = C_KEYS.reduce((a, k, i) => a + d.countries[i] * COUNTRIES[k].rpm, 0);
  return clamp(Math.pow(raw / 0.82, 0.7), 0.6, 1.5);
}
function demoRpmMult(){ return demoAgeRpmMult() * demoCountryRpmMult(); }
function demoFanMult(){ const d = state.demo; return d ? 0.75 + d.core * 1.0 + d.regular * 0.5 : 1; }   // day-one pull for uploads and streams
function demoSubMult(){ const d = state.demo; return d ? 0.9 + d.core * 0.5 + d.regular * 0.15 : 1; }
function demoDecayMult(){ const d = state.demo; return d ? 0.6 + d.casual * 0.8 : 1; }                 // how fast a quiet channel loses people
function subscriberWatchShare(){ const d = state.demo; return d ? clamp(d.core * 0.95 + d.regular * 0.6 + d.casual * 0.05, 0.03, 0.95) : 0; }
/* Day-one boost by the hour a video goes live, from when your audience is actually online. */
function audienceTimeMult(hour){ return 0.72 + 0.5 * audienceActivity()[((hour % 24) + 24) % 24]; }
function audienceLiveMult(hour){ return 0.55 + 0.75 * audienceActivity()[((hour % 24) + 24) % 24]; }
/* The three creators your audience also watches most: same topics, bigger names. */
function audienceAlsoWatches(){
  const topics = audienceTopicShares();
  return ensureRivals().filter(r => topics[r.topic])
    .map(r => ({ r, score: topics[r.topic] * Math.log10(r.subs + 10) * (r.peer ? 0.85 : 1) }))
    .sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.r);
}
function relWord(mult){ const p = Math.round((mult - 1) * 100); return Math.abs(p) < 3 ? 'about average' : `${Math.abs(p)}% ${p > 0 ? 'above' : 'below'} average`; }

/* ---------------- Analytics → Audience ---------------- */
function renderDemographics(){
  const el = document.getElementById('demo-card');
  if (!el) return;
  const tab = document.getElementById('tab-analytics');
  if (tab && !tab.classList.contains('active') && el.dataset.built) return;
  if (!state.demo || !Array.isArray(state.demo.countries)) tickDemographics();
  const d = state.demo;
  if (d){   // a save from before countries/devices existed, with too few views to recompute yet
    if (!Array.isArray(d.countries) || d.countries.length !== C_KEYS.length) d.countries = normalize(C_KEYS.map(k => LOCAL_MIX[k] || 0));
    if (!Array.isArray(d.devices) || d.devices.length !== 4) d.devices = [0.62, 0.2, 0.1, 0.08];
  }
  el.dataset.built = '1';
  const more = document.getElementById('aud-more');
  if (!d){
    el.innerHTML = `<div class="empty-hint">Your audience profile appears once your videos reach ${MIN_DEMO_VIEWS} views.</div>`;
    if (more) more.style.display = 'none';
    return;
  }
  if (more) more.style.display = '';
  const p = primeHour();

  /* age + viewer types */
  const top = topAgeIndex(d.age);
  const ages = d.age.map((x, i) => `
    <div class="dm-age${i === top ? ' top' : ''}">
      <span class="dm-lbl">${AGE_GROUPS[i]}</span>
      <span class="dm-track"><span class="dm-fill" style="width:${Math.round(x / Math.max(...d.age) * 100)}%"></span></span>
      <b>${Math.round(x * 100)}%</b>
    </div>`).join('');
  const kinds = [
    { k: 'core', label: 'Core fans', note: 'Watch everything, show up on day one' },
    { k: 'regular', label: 'Regulars', note: 'Come back for most uploads' },
    { k: 'casual', label: 'Casual viewers', note: 'Found one video, may not return' },
  ];
  const stack = kinds.map(x => `<span class="dm-seg ${x.k}" style="width:${(d[x.k] * 100).toFixed(1)}%"></span>`).join('');
  const legend = kinds.map(x => `
    <div class="dm-kind"><i class="${x.k}"></i><div><div class="dm-kname">${x.label} <b>${Math.round(d[x.k] * 100)}%</b></div><div class="dm-knote">${x.note}</div></div></div>`).join('');
  const shortsHeavy = state.videos.slice(-30).filter(v => v.format === 'shorts').length >= 12;
  const loyalLine = d.core >= 0.22 ? 'You have a real fanbase: core fans give every upload a strong first day and stay through quiet weeks.'
    : d.casual >= 0.6 ? 'Most of your viewers are casual: they found one video and moved on. Steady uploads, longer watch time and live streams turn them into fans.'
    : 'Your audience is a healthy mix. A steady upload streak and high retention grow your core fans.';
  const ageLine = top === 0 ? `Your audience skews young${shortsHeavy ? ', mostly from Shorts' : ''}: lots of comments and shares, but the lowest ad rates.`
    : top >= 2 ? `Your audience skews older, so every view earns more and sponsors pay better.`
    : `Most of your viewers are 18–24. News, guides and reviews pull in older viewers; challenges, reactions and Shorts pull in younger ones.`;
  el.innerHTML = `
    <div class="dm-grid">
      <div><div class="dm-head">Age</div>${ages}</div>
      <div><div class="dm-head">Viewer types</div><div class="dm-stack">${stack}</div>${legend}</div>
    </div>
    <div class="dm-fx">
      <span>Ad rates <b>${relWord(demoRpmMult())}</b></span>
      <span>First-day pull <b>${relWord(demoFanMult())}</b></span>
      <span>Prime time <b>${primeLabel(p)}</b></span>
    </div>
    <div class="dm-insight">${ic('sparkle')}<span>${loyalLine} ${ageLine}</span></div>`;

  /* when your viewers are on Streamly */
  const hoursEl = document.getElementById('aud-hours');
  if (hoursEl){
    const act = audienceActivity();
    const nowH = Math.floor(clockMinute(state.totalTicks) / 60);
    const ranked = C_KEYS.map((k, i) => ({ k, s: d.countries[i] })).sort((a, b) => b.s - a.s);
    const abroad = ranked.find(x => COUNTRIES[x.k].tz !== 0 && Math.abs(COUNTRIES[x.k].tz) >= 3 && x.s >= 0.12);
    hoursEl.innerHTML = `
      <div class="ah-chart">${act.map((a, h) => `<div class="ah-bar${inPrime(h, p) ? ' prime' : ''}${h === nowH ? ' now' : ''}" title="${hourLabel(h)}: ${Math.round(a * 100)}% of your peak"><span style="height:${Math.max(4, Math.round(a * 100))}%"></span></div>`).join('')}</div>
      <div class="ah-axis">${[0, 3, 6, 9, 12, 15, 18, 21].map(h => `<span>${hourLabel(h)}</span>`).join('')}</div>
      <div class="ah-note">
        <div><span class="ah-key prime"></span>Your viewers are most active <b>${primeLabel(p)}</b>. Videos that go live then get the best first day, and streams draw the biggest crowd.</div>
        ${abroad ? `<div><span class="ah-key"></span>${COUNTRIES[abroad.k].name} viewers (${Math.round(abroad.s * 100)}%) are online around <b>${hourLabel(countryPeakHour(abroad.k))}</b> your time.</div>` : ''}
        <div class="ah-small">Times are on your in-game clock. The outlined bar is now.</div>
      </div>`;
  }

  /* top countries */
  const cEl = document.getElementById('aud-countries');
  if (cEl){
    const rows = C_KEYS.map((k, i) => ({ k, s: d.countries[i] })).sort((a, b) => b.s - a.s).slice(0, 5);
    const maxS = rows[0].s;
    cEl.innerHTML = rows.map(r => `
      <div class="ac-row">
        <span class="ac-code">${r.k}</span>
        <span class="ac-name">${COUNTRIES[r.k].name}${COUNTRIES[r.k].rpm >= 1.5 ? '<i>High ad rates</i>' : ''}</span>
        <span class="dm-track"><span class="dm-fill" style="width:${Math.round(r.s / maxS * 100)}%"></span></span>
        <b>${Math.round(r.s * 100)}%</b>
      </div>`).join('') + `<div class="ac-foot">Ad value from countries: <b>${relWord(demoCountryRpmMult())}</b>. Small channels are mostly local; as you grow, your topics bring in viewers from abroad.</div>`;
  }

  /* how they watch: devices + watch time from subscribers */
  const dEl = document.getElementById('aud-devices');
  if (dEl){
    const subShare = subscriberWatchShare();
    const maxD = Math.max(...d.devices);
    dEl.innerHTML = DEVICES.map((x, i) => `
      <div class="ad-row">
        <svg class="ad-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${DEVICE_ICON[x.key]}</svg>
        <span class="ac-name">${x.label}</span>
        <span class="dm-track"><span class="dm-fill" style="width:${Math.round(d.devices[i] / maxD * 100)}%"></span></span>
        <b>${Math.round(d.devices[i] * 100)}%</b>
      </div>`).join('') + `
      <div class="ad-subs">
        <div class="ad-subs-head"><span>Watch time from subscribers</span><b>${Math.round(subShare * 100)}%</b></div>
        <div class="dm-stack"><span class="dm-seg regular" style="width:${(subShare * 100).toFixed(1)}%"></span></div>
        <div class="ac-foot">${d.devices[2] >= 0.15 ? 'A lot of people watch you on TV: long videos suit them.' : d.devices[0] >= 0.8 ? 'Almost everyone watches on a phone, which is where Shorts live.' : 'Most people watch on their phones.'} Core fans and regulars make up your subscriber watch time.</div>
      </div>`;
  }

  /* channels your audience also watches */
  const aEl = document.getElementById('aud-also');
  if (aEl){
    const list = audienceAlsoWatches();
    aEl.innerHTML = list.length ? `<div class="aa-grid">${list.map(r => `
      <div class="aa-card">
        <span class="face-avatar">${thumbFace(r.name)}</span>
        <div><div class="cb-name">${r.name}</div><div class="cb-sub">${TOPICS[r.topic].label} · ${fmtCompact(r.subs)} subs</div></div>
      </div>`).join('')}</div>
      <div class="ac-foot">Your viewers already watch them, so a collab with one of these creators brings in 20% more subscribers.</div>` : `<div class="empty-hint">Make a few more videos to see who else your viewers watch.</div>`;
  }
}

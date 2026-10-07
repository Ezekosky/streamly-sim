/* =========================================================================
   STREAMLY SIM — CREATOR RELATIONSHIPS, SPONSOR CONTRACTS, CREATOR MOMENTS
   Loaded before game.js; everything here runs after the game has started,
   so game.js / identity.js globals are available.
   ========================================================================= */

/* ======================= 1. CREATOR RELATIONSHIPS ======================= */
/* Every rival has a relationship value from -100 to +100 that your interactions move. */
const REL_TIERS = [
  { min: 80,   key: 'regular',  label: 'Regular collaborator', tone: 'good' },
  { min: 50,   key: 'collab',   label: 'Collaborator',         tone: 'good' },
  { min: 20,   key: 'friendly', label: 'Friendly',             tone: 'good' },
  { min: -19,  key: 'neutral',  label: 'Neutral',              tone: 'mute' },
  { min: -59,  key: 'rival',    label: 'Rival',                tone: 'warn' },
  { min: -101, key: 'major',    label: 'Major rivalry',        tone: 'bad'  },
];
function relOf(r){ if (typeof r.rel !== 'number') r.rel = r.peer ? -10 : 0; return r.rel; }
function relTier(r){ const v = relOf(r); return REL_TIERS.find(t => v >= t.min) || REL_TIERS[3]; }
function adjustRel(r, delta, why){
  if (!r) return;
  const before = relTier(r).key;
  r.rel = clamp(relOf(r) + delta, -100, 100);
  const after = relTier(r);
  if (after.key !== before && !offlineFastForward){
    const better = delta > 0;
    const line = {
      friendly: `You and ${r.name} are on good terms now.`,
      collab: `${r.name} considers you a collaborator. Collabs with them cost half.`,
      regular: `${r.name} is now a regular collaborator. Collabs are free and land harder.`,
      neutral: `Things with ${r.name} have cooled to neutral.`,
      rival: `${r.name} sees you as a rival now. Expect them to answer your videos.`,
      major: `It's a full-blown rivalry with ${r.name}. Every upload is a statement now.`,
    }[after.key];
    pushNotification(ic(better ? 'users' : 'fire') + ' ' + line);
    showMoment({ tag: better ? 'Creator relationship' : 'Rivalry', tone: better ? 'good' : 'bad', title: line, lines: why ? [why] : [], face: r.name, actions: [{ label: 'Open Feed', tab: 'feed' }] });
  }
}
/* collab price and pull follow the relationship */
function relCollabCostMult(r){ const k = relTier(r).key; return k === 'regular' ? 0 : k === 'collab' ? 0.5 : k === 'friendly' ? 0.75 : k === 'major' ? 1.6 : k === 'rival' ? 1.25 : 1; }
function relCollabPullMult(r){ return 1 + relOf(r) / 200; }       // 0.5x at -100, 1.5x at +100
function relSizeWaived(r){ return relTier(r).key === 'regular'; }
function relResponseMult(r){ const k = relTier(r).key; return k === 'major' ? 3 : k === 'rival' ? 2 : k === 'friendly' || k === 'collab' || k === 'regular' ? 0.4 : 1; }

/* your own moves, from Feed → Your rivals */
const SHOUTOUT_ENERGY = 6, CALLOUT_ENERGY = 4;
function shoutOut(name){
  const r = ensureRivals().find(x => x.name === name); if (!r) return;
  if ((r.shoutCd || 0) > state.totalTicks){ playErrorSound(); showToast(ic('megaphone') + ` You shouted out ${r.name} recently.`); return; }
  if (state.energy < SHOUTOUT_ENERGY){ playErrorSound(); showToast(ic('bolt') + ' Too tired to record a shout-out.'); return; }
  spendEnergy(SHOUTOUT_ENERGY);
  r.shoutCd = state.totalTicks + 2 * DAY_TICKS;
  r.subs += Math.round(state.subs * rand(0.005, 0.015));
  adjustRel(r, Math.round(rand(8, 13)), `You shouted out ${r.name} in your community post.`);
  r.owesYou = true;                                   // they may return the favour
  playSuccessSound();
  showToast(ic('megaphone') + ` You shouted out ${r.name}. They noticed.`, true);
  pushFeedItem({ name: state.channelName, text: `shouted out ${r.name}.`, badge: { label: 'Shout-out', type: 'milestone' } });
  safeRenderAll();
}
function callOut(name){
  const r = ensureRivals().find(x => x.name === name); if (!r) return;
  if ((r.callCd || 0) > state.totalTicks){ playErrorSound(); showToast(ic('fire') + ` Let the last round with ${r.name} settle first.`); return; }
  if (state.energy < CALLOUT_ENERGY){ playErrorSound(); return; }
  spendEnergy(CALLOUT_ENERGY);
  r.callCd = state.totalTicks + 2 * DAY_TICKS;
  adjustRel(r, -Math.round(rand(14, 20)), `You called out ${r.name} publicly.`);
  // drama pays in the short run: your latest live video gets a burst of curious viewers
  const v = state.videos.slice().reverse().find(x => (!x.publishPhase || x.publishPhase === 'live') && !x.isVod);
  if (v){ v.rate *= rand(1.4, 1.9); v.ctrDrift = (v.ctrDrift || 0) + 2; }
  state.algoRating = clamp(state.algoRating - 1, 0, 100);
  if (Math.random() < 0.5) state.pendingResponses = (state.pendingResponses || []).concat([{ rival: r.name, videoId: v ? v.id : '', title: `Responding to ${state.channelName}`, at: state.totalTicks + Math.round(rand(90, 300)) }]);
  playClickSound();
  showToast(ic('fire') + ` You called out ${r.name}. Views are up, and they won't forget it.`, true);
  pushFeedItem({ name: state.channelName, text: `called out ${r.name}. The comments are a war zone.`, badge: { label: 'Drama', type: 'trend' } });
  safeRenderAll();
}

/* ========================= 2. SPONSOR CONTRACTS ========================= */
const BRANDS = [
  // tier 0: starter brands
  { name: 'Voltwave',      tier: 0, products: [['energy drink', ['gaming', 'football', 'comedy']], ['zero-sugar range', ['lifestyle', 'football']]] },
  { name: 'Crumbs & Co.',  tier: 0, products: [['snack box', ['comedy', 'gaming', 'cooking']], ['spicy chips', ['cooking', 'comedy']]] },
  { name: 'BrewBox',       tier: 0, products: [['coffee subscription', ['lifestyle', 'tech', 'cooking']]] },
  { name: 'Loopline Fibre',tier: 0, products: [['home internet plan', ['gaming', 'tech']]] },
  { name: 'PocketPrint',   tier: 0, products: [['phone case', ['tech', 'lifestyle']]] },
  // tier 1: established brands
  { name: 'TechZone',      tier: 1, products: [['gaming headset', ['gaming']], ['mechanical keyboard', ['gaming', 'tech']], ['smart speaker', ['tech', 'lifestyle']]] },
  { name: 'Kicksville',    tier: 1, products: [['football boots', ['football']], ['sneaker drop', ['lifestyle', 'football']]] },
  { name: 'FreshPlate',    tier: 1, products: [['meal kit', ['cooking', 'lifestyle']]] },
  { name: 'NovaPhone',     tier: 1, products: [['budget phone', ['tech', 'lifestyle']]] },
  { name: 'Laughline',     tier: 1, products: [['comedy app', ['comedy']]] },
  // tier 2: premium brands
  { name: 'Apex Gaming',   tier: 2, products: [['gaming laptop', ['gaming', 'tech']], ['pro controller', ['gaming']]] },
  { name: 'Lumen Cameras', tier: 2, products: [['creator camera', ['tech', 'lifestyle', 'cooking']]] },
  { name: 'Orbit Mobile',  tier: 2, products: [['5G plan', ['tech', 'gaming', 'football']]] },
  { name: 'Kora Motors',   tier: 2, products: [['electric scooter', ['lifestyle', 'tech']]] },
  { name: 'Golden Spoon',  tier: 2, products: [['cookware line', ['cooking']]] },
];
const SPONSOR_TIER_LABEL = ['Starter brands', 'Established brands', 'Premium brands'];
function sponsorBook(){
  if (!state.sponsor || typeof state.sponsor !== 'object') state.sponsor = { rep: 20, deals: [], brands: {} };
  const b = state.sponsor;
  if (typeof b.rep !== 'number') b.rep = 20;
  if (!Array.isArray(b.deals)) b.deals = [];
  if (!b.brands || typeof b.brands !== 'object') b.brands = {};
  return b;
}
function sponsorTier(){ const r = sponsorBook().rep; return r >= 70 ? 2 : r >= 40 ? 1 : 0; }
function recentTypicalViews(){
  const vids = state.videos.filter(v => (!v.publishPhase || v.publishPhase === 'live') && !v.isVod && v.format !== 'shorts' && v.age > 600).slice(-8).map(v => v.views).sort((a, b) => a - b);
  if (!vids.length) return Math.max(300, state.subs * 0.3);
  return vids[Math.floor(vids.length / 2)];
}
const niceRound = n => n >= 10000 ? Math.round(n / 1000) * 1000 : n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 50) * 50;

function makeSponsorOffer(){
  const book = sponsorBook();
  if (identitySponsorRefuses()) return null;
  const tier = sponsorTier();
  // satisfied brands come back first, with bigger contracts
  const repeaters = Object.entries(book.brands).filter(([n, h]) => h.happy > 0 && !book.deals.some(d => d.brand === n && (d.status === 'offer' || d.status === 'active'))).map(([n]) => BRANDS.find(b => b.name === n)).filter(Boolean);
  const pool = BRANDS.filter(b => b.tier <= tier && !book.deals.some(d => d.brand === b.name && (d.status === 'offer' || d.status === 'active')));
  const niche = playerNiche ? playerNiche() : null;
  let brand = repeaters.length && Math.random() < 0.45 ? repeaters[Math.floor(Math.random() * repeaters.length)] : null;
  if (!brand){
    const fits = pool.filter(b => b.products.some(p => !niche || p[1].includes(niche)));
    const from = fits.length && Math.random() < 0.7 ? fits : pool;
    brand = from.length ? from.sort((a, b) => b.tier - a.tier + (Math.random() - 0.5) * 2)[0] : null;
  }
  if (!brand) return null;
  const prod = brand.products.find(p => niche && p[1].includes(niche)) || brand.products[Math.floor(Math.random() * brand.products.length)];
  const topic = niche && prod[1].includes(niche) ? niche : prod[1][Math.floor(Math.random() * prod[1].length)];
  const hist = book.brands[brand.name] || { happy: 0, sad: 0 };
  const repeatMult = 1 + 0.2 * Math.min(5, hist.happy);
  const typical = recentTypicalViews();
  const minViews = Math.max(300, niceRound(typical * rand(0.7, 1.35) * (1 + 0.08 * hist.happy)));
  const payment = Math.round((40 + minViews * rand(0.012, 0.022)) * [1, 1.5, 2.3][brand.tier] * repeatMult * identitySponsorMult() * (typeof demoRpmMult === 'function' ? Math.pow(demoRpmMult(), 0.7) : 1) / 5) * 5;
  const deal = {
    id: 'sp' + Date.now().toString(36) + Math.floor(Math.random() * 1000),
    brand: brand.name, product: prod[0], topic, payment, minViews,
    dueDays: Math.floor(rand(2, 5)), status: 'offer', expiresAt: state.totalTicks + 720,
    repeat: hist.happy, createdAt: state.totalTicks,
  };
  book.deals.unshift(deal);
  if (book.deals.length > 25) book.deals.length = 25;
  return deal;
}
/* hourly: occasionally a brand writes in (only once you've unlocked sponsorships) */
function tickSponsors(){
  if (!state.unlocks.sponsorships) return;
  const book = sponsorBook();
  // expire unanswered offers, fail missed deadlines, judge finished campaigns
  book.deals.forEach(d => {
    if (d.status === 'offer' && state.totalTicks >= d.expiresAt){ d.status = 'expired'; }
    if (d.status === 'active' && !d.videoId && state.totalTicks >= d.dueAt){
      d.status = 'failed'; book.rep = clamp(book.rep - 12, 0, 100);
      const h = book.brands[d.brand] = book.brands[d.brand] || { happy: 0, sad: 0 }; h.sad++;
      pushNotification(ic('alert') + ` You missed the ${d.brand} deadline. No payment, and they're telling other brands.`);
      if (!offlineFastForward) showToast(ic('alert') + ` Missed the ${d.brand} deadline.`, true);
    }
    if (d.status === 'active' && d.videoId){
      const v = state.videos.find(x => x.id === d.videoId);
      if (!v){ d.status = 'failed'; return; }
      if (v.age >= 2 * DAY_TICKS || state.totalTicks >= d.dueAt + 2 * DAY_TICKS) settleDeal(d, v);
    }
  });
  const open = book.deals.filter(d => d.status === 'offer' || d.status === 'active').length;
  if (open >= 3 || offlineFastForward) return;
  if (Math.random() < 1 / 24){
    const d = makeSponsorOffer();
    if (d) announceOffer(d);
  }
}
function announceOffer(d){
  pushNotification(ic('gift') + ` ${d.brand} wants you to promote their ${d.product}: $${fmt(d.payment)} for a ${TOPICS[d.topic].label} video with ${fmt(d.minViews)}+ views.`);
  showMoment({ tag: d.repeat ? 'Repeat sponsor' : 'Sponsor offer', tone: 'money', title: `${d.brand.toUpperCase()} OFFER`, lines: [
    `Promote our ${d.product}.`, `Payment: $${fmt(d.payment)}`, `Required topic: ${TOPICS[d.topic].label}`, `Deadline: ${d.dueDays} days after you accept`, `Minimum views: ${fmt(d.minViews)}`,
  ], actions: [{ label: 'View offer', tab: 'monetization', sub: 'sponsor' }] });
}
function settleDeal(d, v){
  const book = sponsorBook();
  const h = book.brands[d.brand] = book.brands[d.brand] || { happy: 0, sad: 0 };
  const ratio = v.views / d.minViews;
  let pay, outcome;
  const typeBonus = v.ctArch && ARCHETYPES[v.ctArch] && ARCHETYPES[v.ctArch].sponsor ? 1.15 : 1;  // reviews/unboxings sell better
  if (ratio >= 1){ pay = d.payment * typeBonus * (ratio >= 2 ? 1.25 : 1); outcome = 'satisfied'; book.rep = clamp(book.rep + (ratio >= 2 ? 12 : 8), 0, 100); h.happy++; }
  else if (ratio >= 0.6){ pay = d.payment * 0.7; outcome = 'mixed'; book.rep = clamp(book.rep + 1, 0, 100); }
  else { pay = d.payment * 0.4; outcome = 'disappointed'; book.rep = clamp(book.rep - 8, 0, 100); h.sad++; }
  pay = Math.round(pay * 100) / 100;
  d.status = 'done'; d.outcome = outcome; d.paid = pay; d.finalViews = Math.round(v.views);
  state.money += pay; state.lifetimeRevenue += pay; state.sponsorshipRevenue += pay;
  state.dayMoney += pay; state.currentHourRevenue += pay;
  pushTransaction('sponsor', `${d.brand}: ${d.product}`, pay);
  const msg = outcome === 'satisfied' ? `${d.brand} is happy: ${fmt(v.views)} views on "${v.title}". +$${pay.toFixed(2)}${ratio >= 2 ? ' with a bonus' : ''}.`
    : outcome === 'mixed' ? `${d.brand} is lukewarm: ${fmt(v.views)} of ${fmt(d.minViews)} views. Paid $${pay.toFixed(2)} (70%).`
    : `${d.brand} is disappointed: only ${fmt(v.views)} of ${fmt(d.minViews)} views. Kill fee $${pay.toFixed(2)}.`;
  pushNotification(ic('gift') + ' ' + msg);
  if (!offlineFastForward){
    showToast(ic('gift') + ' ' + msg, true);
    if (outcome === 'satisfied') playCoinSound();
  }
  const newTier = sponsorTier();
  if (newTier > (book.lastTier || 0)){
    book.lastTier = newTier;
    showMoment({ tag: 'Sponsor reputation', tone: 'money', title: `${SPONSOR_TIER_LABEL[newTier]} are calling`, lines: [`Your brand reputation is ${Math.round(book.rep)}. Bigger names and bigger contracts can now reach out.`], actions: [{ label: 'Sponsorships', tab: 'monetization', sub: 'sponsor' }] });
  }
}
function acceptDeal(id){
  const d = sponsorBook().deals.find(x => x.id === id); if (!d || d.status !== 'offer') return;
  if (sponsorBook().deals.filter(x => x.status === 'active').length >= 2){ playErrorSound(); showToast(ic('gift') + ' You can run two sponsor deals at a time.'); return; }
  d.status = 'active'; d.dueAt = state.totalTicks + d.dueDays * DAY_TICKS;
  playSuccessSound();
  showToast(ic('gift') + ` Deal signed with ${d.brand}. Upload a ${TOPICS[d.topic].label} video and pick them under Sponsor in the Studio.`, true);
  safeRenderAll();
}
function declineDeal(id){
  const d = sponsorBook().deals.find(x => x.id === id); if (!d || d.status !== 'offer') return;
  d.status = 'declined'; playClickSound(); safeRenderAll();
}
/* Studio: attach an active deal whose topic matches the video */
function renderSponsorSelect(){
  const wrap = document.getElementById('sponsor-field'), sel = document.getElementById('sponsor-select');
  if (!wrap || !sel || document.activeElement === sel) return;
  const topic = (document.getElementById('topic-select') || {}).value;
  const deals = sponsorBook().deals.filter(d => d.status === 'active' && !d.videoId);
  wrap.style.display = deals.length ? '' : 'none';
  if (!deals.length) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">No sponsor</option>' + deals.map(d => `<option value="${d.id}" ${d.topic !== topic ? 'disabled' : ''} ${d.id === cur ? 'selected' : ''}>${d.brand} (${TOPICS[d.topic].label}) · $${fmt(d.payment)}${d.topic !== topic ? ' · wrong topic' : ''}</option>`).join('');
  const hint = document.getElementById('sponsor-hint');
  if (hint){ const d = deals.find(x => x.id === sel.value); hint.textContent = d ? `Needs ${fmt(d.minViews)} views within 2 days of going live. Sponsor segments cost a little retention.` : `${deals.length} active deal${deals.length === 1 ? '' : 's'} waiting for a video.`; }
}
function attachSponsor(v, dealId){
  const d = sponsorBook().deals.find(x => x.id === dealId);
  if (!d || d.status !== 'active' || d.videoId || d.topic !== v.topic) return;
  d.videoId = v.id; v.sponsorBrand = d.brand;
  v.retention = clamp(v.retention - 2, 5, 98); v.satisfaction = clamp(v.satisfaction - 2, 5, 99);  // the ad read
  if (Array.isArray(v.comments)) v.comments.push({ by: randomHandle(v.topic), text: pickW([`Not gonna lie, the ${d.brand} segment was smooth.`, `Skipped the ${d.brand} part lol`, `Bought the ${d.product} because of this.`, `Is the ${d.product} actually good?`]) });
}
function renderSponsorDetail(el){
  const book = sponsorBook();
  const tier = sponsorTier();
  const offers = book.deals.filter(d => d.status === 'offer');
  const active = book.deals.filter(d => d.status === 'active');
  const past = book.deals.filter(d => ['done', 'failed', 'expired', 'declined'].includes(d.status)).slice(0, 8);
  const repeatBrands = Object.entries(book.brands).filter(([, h]) => h.happy > 0).map(([n, h]) => `${n} (${h.happy}x)`);
  const card = (d) => `
    <div class="sp-card">
      <div class="sp-head"><span class="sp-brand">${d.brand.toUpperCase()}${d.repeat ? ' <i class="sp-rep">Repeat</i>' : ''}</span><b>$${fmt(d.payment)}</b></div>
      <div class="sp-line">Promote our ${d.product}.</div>
      <div class="sp-meta"><span>Topic: ${TOPICS[d.topic].label}</span><span>Min views: ${fmt(d.minViews)}</span><span>${d.status === 'offer' ? `Deadline: ${d.dueDays} days` : `Due ${formatTick(d.dueAt).replace(/^Day /, 'day ')}`}</span></div>
      ${d.status === 'offer' ? `<div class="sp-actions"><button class="mini-btn" data-sp-accept="${d.id}">Accept</button><button class="mini-btn" data-sp-decline="${d.id}">Decline</button><span class="sp-exp">Offer ends in ${Math.max(1, Math.round((d.expiresAt - state.totalTicks) / 60))}h</span></div>` : ''}
      ${d.status === 'active' ? (() => {
        const v = d.videoId && state.videos.find(x => x.id === d.videoId);
        if (!v) return `<div class="sp-prog warn">Waiting for a ${TOPICS[d.topic].label} video. Pick ${d.brand} under Sponsor in the Studio.</div>`;
        const pct = Math.min(100, Math.round(v.views / d.minViews * 100));
        return `<div class="sp-prog"><div class="sp-prog-head"><span>"${v.title}"</span><span>${fmt(v.views)} / ${fmt(d.minViews)}</span></div><div class="meter-track"><div class="fill ${pct >= 100 ? 'met' : ''}" style="width:${pct}%"></div></div><div class="sp-exp">Judged ${Math.max(0, Math.round((2 * DAY_TICKS - v.age) / 60))}h after going live</div></div>`;
      })() : ''}
    </div>`;
  el.innerHTML = `
    <div class="stats-4">
      ${monStat('Sponsorship revenue', '$' + state.sponsorshipRevenue.toFixed(2), '')}
      ${monStat('Brand reputation', Math.round(book.rep) + ' / 100', SPONSOR_TIER_LABEL[tier])}
      ${monStat('Deals completed', fmt(book.deals.filter(d => d.status === 'done').length), repeatBrands.length ? 'Repeat: ' + repeatBrands.slice(0, 2).join(', ') : 'Hit the numbers to earn repeats')}
      ${monStat('Active', fmt(active.length) + ' / 2', offers.length ? offers.length + ' offer' + (offers.length === 1 ? '' : 's') + ' waiting' : 'No offers waiting')}
    </div>
    <div class="an-duo-grid">
      <div class="panel-box"><h3>Offers</h3>${offers.length ? offers.map(card).join('') : '<div class="empty-hint">No offers right now. Brands write in every day or so; a niche and steady views bring better ones.</div>'}</div>
      <div class="panel-box"><h3>Active deals</h3>${active.length ? active.map(card).join('') : '<div class="empty-hint">Accept an offer, then upload a matching video with the sponsor attached.</div>'}</div>
    </div>
    <div class="panel-box"><h3>History</h3>${past.length ? past.map(d => `<div class="sp-hist"><span class="sp-brand">${d.brand}</span><span class="sp-out ${d.outcome || d.status}">${d.outcome ? d.outcome[0].toUpperCase() + d.outcome.slice(1) : d.status[0].toUpperCase() + d.status.slice(1)}</span><span class="sp-hist-v">${d.finalViews !== undefined ? fmt(d.finalViews) + ' views' : ''}</span><b>${d.paid ? '+$' + d.paid.toFixed(2) : '—'}</b></div>`).join('') : '<div class="empty-hint">Finished deals show up here.</div>'}</div>`;
}

/* ========================== 3. CREATOR MOMENTS ========================== */
/* "Wait... THAT just happened?" — big cards built from things the sim is already doing. */
let momentQueue = [], momentShowing = false;
function showMoment(m){
  if (offlineFastForward || window.__bootActive) return;
  if (momentQueue.length >= 2) momentQueue.shift();   // never let a backlog build up: newest moments win
  momentQueue.push(m);
  if (!momentShowing) nextMoment();
}
function nextMoment(){
  const el = document.getElementById('moment-card');
  const m = momentQueue.shift();
  if (!el || !m){ momentShowing = false; return; }
  momentShowing = true;
  el.className = 'moment-card ' + (m.tone || '');
  el.innerHTML = `
    ${m.face ? `<span class="mc-face face-avatar">${thumbFace(m.face)}</span>` : (m.thumb ? `<span class="mc-thumb">${m.thumb}</span>` : '')}
    <div class="mc-body">
      <div class="mc-tag">${m.tag}</div>
      <div class="mc-title">${m.title}</div>
      ${(m.lines || []).map(l => `<div class="mc-line">${l}</div>`).join('')}
      <div class="mc-actions">${(m.actions || []).map((a, i) => `<button class="mini-btn" data-mc="${i}">${a.label}</button>`).join('')}<button class="mc-close" data-mc="x">Dismiss</button></div>
    </div>`;
  el.onclick = (e) => {
    const b = e.target.closest('[data-mc]'); if (!b) return;
    const a = b.dataset.mc === 'x' ? null : m.actions[+b.dataset.mc];
    hide();
    if (a){
      if (a.run) a.run();
      else if (a.video) openVideoAnalytics(a.video);
      else if (a.tab){ switchTab(a.tab); if (a.sub){ const s = document.querySelector(`[data-msub="${a.sub}"]`); if (s) s.click(); } }
    }
  };
  requestAnimationFrame(() => el.classList.add('show'));
  try { playLevelUpSound(); } catch(e){}
  const timer = setTimeout(hide, 9000);
  function hide(){ clearTimeout(timer); el.classList.remove('show'); setTimeout(nextMoment, 450); }
  pushFeedItem({ name: state.channelName, text: m.title, badge: { label: 'Moment', type: 'milestone' } });
}
function viewsLastHours(v, hours){
  const h = v.hist || [];
  if (h.length < 2) return 0;
  const now = v.views, back = h[Math.max(0, h.length - 1 - hours)];
  return Math.max(0, now - (back ? back[0] : 0));
}
/* hourly detectors */
function tickMoments(){
  if (offlineFastForward) return;
  state.momentCd = state.momentCd || {};
  const cd = (key, hours) => { if ((state.momentCd[key] || 0) > state.totalTicks) return false; state.momentCd[key] = state.totalTicks + hours * 60; return true; };
  const live = state.videos.filter(v => (!v.publishPhase || v.publishPhase === 'live') && !v.isVod);

  // (a) an old video resurfaces: rarely nudge one, then report it once it has actually taken off
  const old = live.filter(v => v.age > 7 * DAY_TICKS && v.views > 50 && !v.resurged);
  if (old.length && Math.random() < 0.004){
    const v = old.sort((a, b) => b.algorithmScore - a.algorithmScore)[Math.floor(Math.random() * Math.min(5, old.length))];
    v.resurged = state.totalTicks;
    v.rate = Math.max(v.rate, (v.baseRate || 20) * rand(6, 14)); v.ctrDrift = (v.ctrDrift || 0) + 4;
    state.pendingMoments = (state.pendingMoments || []).concat([{ type: 'resurge', id: v.id, at: state.totalTicks + 360, before: viewsLastHours(v, 24) }]);
  }
  (state.pendingMoments || []).slice().forEach(p => {
    if (state.totalTicks < p.at) return;
    state.pendingMoments = state.pendingMoments.filter(x => x !== p);
    const v = state.videos.find(x => x.id === p.id); if (!v) return;
    const today = viewsLastHours(v, 24);
    if (today < Math.max(300, (p.before || 0) * 3)) return;
    showMoment({ tag: 'Your old video is going viral', tone: 'hot', title: `"${v.title}"`, thumb: videoThumb(v), lines: [
      `Uploaded ${Math.round(v.age / DAY_TICKS)} days ago`, `Yesterday: ${fmt(p.before || 0)} views`, `Today: ${fmt(today)} views`,
    ], actions: [{ label: 'View video', video: v.id }] });
  });
  // natural resurgences the sim produces on its own (recommendation pulses on older videos)
  live.forEach(v => {
    if (v.age < 5 * DAY_TICKS || (v.hist || []).length < 48) return;
    const today = viewsLastHours(v, 24), yesterday = Math.max(0, viewsLastHours(v, 47) - today);
    if (today >= 1000 && today >= yesterday * 8 && cd('res:' + v.id, 72)){
      showMoment({ tag: 'Your old video is going viral', tone: 'hot', title: `"${v.title}"`, thumb: videoThumb(v), lines: [
        `Uploaded ${Math.round(v.age / DAY_TICKS)} days ago`, `Yesterday: ${fmt(yesterday)} views`, `Today: ${fmt(today)} views`,
      ], actions: [{ label: 'View video', video: v.id }] });
    }
  });

  // (b) rival breakout: one of their recent uploads crosses a big number
  (state.creatorFeed || []).slice(0, 25).forEach(item => {
    if (!item.vid || !item.name) return;
    const views = rivalVideoViews(item);
    const mark = views >= 1e6 ? 1e6 : views >= 5e5 ? 5e5 : 0;
    if (mark && (item.markHit || 0) < mark){
      item.markHit = mark;
      const r = ensureRivals().find(x => x.name === item.name);
      const m = (item.text || '').match(/"(.+)"/);
      if (r && (r.topic === playerNiche() || r.peer || relTier(r).key !== 'neutral')) showMoment({ tag: 'Rival breakout', tone: 'hot', face: r.name,
        title: `${r.name}'s latest video just passed ${mark >= 1e6 ? '1M' : '500K'} views.`, lines: m ? [`"${m[1]}"`] : [], actions: [{ label: 'Open Feed', tab: 'feed' }] });
    }
  });

  // (c) audience shift: your main audience is drifting toward a hot topic you don't make
  if (clockMinute(state.totalTicks) < 60){
    const niche = playerNiche();
    const mood = ensureAudienceMood().moods;
    const hot = Object.entries(mood).filter(([t]) => t !== niche).sort((a, b) => b[1] - a[1])[0];
    const loyal = niche && typeof state.audienceLoyalty[niche] === 'number' ? state.audienceLoyalty[niche] : null;
    if (niche && hot && hot[1] >= 15 && loyal !== null && loyal < 60 && cd('shift', 96)){
      state.audienceLoyalty[niche] = clamp(loyal - 2, 0, 100);
      showMoment({ tag: 'Audience shift', tone: 'warn', title: `Your ${TOPICS[niche].label} audience is increasingly watching ${TOPICS[hot[0]].label} content.`, lines: [
        `${TOPICS[hot[0]].label} is up ${hot[1]}% today and your ${TOPICS[niche].label} loyalty has slipped to ${Math.round(loyal)}%.`, `A strong ${TOPICS[niche].label} upload pulls them back, or try a ${TOPICS[hot[0]].label} video to follow them.`,
      ], actions: [{ label: 'Open Studio', tab: 'studio' }] });
    }
  }
}

/* ============================ UI wiring ============================ */
function initSocialUI(){
  document.getElementById('rival-watch').addEventListener('click', (e) => {
    const s = e.target.closest('[data-shout]'), c = e.target.closest('[data-callout]');
    if (s) shoutOut(s.dataset.shout);
    if (c) callOut(c.dataset.callout);
  });
  document.getElementById('mon-detail').addEventListener('click', (e) => {
    const a = e.target.closest('[data-sp-accept]'), d = e.target.closest('[data-sp-decline]');
    if (a) acceptDeal(a.dataset.spAccept);
    if (d) declineDeal(d.dataset.spDecline);
  });
  const sel = document.getElementById('sponsor-select');
  if (sel) sel.addEventListener('change', renderSponsorSelect);
}

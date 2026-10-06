/* =========================================================================
   STREAMLY SIM — CHANNEL IDENTITY + RIVAL COMPETITION
   Identity: your last 30 uploads decide what your channel is known for
   (a topic or "Variety", plus one trait). It shows up from 15 uploads
   (emerging, half strength) and locks in at 30 (established). Every
   identity has an upside and a cost, so there's no single best strategy.

   Competition: rivals react to you and to trends. Peer rivals (spawned
   near your size, in your niche) keep pace with you so there's real
   racing early on. Big rivals chase trends, answer your videos, pivot,
   break out, slump, shout you out and invite you to collabs.
   Loaded before game.js; functions run only after the game has started.
   ========================================================================= */
const TRAIT_WORDS = {
  quality: 'high-quality', shorts: 'Shorts', controversial: 'controversy',
  guide: 'guides', review: 'reviews', unboxing: 'hauls and unboxings', comparison: 'comparisons', news: 'breaking news',
  reaction: 'reactions', list: 'lists and rankings', opinion: 'hot takes', challenge: 'challenges', casual: 'laid-back videos',
};

const CASUAL_WORDS = { gaming: 'chill gameplay', tech: 'laid-back tech chats', lifestyle: 'vlogs', comedy: 'skits', football: 'football banter', cooking: 'street food trips' };

/* ---------------- identity ---------------- */
function identityUploads(){ return (state.videos || []).filter(v => !v.isVod); }
function computeIdentity(){
  const all = identityUploads();
  const total = Math.max(all.length, (state.uploadLog || []).length);
  const vids = all.slice(-30);
  const n = vids.length;
  const stage = total < 15 || n < 10 ? 'none' : total < 30 ? 'emerging' : 'established';
  const count = (fn) => vids.filter(fn).length / Math.max(1, n);
  const topics = {};
  vids.forEach(v => { topics[v.topic] = (topics[v.topic] || 0) + 1 / n; });
  const topicList = Object.entries(topics).sort((a, b) => b[1] - a[1]);
  const [topTopic, topShare] = topicList[0] || [null, 0];
  const main = topShare >= 0.55 ? 'specialist' : 'variety';

  const archs = {};
  vids.forEach(v => { if (v.ctArch) archs[v.ctArch] = (archs[v.ctArch] || 0) + 1 / n; });
  const [topArch, archShare] = Object.entries(archs).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  // trait = whichever habit clears its bar by the widest margin
  const candidates = [
    { key: 'controversial', score: count(v => v.thumb === 'shock' || v.titleStyle === 'curiosity' || v.ctArch === 'opinion') / 0.55 },
    { key: 'quality',       score: count(v => v.effort === 'polished') / 0.6 },
    { key: 'shorts',        score: count(v => v.format === 'shorts') / 0.6 },
  ];
  if (topArch) candidates.push({ key: topArch, score: archShare / 0.4, arch: true });
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  const trait = best && best.score >= 1 ? best.key : null;

  return {
    stage, main, topic: main === 'specialist' ? topTopic : null, trait, traitIsArch: !!(best && best.arch && trait),
    topicShares: topicList.slice(0, 3), archShares: Object.entries(archs).sort((a, b) => b[1] - a[1]).slice(0, 2),
    total,
  };
}
function identityHeadline(id){
  if (!id || id.stage === 'none') return 'Too early to tell';
  const T = id.topic && TOPICS[id.topic] ? TOPICS[id.topic].label : null;
  const w = id.trait ? TRAIT_WORDS[id.trait] : null;
  if (id.main === 'specialist'){
    if (id.trait === 'quality') return `a reputation for high-quality ${T} content`;
    if (id.trait === 'shorts') return `known for ${T} Shorts`;
    if (id.trait === 'controversial') return `a ${T} channel known for stirring controversy`;
    if (id.trait === 'casual') return `a ${T} channel known for ${CASUAL_WORDS[id.topic] || 'laid-back videos'}`;
    if (w) return `a ${T} channel known for ${w}`;
    return `known for ${T}`;
  }
  if (w) return `a Variety Creator known for ${w === 'high-quality' ? 'high-quality videos' : w}`;
  return 'a Variety Creator';
}
function identityStrength(){ if (window.__noIdentity) return 0; const s = state.identity && state.identity.stage; return s === 'established' ? 1 : s === 'emerging' ? 0.5 : 0; }

/* What your identity does to one upload. Called from createVideo (after content type is applied). */
function identityEffects(v){
  const id = state.identity, k = identityStrength();
  const fx = { algo: 0, ctr: 0, sat: 0, cap: 1, notes: [] };
  // rivals piling onto a topic (trend chasers, premieres on the calendar) crowd it out for everyone
  const crowd = (state.topicCrowd || {})[v.topic] || 0;
  if (crowd > 0.05){ fx.algo -= Math.min(10, crowd * 10); fx.notes.push({ good: false, text: `Crowded: rivals just piled onto ${TOPICS[v.topic].label} (-${Math.round(Math.min(10, crowd * 10))})` }); }
  if (!id || k === 0) return fx;
  if (id.main === 'specialist'){
    if (v.topic === id.topic){ fx.algo += 7 * k; fx.notes.push({ good: true, text: `In your niche (+${Math.round(7 * k)})` }); }
    else { fx.algo -= 1 * k; fx.sat -= 4 * k; fx.offTopic = true; fx.notes.push({ good: false, text: `Off-topic for a ${TOPICS[id.topic].label} channel: subscribers may be disappointed` }); }
  } else {
    const mood = (ensureAudienceMood().moods[v.topic] || 0);
    fx.algo -= mood * 0.15 * k;   // variety creators ride out topic swings: half the mood effect
    fx.algo += 5 * k;             // a broad audience: something for everyone, every upload
    fx.notes.push({ good: true, text: `Variety audience (+${Math.round(5 * k)})` });
  }
  if (id.trait === 'quality'){
    fx.ctr += 2 * k;
    if (v.effort === 'quick'){ fx.sat -= 10 * k; fx.algo -= 5 * k; fx.notes.push({ good: false, text: 'Your audience expects polish: a quick edit will disappoint' }); }
  }
  if (id.trait === 'shorts'){
    if (v.format === 'shorts'){ fx.algo += 5 * k; fx.cap *= 1 + 0.5 * k; fx.notes.push({ good: true, text: 'Shorts are your thing (+' + Math.round(5 * k) + ')' }); }
    else { fx.algo -= 6 * k; fx.notes.push({ good: false, text: 'Your audience mostly watches your Shorts' }); }
  }
  if (id.trait === 'controversial'){ fx.ctr += 6 * k; fx.algo += 6 * k; fx.cap *= 1 + 0.4 * k; }  // drama travels further
  if (id.traitIsArch && v.ctArch === id.trait){
    fx.algo += 4 * k + (v.ctRepeats > 1 ? 2 * (v.ctRepeats - 1) * k : 0); // they expect it, so repeats hurt less
    fx.notes.push({ good: true, text: `Your audience knows you for ${TRAIT_WORDS[id.trait]}` });
  }
  return fx;
}
function applyIdentityPre(v){
  const fx = identityEffects(v);
  const oldScore = v.algorithmScore;
  v.algorithmScore = clamp(v.algorithmScore + fx.algo, 0, 100);
  rescaleCapForScore(v, oldScore);
  if (Number.isFinite(v.authorityCap)) v.authorityCap *= fx.cap;
  v.ctr = clamp(v.ctr + fx.ctr, 1, 97);
  v._idSat = fx.sat; v._offTopic = !!fx.offTopic;
}
function applyIdentityPost(v){
  if (v._idSat) v.satisfaction = clamp(v.satisfaction + v._idSat, 5, 99);
  if (v._offTopic && identityStrength() === 1 && state.subs > 50){
    const lost = Math.max(1, Math.round(state.subs * rand(0.0005, 0.0015)));
    state.subs -= lost;
    if (!offlineFastForward) showToast(ic('users') + ` ${fmt(lost)} subscribers left: they subscribed for ${TOPICS[state.identity.topic].label}.`);
  }
  delete v._idSat; delete v._offTopic;
}
function identitySubsMult(v){
  const id = state.identity, k = identityStrength();
  // Shorts viewers who already know you do subscribe
  return id && id.trait === 'shorts' && v && v.format === 'shorts' ? 1 + 0.8 * k : 1;
}
function identityCommentsMult(){ const id = state.identity, k = identityStrength(); return id && id.trait === 'controversial' ? 1 + 0.3 * k : 1; }
function identitySponsorMult(){
  const id = state.identity, k = identityStrength();
  if (!id || !k) return 1;
  let m = 1;
  if (id.main === 'specialist') m *= 1 + 0.3 * k; else m *= 1 - 0.1 * k;
  if (id.trait === 'quality') m *= 1 + 0.2 * k;
  if (id.trait === 'controversial') m *= 1 - 0.4 * k;
  return m;
}
function identitySponsorRefuses(){ const id = state.identity; return !!(id && id.trait === 'controversial' && Math.random() < 0.25 * identityStrength()); }

/* After every upload: recompute, and celebrate a change. */
function refreshIdentity(announce){
  const prev = state.identity;
  const next = computeIdentity();
  state.identity = next;
  if (!announce || next.stage === 'none') return;
  const changed = !prev || prev.stage !== next.stage || prev.main !== next.main || prev.topic !== next.topic || prev.trait !== next.trait;
  if (!changed) return;
  const line = next.stage === 'emerging'
    ? `Your channel is becoming ${identityHeadline(next).replace(/^a /, 'a ')}.`.replace('becoming known', 'becoming known').replace('becoming a reputation', 'building a reputation')
    : `Your audience now sees you as ${identityHeadline(next).replace(/^known for/, 'the channel known for').replace(/^a reputation/, 'the channel with a reputation')}.`;
  pushNotification(ic('star') + ' ' + line);
  pushFeedItem({ name: state.channelName, text: 'has a new channel identity: ' + identityHeadline(next) + '.', badge: { label: 'Identity', type: 'gain' } });
  if (!offlineFastForward){
    playLevelUpSound();
    const m = document.getElementById('identity-modal');
    if (m){
      m.querySelector('.idm-line').textContent = line;
      m.querySelector('.idm-effects').innerHTML = identityEffectsList(next).map(e => `<div class="idm-fx ${e.good ? 'good' : 'bad'}">${e.good ? '+' : '−'} ${e.text}</div>`).join('');
      m.classList.add('show');
    }
  }
}
/* Plain-language list of what the current identity does, for the card and the modal. */
function identityEffectsList(id){
  const out = [];
  if (!id || id.stage === 'none') return out;
  const half = id.stage === 'emerging' ? ' (half strength while emerging)' : '';
  if (id.main === 'specialist'){
    const T = TOPICS[id.topic].label;
    out.push({ good: true, text: `${T} videos get recommended more${half}` });
    out.push({ good: true, text: 'Sponsors pay more for a clear niche' });
    out.push({ good: false, text: `Off-topic videos disappoint subscribers${id.stage === 'established' ? ' and a few leave' : ''}` });
  } else {
    out.push({ good: true, text: 'No penalty for switching topics' });
    out.push({ good: true, text: "A topic's bad day hurts you half as much" });
    out.push({ good: true, text: 'A broad audience gives every upload a small boost' });
    out.push({ good: false, text: 'No niche to own: smaller sponsor deals and weaker topic loyalty' });
  }
  if (id.trait === 'quality'){ out.push({ good: true, text: 'Viewers trust your thumbnails (higher CTR)' }); out.push({ good: false, text: 'Quick, rushed edits get punished harder' }); }
  if (id.trait === 'shorts'){ out.push({ good: true, text: 'Your Shorts get pushed harder' }); out.push({ good: false, text: 'Long videos struggle to find your audience' }); }
  if (id.trait === 'controversial'){ out.push({ good: true, text: 'More clicks, more reach and far more comments' }); out.push({ good: false, text: 'Sponsors pay less, and some refuse to work with you' }); }
  if (id.traitIsArch){ out.push({ good: true, text: `${TRAIT_WORDS[id.trait][0].toUpperCase() + TRAIT_WORDS[id.trait].slice(1)} get a boost and repeating them tires your audience less` }); }
  return out;
}
function renderIdentityCard(){
  const el = document.getElementById('identity-card');
  if (!el) return;
  const id = state.identity || computeIdentity();
  const bar = ([k, share]) => `<div class="id-bar"><span>${TOPICS[k] ? TOPICS[k].label : k}</span><div class="id-track"><div class="id-fill" style="width:${Math.round(share * 100)}%"></div></div><b>${Math.round(share * 100)}%</b></div>`;
  const stageLbl = { none: 'Forming', emerging: 'Emerging', established: 'Established' }[id.stage];
  const toGo = id.stage === 'none' ? Math.max(0, 15 - id.total) : id.stage === 'emerging' ? Math.max(0, 30 - id.total) : 0;
  el.innerHTML = `
    <div class="id-head">
      <div>
        <div class="id-kicker">Your audience sees you as</div>
        <div class="id-title">${id.stage === 'none' ? 'Still forming' : identityHeadline(id).replace(/^./, c => c.toUpperCase())}</div>
      </div>
      <span class="id-stage ${id.stage}">${stageLbl}</span>
    </div>
    <div class="id-sub">${id.stage === 'none' ? `Your identity appears after 15 uploads (${toGo} to go). It's based on your last 30.` : id.stage === 'emerging' ? `Locks in at 30 uploads (${toGo} to go). It keeps shifting with your last 30 uploads.` : 'Based on your last 30 uploads. Change what you make and it will slowly change too.'}</div>
    ${id.topicShares.length ? `<div class="id-bars">${id.topicShares.map(bar).join('')}</div>` : ''}
    ${identityEffectsList(id).length ? `<div class="id-fx-list">${identityEffectsList(id).map(e => `<div class="idm-fx ${e.good ? 'good' : 'bad'}">${e.good ? '+' : '−'} ${e.text}</div>`).join('')}</div>` : ''}`;
}

/* ---------------- rivals: peers + competition ---------------- */
const PEER_NAMES = {
  gaming: ['Marcus Plays', 'ClutchKid', 'NoScopeNia', 'RespawnRay'], tech: ['TechWithTobi', 'ByteSizeBola', 'GadgetGrace', 'WiredWale'],
  lifestyle: ['LifeOfAda', 'CozyKemi', 'DailyDami', 'SunriseSade'], comedy: ['LaughWithDayo', 'SkitsBySeun', 'ChaosChioma', 'GoofyGbenga'],
  football: ['FootyFemi', 'TekkersTunde', 'TopBinsTolu', 'MatchdayMusa'], cooking: ['KemiCooks', 'SpiceWithUche', 'JollofJay', 'KitchenKofi'],
};
function playerNiche(){
  if (state.identity && state.identity.topic) return state.identity.topic;
  const vids = identityUploads().slice(-20);
  const c = {}; vids.forEach(v => { c[v.topic] = (c[v.topic] || 0) + 1; });
  return (Object.entries(c).sort((a, b) => b[1] - a[1])[0] || [null])[0];
}
function spawnPeersIfReady(){
  if (state.peersSpawned || identityUploads().length < 5) return;
  const niche = playerNiche() || 'gaming';
  const second = Object.keys(TOPICS).filter(t => t !== niche)[Math.floor(Math.random() * 5)];
  const rivals = ensureRivals();
  [niche, niche, second].forEach((topic, i) => {
    const pool = PEER_NAMES[topic].filter(n => !rivals.some(r => r.name === n));
    const name = pool[Math.floor(Math.random() * pool.length)] || (topic + 'Rival' + i);
    rivals.push({ name, topic, subs: Math.max(20, Math.round(state.subs * rand(0.6, 1.6) + rand(10, 40))), growthRate: 0.002, volatility: 0.4, peer: true, pace: rand(0.75, 1.3), hist: [], joinedTick: state.totalTicks });
  });
  state.peersSpawned = true;
  pushNotification(ic('users') + ` New creators in your space: ${rivals.filter(r => r.peer).map(r => r.name).join(', ')}. They're about your size. Keep an eye on them in Feed.`);
}
function compEvent(r, text, opts){
  opts = opts || {};
  pushFeedItem({ name: r ? r.name : state.channelName, text, badge: { label: 'Competition', type: 'trend' } });
  if (opts.toast && !offlineFastForward) showToast(ic('fire') + ' ' + (r ? r.name + ' ' : 'You ') + text, true);
  if (opts.notify) pushNotification(ic('fire') + ' Competition: ' + (r ? r.name + ' ' : 'You ') + text);
  state.compCooldownUntil = state.totalTicks + (opts.cooldown || 45);
}
function rivalSubsLabel(n){ return fmtCompact(n); }

/* Runs every in-game hour, after tickCreatorFeed. */
function tickRivalry(){
  const rivals = ensureRivals();
  spawnPeersIfReady();
  state.topicCrowd = state.topicCrowd || {};
  Object.keys(state.topicCrowd).forEach(t => { state.topicCrowd[t] *= 0.97; if (state.topicCrowd[t] < 0.02) delete state.topicCrowd[t]; });

  // peers keep pace with you (so the race is real), big rivals keep their own growth (tickCreatorFeed)
  const recent = (state.hourlySubs || []).slice(-24);
  const playerHourly = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  rivals.forEach(r => {
    if (!r.peer) return;
    r.subs = Math.max(5, r.subs + Math.max(0, playerHourly * r.pace * rand(0.4, 1.6)) + r.subs * rand(-0.0006, 0.0014) + rand(0, 0.6));
  });

  // daily bookkeeping
  const newDay = clockMinute(state.totalTicks) < 60;
  if (newDay) rivals.forEach(r => { r.hist = (r.hist || []).concat([Math.round(r.subs)]).slice(-8); if (r.status && Math.random() < 0.5) r.status = null; });

  // ignored collab invites cost goodwill
  rivals.forEach(r => { if (r.inviteUntil && r.inviteUntil < state.totalTicks && !r.inviteUsed){ r.inviteUntil = 0; if (!(typeof bookingFor === 'function' && bookingFor(r.name))) adjustRel(r, -6); } });
  // resolve rival "response" videos that are due
  (state.pendingResponses || []).slice().forEach(p => {
    if (state.totalTicks < p.at) return;
    state.pendingResponses = state.pendingResponses.filter(x => x !== p);
    const r = rivals.find(x => x.name === p.rival);
    const v = state.videos.find(x => x.id === p.videoId);
    if (!r || !v) return;
    const odds = clamp(0.5 + (v.algorithmScore - 50) / 150 + Math.log10((state.subs + 10) / (r.subs + 10)) * 0.15, 0.1, 0.9);
    pushFeedItem({ name: r.name, text: `just uploaded a new video — "${p.title}"`, vid: rivalVideoStats(r) });
    if (Math.random() < odds){
      v.rate *= 1.15; state.algoRating = clamp(state.algoRating + 1, 0, 100);
      adjustRel(r, -6, `${r.name}'s answer to your video lost.`);
      compEvent(r, `made their own version of "${v.title}". Yours is winning.`, { toast: true, cooldown: 30 });
    } else {
      v.rate *= 0.85; if (Number.isFinite(v.authorityCap)) v.authorityCap *= 0.9;
      adjustRel(r, -3);
      compEvent(r, `made their own version of "${v.title}", and theirs is getting more views.`, { toast: true, notify: true, cooldown: 30 });
    }
  });

  if (offlineFastForward) return;           // no event spam while replaying time away
  const niche = playerNiche();

  // crossing: rivals near your size passing you (or you passing them)
  rivals.forEach(r => {
    if (!(r.subs > state.subs * 0.4 && r.subs < state.subs * 2.5) && r.aheadKnown === undefined) return;
    if (r.aheadKnown === undefined){ r.aheadKnown = r.subs > state.subs; return; }
    // a clear pass (3% margin) and at most one swap per rival every 6 game-hours, so neck-and-neck races don't spam
    const ahead = r.aheadKnown ? r.subs > state.subs * 0.97 : r.subs > state.subs * 1.03;
    if (ahead !== r.aheadKnown && state.subs >= 20 && state.totalTicks >= (r.crossCd || 0)){
      r.aheadKnown = ahead;
      r.crossCd = state.totalTicks + 360;
      if (ahead){ adjustRel(r, -3); compEvent(r, `just overtook you with ${fmt(r.subs)} subscribers.`, { toast: true, notify: true, cooldown: 20 }); }
      else { adjustRel(r, -5); compEvent(null, `overtook ${r.name}! You're now ahead with ${fmt(state.subs)} subscribers.`, { toast: true, cooldown: 20 }); playSuccessSound(); }
    }
  });

  if (state.totalTicks < (state.compCooldownUntil || 0)) return;
  const mood = ensureAudienceMood().moods;
  const [trendTopic, trendVal] = Object.entries(mood).sort((a, b) => b[1] - a[1])[0];
  const roll = Math.random();

  if (roll < 0.05 && trendVal >= 18){
    // chase the trend
    const chasers = rivals.filter(r => r.topic !== trendTopic);
    const r = chasers[Math.floor(Math.random() * chasers.length)];
    if (!r) return;
    const bank = TITLE_BANK[trendTopic];
    pushFeedItem({ name: r.name, text: `just uploaded a new video — "${bank[Math.floor(Math.random() * bank.length)]}"`, vid: rivalVideoStats(r) });
    state.topicCrowd[trendTopic] = (state.topicCrowd[trendTopic] || 0) + 0.3;
    compEvent(r, `jumped on the ${TOPICS[trendTopic].label} trend. That topic is getting crowded.`, { toast: trendTopic === niche });
  } else if (roll < 0.08 && niche && newDay === false){
    // someone starts dominating your category
    const inNiche = rivals.filter(r => r.topic === niche && (r.hist || []).length);
    const top = inNiche.map(r => ({ r, gain: r.subs - r.hist[r.hist.length - 1] })).sort((a, b) => b.gain - a.gain)[0];
    const yours = (state.dailyHistory.slice(-1)[0] || { subs: 0 }).subs + state.daySubs;
    if (top && top.gain > Math.max(10, yours * 1.5) && (top.r.domUntil || 0) < state.totalTicks){
      top.r.domUntil = state.totalTicks + 3 * DAY_TICKS; top.r.status = 'Dominating';
      state.topicCrowd[niche] = (state.topicCrowd[niche] || 0) + 0.2;
      adjustRel(top.r, -4);
      compEvent(top.r, `has started dominating the ${TOPICS[niche].label} category.`, { toast: true, notify: true, cooldown: 120 });
    }
  } else if (roll < 0.095 && state.subs >= 100 && niche){
    // shout-out: friends (and anyone you shouted out first) are the ones who mention you
    const friendly = rivals.filter(x => relOf(x) >= 20 || x.owesYou).sort((a, b) => relOf(b) - relOf(a));
    const r = friendly[0] || rivals.filter(x => x.topic === niche && relOf(x) > -20)[0] || rivals.filter(x => relOf(x) > -20)[Math.floor(Math.random() * Math.max(1, rivals.length))];
    if (!r) return;
    r.owesYou = false;
    const gain = Math.round(Math.min(r.subs * 0.0004, state.subs * 0.02 + 8) * (1 + Math.max(0, relOf(r)) / 100));
    if (gain >= 1){ state.subs += gain; state.daySubs += gain; state.currentHourSubs += gain; }
    adjustRel(r, 6);
    compEvent(r, `mentioned you in their latest video. +${fmt(gain)} subscribers.`, { toast: false });
    if (!(typeof queueSituation === 'function' && queueSituation('shoutout', { rival: r.name, subs: r.subs, gain })))
      showMoment({ tag: 'Creator shoutout', tone: 'good', face: r.name, title: `A creator with ${fmtCompact(r.subs)} subscribers mentioned your channel.`, lines: [`${r.name} told their audience to check you out. +${fmt(gain)} subscribers so far.`], actions: [{ label: 'Open Feed', tab: 'feed' }] });
  } else if (roll < 0.105 && state.subs >= 200 && niche){
    // collab invite: free for a day, size requirement waived; friends invite more, rivals never do
    const bigger = rivals.filter(x => (x.topic === niche || relOf(x) >= 20) && x.subs > state.subs * 0.5 && relOf(x) > -20 && !(x.inviteUntil > state.totalTicks) && !(typeof bookingFor === 'function' && bookingFor(x.name))).sort((a, b) => relOf(b) - relOf(a));
    const r = bigger[0] && Math.random() < 0.6 ? bigger[0] : bigger[Math.floor(Math.random() * bigger.length)];
    if (r){ r.inviteUntil = state.totalTicks + DAY_TICKS; r.inviteUsed = false; compEvent(r, `wants to collab with you. It's free if you accept within a day (Feed → Collabs).`, { toast: true, notify: true, cooldown: 90 }); }
  } else if (roll < 0.12){
    // breakout
    const r = rivals[Math.floor(Math.random() * rivals.length)];
    const jump = r.peer ? rand(0.1, 0.3) : rand(0.03, 0.1);
    r.subs = Math.min(RIVAL_SUBS_CAP, r.subs * (1 + jump)); r.status = 'Breakout';
    const vid = rivalVideoStats(r); vid.finalViews = Math.round(vid.finalViews * rand(4, 8));
    const bank = TITLE_BANK[r.topic];
    pushFeedItem({ name: r.name, text: `just uploaded a new video — "${bank[Math.floor(Math.random() * bank.length)]}"`, vid });
    compEvent(r, `had a breakout video and gained ${Math.round(jump * 100)}% more subscribers.`, { toast: r.topic === niche || r.peer });
  } else if (roll < 0.132){
    // slump
    const r = rivals[Math.floor(Math.random() * rivals.length)];
    const loss = rand(0.02, 0.07);
    r.subs = Math.max(20, r.subs * (1 - loss)); r.status = 'Slumping';
    const why = ['after a clickbait backlash', 'after going quiet for weeks', 'after a controversy', 'after a string of flops'][Math.floor(Math.random() * 4)];
    compEvent(r, `lost ${fmtCompact(r.subs * loss / (1 - loss))} subscribers ${why}.`, { toast: r.topic === niche });
  } else if (roll < 0.139){
    // strategy change
    const r = rivals[Math.floor(Math.random() * rivals.length)];
    const options = Object.keys(TOPICS).filter(t => t !== r.topic);
    const to = Math.random() < 0.5 && niche && niche !== r.topic ? niche : (trendTopic !== r.topic ? trendTopic : options[Math.floor(Math.random() * options.length)]);
    const from = r.topic; r.topic = to; r.status = 'Pivoting';
    compEvent(r, `is pivoting from ${TOPICS[from].label} to ${TOPICS[to].label}.${to === niche ? ' New competition in your niche.' : ''}`, { toast: to === niche, notify: to === niche });
  }
}

/* After each of your uploads: identity refresh + maybe a rival answers it. */
function onPlayerUpload(v){
  refreshIdentity(true);
  spawnPeersIfReady();
  if (v.collab || !state.peersSpawned) return;
  const same = ensureRivals().filter(r => r.topic === v.topic);
  if (!same.length) return;
  const r = same.slice().sort((a, b) => relResponseMult(b) - relResponseMult(a))[0] || same[Math.floor(Math.random() * same.length)];
  const chance = (state.identity && state.identity.topic === v.topic ? 0.2 : 0.1) * relResponseMult(r);
  if (Math.random() >= chance) return;
  const typed = TYPE_TITLES[v.topic] && v.ctype && TYPE_TITLES[v.topic][v.ctype];
  const pool = typed || TITLE_BANK[v.topic];
  let title = pool[Math.floor(Math.random() * pool.length)];
  if (title === v.title) title = 'My Take: ' + title;
  state.pendingResponses = (state.pendingResponses || []).concat([{ rival: r.name, videoId: v.id, title, at: state.totalTicks + Math.round(rand(60, 240)) }]);
}

/* Feed → "Your rivals" panel */
function renderRivalWatch(){
  const el = document.getElementById('rival-watch');
  if (!el) return;
  const niche = playerNiche();
  const rivals = ensureRivals();
  const list = rivals.filter(r => r.peer || (niche && r.topic === niche)).sort((a, b) => b.subs - a.subs).slice(0, 5);
  if (!list.length){ el.innerHTML = `<div class="empty-hint">Rivals appear once you've made a few videos.</div>`; return; }
  el.innerHTML = list.map(r => {
    const h = r.hist || [];
    const base = h.length ? h[0] : r.subs;
    const fresh = h.length < 2;                        // not enough daily history for a weekly % yet
    const change = !fresh && base > 0 ? (r.subs - base) / base * 100 : 0;
    const ahead = r.subs > state.subs;
    const tag = r.status || (fresh && r.peer ? 'New' : change > 8 ? 'Rising' : change < -2 ? 'Slumping' : null);
    return `<div class="rw-row">
      <span class="dc-avatar face-avatar">${thumbFace(r.name)}</span>
      <div class="wtf-main">
        <div class="dc-creator-name">${r.name}${tag ? ` <span class="rw-tag ${tag.toLowerCase()}">${tag}</span>` : ''}</div>
        <div class="dc-creator-subs">${TOPICS[r.topic].label} &middot; ${rivalSubsLabel(r.subs)} subs &middot; ${fresh ? (r.peer ? `new, started ${feedTimeAgo(r.joinedTick || state.totalTicks)}` : 'weekly change shows tomorrow') : `<span class="${change >= 0 ? 'rw-up' : 'rw-down'}">${change >= 0 ? '+' : ''}${change.toFixed(1)}% this week</span>`}</div>
      </div>
      <span class="rw-pos ${ahead ? 'ahead' : 'behind'}">${ahead ? 'Ahead of you' : 'Behind you'}</span>
    </div>
    <div class="rw-rel">
      <span class="rel-tag ${relTier(r).tone}">${relTier(r).label}</span>
      <div class="rel-bar"><span class="rel-zero"></span><span class="rel-fill ${relOf(r) >= 0 ? 'pos' : 'neg'}" style="${relOf(r) >= 0 ? `left:50%;width:${relOf(r) / 2}%` : `right:50%;width:${-relOf(r) / 2}%`}"></span></div>
      <button class="mini-btn" data-shout="${r.name}" ${(r.shoutCd || 0) > state.totalTicks ? 'disabled' : ''}>Shout out</button>
      <button class="mini-btn danger" data-callout="${r.name}" ${(r.callCd || 0) > state.totalTicks ? 'disabled' : ''}>Call out</button>
    </div>`;
  }).join('');
}

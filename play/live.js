/* =========================================================================
   STREAMLY SIM — LIVE STREAMING
   Content → Live Streams. Pick a topic and length, go live, and watch a live
   audience come and go: viewer count, scrolling chat, Super Chats and new
   members (Partner Programme tier 1), the odd raid. When it ends you get a
   summary and the stream becomes a VOD in Content that keeps earning views.

   Time: 1 tick = 1 in-game minute = 1 real second, so a 1-hour stream is a
   one-minute real-time session. Loaded before game.js; everything here runs
   only after the game has started, so game.js globals are available.
   ========================================================================= */
/* Feature flag: live streaming is built but held back for a later update. Flip to true to release. */
const LIVE_ENABLED = false;
const LIVE_MIN_SUBS = 50;
const LIVE_LENGTHS = {
  s30:  { label: '30 min', minutes: 30,  energy: 22 },
  s60:  { label: '1 hour', minutes: 60,  energy: 35 },
  s120: { label: '2 hours', minutes: 120, energy: 55 },
};
const LIVE_TITLES = {
  gaming:    ['Ranked Grind Until I Win', 'Late Night Gaming Stream', 'Road to Top 100', 'Playing With Viewers', 'New Season, First Look'],
  tech:      ['Tech Q&A: Ask Me Anything', 'Unboxing Live', 'Building My New Setup Live', 'Rating Your Desk Setups'],
  lifestyle: ['Chill Sunday Stream', 'Study With Me', 'Reset My Room With Me', 'Morning Coffee Chat'],
  comedy:    ['Reacting to Your Worst Videos', 'Try Not to Laugh, Live', 'Roasting Viewer Submissions', 'Chaos Stream'],
  football:  ['Matchday Watchalong', 'Transfer Talk Live', 'Rating Free Kicks, Live', 'Weekend Football Chat'],
  cooking:   ['Cooking Dinner Live', 'Midnight Snack Stream', 'Viewers Pick My Recipe', 'Cooking With What I Have'],
};
const LIVE_CHAT = {
  any: [
    'hello from Lagos!', 'first time catching you live', 'W stream', 'LETS GOOO', 'audio is good today',
    'how long are you streaming?', 'just got here, what did I miss?', 'this is so chill', 'hi chat',
    'been waiting all week for this', 'mic is a bit low', 'ok this is actually fun', 'can you say hi to me?',
    'lurking but enjoying', 'shoutout from Accra', 'who else is here from the last video?', 'vibes are immaculate',
    'lag or is it just me?', 'W chat', 'do a giveaway!', 'what time do you usually stream?', 'this stream deserves more viewers',
  ],
  gaming: ['clip that!', 'nahh that was clean', 'what rank are you?', 'play the other map next', 'that was a throw lol', 'aim is on point today'],
  tech: ['which phone should I buy?', 'thoughts on the new laptops?', 'show the cable management', 'how much did that cost?'],
  lifestyle: ['love the room', 'what are you drinking?', 'this is my study playlist now', 'plant tour please'],
  comedy: ['I cannot breathe', 'CHAT IS UNHINGED', 'the timing lmao', 'no way he said that', 'crying rn'],
  football: ['that goal was offside', 'who wins the league?', 'the ref needs glasses', 'rate my team', 'best player right now?'],
  cooking: ['it looks so good', 'add more pepper!!', 'what oil is that?', 'I can smell it through the screen', 'recipe in the description?'],
};

let liveDirty = true;             // setup screen needs a rebuild (never rebuilt while you pick options)
let liveUIBuiltFor = null;        // which screen is on the page: 'setup' | 'live' | null
let liveSetup = { topic: 'gaming', len: 's60' };

function liveTimeOfDayMult(){
  const hour = Math.floor(((state.totalTicks + CLOCK_START_OFFSET_MIN) % DAY_TICKS) / 60);
  if (hour >= 18 && hour <= 23) return 1.3;   // prime time
  if (hour >= 12) return 1.0;
  if (hour >= 7) return 0.8;
  return 0.55;                                 // 2 AM streams are lonely
}
/* Who can show up: a share of subscribers get the notification, plus people browsing live. */
function liveAudiencePotential(topic){
  const mood = ensureAudienceMood();
  const moodMult = 1 + (mood.moods[topic] || 0) / 100;
  const loyalty = typeof state.audienceLoyalty[topic] === 'number' ? state.audienceLoyalty[topic] : 50;
  const notified = state.subs * rand(0.025, 0.045) * (0.6 + loyalty / 125);
  const browsing = 3 + Math.sqrt(state.subs) * 0.6;
  return (notified + browsing) * moodMult * liveTimeOfDayMult() * (0.8 + state.algoRating / 250);
}

function canGoLive(){
  if (state.live) return { ok: false, why: "You're already live." };
  if (state.subs < LIVE_MIN_SUBS) return { ok: false, why: `Live streaming unlocks at ${LIVE_MIN_SUBS} subscribers.` };
  if (state.uploadCooldownTicksLeft > 0) return { ok: false, why: 'Finish your current upload first.' };
  return { ok: true };
}

function startLiveStream(){
  if (!LIVE_ENABLED) return;
  const gate = canGoLive();
  if (!gate.ok){ playErrorSound(); showToast(ic('tv') + ' ' + gate.why); return; }
  const L = LIVE_LENGTHS[liveSetup.len];
  const topic = liveSetup.topic;
  const tired = fatigueFor(L.energy);          // same fatigue rule as uploads
  spendEnergy(L.energy);
  const bank = LIVE_TITLES[topic] || LIVE_TITLES.gaming;
  state.live = {
    topic, len: liveSetup.len, minutes: L.minutes, elapsed: 0,
    title: bank[Math.floor(Math.random() * bank.length)],
    potential: liveAudiencePotential(topic) * (1 - tired / 120),
    viewers: 0, peak: 0, viewerMinutes: 0, history: [],
    chat: [], chatCount: 0, subsRaw: 0, subs: 0, likes: 0,
    superChats: 0, superChatNet: 0, members: 0, raided: false, startTick: state.totalTicks,
  };
  state.streamCount = (state.streamCount || 0) + 1;
  gainXP(60, 'live');
  playSuccessSound();
  showToast(ic('tv') + ` You're live: "${state.live.title}"`, true);
  pushLiveChat({ sys: true, text: `Stream started. ${fmt(state.subs)} subscribers notified.` });
  liveUIBuiltFor = null;
  renderLiveTab();
  renderLivePill();
}

function pushLiveChat(msg){
  const L = state.live;
  L.chat.push(msg);
  if (L.chat.length > 40) L.chat.shift();
  if (!msg.sys) L.chatCount++;
  const box = document.getElementById('live-chat');
  if (box && liveUIBuiltFor === 'live'){
    box.insertAdjacentHTML('beforeend', liveChatLineHTML(msg));
    while (box.children.length > 40) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }
}
function liveChatLineHTML(m){
  if (m.sys) return `<div class="lc-line sys">${m.text}</div>`;
  if (m.sc) return `<div class="lc-line sc"><span class="lc-sc-amt">$${m.sc.toFixed(2)}</span><span class="lc-by">${m.by}</span>${m.text}</div>`;
  if (m.member) return `<div class="lc-line mem"><span class="lc-by">${m.by}</span>just became a member!</div>`;
  return `<div class="lc-line"><span class="lc-by">${m.by}</span>${m.text}</div>`;
}

/* Called once per game minute from liveTick (and in fast-forward when coming back to a mid-stream save). */
function tickLiveStream(){
  const L = state.live;
  if (!L) return;
  L.elapsed++;
  const t = L.elapsed / L.minutes;
  // arrival curve: build up for the first ~20%, hold with drift, thin out near the end
  const shape = t < 0.2 ? 0.25 + (t / 0.2) * 0.75 : t > 0.85 ? 1 - (t - 0.85) * 2.2 : 1;
  const target = Math.max(0, L.potential * shape * rand(0.9, 1.1));
  L.viewers = Math.max(0, Math.round(L.viewers + (target - L.viewers) * 0.25 + rand(-1, 1) * Math.sqrt(Math.max(1, L.viewers))));
  // raid: once per stream, after the warm-up
  if (!L.raided && t > 0.3 && t < 0.8 && Math.random() < 0.012){
    L.raided = true;
    let who = null, size;
    if (state.subs >= 1000){
      const rivals = ensureRivals().filter(r => r.topic === L.topic || Math.random() < 0.3);
      who = rivals[Math.floor(Math.random() * rivals.length)];
      size = Math.round(who ? Math.min(who.subs * rand(0.00004, 0.0002), state.subs * 0.2 + 40) : rand(10, 40));
    } else {
      size = Math.round(rand(4, 18));
    }
    L.viewers += size;
    L.potential += size * 0.5; // some raiders stick around
    const name = who ? who.name : randomHandle().slice(1);
    pushLiveChat({ sys: true, text: `${name} raided with ${fmt(size)} viewers!` });
    if (!offlineFastForward) showToast(ic('users') + ` ${name} raided your stream with ${fmt(size)} viewers!`, true);
  }
  L.peak = Math.max(L.peak, L.viewers);
  L.viewerMinutes += L.viewers;
  L.history.push(L.viewers);
  L.likes += L.viewers * rand(0.01, 0.03);

  // subscribers from the stream (live viewers convert better than video viewers)
  L.subsRaw += L.viewers * 0.0016;
  if (L.subsRaw >= 1){
    const whole = Math.floor(L.subsRaw);
    L.subsRaw -= whole;
    L.subs += whole;
    state.subs += whole; state.daySubs += whole; state.currentHourSubs += whole;
    accrueViewXP(0, whole);
  }
  // watch time counts toward the long-form path like any public video
  const hrs = L.viewers / 60;
  state.watchHours += hrs; state.lfWatchHours += hrs; state.dayWatch += hrs; state.currentHourWatch += hrs;

  // chat
  const msgs = Math.min(3, Math.floor(L.viewers * 0.04 + Math.random() * (L.viewers > 0 ? 1.2 : 0.2)));
  for (let i = 0; i < msgs; i++){
    const pool = Math.random() < 0.35 && LIVE_CHAT[L.topic] ? LIVE_CHAT[L.topic] : LIVE_CHAT.any;
    pushLiveChat({ by: randomHandle(L.topic), text: pool[Math.floor(Math.random() * pool.length)] });
  }
  // Super Chats and memberships need Partner Programme tier 1 (fan funding)
  if (state.fanFunding){
    if (Math.random() < Math.min(0.3, L.viewers * 0.0005)){
      const r = Math.random();
      const amt = r < 0.6 ? pickOne([1, 2, 2, 5]) : r < 0.9 ? pickOne([5, 10, 10, 20]) : r < 0.99 ? pickOne([20, 50]) : 100;
      const net = amt * 0.7;                                  // platform keeps 30%
      L.superChats++; L.superChatNet += net;
      state.money += net; state.lifetimeRevenue += net;
      state.superChatRevenue = (state.superChatRevenue || 0) + net;
      state.dayMoney += net; state.currentHourRevenue += net;
      const lines = ['great stream!', 'keep it up!', 'for the new mic', 'love your content', 'shoutout please!', 'first super chat ever!'];
      pushLiveChat({ by: randomHandle(), sc: amt, text: pickOne(lines) });
      if (!offlineFastForward) playCoinSound();
    }
    if (Math.random() < Math.min(0.12, L.viewers * 0.00025)){
      L.members++;
      const net = 4.99 * 0.7;
      state.money += net; state.lifetimeRevenue += net; state.membershipRevenue += net;
      state.dayMoney += net; state.currentHourRevenue += net;
      pushLiveChat({ by: randomHandle(), member: true });
    }
  }
  if (L.elapsed >= L.minutes) endLiveStream(false);
}
function pickOne(a){ return a[Math.floor(Math.random() * a.length)]; }

function endLiveStream(early){
  const L = state.live;
  if (!L) return;
  state.live = null;
  const avg = L.elapsed > 0 ? L.viewerMinutes / L.elapsed : 0;
  const unique = Math.round(L.viewerMinutes / Math.max(6, Math.min(25, L.elapsed * 0.3)) + L.peak);
  // the stream becomes a VOD: a long-form video that starts with its live viewers
  const v = createVideo(L.topic, 'funny', 'm25', 'standard', 'normal', 'longform', {});
  v.title = 'LIVE: ' + L.title;
  v.isVod = true;
  v.durationSec = L.elapsed * 60 + Math.floor(rand(0, 59));
  v.algorithmScore = clamp(v.algorithmScore * 0.75, 0, 100);   // replays travel less far than uploads
  v.views = unique;
  v.likes = L.likes;
  v.commentCount = L.chatCount;
  v.comments = L.chat.filter(m => !m.sys && !m.member).slice(-6).map(m => ({ by: m.by, text: m.text }));
  v.sizeGB = 0;
  v.publishPhase = 'live';
  v.vodStats = { peak: L.peak, avg: Math.round(avg), minutes: L.elapsed, superChatNet: L.superChatNet, subs: L.subs, members: L.members };
  state.videos.push(v);
  state.dayViews += unique; state.currentHourViews += unique; state.totalViews += unique;
  gainXP(Math.min(300, Math.floor(L.peak / 5)), 'live');
  state.bestStreamPeak = Math.max(state.bestStreamPeak || 0, L.peak);
  pushNotification(ic('tv') + ` Stream ended: peak ${fmt(L.peak)} viewers, +${fmt(L.subs)} subscribers${L.superChatNet > 0 ? `, $${L.superChatNet.toFixed(2)} in Super Chats` : ''}.`);
  if (L.superChatNet > 0.01) pushTransaction('superchat', 'Super Chats from a stream', L.superChatNet);
  liveUIBuiltFor = null; liveDirty = true;
  renderLivePill();
  if (!offlineFastForward) showLiveSummary(L, avg, unique, early);
  try { saveState(); } catch(e){}
}

function showLiveSummary(L, avg, unique, early){
  playLevelUpSound();
  const m = document.getElementById('live-summary');
  if (!m) return;
  m.querySelector('.ls-body').innerHTML = `
    <div class="ls-title">${L.title}</div>
    <div class="ls-sub">${early ? 'Ended early after' : 'Streamed for'} ${L.elapsed} minutes of game time</div>
    <div class="ls-grid">
      <div><span>Peak viewers</span><b>${fmt(L.peak)}</b></div>
      <div><span>Average viewers</span><b>${fmt(avg)}</b></div>
      <div><span>New subscribers</span><b>+${fmt(L.subs)}</b></div>
      <div><span>Chat messages</span><b>${fmt(L.chatCount)}</b></div>
      <div><span>Super Chats</span><b>${state.fanFunding ? '$' + L.superChatNet.toFixed(2) : '—'}</b></div>
      <div><span>New members</span><b>${state.fanFunding ? fmt(L.members) : '—'}</b></div>
    </div>
    <div class="ls-note">The replay is now in Content with ${fmt(unique)} views and will keep picking up more.${state.fanFunding ? '' : ' Super Chats and members unlock with Partner Programme tier 1.'}</div>`;
  m.classList.add('show');
}

/* ---------- Top bar LIVE pill (visible from any tab) ---------- */
function renderLivePill(){
  const pill = document.getElementById('live-pill');
  if (!pill) return;
  const L = state.live;
  pill.style.display = L ? '' : 'none';
  if (L) pill.querySelector('span').textContent = `LIVE · ${fmt(L.viewers)}`;
}

/* ---------- Content → Live Streams ---------- */
function renderLiveTab(){
  const el = document.getElementById('video-list');
  if (!el || contentSubTab !== 'live') return;
  const pagerEl = document.getElementById('content-pager');
  if (pagerEl) pagerEl.innerHTML = '';
  if (!LIVE_ENABLED){
    if (liveUIBuiltFor !== 'soon'){ liveUIBuiltFor = 'soon'; el.innerHTML = `<div class="empty-hint">Live streaming is coming in a future update.</div>`; }
    return;
  }
  if (state.live){
    if (liveUIBuiltFor !== 'live') buildLiveDashboard(el);
    updateLiveDashboard();
  } else if (liveUIBuiltFor !== 'setup' || liveDirty){
    buildLiveSetup(el);
  } else {
    const gateEl = document.getElementById('live-gate');
    const g = canGoLive();
    if (gateEl) gateEl.textContent = g.ok ? '' : g.why;
    const btn = document.getElementById('go-live-btn');
    if (btn) btn.disabled = !g.ok;
  }
}

function buildLiveSetup(el){
  liveUIBuiltFor = 'setup'; liveDirty = false;
  const g = canGoLive();
  const L = LIVE_LENGTHS[liveSetup.len];
  const est = liveAudiencePotential(liveSetup.topic);
  const lo = Math.max(1, Math.round(est * 0.6)), hi = Math.max(2, Math.round(est * 1.2));
  const vods = state.videos.filter(v => v.isVod).slice(-5).reverse();
  el.innerHTML = `
    <div class="live-setup">
      <div class="panel-box live-card">
        <h3>Go live</h3>
        <div class="live-row">
          <label>Topic</label>
          <div class="live-chips" id="live-topics">${Object.entries(TOPICS).map(([k, t]) => `<button class="live-chip ${k === liveSetup.topic ? 'on' : ''}" data-lt="${k}">${t.label}</button>`).join('')}</div>
        </div>
        <div class="live-row">
          <label>Length (game time)</label>
          <div class="live-chips" id="live-lens">${Object.entries(LIVE_LENGTHS).map(([k, l]) => `<button class="live-chip ${k === liveSetup.len ? 'on' : ''}" data-ll="${k}">${l.label}</button>`).join('')}</div>
        </div>
        <div class="live-est">
          <div><span>Expected viewers</span><b>${lo}–${hi}</b></div>
          <div><span>Energy cost</span><b>${L.energy}</b></div>
          <div><span>Real time</span><b>${L.minutes >= 60 ? L.minutes / 60 + ' min' : '30 sec'}</b></div>
        </div>
        <div class="live-hint">More viewers come in the evening, on trending topics, and from loyal audiences. ${state.fanFunding ? 'Super Chats and new members are on.' : 'Super Chats and members unlock with Partner Programme tier 1.'}</div>
        <div class="live-gate" id="live-gate">${g.ok ? '' : g.why}</div>
        <button class="upload-btn" id="go-live-btn" ${g.ok ? '' : 'disabled'}><span class="live-dot-red"></span>Go live</button>
      </div>
      <div class="panel-box">
        <h3>Past streams</h3>
        ${vods.length ? vods.map(v => `
          <div class="pl-item">
            <div class="rv-thumb">${videoThumb(v)}</div>
            <div class="pl-item-main"><div class="rv-title">${v.title}</div>
              <div class="rv-sub">Peak ${fmt(v.vodStats ? v.vodStats.peak : 0)} viewers &middot; ${fmt(v.views)} replay views${v.vodStats && v.vodStats.superChatNet > 0 ? ' &middot; $' + v.vodStats.superChatNet.toFixed(2) + ' Super Chats' : ''}</div></div>
          </div>`).join('') : `<div class="empty-hint">No streams yet. Your replays show up here and in Videos.</div>`}
      </div>
    </div>`;
}

function buildLiveDashboard(el){
  liveUIBuiltFor = 'live';
  const L = state.live;
  el.innerHTML = `
    <div class="live-dash">
      <div class="panel-box live-main">
        <div class="ld-top">
          <span class="live-badge"><span class="live-dot-red"></span>LIVE</span>
          <span class="ld-title">${L.title}</span>
          <span class="ld-time" id="ld-time"></span>
        </div>
        <div class="ld-viewers"><b id="ld-viewers">0</b><span>watching now</span></div>
        <div class="ld-chart" id="ld-chart"></div>
        <div class="ld-stats">
          <div><span>Peak</span><b id="ld-peak">0</b></div>
          <div><span>New subs</span><b id="ld-subs">0</b></div>
          <div><span>Likes</span><b id="ld-likes">0</b></div>
          <div><span>Super Chats</span><b id="ld-sc">${state.fanFunding ? '$0.00' : 'Locked'}</b></div>
        </div>
        <button class="mini-btn danger" id="end-live-btn">End stream</button>
      </div>
      <div class="panel-box live-chat-box">
        <h3>Live chat</h3>
        <div class="live-chat" id="live-chat">${L.chat.map(liveChatLineHTML).join('')}</div>
      </div>
    </div>`;
  const box = document.getElementById('live-chat');
  if (box) box.scrollTop = box.scrollHeight;
}

function updateLiveDashboard(){
  const L = state.live;
  if (!L) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('ld-viewers', fmt(L.viewers));
  set('ld-peak', fmt(L.peak));
  set('ld-subs', '+' + fmt(L.subs));
  set('ld-likes', fmt(L.likes));
  if (state.fanFunding) set('ld-sc', '$' + L.superChatNet.toFixed(2));
  set('ld-time', `${L.elapsed} / ${L.minutes} min`);
  const ch = document.getElementById('ld-chart');
  if (ch){
    const pts = L.history.length > 1 ? L.history : [0, L.viewers];
    const max = Math.max(1, ...pts), n = Math.max(L.minutes, pts.length);
    const d = pts.map((p, i) => `${(i / (n - 1)) * 100},${40 - (p / max) * 36}`).join(' ');
    ch.innerHTML = `<svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="${d}" fill="none" stroke="#ef4444" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>`;
  }
}

/* ---------- event wiring (called once from game.js startGame) ---------- */
function initLiveUI(){
  const list = document.getElementById('video-list');
  list.addEventListener('click', (e) => {
    if (contentSubTab !== 'live') return;
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.lt){ liveSetup.topic = t.dataset.lt; liveDirty = true; playClickSound(); renderLiveTab(); e.stopPropagation(); }
    else if (t.dataset.ll){ liveSetup.len = t.dataset.ll; liveDirty = true; playClickSound(); renderLiveTab(); e.stopPropagation(); }
    else if (t.id === 'go-live-btn'){ startLiveStream(); e.stopPropagation(); }
    else if (t.id === 'end-live-btn'){ playClickSound(); endLiveStream(true); renderLiveTab(); e.stopPropagation(); }
  }, true);
  const pill = document.getElementById('live-pill');
  if (pill) pill.addEventListener('click', () => { switchTab('content'); const b = document.querySelector('[data-sub="live"]'); if (b) b.click(); });
  const close = document.getElementById('live-summary-close');
  if (close) close.addEventListener('click', () => { playClickSound(); document.getElementById('live-summary').classList.remove('show'); renderLiveTab(); });
  renderLivePill();
}

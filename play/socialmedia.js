/* =========================================================================
   STREAMLY SIM — SOCIAL (your creator's account on Pulse)
   Not a social-network simulator: another channel-growth tool.

   You have Pulse followers. A slice of every new subscriber follows you
   there, and good posts win more. Five kinds of post:
   - Announcement: wins followers, a little loyalty in your niche.
   - Share a video: link clicks become views (and a few subs) on that video.
   - Tease an upload: the people who click wait for it; when the video goes
     live they show up as release-day viewers and give it a head start.
   - Trending topic: reach rides today's mood; your next video on that
     topic within 12 hours gets a small tie-in boost.
   - Promote a collab: your partner's audience sees it too. A booked collab
     gets release-day viewers like a teaser; a live one gets views.

   Reach = followers x reshares + discovery, times how online your audience
   is right now (Analytics → Audience), times a caption style. Posting more
   than 3 times a day cuts reach. Numbers reveal over ~3 in-game hours, and
   now and then a post blows up.
   Loaded before game.js; functions only run after the game starts.
   ========================================================================= */
const POST_REVEAL = 180, POST_ENERGY = 3, POSTS_PER_DAY_FREE = 3, TEASE_WINDOW = 24 * 60, TIE_WINDOW = 12 * 60;
const POST_TYPES = {
  announce: { label: 'Announcement',     icon: 'megaphone', reach: 0.9, follow: 1.4, click: 0.008, hint: 'Wins followers and a bit of loyalty' },
  share:    { label: 'Share a video',    icon: 'play',      reach: 1.0, follow: 0.8, click: 0.04,  hint: 'Link clicks become views on that video' },
  tease:    { label: 'Tease an upload',  icon: 'calendar',  reach: 1.0, follow: 1.0, click: 0.035, hint: 'Builds release-day viewers' },
  trend:    { label: 'Trending topic',   icon: 'fire',      reach: 1.1, follow: 1.2, click: 0.015, hint: 'Rides today’s mood, boosts your next video on it' },
  collab:   { label: 'Promote a collab', icon: 'users',     reach: 1.0, follow: 1.0, click: 0.03,  hint: 'Reaches your partner’s audience too' },
};
const CAPTION_STYLES = [
  { key: 'hype',    label: 'Hype',       note: 'More clicks, fewer new followers' },
  { key: 'chill',   label: 'Chill',      note: 'More new followers, fewer clicks' },
  { key: 'mystery', label: 'Mysterious', note: 'Could flop, could fly' },
];
const POST_REPLIES = {
  announce: ['congrats!!', 'deserved fr', 'we’re proud of you', 'been here since day one', 'LET’S GOOO'],
  share: ['watching now', 'this was so good', 'W video', 'the editing on this 🔥', 'notification gang'],
  tease: ['finally!!', 'setting a reminder', 'what time??', '👀👀👀', 'can’t wait'],
  trend: ['facts', 'nah you’re wrong for this', 'this take 😂', 'finally someone said it', 'ratio'],
  collab: ['DREAM COLLAB', 'two goats in one video', 'can’t wait', 'this is huge', 'did NOT see this coming'],
};

let socialDraft = { type: 'share', target: '', caption: 0 };
let socialDirty = true, socialFeedAt = 0, socialBuiltAt = 0;

function socialBook(){
  if (!state.social || typeof state.social !== 'object') state.social = {};
  const s = state.social;
  if (typeof s.followers !== 'number') s.followers = Math.round((state.subs || 0) * 0.2);
  if (typeof s.lastSubs !== 'number') s.lastSubs = state.subs || 0;
  if (typeof s.carry !== 'number') s.carry = 0;
  if (!Array.isArray(s.posts)) s.posts = [];
  return s;
}
const nFollowers = n => `${fmt(n)} follower${n === 1 ? '' : 's'}`;
function handleOf(name){ const h = String(name || '').toLowerCase().replace(/[^a-z0-9_]/g, ''); return '@' + (h || 'creator'); }
function socialHandle(){ return handleOf(state.channelName); }
function postsToday(){ return socialBook().posts.filter(p => clockDay(p.at) === clockDay()).length; }
function socialTimeMult(){
  if (typeof audienceActivity !== 'function') return 1;
  const h = Math.floor(clockMinute(state.totalTicks) / 60);
  return 0.6 + 0.6 * audienceActivity()[h];
}
function socialSpamMult(){ const n = postsToday(); return n < POSTS_PER_DAY_FREE ? 1 : Math.pow(0.6, n - POSTS_PER_DAY_FREE + 1); }
const sLive = v => v && (!v.publishPhase || v.publishPhase === 'live') && !v.isVod;
const ease = p => 1 - Math.pow(1 - clamp(p, 0, 1), 2);

/* ---------------- what each post type can point at ---------------- */
function postTargets(type){
  const now = state.totalTicks;
  if (type === 'share') return state.videos.filter(v => sLive(v) && !v.sharedOnSocial).slice(-8).reverse()
    .map(v => ({ id: v.id, label: v.title, sub: `${fmt(v.views)} views · ${formatDuration(v.age)} old`, fresh: v.age < DAY_TICKS }));
  if (type === 'tease'){
    const sched = state.videos.filter(v => v.publishAt && v.publishAt > now && v.publishPhase !== 'live' && v.publishPhase && !v.teased)
      .map(v => ({ id: v.id, label: v.title, sub: `Goes live ${calWhen(v.publishAt)}`, at: v.publishAt }));
    return sched.concat(socialBook().pendingTease ? [] : [{ id: 'next', label: 'My next upload', sub: 'Upload or schedule one within 24 hours' }]);
  }
  if (type === 'trend'){
    const moods = Object.entries(ensureAudienceMood().moods).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return moods.map(([k, m]) => ({ id: k, label: TOPICS[k].label, sub: `${m >= 0 ? '+' : ''}${m}% today`, mood: m }));
  }
  if (type === 'collab'){
    const out = [];
    if (typeof activeBookings === 'function') activeBookings().forEach(b => { if (!b.promoted) out.push({ id: 'bk:' + b.id, label: `Upcoming collab with ${b.name}`, sub: `Booked for ${calWhen(b.at)}`, rival: b.name }); });
    state.videos.filter(v => sLive(v) && v.collab && v.age < 2 * DAY_TICKS && !v.sharedOnSocial).forEach(v => out.push({ id: 'cv:' + v.id, label: v.title, sub: `Collab with ${v.collab.name} · live now`, rival: v.collab.name, videoId: v.id }));
    const inProgress = state.videos.filter(v => v.collab && v.publishPhase && v.publishPhase !== 'live' && !v.teased);
    inProgress.forEach(v => out.push({ id: 'cp:' + v.id, label: v.title, sub: `Collab with ${v.collab.name} · still uploading`, rival: v.collab.name, pendingVideo: v.id }));
    return out;
  }
  return [{ id: 'none', label: '', sub: '' }];
}
function whenWords(at){
  if (!at) return 'soon';
  const d = clockDay(at) - clockDay();
  const h = Math.floor(clockMinute(at) / 60);
  const t = hourLabel(h);
  return d <= 0 ? (h >= 17 ? 'tonight' : `today at ${t}`) : d === 1 ? 'tomorrow' : `on Day ${clockDay(at) + 1}`;
}
function postCaptions(type, tgt){
  const me = state.channelName || 'me';
  const short = s => { s = String(s || ''); return s.length > 48 ? s.slice(0, 46) + '…' : s; };
  if (type === 'announce') return [
    state.subs >= 100 ? `${fmt(state.subs)} subscribers?? Thank you, genuinely 🙏` : 'Starting something new here. Stick around 🙏',
    'New upload schedule coming. More videos, same energy.',
    'Big things coming to the channel. That’s all I can say for now.'];
  if (type === 'share') return [`NEW VIDEO 🔥 ${short(tgt && tgt.label)}`, `Put a lot into this one. "${short(tgt && tgt.label)}" is up now.`, `Watch till the end. That’s all.`];
  if (type === 'tease'){ const w = tgt && tgt.at ? whenWords(tgt.at) : 'soon'; return [`New video ${w} 👀`, `Been editing all week. New one ${w}.`, `${w === 'soon' ? 'Soon' : w[0].toUpperCase() + w.slice(1)}. You’re not ready.`]; }
  if (type === 'trend'){ const T = tgt ? tgt.label : 'this'; return [`Everyone’s talking about ${T} today. My take 🧵`, `Can we talk about ${T} for a second?`, `Hot ${T} take incoming. Don’t @ me.`]; }
  if (type === 'collab'){ const r = tgt && tgt.rival ? handleOf(tgt.rival) : '@friend'; return [`Me and ${r} cooked something 🔥`, `Had the best time filming with ${r}. You’ll see.`, `${r} x ${me}. That’s all I’m saying.`]; }
  return ['', '', ''];
}

/* ---------------- reach estimate + posting ---------------- */
function postBaseReach(type, tgt){
  const book = socialBook(), T = POST_TYPES[type];
  let reach = book.followers * 1.6 + 60 + Math.sqrt(state.subs) * 4;
  if (type === 'trend' && tgt && typeof tgt.mood === 'number') reach *= 1 + tgt.mood / 50;
  if (type === 'share' && tgt && tgt.fresh) reach *= 1.15;
  let partner = 0;
  if (type === 'collab' && tgt && tgt.rival){ const r = ensureRivals().find(x => x.name === tgt.rival); if (r) partner = Math.min(r.subs * 0.004, book.followers * 3 + 2500); }
  return Math.max(30, (reach * T.reach + partner) * socialTimeMult() * socialSpamMult());
}
function makePost(){
  const type = socialDraft.type, T = POST_TYPES[type];
  const targets = postTargets(type);
  const tgt = targets.find(t => t.id === socialDraft.target) || targets[0];
  if (type !== 'announce' && (!tgt || !tgt.id || tgt.id === 'none')){ playErrorSound(); showToast(ic('chat') + ' Nothing to post about yet for this type.'); return; }
  if (state.energy < POST_ENERGY){ playErrorSound(); showToast(ic('bolt') + ' Too tired to write a post.'); return; }
  const style = CAPTION_STYLES[socialDraft.caption] || CAPTION_STYLES[0];
  const text = postCaptions(type, tgt)[socialDraft.caption] || postCaptions(type, tgt)[0];
  let impressions = postBaseReach(type, tgt) * rand(0.8, 1.25) * (style.key === 'mystery' ? rand(0.65, 1.7) : 1);
  const viral = Math.random() < 0.04;
  if (viral) impressions *= rand(4, 7);
  impressions = Math.round(impressions);
  const followers = Math.round(impressions * rand(0.004, 0.011) * T.follow * (style.key === 'chill' ? 1.25 : style.key === 'hype' ? 0.85 : 1));
  const clicks = Math.round(impressions * T.click * rand(0.75, 1.25) * (style.key === 'hype' ? 1.25 : style.key === 'chill' ? 0.85 : 1));
  const likes = Math.round(impressions * rand(0.02, 0.06)), reposts = Math.round(likes * rand(0.05, 0.16));
  const pool = POST_REPLIES[type];
  const replies = pool.slice().sort(() => Math.random() - 0.5).slice(0, 2).map(t => ({ by: randomHandle(), text: t }));
  const post = { id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), type, text, style: style.key, at: state.totalTicks,
    final: { impressions, followers, clicks, likes, reposts, replies: Math.round(likes * rand(0.08, 0.14)) }, replies, applied: 0, viral };
  const book = socialBook();
  // attach to its target
  if (type === 'share' || (type === 'collab' && tgt.videoId)){ const v = state.videos.find(x => x.id === (tgt.videoId || tgt.id)); if (v){ post.videoId = v.id; v.sharedOnSocial = true; } }
  if (type === 'tease'){
    if (tgt.id === 'next'){ book.pendingTease = { postId: post.id, until: state.totalTicks + TEASE_WINDOW }; post.waitNext = true; }
    else { const v = state.videos.find(x => x.id === tgt.id); if (v){ post.hypeFor = v.id; v.teased = true; } }
  }
  if (type === 'collab'){
    const r = ensureRivals().find(x => x.name === tgt.rival);
    if (r) adjustRel(r, 3);
    post.rival = tgt.rival;
    if (tgt.id.indexOf('bk:') === 0){ const b = collabBookings().find(x => 'bk:' + x.id === tgt.id); if (b){ b.promoted = true; post.hypeCollab = b.name; } }
    if (tgt.pendingVideo){ const v = state.videos.find(x => x.id === tgt.pendingVideo); if (v){ v.teased = true; v.sharedOnSocial = true; post.hypeFor = v.id; } }
  }
  if (type === 'trend'){ book.trendTie = { topic: tgt.id, until: state.totalTicks + TIE_WINDOW }; post.topic = tgt.id; }
  if (type === 'announce'){ const n = playerNiche(); if (n && clockDay(book.lastAnnounce || -9999) !== clockDay()){ state.audienceLoyalty[n] = clamp((state.audienceLoyalty[n] || 55) + 1, 5, 98); } book.lastAnnounce = state.totalTicks; }
  book.posts.unshift(post);
  if (book.posts.length > 20) book.posts.length = 20;
  spendEnergy(POST_ENERGY);
  gainXP(10, 'social');
  playSuccessSound();
  showToast(ic('chat') + ` Posted on Pulse. Let’s see how it does.`);
  socialDraft.target = ''; socialDraft.caption = 0;
  socialDirty = true;
  safeRenderAll(); renderSocial(true);
}

/* ---------------- reveal over time: followers, clicks, views ---------------- */
function postRevealed(p, at){ return ease(((typeof at === 'number' ? at : state.totalTicks) - p.at) / POST_REVEAL); }
function tickSocial(){
  const book = socialBook(), now = state.totalTicks;
  // a slice of new subscribers follow you on Pulse
  const ds = state.subs - book.lastSubs;
  if (ds > 0){ book.carry += ds * 0.15; const w = Math.floor(book.carry); book.followers += w; book.carry -= w; }
  book.lastSubs = state.subs;
  book.posts.forEach(p => {
    if (p.applied >= 1) return;
    const e = postRevealed(p), d = e - p.applied;
    if (d <= 0) return;
    p.applied = e;
    p.folAcc = (p.folAcc || 0) + p.final.followers * d;
    const fw = e >= 1 ? p.final.followers - (p.folGiven || 0) : Math.floor(p.folAcc - (p.folGiven || 0));   // fully revealed: settle exactly
    if (fw > 0){ p.folGiven = (p.folGiven || 0) + fw; book.followers += fw; }
    const clicks = p.final.clicks * d;
    if (p.type === 'tease' || (p.type === 'collab' && (p.hypeFor || p.hypeCollab))) return;   // these clicks wait for release day
    const v = p.videoId ? state.videos.find(x => x.id === p.videoId) : state.videos.slice().reverse().find(sLive);
    if (v && clicks > 0){
      v.views += clicks; state.totalViews += clicks; state.dayViews += clicks; state.currentHourViews += clicks;
      p.subsRaw = (p.subsRaw || 0) + clicks * 0.03 * clamp((v.satisfaction || 60) / 70, 0.5, 1.4);
      const whole = Math.floor(p.subsRaw - (p.subsGiven || 0));
      if (whole > 0){ p.subsGiven = (p.subsGiven || 0) + whole; state.subs += whole; state.daySubs += whole; state.currentHourSubs += whole; }
    }
    if (p.viral && !p.viralSaid && e > 0.3){ p.viralSaid = true; pushNotification(ic('fire') + ' Your Pulse post is blowing up.'); if (!offlineFastForward) showToast(ic('fire') + ' Your Pulse post is blowing up!', true); }
  });
  // a teaser for "my next upload" that never got one
  const pt = book.pendingTease;
  if (pt && now > pt.until){
    book.pendingTease = null;
    const p = book.posts.find(x => x.id === pt.postId);
    const lost = p ? Math.round((p.folGiven || 0) * 0.5) : 0;
    book.followers = Math.max(0, book.followers - lost);
    if (p) p.outcome = `No video came.${lost ? ' ' + nFollowers(lost) + ' unfollowed.' : ''}`;
    pushNotification(ic('chat') + ` Your followers waited for the video you teased on Pulse.${lost ? ' ' + nFollowers(lost) + ' unfollowed.' : ''}`);
  }
  if (book.trendTie && now > book.trendTie.until) book.trendTie = null;
  if (document.getElementById('tab-social') && document.getElementById('tab-social').classList.contains('active')) renderSocialFeed();
}

/* Called when any video goes live: teasers and collab promos cash in as release-day viewers. */
function onVideoLiveSocial(v){
  const book = socialBook();
  if (v.socialTie){   // trend tie-in claimed at upload
    delete v.socialTie;
    const old = v.algorithmScore;
    v.algorithmScore = clamp(v.algorithmScore + 4, 0, 100);
    rescaleCapForScore(v, old);
    v.ctr = clamp(v.ctr + 1.5, 1, 97);
  }
  const hits = book.posts.filter(p => !p.released && p.hypeFor && p.hypeFor === v.id);
  if (!hits.length) return;
  let waiting = 0;
  hits.forEach(p => {
    p.released = true;
    const n = Math.round(p.final.clicks * Math.max(0.25, postRevealed(p)));
    waiting += n;
    p.outcome = `${fmt(n)} people from this post watched on release day.`;
  });
  if (waiting <= 0) return;
  v.views += waiting; state.totalViews += waiting; state.dayViews += waiting; state.currentHourViews += waiting;
  const subs = Math.round(waiting * 0.02);
  if (subs > 0){ state.subs += subs; state.daySubs += subs; state.currentHourSubs += subs; }
  const old = v.algorithmScore;
  v.algorithmScore = clamp(v.algorithmScore + Math.min(6, 1 + Math.log10(waiting + 1) * 1.6), 0, 100);   // a strong start tells the algorithm people wanted this
  if (typeof rescaleCapForScore === 'function') rescaleCapForScore(v, old);
  v.socialLaunch = waiting;
  pushNotification(ic('chat') + ` ${fmt(waiting)} people who saw your Pulse post showed up for "${v.title}".`);
  if (!offlineFastForward) showToast(ic('chat') + ` ${fmt(waiting)} people from your Pulse post showed up on release day!`, true);
}
/* Called from performUpload once the video exists: a waiting teaser or trend tie-in claims it. */
function claimSocial(v){
  const book = socialBook(), now = state.totalTicks;
  const liveAt = v.publishAt && v.publishAt > now ? v.publishAt : now;
  const t = book.trendTie;
  if (t && v.topic === t.topic && liveAt <= t.until){ book.trendTie = null; v.socialTie = true; }
  const pt = book.pendingTease;
  if (pt && now <= pt.until && !v.isVod){
    const p = book.posts.find(x => x.id === pt.postId);
    book.pendingTease = null;
    if (p){ p.hypeFor = v.id; p.waitNext = false; v.teased = true; }
  }
}
/* A collab you promoted from its booking: link the post to the video once you film it. */
function linkCollabPromo(v, rivalName){
  const p = socialBook().posts.find(x => !x.released && !x.hypeFor && x.hypeCollab === rivalName);
  if (p){ p.hypeFor = v.id; v.teased = true; v.sharedOnSocial = true; }
}
/* A booked collab you promoted didn't happen. */
function socialBookingMissed(rivalName){
  socialBook().posts.forEach(p => {
    if (p.released || p.hypeFor || p.hypeCollab !== rivalName) return;
    p.released = true;
    const lost = Math.round((p.folGiven || 0) * 0.5);
    socialBook().followers = Math.max(0, socialBook().followers - lost);
    p.outcome = `The collab never happened.${lost ? ' ' + nFollowers(lost) + ' unfollowed.' : ''}`;
  });
}
/* A teased video was cancelled or deleted before it went live. */
function socialVideoGone(id){
  socialBook().posts.forEach(p => {
    if (p.released || p.hypeFor !== id) return;
    p.released = true;
    const lost = Math.round((p.folGiven || 0) * 0.5);
    socialBook().followers = Math.max(0, socialBook().followers - lost);
    p.outcome = `You cancelled the video.${lost ? ' ' + nFollowers(lost) + ' unfollowed.' : ''}`;
  });
}

/* ---------------- the Social tab ---------------- */
function postCardHTML(p){
  const e = postRevealed(p), f = p.final, T = POST_TYPES[p.type];
  const v = p.videoId || p.hypeFor ? state.videos.find(x => x.id === (p.videoId || p.hypeFor)) : null;
  const n = k => fmtCompact(Math.round(f[k] * e));
  let result = p.outcome || '';
  if (!result){
    if (p.type === 'tease' || p.hypeCollab || (p.type === 'collab' && p.hypeFor)) result = `${fmt(Math.round(f.clicks * e))} people waiting for release`;
    else result = `${fmt(Math.round(f.clicks * e))} link clicks${p.subsGiven ? ` · +${fmt(p.subsGiven)} subscribers` : ''}`;
  }
  return `<article class="pp-card${p.viral ? ' viral' : ''}">
    <div class="pp-head">
      <span class="face-avatar pp-av">${faceSVG(state.channelName || 'me')}</span>
      <div class="pp-who"><b>${state.channelName || 'You'}</b><span>${socialHandle()} · ${feedTimeAgo(p.at)}</span></div>
      <span class="pp-type">${ic(T.icon)}${T.label}</span>
    </div>
    <div class="pp-text">${p.text}</div>
    ${v ? `<div class="pp-attach"><span class="rv-thumb">${videoThumb(v)}</span><div><div class="rv-title">${v.title}</div><div class="rv-sub">${v.publishPhase && v.publishPhase !== 'live' ? 'Coming soon' : fmt(v.views) + ' views'}</div></div></div>` : ''}
    <div class="pp-stats">
      <span title="Impressions">${ic('eye')}${n('impressions')}</span>
      <span title="Likes">${ic('heart')}${n('likes')}</span>
      <span title="Reposts">${ic('arrowUp')}${n('reposts')}</span>
      <span title="Replies">${ic('chat')}${n('replies')}</span>
      ${p.viral ? '<em>Blowing up</em>' : e < 1 ? '<i>Still spreading</i>' : ''}
    </div>
    <div class="pp-result">+${fmt(Math.round(f.followers * e))} followers · ${result}</div>
    ${e > 0.2 ? `<div class="pp-replies">${p.replies.map(r => `<div><b>${r.by}</b> ${r.text}</div>`).join('')}</div>` : ''}
  </article>`;
}
function renderSocialFeed(){
  const feed = document.getElementById('pp-feed');
  if (!feed) return;
  const book = socialBook();
  const html = book.posts.length ? book.posts.slice(0, 10).map(postCardHTML).join('') : `<div class="empty-hint">No posts yet. Your first post goes out to ${fmt(book.followers)} followers, plus anyone Pulse shows it to.</div>`;
  if (feed.dataset.html !== html){ feed.innerHTML = html; feed.dataset.html = html; }
  const fol = document.getElementById('pp-followers'); if (fol) fol.textContent = fmt(book.followers);
  const wk = document.getElementById('pp-week');
  if (wk){ const recent = book.posts.filter(p => state.totalTicks - p.at < 7 * DAY_TICKS); wk.textContent = `${fmt(recent.reduce((a, p) => a + Math.round(p.final.impressions * postRevealed(p)), 0))} impressions this week`; }
}
function renderSocial(force){
  const root = document.getElementById('social-root');
  const tab = document.getElementById('tab-social');
  if (!root || !tab || !tab.classList.contains('active')) return;
  const busy = root.contains(document.activeElement) && document.activeElement.tagName === 'SELECT' || !!document.querySelector('.pp-composer:hover');
  if (!force && (!socialDirty || busy) && !(Date.now() - socialBuiltAt > 10000 && !busy)){ if (Date.now() - socialFeedAt > 1000){ socialFeedAt = Date.now(); renderSocialFeed(); } return; }
  socialDirty = false; socialBuiltAt = Date.now();
  const book = socialBook();
  const type = socialDraft.type, T = POST_TYPES[type];
  const targets = postTargets(type);
  if (!targets.some(t => t.id === socialDraft.target)) socialDraft.target = targets.length ? targets[0].id : '';
  const tgt = targets.find(t => t.id === socialDraft.target);
  const caps = postCaptions(type, tgt);
  const est = postBaseReach(type, tgt);
  const tm = socialTimeMult(), today = postsToday();
  const P = typeof primeHour === 'function' ? primeHour() : 19;
  const empty = type !== 'announce' && (!targets.length || targets[0].id === 'none');
  const emptyMsg = { share: 'Upload a video first, then share it here. Each video can be shared once.', tease: 'You already have a teaser waiting for your next upload.', collab: 'No collab to promote yet. Book one on the Calendar or pitch one in Feed → Collabs.', trend: '' }[type] || '';
  const targetUI = type === 'announce' ? '' : empty ? `<div class="cal-hint">${emptyMsg}</div>`
    : type === 'trend' ? `<div class="pp-chips">${targets.map(t => `<button class="live-chip ${t.id === socialDraft.target ? 'on' : ''}" data-pp-target="${t.id}">${t.label} <i class="${t.mood >= 0 ? 'up' : 'down'}">${t.sub}</i></button>`).join('')}</div>`
    : `<select id="pp-target">${targets.map(t => `<option value="${t.id}" ${t.id === socialDraft.target ? 'selected' : ''}>${t.label.replace(/"/g, '&quot;')} — ${t.sub}</option>`).join('')}</select>`;
  const tie = book.trendTie;
  const html = `
    <div class="content-head-row">
      <div><h2 class="shop-title">Social</h2><div class="shop-sub">Your creator account on Pulse. Post to pull people into your channel.</div></div>
    </div>
    <div class="pp-grid">
      <div>
        <div class="panel-box pp-composer">
          <h3>Create a post</h3>
          <div class="pp-types">${Object.entries(POST_TYPES).map(([k, t]) => `<button class="pp-type-btn ${k === type ? 'on' : ''}" data-pp-type="${k}">${ic(t.icon)}<span>${t.label}</span></button>`).join('')}</div>
          <div class="pp-hint">${T.hint}.</div>
          ${targetUI ? `<div class="pp-field form-field">${targetUI}</div>` : ''}
          ${empty ? '' : `
          <div class="pp-caps">${caps.map((c, i) => `<button class="pp-cap ${i === socialDraft.caption ? 'on' : ''}" data-pp-cap="${i}"><span class="pp-cap-text">${c}</span><span class="pp-cap-style">${CAPTION_STYLES[i].label} · ${CAPTION_STYLES[i].note}</span></button>`).join('')}</div>
          <div class="pp-est">
            <div><span>Estimated reach</span><b>${fmtCompact(est * 0.8)}–${fmtCompact(est * 1.25)}</b></div>
            <div><span>Timing</span><b class="${tm >= 1.05 ? 'up' : tm < 0.85 ? 'down' : ''}">${tm >= 1.05 ? 'Great right now' : tm < 0.85 ? 'Quiet hour' : 'OK'}</b></div>
            <div><span>Posts today</span><b class="${today >= POSTS_PER_DAY_FREE ? 'down' : ''}">${today} / ${POSTS_PER_DAY_FREE}</b></div>
          </div>
          ${today >= POSTS_PER_DAY_FREE ? `<div class="cal-warn">${ic('alert')}<span>You've posted ${today} times today. More posts reach fewer people.</span></div>` : ''}
          <button class="upload-btn pp-post" id="pp-post">${ic('chat')}Post · ${POST_ENERGY} energy</button>`}
        </div>
        <div class="section-head" style="margin-top:6px"><h2>Your posts</h2></div>
        <div id="pp-feed"></div>
      </div>
      <div class="pp-side">
        <div class="panel-box pp-profile">
          <div class="pp-prof-top"><span class="face-avatar pp-av big">${faceSVG(state.channelName || 'me')}</span><div><b>${state.channelName || 'You'}</b><span>${socialHandle()}</span></div></div>
          <div class="pp-prof-num"><b id="pp-followers">${fmt(book.followers)}</b><span>followers on Pulse</span></div>
          <div class="pp-prof-sub" id="pp-week"></div>
          <div class="pp-prof-note">About 15% of your new subscribers follow you here too.</div>
        </div>
        <div class="panel-box">
          <h3>Best time to post</h3>
          <div class="pp-side-line">${ic('calendar')}<span>Your audience is most active <b>${typeof primeLabel === 'function' ? primeLabel(P) : '7 PM – 10 PM'}</b>. Posts then reach up to twice as many people as posts at a quiet hour.</span></div>
          ${tie ? `<div class="pp-side-line good">${ic('fire')}<span>Trend tie-in: your next ${TOPICS[tie.topic].label} video before ${calTime(tie.until)} gets a boost.</span></div>` : ''}
          ${book.pendingTease ? `<div class="pp-side-line good">${ic('calendar')}<span>Followers are waiting for your next upload. Post one before ${calWhen(book.pendingTease.until)}.</span></div>` : ''}
        </div>
        <div class="panel-box">
          <h3>What posts do</h3>
          ${Object.values(POST_TYPES).map(t => `<div class="pp-side-line">${ic(t.icon)}<span><b>${t.label}:</b> ${t.hint.toLowerCase()}.</span></div>`).join('')}
        </div>
      </div>
    </div>`;
  if (root.dataset.html !== html){ root.dataset.html = html; root.innerHTML = html; }
  renderSocialFeed();
}
function initSocialMediaUI(){
  const root = document.getElementById('social-root');
  if (!root) return;
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-pp-type]'), c = e.target.closest('[data-pp-cap]'), g = e.target.closest('[data-pp-target]');
    if (t){ socialDraft.type = t.dataset.ppType; socialDraft.target = ''; socialDraft.caption = 0; playClickSound(); renderSocial(true); return; }
    if (c){ socialDraft.caption = +c.dataset.ppCap; playClickSound(); renderSocial(true); return; }
    if (g){ socialDraft.target = g.dataset.ppTarget; playClickSound(); renderSocial(true); return; }
    if (e.target.closest('#pp-post')) makePost();
  });
  root.addEventListener('change', (e) => { if (e.target.id === 'pp-target'){ socialDraft.target = e.target.value; renderSocial(true); } });
  socialBook();
}

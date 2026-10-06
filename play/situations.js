/* =========================================================================
   STREAMLY SIM — SITUATIONS (creator drama, kept light)
   Things happen around your channel and you decide how to handle them:
   Respond, Apologize, Make another video, or Ignore. Consequences are
   small: a few subscribers, a point or two of algorithm, a relationship,
   brand reputation, a burst of views.

   Played fairly:
   - Most situations come from what you actually did (a baity thumbnail
     with low retention, a long sponsor read, a hot take, a lazy reaction,
     a rival you've feuded with, a break from uploading), and the card
     shows the evidence, so you can judge whether the accusation is fair.
     Owning a fair accusation works; defending one backfires, and the
     other way round.
   - One at a time-ish: at most 2 open, a cooldown between new ones, none
     in your first 3 uploads (random ones wait for 5 uploads and 30 subs),
     none spawned while you're away.
   - Undecided situations close themselves after 8 in-game hours as
     "Ignore". "Make another video" sets a follow-up: upload a matching
     video within 12 hours (it's claimed when you upload it, and pays out
     when it goes live) and it gets a boost; promise and don't deliver and
     it costs a little. Some follow-ups ask for more than a topic.
   Loaded before game.js; functions only run after the game starts.
   ========================================================================= */
const SIT_EXPIRE = 8 * 60, SIT_FOLLOW_WINDOW = 12 * 60, SIT_COOLDOWN = 16 * 60;
const SIT_TONE = { good: 'Positive', bad: 'Negative', neutral: 'Neutral' };

function sitBook(){
  if (!state.sit || typeof state.sit !== 'object') state.sit = {};
  const s = state.sit;
  if (!Array.isArray(s.open)) s.open = [];
  if (!Array.isArray(s.log)) s.log = [];
  return s;
}
const sitVideo = id => state.videos.find(v => v.id === id) || null;
const sitLive = v => v && (!v.publishPhase || v.publishPhase === 'live') && !v.isVod;
const sitShort = t => { t = String(t || ''); return t.length > 38 ? t.slice(0, 36) + '…' : t; };
const sitRoll = p => Math.random() < p;
const sitRival = name => name ? ensureRivals().find(r => r.name === name) || null : null;
function sitPickRecent(fn){
  const list = state.videos.filter(v => sitLive(v) && !v.sitUsed && fn(v));
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

/* ---------------- the situations ----------------
   check()        -> ctx or null (random spawns only)
   make(ctx)      -> { title, body, evidence[] }
   choices        -> which of respond / apologize / video / ignore, with labels and hints
   resolve(k,ctx) -> { text, fx }   (fx: subs %, algo, views share, rel, rep, loyal, sat, ctr, invite)
   follow         -> what "Make another video" asks for, and what happens if you do / don't */
const SITUATIONS = {
  clickbait: {
    tone: 'bad', tag: 'Clickbait accusations', weight: 3,
    check(){
      const v = sitPickRecent(v => v.age > 60 && v.age < DAY_TICKS && v.views >= 80 && (v.thumb === 'shock' || v.titleStyle === 'curiosity'));
      return v ? { videoId: v.id, topic: v.topic, title: v.title, justified: shownRetention(v) < 33 } : null;
    },
    make(c){
      const v = sitVideo(c.videoId);
      return { title: `Viewers are accusing "${sitShort(c.title)}" of clickbait.`,
        body: 'The top comment says the thumbnail promised something the video never showed, and it has hundreds of likes.',
        evidence: v ? [`CTR ${v.ctr.toFixed(1)}%`, `Viewers watched ${shownRetention(v)}% on average`, c.justified ? 'Most people left early' : 'Most people actually stayed'] : [] };
    },
    choices: { respond: ['Defend the video', 'Works if the video really delivered'], apologize: ['Own it and fix the thumbnail', 'Works if they have a point'],
      video: ['Make a follow-up that delivers', 'Same topic within 12h, no clickbait this time'], ignore: ['Ignore it', 'Usually blows over'] },
    resolve(k, c){
      if (k === 'respond') return c.justified
        ? { text: 'Defending it made it worse: someone posted your retention graph and it spread.', fx: { subs: -0.006, algo: -2 } }
        : { text: 'You showed the numbers. Most viewers took your side, and the video got a second look.', fx: { algo: 1, views: 0.25, subs: 0.002 } };
      if (k === 'apologize') return c.justified
        ? { text: 'Viewers respected it. You swapped the thumbnail and trust came back.', fx: { algo: 1, loyal: 3, sat: 5 } }
        : { text: 'Some people took it as an admission, and the new thumbnail clicks a little worse. It blew over.', fx: { subs: -0.0015, ctr: -2 } };
      return sitRoll(0.6) ? { text: 'It blew over within a day.', fx: {} }
        : { text: 'A couple of commentary channels picked it up before it died down.', fx: c.justified ? { algo: -2, subs: -0.003 } : { algo: -1 } };
    },
    follow: { label: 'a follow-up that delivers what the thumbnail promised', prefix: 'I Heard You: ', algo: 6, ctr: 1,
      req: v => v.thumb !== 'shock' && v.titleStyle !== 'curiosity', reqText: 'no shock thumbnail or curiosity title',
      done: { text: 'Your follow-up delivered. The accusations faded and the comments turned around.', fx: { algo: 2, subs: 0.003, loyal: 2 } },
      missed: { text: 'You promised a follow-up and never posted it. People noticed.', fx: { algo: -1, loyal: -2 } } },
  },

  hotTake: {
    tone: 'bad', tag: 'Heated debate', weight: 0,
    make(c){
      return { title: c.opinion ? `Your take in "${sitShort(c.title)}" started a heated debate.` : `Something you said in "${sitShort(c.title)}" has people arguing.`,
        body: 'The comments are split down the middle and a few other channels are weighing in.',
        evidence: ['Comments are flooding in', 'Views are up', 'Some brands are watching quietly'] };
    },
    choices: { respond: ['Double down', 'More views and fans of your take, but brands go quiet'], apologize: ['Clarify and apologize', 'Calms things down'],
      video: ['Make a follow-up discussion video', 'Round two gets attention'], ignore: ['Let it play out', 'Could go either way'] },
    resolve(k){
      if (k === 'respond') return { text: 'Doubling down kept the debate going. More views and more fans of your take, and a couple of brands went quiet.', fx: { views: 0.35, subs: 0.003, algo: -1, rep: -3 } };
      if (k === 'apologize') return { text: 'Most people accepted the clarification. The comments calmed down.', fx: { algo: 1, rep: 2, subs: -0.001 } };
      return sitRoll(0.5) ? { text: 'It burned out on its own.', fx: {} } : { text: 'It dragged on for a day and wore on people.', fx: { algo: -2 } };
    },
    follow: { label: 'a follow-up discussion video', prefix: 'Let’s Talk About It: ', algo: 7, ctr: 3,
      done: { text: 'The discussion video landed: people came back for round two.', fx: { subs: 0.003, algo: 1 } },
      missed: { text: 'You teased a follow-up and never made it.', fx: { algo: -1 } } },
  },

  reactionTheft: {
    tone: 'bad', tag: 'Stolen content claim', weight: 0,
    make(c){
      return { title: `The creator of the video you reacted to says you stole their content.`,
        body: `They posted about "${sitShort(c.title)}" and their fans are in your comments.`,
        evidence: [c.justified ? 'Your reaction was quick and light on commentary' : 'You talked over most of it', c.justified ? 'Viewers called it lazy' : 'Your viewers mostly liked it'] };
    },
    choices: { respond: ['Explain your commentary', 'Works if you added a lot'], apologize: ['Credit them and apologize', 'Usually welcomed'],
      video: ['Make a proper reaction with more commentary', 'A reaction, not a quick edit, within 12h'], ignore: ['Ignore it', 'Risky if they have a point'] },
    resolve(k, c){
      if (k === 'respond') return c.justified
        ? { text: 'Nobody bought it: your reaction really was mostly their video.', fx: { algo: -2, subs: -0.004 } }
        : { text: 'Your viewers backed you: you clearly added your own take.', fx: { algo: 1, subs: 0.001 } };
      if (k === 'apologize') return { text: 'They accepted, and a few of their viewers even subscribed to you.', fx: { algo: 1, sat: 4, subs: 0.002 } };
      return c.justified && sitRoll(0.5) ? { text: 'They filed a claim. That video stopped getting recommended.', fx: { algo: -2 }, claim: true }
        : { text: 'It faded after a day.', fx: {} };
    },
    follow: { label: 'a proper reaction with real commentary', prefix: '', algo: 5,
      req: v => v.ctArch === 'reaction' && v.effort !== 'quick', reqText: 'a reaction video with Standard or Polished editing',
      done: { text: 'The new reaction showed you can do it properly. Most of the criticism stopped.', fx: { algo: 2, loyal: 2 } },
      missed: { text: 'You said you’d do better and didn’t upload anything.', fx: { algo: -1 } } },
  },

  sponsorBacklash: {
    tone: 'bad', tag: 'Sponsor backlash', weight: 2,
    check(){
      const v = sitPickRecent(v => v.sponsorBrand && v.age > 60 && v.age < DAY_TICKS && v.views >= 60);
      return v ? { videoId: v.id, topic: v.topic, title: v.title, brand: v.sponsorBrand, justified: (v.satisfaction || 50) < 58 } : null;
    },
    make(c){
      return { title: `Viewers say the ${c.brand} segment ruined "${sitShort(c.title)}".`,
        body: '"Half the video was an ad" is the top comment.',
        evidence: [c.justified ? 'Satisfaction on this video is low' : 'Most viewers didn’t mind', `${c.brand} is watching the reaction`] };
    },
    choices: { respond: ['Stand by the sponsor', 'The brand will love it, some viewers won’t'], apologize: ['Promise shorter ad reads', 'Viewers like it, the brand less so'],
      video: ['Make a sponsor-free video to make it up', 'Any topic, no sponsor, within 12h'], ignore: ['Ignore it', 'Might cost a few subs'] },
    resolve(k, c){
      if (k === 'respond') return { text: `${c.brand} appreciated the support. Some viewers rolled their eyes.`, fx: { rep: 4, subs: c.justified ? -0.003 : -0.001 } };
      if (k === 'apologize') return { text: 'Viewers liked the promise. The brand was a bit less happy.', fx: { rep: -2, loyal: 3, algo: 1 } };
      return sitRoll(0.5) ? { text: 'It faded.', fx: {} } : { text: 'A few people unsubscribed over it.', fx: { subs: -0.002 } };
    },
    follow: { label: 'a sponsor-free video for your viewers', prefix: '', algo: 4, any: true,
      req: v => !v.sponsorBrand, reqText: 'no sponsor attached',
      done: { text: 'A no-ads video for the fans. Goodwill restored.', fx: { loyal: 3, subs: 0.002 } },
      missed: { text: 'The promised ad-free video never came.', fx: { loyal: -2 } } },
  },

  calledOut: {
    tone: 'bad', tag: 'Called out', weight: 2,
    check(){
      const niche = playerNiche();
      const r = ensureRivals().filter(x => relOf(x) <= -20 && (x.peer || x.topic === niche)).sort((a, b) => relOf(a) - relOf(b))[0];
      return r && state.subs >= 50 ? { rival: r.name, topic: r.topic } : null;
    },
    make(c){
      const r = sitRival(c.rival);
      return { title: `${c.rival} made a video calling you out.`, face: c.rival,
        body: 'They say you copy their ideas. Their viewers are showing up in your comments.',
        evidence: r ? [`${fmtCompact(r.subs)} subscribers`, `Relationship: ${relTier(r).label}`] : [] };
    },
    choices: { respond: ['Clap back in a community post', 'Drama brings views, and it gets personal'], apologize: ['Reach out and make peace', 'Repairs the relationship'],
      video: ['Make a response video', 'Big first day, a deeper rivalry'], ignore: ['Rise above it', 'Usually fizzles'] },
    resolve(k){
      if (k === 'respond') return { text: 'The back-and-forth sent viewers to both channels. It’s personal now.', fx: { views: 0.3, rel: -8, algo: -1, subs: 0.002 }, latest: true };
      if (k === 'apologize') return { text: 'They accepted. Things are a lot calmer between you.', fx: { rel: 22, subs: -0.001 } };
      return sitRoll(0.6) ? { text: 'With no reaction from you, it fizzled.', fx: {} } : { text: 'They made a second video. Some viewers believed it.', fx: { subs: -0.003 } };
    },
    follow: { label: 'a response video', prefix: 'Responding to {rival}: ', algo: 8, ctr: 4, cap: 1.4, any: true,
      done: { text: 'Your response video took off. The rivalry is fully public now.', fx: { subs: 0.004, rel: -12, algo: 1 } },
      missed: { text: 'You announced a response and never posted it. They took a victory lap.', fx: { subs: -0.002, rel: -3 } } },
  },

  shoutout: {
    tone: 'good', tag: 'Creator shout-out', weight: 0,
    make(c){
      return { title: c.rival ? `${c.rival} shouted you out.` : 'Another creator shouted you out.', face: c.rival || null,
        body: c.rival ? `They told their ${fmtCompact(c.subs || 0)} subscribers to check you out.` : 'A bigger creator shared your channel with their audience.',
        evidence: [`+${fmt(c.gain || 0)} subscribers so far`] };
    },
    choices: { respond: ['Thank them publicly', 'Goodwill and a few more subs'], video: ['Pitch a collab', c => c.rival ? 'They might invite you' : 'Worth a try'], ignore: ['Say nothing', 'They’ll notice'] },
    resolve(k, c){
      if (k === 'respond') return { text: 'Your thank-you went down well with both audiences.', fx: { subs: 0.002, rel: c.rival ? 8 : 0 } };
      if (k === 'video' && c.rival && typeof bookingFor === 'function' && bookingFor(c.rival)) return { text: `You already have a collab booked with ${c.rival}. They said they can't wait.`, fx: { rel: 4 } };
      if (k === 'video') return c.rival
        ? (sitRoll(0.7) ? { text: `${c.rival} loved the idea and invited you to collab. It’s free if you accept within a day (Feed → Collabs).`, fx: { invite: true, rel: 4 } }
          : { text: `${c.rival} is busy for now, but they appreciated the pitch.`, fx: { rel: 4 } })
        : { text: 'They said maybe later. At least you’re on their radar.', fx: { subs: 0.001 } };
      return { text: 'You didn’t acknowledge it.', fx: { rel: c.rival ? -3 : 0 } };
    },
  },

  fanEdit: {
    tone: 'good', tag: 'Fan edit', weight: 2,
    check(){
      const v = sitPickRecent(v => (v.satisfaction || 0) >= 66 && v.views >= 250 && v.age > 120);
      return v ? { videoId: v.id, topic: v.topic, title: v.title } : null;
    },
    make(c){ return { title: `A fan edit of "${sitShort(c.title)}" is blowing up on social media.`, body: 'Someone cut your best moment to music and it’s being shared everywhere.', evidence: ['Shared thousands of times', 'Lots of people asking who you are'] }; },
    choices: { respond: ['Share it and credit the fan', 'Sends people your way'], video: ['Make a video featuring fan edits', 'Same topic within 12h'], ignore: ['Let it be', 'Still brings a few people'] },
    resolve(k){
      if (k === 'respond') return { text: 'You shared it and tagged the fan. The original video picked up a wave of new viewers.', fx: { views: 0.3, subs: 0.003, loyal: 2 } };
      return { text: 'It still sent a few people your way.', fx: { views: 0.1 } };
    },
    follow: { label: 'a video celebrating your fans’ edits', prefix: '', algo: 6, ctr: 2,
      done: { text: 'Your fans loved being featured. Core fans are louder than ever.', fx: { loyal: 4, subs: 0.003 } },
      missed: { text: 'The moment passed.', fx: {} } },
  },

  oldClip: {
    tone: 'neutral', tag: 'Old clip going viral', weight: 3,
    check(){
      const v = sitPickRecent(v => v.age > 4 * DAY_TICKS && v.views >= 150);
      return v ? { videoId: v.id, topic: v.topic, title: v.title } : null;
    },
    make(c){ return { title: 'Your old clip is going viral on social media.', body: `A 20-second moment from "${sitShort(c.title)}" is being shared, mostly without context.`, evidence: ['People are quoting it', 'Not everyone knows it’s yours'] }; },
    choices: { respond: ['Post the full context', 'Sends people to the full video'], apologize: ['Apologize for the old clip', 'Probably unnecessary'],
      video: ['Make a follow-up while it’s hot', 'Same topic within 12h'], ignore: ['Enjoy the ride', 'A few views anyway'] },
    resolve(k){
      if (k === 'respond') return { text: 'You posted the full context. Lots of people went and watched the original.', fx: { views: 0.4, subs: 0.002 } };
      if (k === 'apologize') return { text: 'Most people didn’t think you needed to apologize. It went down fine, but it took the wind out of it.', fx: { loyal: 1 } };
      return { text: 'The clip did its thing and sent a few viewers to the original.', fx: { views: 0.15 } };
    },
    follow: { label: 'a follow-up while the clip is hot', prefix: '', algo: 8, cap: 1.3,
      done: { text: 'Perfect timing: the follow-up caught the wave.', fx: { subs: 0.003 } },
      missed: { text: 'The wave passed without a follow-up.', fx: {} } },
  },

  partTwo: {
    tone: 'neutral', tag: 'Viewers want more', weight: 2,
    check(){
      const v = sitPickRecent(v => v.age > 180 && v.age < 3 * DAY_TICKS && (v.satisfaction || 0) >= 64 && v.views >= 120 && v.format !== 'shorts');
      return v ? { videoId: v.id, topic: v.topic, title: v.title } : null;
    },
    make(c){ return { title: `Viewers are demanding a part 2 of "${sitShort(c.title)}".`, body: '"PART 2" is all over the comments.', evidence: ['Top comment: "part 2 or I unsubscribe"'] }; },
    followChoices: ['respond', 'video'],
    choices: { respond: ['Promise it’s coming', 'Only if you deliver'], video: ['Make part 2', 'Same topic within 12h'], ignore: ['Move on', 'A few will be disappointed'] },
    resolve(k){
      if (k === 'respond') return { text: 'You promised part 2. Now they’re waiting for it.', fx: {}, followAlso: true };
      return { text: 'A few viewers were disappointed.', fx: { loyal: -1 } };
    },
    follow: { label: 'part 2', prefix: 'Part 2: ', algo: 8, cap: 1.3, ctr: 2,
      done: { text: 'Part 2 is here and the people who asked for it showed up.', fx: { subs: 0.003, loyal: 3 } },
      missed: { text: 'No part 2. The comments are not happy.', fx: { loyal: -4, algo: -1 } } },
  },

  quitRumours: {
    tone: 'neutral', tag: 'Fans are worried', weight: 3,
    check(){
      if (!(state.uploadLog || []).length) return null;
      const silent = (state.totalTicks - lastUploadAt()) / DAY_TICKS;
      return silent > cadence().graceDays + 0.5 ? { topic: playerNiche(), days: Math.floor(silent) } : null;
    },
    make(c){ return { title: 'Fans are asking if you’ve quit.', body: `It’s been ${c.days} days since your last upload.`, evidence: ['"Is this channel dead?"', 'Some subscribers are drifting away'] }; },
    choices: { respond: ['Post an update', 'Reassures your fans'], video: ['Upload a comeback video', 'Any topic within 12h'], ignore: ['Say nothing', 'They’ll keep drifting'] },
    resolve(k){
      if (k === 'respond') return { text: 'Your update reassured people. They’re waiting for the next video.', fx: { algo: 1, loyal: 2 } };
      return { text: 'The silence continued.', fx: { subs: -0.003 } };
    },
    follow: { label: 'a comeback video', prefix: 'I’m Back: ', algo: 6, cap: 1.3, any: true,
      done: { text: 'Welcome back! Your fans showed up for the comeback.', fx: { subs: 0.002, loyal: 3, algo: 1 } },
      missed: { text: 'You said you were coming back, then didn’t.', fx: { loyal: -3 } } },
  },

  meme: {
    tone: 'neutral', tag: 'You’re a meme', weight: 2,
    check(){
      const v = sitPickRecent(v => (v.thumb === 'shock' || v.thumb === 'funny') && v.views >= 120 && v.age > 120);
      return v ? { videoId: v.id, topic: v.topic, title: v.title } : null;
    },
    make(c){ return { title: 'Your face from a thumbnail became a meme.', body: `The thumbnail from "${sitShort(c.title)}" is being used as a reaction image.`, evidence: ['Posted in group chats everywhere', 'Some of it is a bit mean'] }; },
    choices: { respond: ['Lean into it', 'Fun, and good for reach'], apologize: ['Ask people to stop', 'Rarely works on the internet'], video: ['Make a video about the meme', 'Same topic within 12h'], ignore: ['Ignore it', 'It fades'] },
    resolve(k){
      if (k === 'respond') return { text: 'You made it your profile picture. The internet loved it.', fx: { subs: 0.003, views: 0.2 } };
      if (k === 'apologize') return { text: 'Asking the internet to stop made the meme bigger. Some of it got meaner.', fx: { views: 0.2, loyal: -1 } };
      return { text: 'The meme faded, as memes do.', fx: { views: 0.05 } };
    },
    follow: { label: 'a video about the meme', prefix: 'Reacting to My Own Meme: ', algo: 6, ctr: 3,
      done: { text: 'Leaning in worked: the meme crowd came to watch.', fx: { subs: 0.003 } },
      missed: { text: 'The meme moved on without you.', fx: {} } },
  },
};

/* ---------------- spawning ---------------- */
function queueSituation(key, ctx, force){
  const def = SITUATIONS[key];
  if (!def) return false;
  const book = sitBook(), now = state.totalTicks;
  if (book.open.length >= 2 || book.open.some(s => s.key === key)) return false;
  if (!force && now < (book.cd || 0)) return false;
  if (!force && (state.uploadLog || []).length < 3) return false;    // brand-new channels get a quiet start
  book.keyCd = book.keyCd || {};
  if (!force && now < (book.keyCd[key] || 0)) return false;          // the same kind of thing doesn't keep happening
  book.keyCd[key] = now + (key === 'shoutout' ? 2 : 1.5) * DAY_TICKS;
  const made = def.make(ctx);
  const sit = { id: 'st' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), key, at: now, until: now + SIT_EXPIRE, ctx, ...made };
  book.open.push(sit);
  book.cd = now + SIT_COOLDOWN;
  if (ctx.videoId){ const v = sitVideo(ctx.videoId); if (v) v.sitUsed = true; }
  pushNotification(ic('chat') + ` ${def.tag}: ${made.title}`);
  if (!offlineFastForward && !window.__bootActive && !(window.Tutorial && Tutorial.isActive())){
    try { playNotifSound(); } catch(e){}
    showSituationCard(sit.id);
  }
  renderSituations();
  return true;
}
/* Hourly (from advanceGlobalTicks): expire, follow-ups, and now and then something new. */
function tickSituations(){
  const book = sitBook(), now = state.totalTicks;
  book.open.slice().forEach(s => {
    if (now < s.until) return;
    const res = resolveSituation(s.id, 'ignore', true);
    if (res && sitCardFor === s.id && !offlineFastForward) showSituationResult({ text: 'Time ran out. ' + res.text, fx: res.fx });
  });
  const fu = book.followUp;
  if (fu && fu.videoId && !state.videos.some(v => v.id === fu.videoId)) fu.videoId = null;   // the claimed video was cancelled or deleted
  if (fu && !fu.videoId && now > fu.until){
    book.followUp = null;
    const def = SITUATIONS[fu.key];
    if (def && def.follow) finishSituation({ key: fu.key, title: fu.title, ctx: fu.ctx }, 'Follow-up missed', def.follow.missed, true);
  }
  if (offlineFastForward || (state.uploadLog || []).length < 5 || state.subs < 30) return;
  if (book.open.length || now < (book.cd || 0) || book.followUp || state.live) return;
  if (!sitRoll(1 / 14)) return;
  const pool = [];
  Object.entries(SITUATIONS).forEach(([k, d]) => {
    if (!d.weight || !d.check) return;
    if ((book.lastKey === k) && sitRoll(0.7)) return;     // vary it up
    const ctx = d.check();
    if (ctx) for (let i = 0; i < d.weight; i++) pool.push([k, ctx]);
  });
  if (!pool.length) return;
  const [k, ctx] = pool[Math.floor(Math.random() * pool.length)];
  book.lastKey = k;
  queueSituation(k, ctx);
}

/* ---------------- choosing ---------------- */
function applySitFx(fx, ctx, extra){
  const out = [];
  fx = fx || {};
  const v = ctx.videoId ? sitVideo(ctx.videoId) : (extra && extra.latest ? state.videos.slice().reverse().find(sitLive) : null);
  const r = sitRival(ctx.rival);
  if (fx.subs){
    let n = Math.round(state.subs * fx.subs);
    if (n === 0 && state.subs >= 20) n = fx.subs > 0 ? 1 : -1;
    n = Math.max(-state.subs, n);
    if (n){ state.subs += n; state.daySubs += n; state.currentHourSubs += n; out.push({ good: n > 0, text: `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))} subscribers` }); }
  }
  if (fx.algo){ state.algoRating = clamp(state.algoRating + fx.algo, 0, 100); out.push({ good: fx.algo > 0, text: `Algorithm ${fx.algo > 0 ? '+' : '−'}${Math.abs(fx.algo)}` }); }
  if (fx.views > 0 && v){
    const n = Math.round(Math.max(20, v.views * fx.views));
    v.views += n; state.totalViews += n; state.dayViews += n; state.currentHourViews += n;
    v.rate = Math.max(v.rate, (v.baseRate || 10) * 0.5) * (1 + Math.min(1, fx.views));
    out.push({ good: true, text: `+${fmtCompact(n)} views` });
  }
  if (extra && extra.claim && v){ v.rate *= 0.4; if (Number.isFinite(v.authorityCap)) v.authorityCap = Math.min(v.authorityCap, v.views * 1.1); out.push({ good: false, text: 'Video stopped being recommended' }); }
  if (fx.rel && r){ adjustRel(r, fx.rel); out.push({ good: fx.rel > 0, text: `${r.name} ${fx.rel > 0 ? '+' : '−'}${Math.abs(fx.rel)} relationship` }); }
  if (fx.rep && typeof sponsorBook === 'function' && state.unlocks.sponsorships){ const b = sponsorBook(); b.rep = clamp(b.rep + fx.rep, 0, 100); out.push({ good: fx.rep > 0, text: `Brand reputation ${fx.rep > 0 ? '+' : '−'}${Math.abs(fx.rep)}` }); }
  const topic = ctx.topic && TOPICS[ctx.topic] ? ctx.topic : playerNiche();
  if (fx.loyal && topic && TOPICS[topic]){
    const L = state.audienceLoyalty;
    L[topic] = clamp((typeof L[topic] === 'number' ? L[topic] : 55) + fx.loyal, 5, 98);
    out.push({ good: fx.loyal > 0, text: `${TOPICS[topic].label} loyalty ${fx.loyal > 0 ? '+' : '−'}${Math.abs(fx.loyal)}` });
  }
  if (fx.sat && v) v.satisfaction = clamp(v.satisfaction + fx.sat, 5, 99);
  if (fx.ctr && v) v.ctrDrift = (v.ctrDrift || 0) + fx.ctr;
  if (fx.invite && r && !(typeof bookingFor === 'function' && bookingFor(r.name))){ r.inviteUntil = state.totalTicks + DAY_TICKS; r.inviteUsed = false; out.push({ good: true, text: `Free collab invite from ${r.name}` }); }
  return out;
}
function finishSituation(sit, choiceLabel, res, quiet){
  const fxList = applySitFx(res.fx, sit.ctx, res);
  const book = sitBook();
  const def = SITUATIONS[sit.key] || {};
  book.log.unshift({ key: sit.key, tone: def.tone, title: sit.title, choice: choiceLabel, text: res.text, fx: fxList.map(f => (f.good ? '+' : '-') + f.text), at: state.totalTicks });
  if (book.log.length > 12) book.log.length = 12;
  pushNotification(ic('chat') + ` ${choiceLabel}: ${res.text}`);
  if (!quiet && !offlineFastForward) showToast(ic('chat') + ' ' + res.text, true);
  safeRenderAll();
  return fxList;
}
function resolveSituation(id, k, auto){
  const book = sitBook();
  const sit = book.open.find(s => s.id === id);
  if (!sit) return null;
  const def = SITUATIONS[sit.key];
  book.open = book.open.filter(s => s !== sit);
  const followBusy = !!book.followUp;
  if (k === 'video' && def.follow && followBusy) k = 'ignore';     // the card disables this; this only guards other paths
  const label = auto ? 'No response' : ((def.choices[k] || [k])[0]);
  if (k === 'video' && def.follow && !(sit.key === 'shoutout')){
    startFollowUp(sit, def);
    const fu = book.followUp;
    const msg = `Make ${def.follow.label}${fu.topic ? ` (a ${TOPICS[fu.topic].label} video)` : ''} before ${formatTick(fu.until).replace(/^Day \d+ · /, '')}. It gets a boost when it goes up.`;
    book.log.unshift({ key: sit.key, tone: def.tone, title: sit.title, choice: label, text: msg, fx: [], at: state.totalTicks, pending: true });
    if (book.log.length > 12) book.log.length = 12;
    pushNotification(ic('calendar') + ' ' + msg);
    safeRenderAll();
    return { text: msg, fx: [], follow: true };
  }
  const res = def.resolve(k, sit.ctx);
  if (res.followAlso && def.follow && !followBusy) startFollowUp(sit, def);
  else if (res.followAlso) res.followAlso = false;
  const fx = finishSituation(sit, label, res, true);
  if (auto) pushNotification(ic('chat') + ` You didn't respond to "${sitShort(sit.title)}". ${res.text}`);
  if (res.followAlso && def.follow){
    const fu = sitBook().followUp;
    return { text: `${res.text} Make ${def.follow.label} before ${formatTick(fu.until).replace(/^Day \d+ · /, '')} to keep the promise.`, fx, follow: true };
  }
  return { text: res.text, fx };
}
function startFollowUp(sit, def){
  const f = def.follow;
  sitBook().followUp = { sitId: sit.id, key: sit.key, title: sit.title, topic: f.any ? null : (sit.ctx.topic || null), until: state.totalTicks + SIT_FOLLOW_WINDOW,
    label: f.label, prefix: (f.prefix || '').replace('{rival}', sit.ctx.rival || ''), algo: f.algo || 0, ctr: f.ctr || 0, cap: f.cap || 1, ctx: sit.ctx };
}
/* Called from performUpload once the video exists (and its publish time is known): does it count? */
function claimFollowUp(v){
  const book = sitBook(), fu = book.followUp;
  if (!fu || fu.videoId) return;
  const def = SITUATIONS[fu.key];
  const liveAt = v.publishAt && v.publishAt > state.totalTicks ? v.publishAt : state.totalTicks;
  if (liveAt > fu.until || (fu.topic && v.topic !== fu.topic)) return;
  if (def && def.follow && def.follow.req && !def.follow.req(v)){
    if (!offlineFastForward) showToast(ic('chat') + ` This one doesn't count as your follow-up: it needs ${def.follow.reqText}.`);
    return;
  }
  fu.videoId = v.id;
  if (!offlineFastForward) showToast(ic('chat') + ' This video counts as your follow-up. It gets its boost when it goes live.');
}
/* Called when a video goes live (cadence.js goLive). */
function applyFollowUp(v){
  const book = sitBook(), fu = book.followUp;
  if (!fu || fu.videoId !== v.id) return;
  book.followUp = null;
  const old = v.algorithmScore;
  v.algorithmScore = clamp(v.algorithmScore + fu.algo, 0, 100);
  rescaleCapForScore(v, old);
  if (Number.isFinite(v.authorityCap)) v.authorityCap *= fu.cap;
  v.ctr = clamp(v.ctr + fu.ctr, 1, 97);
  if (typeof v.baseCtr === 'number') v.baseCtr = clamp(v.baseCtr + fu.ctr, 0.5, 97);
  if (fu.prefix && v.title.indexOf(fu.prefix) !== 0) v.title = fu.prefix + v.title;
  v.followUpOf = fu.key;
  const def = SITUATIONS[fu.key];
  const pend = book.log.find(l => l.pending && l.title === fu.title);
  if (pend) pend.pending = false;
  if (def && def.follow) finishSituation({ key: fu.key, title: fu.title, ctx: fu.ctx }, 'Follow-up posted', def.follow.done);
}

/* ---------------- UI: the card, the top-bar pill, the Home panel, the Studio banner ---------------- */
let sitCardFor = null, sitCardTimer = null, sitListHtml = '', sitListPointer = false;
function ensureSitCard(){
  let el = document.getElementById('sit-card');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'sit-card'; el.className = 'sit-card'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sit]');
    if (!b || b.disabled) return;
    const k = b.dataset.sit;
    if (k === 'later' || k === 'close'){ playClickSound(); hideSituationCard(); return; }
    const res = resolveSituation(sitCardFor, k);
    if (!res){ hideSituationCard(); return; }
    playClickSound();
    showSituationResult(res);
  });
  return el;
}
function showSituationCard(id){
  const sit = sitBook().open.find(s => s.id === id);
  if (!sit) return;
  const def = SITUATIONS[sit.key];
  const el = ensureSitCard();
  clearTimeout(sitCardTimer);
  sitCardFor = id;
  const hasFollow = !!sitBook().followUp;
  const order = ['respond', 'apologize', 'video', 'ignore'].filter(k => def.choices[k]);
  el.className = 'sit-card tone-' + def.tone;
  el.innerHTML = `
    <div class="sc-top"><span class="sc-tone">${SIT_TONE[def.tone]}</span><span class="sc-tag">${def.tag}</span><span class="sc-time">Decide ${calIn(sit.until)}</span></div>
    <div class="sc-head">${sit.face ? `<span class="face-avatar">${thumbFace(sit.face)}</span>` : ''}<div class="sc-title">${sit.title}</div></div>
    <div class="sc-body">${sit.body || ''}</div>
    ${(sit.evidence || []).length ? `<div class="sc-ev">${sit.evidence.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
    <div class="sc-choices">${order.map(k => {
      const [label, hint] = def.choices[k];
      const blocked = hasFollow && def.follow && (def.followChoices || ['video']).includes(k);
      const h = typeof hint === 'function' ? hint(sit.ctx) : hint;
      return `<button class="sc-choice c-${k}" data-sit="${k}" ${blocked ? 'disabled' : ''}><b>${label}</b><span>${blocked ? 'Finish your other follow-up first' : h}</span></button>`;
    }).join('')}</div>
    <div class="sc-foot"><button class="sc-later" data-sit="later">Decide later</button></div>`;
  requestAnimationFrame(() => { if (sitCardFor === id) el.classList.add('show'); });
}
function showSituationResult(res){
  const el = ensureSitCard();
  el.innerHTML = `
    <div class="sc-top"><span class="sc-tone">${res.follow ? 'Follow-up' : 'Outcome'}</span></div>
    <div class="sc-title">${res.text}</div>
    ${res.fx && res.fx.length ? `<div class="sc-fx">${res.fx.map(f => `<span class="${f.good ? 'good' : 'bad'}">${f.text}</span>`).join('')}</div>` : (res.follow ? '' : '<div class="sc-body">No real change.</div>')}
    <div class="sc-foot"><button class="mini-btn" data-sit="close">${res.follow ? 'Go to the Studio' : 'Got it'}</button></div>`;
  if (res.follow){
    el.querySelector('[data-sit="close"]').addEventListener('click', () => switchTab('studio'), { once: true });
  }
  clearTimeout(sitCardTimer);
  sitCardTimer = setTimeout(hideSituationCard, 12000);
}
function hideSituationCard(){
  const el = document.getElementById('sit-card');
  if (el) el.classList.remove('show');
  sitCardFor = null;
  renderSituations();
}
function renderSituations(){
  const book = sitBook(), open = book.open;
  const pill = document.getElementById('sit-pill');
  if (pill){
    pill.style.display = open.length ? '' : 'none';
    const t = pill.querySelector('span'); if (t) t.textContent = open.length === 1 ? '1 to respond' : `${open.length} to respond`;
  }
  const panel = document.getElementById('sit-panel'), list = document.getElementById('sit-list');
  if (panel && list && !sitListPointer){
    const recent = book.log.slice(0, 3);
    panel.style.display = open.length || recent.length || book.followUp ? '' : 'none';
    const html = open.map(s => {
      const def = SITUATIONS[s.key];
      return `<div class="sp-row open tone-${def.tone}"><i></i><div class="sp-main"><div class="sp-title">${s.title}</div><div class="sp-sub">${def.tag} · decide ${calIn(s.until)}</div></div><button class="mini-btn" data-sit-open="${s.id}">Respond</button></div>`;
    }).join('') + (book.followUp ? `<div class="sp-row follow"><i></i><div class="sp-main"><div class="sp-title">Follow-up: ${book.followUp.label}</div><div class="sp-sub">${book.followUp.topic ? TOPICS[book.followUp.topic].label + ' video · ' : ''}due ${calIn(book.followUp.until)}</div></div><button class="mini-btn" data-sit-studio="1">Create</button></div>` : '')
      + recent.map(l => `<div class="sp-row tone-${l.tone || 'neutral'}"><i></i><div class="sp-main"><div class="sp-title">${l.choice}: ${l.text}</div><div class="sp-sub">${sitShort(l.title)} · ${feedTimeAgo(l.at)}</div></div></div>`).join('');
    if (html !== sitListHtml){ sitListHtml = html; list.innerHTML = html; }
  }
  renderFollowUpBanner();
}
function renderFollowUpBanner(){
  const el = document.getElementById('followup-banner');
  if (!el) return;
  const fu = sitBook().followUp;
  if (!fu){ el.style.display = 'none'; return; }
  const cur = (document.getElementById('topic-select') || {}).value;
  const ok = !fu.topic || cur === fu.topic;
  el.style.display = '';
  el.className = 'followup-banner' + (ok ? ' ok' : '');
  const def = SITUATIONS[fu.key] || {}, req = def.follow && def.follow.reqText;
  const claimed = fu.videoId && state.videos.find(v => v.id === fu.videoId);
  if (claimed){ el.className = 'followup-banner ok'; el.innerHTML = `${ic('chat')}<div><b>Follow-up ready:</b> "${sitShort(claimed.title)}" counts. It gets its boost when it goes live.</div>`; return; }
  el.innerHTML = `${ic('chat')}<div><b>Follow-up: ${fu.label}.</b> ${fu.topic ? `Make a ${TOPICS[fu.topic].label} video` : 'Upload any video'}${req ? ` (${req})` : ''} that goes live before ${formatTick(fu.until).replace(/^Day \d+ · /, '')} (${calIn(fu.until)}) and it gets a boost.${ok ? '' : ` <em>Pick ${TOPICS[fu.topic].label} for it to count.</em>`}</div>`;
}
/* Calendar hook: open situations and follow-up deadlines. */
function situationEvents(add){
  const book = sitBook();
  book.open.forEach(s => add({ at: s.until, cat: 'drama', warn: true, title: `Respond: ${sitShort(s.title)}`, sub: `${SITUATIONS[s.key].tag} · after this it counts as ignored`, action: { label: 'Respond', sit: s.id } }));
  if (book.followUp && !book.followUp.videoId){ const req = (SITUATIONS[book.followUp.key].follow || {}).reqText; add({ at: book.followUp.until, cat: 'drama', title: `Follow-up due: ${book.followUp.label}`, sub: (book.followUp.topic ? `A ${TOPICS[book.followUp.topic].label} video` : 'Any upload') + (req ? ` (${req})` : '') + ' gets the boost', action: { label: 'Create', tab: 'studio' } }); }
}
function initSituationsUI(){
  const pill = document.getElementById('sit-pill');
  if (pill) pill.addEventListener('click', () => { const s = sitBook().open[0]; if (s){ playClickSound(); showSituationCard(s.id); } });
  const list = document.getElementById('sit-list');
  if (list){ list.addEventListener('pointerdown', () => { sitListPointer = true; }); window.addEventListener('pointerup', () => { setTimeout(() => { sitListPointer = false; }, 50); }); }
  if (list) list.addEventListener('click', (e) => {
    const o = e.target.closest('[data-sit-open]'), st = e.target.closest('[data-sit-studio]');
    if (o){ playClickSound(); showSituationCard(o.dataset.sitOpen); }
    if (st){ playClickSound(); switchTab('studio'); }
  });
  const tiles = document.getElementById('topic-tiles');
  if (tiles) tiles.addEventListener('click', () => setTimeout(renderFollowUpBanner, 0));
  renderSituations();
}

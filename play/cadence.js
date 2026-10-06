/* =========================================================================
   STREAMLY SIM — UPLOAD PLAN + SCHEDULING
   Upload plan: Casual / Consistent / Aggressive. Every in-game day the game
   checks whether you kept your plan. Keeping it builds a streak, and the
   streak feeds the algorithm rating ("algorithm familiarity"): Streamly
   pushes channels it can predict. Breaking it costs rating; long breaks
   also make your audience drift away. Aggressive builds familiarity
   fastest, but your own videos compete for the same viewers.

   Scheduling: make a video now, publish it later (tonight, tomorrow...).
   It goes live on time even while you're away, counts for the day it
   publishes, and prime-time publishing gets a better first day.
   Loaded before game.js; functions only run after the game starts.
   ========================================================================= */
const CADENCES = {
  casual:     { label: 'Casual',     need: 1, windowDays: 2, gain: 0.6, miss: 0.3, graceDays: 3, streakAlgo: 0.4, energyRegen: 1.15, energyExtra: 0,
                blurb: 'At least 1 upload every 2 days. Gentle on your energy, slow to build algorithm familiarity.' },
  consistent: { label: 'Consistent', need: 2, windowDays: 1, gain: 1.4, miss: 1.0, graceDays: 2, streakAlgo: 0.8, energyRegen: 1.0,  energyExtra: 0,
                blurb: 'At least 2 uploads a day. The algorithm learns your rhythm and pushes you steadily.' },
  aggressive: { label: 'Aggressive', need: 4, windowDays: 1, gain: 2.2, miss: 1.8, graceDays: 1, streakAlgo: 1.0, energyRegen: 1.0,  energyExtra: 3, reach: 0.85,
                blurb: '4+ uploads a day. Fastest familiarity, but your videos fight each other for views and it drains energy.' },
};
const STREAK_CAP = 10;

function cadence(){ return CADENCES[state.cadence] || CADENCES.casual; }
/* Published uploads inside the last N in-game days (scheduled ones count when they go live). */
function uploadsInLastDays(days){ return (state.uploadLog || []).filter(t => t <= state.totalTicks && state.totalTicks - t < days * DAY_TICKS).length; }
/* The most recent upload that has actually gone live by now (replaying time away can hold later ones). */
function lastUploadAt(){ return (state.uploadLog || []).reduce((m, t) => t <= state.totalTicks && t > m ? t : m, 0); }
/* Streak length in days (a casual check covers 2 days). */
function streakDays(){ return (state.cadStreak || 0) * cadence().windowDays; }

/* Runs once per in-game day crossed (from advanceGlobalTicks). */
function checkCadence(){
  if (!(state.uploadLog || []).length) return;          // nothing to judge before the first upload
  const C = cadence();
  state.cadDayCount = (state.cadDayCount || 0) + 1;
  if (state.cadDayCount % C.windowDays !== 0) return;   // casual is judged every 2 days
  const made = uploadsInLastDays(C.windowDays);
  if (made >= C.need){
    state.cadStreak = Math.min(99, (state.cadStreak || 0) + 1);
    const boost = C.gain * (1 + Math.min(state.cadStreak, STREAK_CAP) * 0.1);
    state.algoRating = clamp(state.algoRating + boost, 0, 100);
    if (state.cadStreak === 3 || state.cadStreak === 7 || state.cadStreak % 10 === 0){
      pushNotification(ic('fire') + ` ${streakDays()}-day ${C.label.toLowerCase()} streak. Streamly knows your rhythm now: your uploads get pushed harder.`);
      if (!offlineFastForward) showToast(ic('fire') + ` ${streakDays()}-day upload streak!`, true);
    }
  } else {
    if ((state.cadStreak || 0) >= 2){
      pushNotification(ic('alert') + ` You missed your ${C.label.toLowerCase()} upload plan (${made} of ${C.need}). Your ${streakDays()}-day streak is over.`);
      if (!offlineFastForward) showToast(ic('alert') + ` Streak broken: ${made} of ${C.need} uploads.`, true);
    }
    state.cadStreak = 0;
    state.algoRating = clamp(state.algoRating - C.miss, 0, 100);
  }
}
/* Long breaks: after the plan's grace period, the audience drifts away a little every day. */
function audienceDecay(){
  if (!(state.uploadLog || []).length) return;
  const silentDays = (state.totalTicks - lastUploadAt()) / DAY_TICKS;
  if (silentDays <= cadence().graceDays) return;
  const lost = Math.floor(state.subs * 0.004 * (typeof demoDecayMult === 'function' ? demoDecayMult() : 1));  // casual audiences drift fastest
  if (lost > 0){
    state.subs -= lost; state.daySubs -= lost;
    Object.keys(state.audienceLoyalty || {}).forEach(t => { state.audienceLoyalty[t] = clamp(state.audienceLoyalty[t] - 2, 0, 100); });
    if (!state.decayNoticeDay || state.decayNoticeDay !== clockDay()){
      state.decayNoticeDay = clockDay();
      pushNotification(ic('users') + ` ${Math.floor(silentDays)} days without an upload: ${fmt(lost)} subscribers drifted away today.`);
    }
  }
}
/* Applied to every upload (from createVideo): the familiarity the streak has built. */
function cadenceAlgoBonus(){ return Math.min(state.cadStreak || 0, STREAK_CAP) * cadence().streakAlgo; }
/* Aggressive plans split your audience across more videos: each one reaches fewer of them. */
function cadenceReachMult(){ return cadence().reach || 1; }

/* ---------------- scheduling ---------------- */
const MAX_SCHEDULED = 5;
function clockMinute(tick){ return (tick + CLOCK_START_OFFSET_MIN) % DAY_TICKS; }
function formatTick(tick){
  const totalMin = tick + CLOCK_START_OFFSET_MIN;
  const day = Math.floor(totalMin / DAY_TICKS) + 1, m = totalMin % DAY_TICKS, h = Math.floor(m / 60);
  return `Day ${day} · ${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
/* Next time the clock reads hh:00 (today if still ahead, otherwise tomorrow), plus extra days. */
function nextClockTick(hour, extraDays){
  const now = state.totalTicks, m = clockMinute(now);
  let delta = hour * 60 - m;
  if (delta <= 30) delta += DAY_TICKS;
  return now + delta + (extraDays || 0) * DAY_TICKS;
}
function publishSlots(){
  const P = typeof primeHour === 'function' ? primeHour() : 19;   // your audience's prime time
  const tonight = nextClockTick(P, 0);
  const tmrMorning = nextClockTick(9, 0);
  return [
    { id: 'now',      label: 'Publish now' },
    { id: 'in2h',     label: 'In 2 hours',             at: state.totalTicks + 120 },
    { id: 'tonight',  label: 'Next prime time',        at: tonight },
    { id: 'morning',  label: 'Next 9:00 AM',            at: tmrMorning },
    { id: 'tomorrow', label: 'Prime time, a day later', at: tonight + DAY_TICKS },
  ].concat(typeof calendarPublishAt === 'number' && calendarPublishAt > state.totalTicks + 5
    ? [{ id: 'cal', label: 'From your Calendar: Day ' + (clockDay(calendarPublishAt) + 1), at: calendarPublishAt }] : []);
}
function scheduledVideos(){ return state.videos.filter(v => v.publishPhase === 'scheduled'); }

/* Day-one audience by the hour a video goes live. */
function timeOfDayMult(hour){
  if (typeof audienceTimeMult === 'function') return audienceTimeMult(hour);   // when YOUR audience is online (Analytics → Audience)
  if (hour >= 18 && hour <= 22) return 1.2;   // prime time
  if (hour >= 12) return 1.08;
  if (hour >= 7) return 1.0;
  return 0.75;                                  // 2 AM uploads land with nobody awake
}

/* Puts a video live: counts it for your plan, records the hour, notifies. */
function goLive(v, atTick){
  const t = typeof atTick === 'number' ? atTick : state.totalTicks;
  v.publishPhase = 'live';
  v.publishHour = Math.floor(clockMinute(t) / 60);
  if (!v.logged){ state.uploadLog.push(t); v.logged = true; }
  state.lastUploadTick = Math.max(state.lastUploadTick || 0, t);
  videoLiveHooks(v);
  if (v.wasScheduled){
    pushNotification(ic('play') + ` Your scheduled video "${v.title}" is now live.`);
    if (!offlineFastForward) showToast(ic('play') + ` Scheduled video is live: "${v.title}"`, true);
  }
}
/* Everything that happens the moment a video goes live. */
function videoLiveHooks(v){
  if (typeof rebaseScheduledVideo === 'function') rebaseScheduledVideo(v);   // a scheduled video meets the day it actually lands on
  if (typeof applyFollowUp === 'function') applyFollowUp(v);                 // a follow-up promised in a Situation
  if (typeof onVideoLiveSocial === 'function') onVideoLiveSocial(v);         // Pulse teasers and trend tie-ins
}
/* Every tick: publish anything that's due. */
function publishDueVideos(){
  scheduledVideos().forEach(v => { if (state.totalTicks >= v.publishAt) goLive(v); });
}

/* ---------------- UI ---------------- */
function renderPublishSelect(){
  const sel = document.getElementById('publish-select');
  if (!sel || document.activeElement === sel) return;
  let cur = sel.value || 'now';
  const slots = publishSlots();
  if (cur === 'cal' && !slots.some(s => s.id === 'cal')){
    cur = 'now';
    if (typeof calendarPublishAt === 'number'){ calendarPublishAt = null; showToast(ic('calendar') + ' Your Calendar time has passed, so Publish is back to "now".'); }
  }
  const dayWord = at => { const d = clockDay(at) - clockDay(); return d <= 0 ? '' : d === 1 ? 'Tomorrow ' : `Day ${clockDay(at) + 1} `; };
  sel.innerHTML = slots.map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${s.label}${s.at ? ' · ' + (s.id === 'cal' ? '' : dayWord(s.at)) + formatTick(s.at).replace(/^Day \d+ · /, '') : ''}</option>`).join('');
  const hint = document.getElementById('publish-hint');
  if (hint){
    const q = scheduledVideos().length;
    hint.textContent = q >= MAX_SCHEDULED ? `You have ${q} videos scheduled, the maximum.` : `Your viewers' prime time (${typeof primeLabel === 'function' ? primeLabel(primeHour()) : '7 PM – 10 PM'}) gets the best first day.${q ? ' ' + q + ' scheduled: tease them on Social for release-day viewers.' : ''}`;
  }
}
function chosenPublishAt(){
  const sel = document.getElementById('publish-select');
  const id = sel ? sel.value : 'now';
  const slot = publishSlots().find(s => s.id === id);
  return slot && slot.at ? slot.at : null;
}

function renderCadencePanel(){
  const el = document.getElementById('cadence-panel');
  if (!el) return;
  const C = cadence();
  const made = uploadsInLastDays(C.windowDays);
  const streak = state.cadStreak || 0;
  const silent = (state.uploadLog || []).length ? (state.totalTicks - lastUploadAt()) / DAY_TICKS : 0;
  const pct = Math.round(clamp(state.algoRating, 0, 100));
  el.innerHTML = `
    <div class="cad-chips">${Object.entries(CADENCES).map(([k, c]) => `<button class="cad-chip ${state.cadence === k ? 'on' : ''}" data-cad="${k}">${c.label}</button>`).join('')}</div>
    <div class="cad-blurb">${C.blurb}</div>
    <div class="cad-stats">
      <div><span>${C.windowDays === 2 ? 'Last 2 days' : 'Last 24 hours'}</span><b>${made} / ${C.need}</b></div>
      <div><span>Streak</span><b>${streakDays()} ${streakDays() === 1 ? 'day' : 'days'}</b></div>
      <div><span>Familiarity bonus</span><b>+${cadenceAlgoBonus().toFixed(1)}</b></div>
    </div>
    <div class="cad-fam"><div class="cad-fam-head"><span>Algorithm familiarity</span><b>${pct}%</b></div>
      <div class="meter-track"><div class="fill" style="width:${pct}%"></div></div></div>
    ${silent > C.graceDays ? `<div class="cad-warn">${Math.floor(silent)} days without an upload: your audience is drifting away and Streamly is losing interest.</div>`
      : `<div class="cad-note">Keep the plan to grow your streak. Miss it and the streak resets. After ${C.graceDays} ${C.graceDays === 1 ? 'day' : 'days'} with no uploads, subscribers start drifting away.</div>`}`;
}
function renderStudioCadence(){
  const el = document.getElementById('studio-cadence');
  if (!el) return;
  const C = cadence();
  const made = uploadsInLastDays(C.windowDays);
  el.innerHTML = `<b>${C.label} plan</b> · ${made} of ${C.need} ${C.windowDays === 2 ? 'in 2 days' : 'today'} · streak ${streakDays()} ${streakDays() === 1 ? 'day' : 'days'}`;
}
function initCadenceUI(){
  const p = document.getElementById('cadence-panel');
  if (p) p.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cad]');
    if (!b || b.dataset.cad === state.cadence) return;
    state.cadence = b.dataset.cad;
    state.cadStreak = 0; state.cadDayCount = 0;   // a new plan starts a new streak
    playClickSound();
    showToast(ic('calendar') + ` Upload plan: ${CADENCES[state.cadence].label}. Your streak starts fresh.`);
    renderCadencePanel(); renderStudioCadence();
  });
}

/* =========================================================================
   STREAMLY SIM — CHANNEL CALENDAR
   One place to plan the week: your scheduled uploads, sponsor deadlines,
   the audience-mood forecast (which topics will be hot), rival premieres,
   collabs you've booked, the weekly internet bill and data renewal, and
   upload-plan checks. Days run midnight to midnight on the in-game clock.

   Systems that live here:
   - Mood forecast: each day's audience mood is drawn a week ahead. Near
     days are reliable; far days drift a little every night until they
     arrive, and the real day lands within a few points of its forecast.
   - Rival premieres: creators announce uploads 1-4 days ahead. When one
     drops, its topic gets crowded for a while (big premieres more so),
     so uploading into it right afterwards costs you reach.
   - Collab bookings: book a creator for a future day at 15% off. On the
     day you get a 6-hour window to film; a no-show hurts the relationship.
   Loaded before game.js; functions only run after the game has started.
   ========================================================================= */
const CAL_DAYS = 7;
const CAL_PREMIERE_HOURS = [12, 14, 16, 17, 18, 19, 20, 21];
const BOOK_DISCOUNT = 0.85, BOOK_WINDOW = 6 * 60, MAX_BOOKINGS = 2;
const CAL_SLOTS = [{ hour: 9, label: '9:00 AM' }, { hour: 13, label: '1:00 PM' }, { hour: 19, label: '7:00 PM', prime: true }];
const CAL_CATS = {
  upload:  { label: 'Uploads',      icon: 'play' },
  sponsor: { label: 'Sponsors',     icon: 'gift' },
  trend:   { label: 'Trends',       icon: 'fire' },
  rival:   { label: 'Rivals',       icon: 'tv' },
  collab:  { label: 'Collabs',      icon: 'users' },
  bill:    { label: 'Bills & data', icon: 'wifi' },
  plan:    { label: 'Upload plan',  icon: 'calendar' },
  drama:   { label: 'Situations',   icon: 'chat' },
};

let calendarPublishAt = null;   // a slot picked on the Calendar, offered in the Studio's Publish menu
let calSelDay = null;           // the day the Calendar has open (null = today)
let calHidden = {};             // category -> true when filtered out
let calDirty = true, calRenderedAt = 0, calPointerDown = false;

/* ---------------- time helpers ---------------- */
function clockDay(t){ return Math.floor(((typeof t === 'number' ? t : state.totalTicks) + CLOCK_START_OFFSET_MIN) / DAY_TICKS); }
function dayStartTick(d){ return d * DAY_TICKS - CLOCK_START_OFFSET_MIN; }
function tickAt(d, hour){ return dayStartTick(d) + Math.round(hour * 60); }
function calDayName(d){ const t = clockDay(); return d === t ? 'Today' : d === t + 1 ? 'Tomorrow' : 'Day ' + (d + 1); }
function calTime(t){ const m = clockMinute(t), h = Math.floor(m / 60); return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; }
function calWhen(t){ return `${calDayName(clockDay(t))}, ${calTime(t)}`; }
function calIn(t){
  const d = t - state.totalTicks;
  if (d <= 0) return 'now';
  if (d < 60) return `in ${Math.max(1, Math.round(d))}m`;
  if (d < DAY_TICKS) return `in ${Math.round(d / 60)}h`;
  return `in ${Math.round(d / DAY_TICKS)}d`;
}
const calPick = a => a[Math.floor(Math.random() * a.length)];
const calEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/* ---------------- audience-mood forecast ---------------- */
function moodForecastBook(){
  if (!state.moodForecast || typeof state.moodForecast !== 'object') state.moodForecast = {};
  const f = state.moodForecast, today = clockDay();
  Object.keys(f).forEach(d => { if (+d < today) delete f[d]; });
  for (let d = today; d <= today + CAL_DAYS; d++){
    if (!f[d]){ const m = {}; Object.keys(TOPICS).forEach(k => { m[k] = Math.round(rand(-25, 35)); }); f[d] = m; }
  }
  return f;
}
function forecastMoods(day){ return moodForecastBook()[day] || null; }
/* Every night, forecasts further out shift a little: the further away, the less certain. */
function reviseForecasts(today){
  const f = moodForecastBook();
  Object.keys(f).forEach(d => {
    const ahead = +d - today;
    if (ahead <= 1) return;
    const amp = Math.min(8, 2 * (ahead - 1));
    Object.keys(f[d]).forEach(k => { f[d][k] = clamp(Math.round(f[d][k] + rand(-amp, amp)), -25, 35); });
  });
}
function moodsForDay(d){ return d === clockDay() ? ensureAudienceMood().moods : (forecastMoods(d) || {}); }
function forecastLabel(ahead){ return ahead <= 0 ? 'Live today' : ahead === 1 ? 'Reliable forecast' : ahead <= 3 ? 'Forecast' : 'Early forecast, may shift'; }

/* ---------------- rival premieres ---------------- */
function rivalPlans(){ if (!Array.isArray(state.rivalPlans)) state.rivalPlans = []; return state.rivalPlans; }
function planRivalUploads(){
  const now = state.totalTicks, today = clockDay();
  state.rivalPlans = rivalPlans().filter(p => !p.done || now - p.at < DAY_TICKS);
  const upcoming = state.rivalPlans.filter(p => !p.done);
  const rivals = ensureRivals();
  if (!rivals.length) return;
  const niche = playerNiche();
  let want = 6 - upcoming.length, guard = 0;
  while (want > 0 && guard++ < 30){
    const pool = rivals.filter(r => !upcoming.some(p => p.rival === r.name) && TOPICS[r.topic]);
    if (!pool.length) break;
    const weighted = pool.flatMap(r => (r.peer || r.topic === niche) ? [r, r, r] : [r]);  // creators in your space announce more
    const r = calPick(weighted);
    const at = tickAt(today + 1 + Math.floor(Math.random() * 4), calPick(CAL_PREMIERE_HOURS));
    const typed = TYPE_TITLES[r.topic] ? Object.values(TYPE_TITLES[r.topic]) : [];
    const bank = typed.length && Math.random() < 0.7 ? calPick(typed) : TITLE_BANK[r.topic];
    const plan = { id: 'rp' + Date.now().toString(36) + Math.floor(Math.random() * 1e5), rival: r.name, topic: r.topic, at, title: calPick(bank), big: Math.random() < (r.peer ? 0.12 : 0.3), done: false };
    state.rivalPlans.push(plan); upcoming.push(plan); want--;
  }
}

/* ---------------- collab bookings ---------------- */
function collabBookings(){ if (!Array.isArray(state.collabBookings)) state.collabBookings = []; return state.collabBookings; }
function bookingFor(name){ return collabBookings().find(b => b.name === name && (b.status === 'booked' || b.status === 'ready')) || null; }
function activeBookings(){ return collabBookings().filter(b => b.status === 'booked' || b.status === 'ready'); }
function bookAt(day){
  const at = tickAt(day, 19);
  if (at >= state.totalTicks + 120) return at;
  const late = tickAt(day, 21);
  return late >= state.totalTicks + 120 ? late : null;
}
function bookableCreators(at){
  return ensureRivals().filter(r => {
    if (!TOPICS[r.topic] || bookingFor(r.name)) return false;
    const c = collabInfo(r);
    return !c.tooSmall && (state.collabCooldowns[r.name] || 0) <= at;
  }).sort((a, b) => b.subs - a.subs);
}
function bookCollab(name, at){
  const r = ensureRivals().find(x => x.name === name);
  if (!r || !at) return;
  if (bookingFor(name)){ playErrorSound(); showToast(ic('calendar') + ` You already have a collab booked with ${name}.`); return; }
  if (activeBookings().length >= MAX_BOOKINGS){ playErrorSound(); showToast(ic('calendar') + ` You can have ${MAX_BOOKINGS} collabs booked at a time.`); return; }
  const c = collabInfo(r);
  if (c.tooSmall){ playErrorSound(); showToast(ic('users') + ` ${name} wants you at ${fmt(c.needSubs)} subscribers first.`); return; }
  if ((state.collabCooldowns[name] || 0) > at){ playErrorSound(); showToast(ic('users') + ` ${name} is busy until ${calWhen(state.collabCooldowns[name])}.`); return; }
  const cost = Math.round(c.listCost * BOOK_DISCOUNT);
  collabBookings().push({ id: 'bk' + Date.now().toString(36), name, topic: r.topic, at, until: at + BOOK_WINDOW, cost, status: 'booked' });
  if (collabBookings().length > 20) state.collabBookings = collabBookings().slice(-20);
  adjustRel(r, 3);
  playSuccessSound();
  showToast(ic('calendar') + ` Booked ${name} for ${calWhen(at)}. Price locked at $${fmt(cost)}.`, true);
  pushNotification(ic('calendar') + ` Collab booked with ${name} for ${formatTick(at)}. You'll have 6 hours to film.`);
  calDirty = true;
  safeRenderAll(); renderCalendar(true);
}

/* ---------------- hourly: premieres drop, bookings open and close, reminders ---------------- */
function tickCalendar(){
  const now = state.totalTicks, niche = playerNiche();
  if (state.rivalPlanDay !== clockDay()){ state.rivalPlanDay = clockDay(); planRivalUploads(); }

  rivalPlans().forEach(p => {
    if (p.done) return;
    if (p.at > now){
      if (!p.warned && p.at - now <= 60 && p.topic === niche && !offlineFastForward){
        p.warned = true;
        pushNotification(ic('tv') + ` ${p.rival} premieres a ${TOPICS[p.topic].label} video within the hour.${p.big ? ' It\'s a big one.' : ''}`);
      }
      return;
    }
    p.done = true;
    const r = ensureRivals().find(x => x.name === p.rival);
    if (!r) return;
    const vid = rivalVideoStats(r);
    if (p.big) vid.finalViews = Math.round(vid.finalViews * rand(2.5, 4));
    pushFeedItem({ name: r.name, text: `just uploaded a new video — "${p.title}"`, vid, tick: p.at });
    state.topicCrowd = state.topicCrowd || {};
    state.topicCrowd[p.topic] = (state.topicCrowd[p.topic] || 0) + (p.big ? 0.45 : 0.15);
    if (p.big || p.topic === niche){
      const line = `${r.name}'s ${p.big ? 'big ' : ''}premiere is out. ${TOPICS[p.topic].label} is crowded for a while.`;
      pushNotification(ic('tv') + ' ' + line);
      if (!offlineFastForward && p.topic === niche) showToast(ic('tv') + ' ' + line, true);
    }
  });

  collabBookings().forEach(b => {
    const r = ensureRivals().find(x => x.name === b.name);
    if (b.status === 'booked' && now >= b.at){
      b.status = 'ready';
      pushNotification(ic('users') + ` Collab day with ${b.name}: film before ${formatTick(b.until)} ($${fmt(b.cost)}).`);
      if (!offlineFastForward && typeof showMoment === 'function'){
        showMoment({ tag: 'Collab day', tone: 'good', face: b.name, title: `${b.name} is ready to film with you.`, lines: [`You booked this collab. Film within 6 hours: $${fmt(b.cost)} and ${COLLAB_ENERGY} energy.`],
          actions: [{ label: 'Film now', run: () => startCollab(b.name) }, { label: 'Open Feed', tab: 'feed' }] });
      }
    }
    if (b.status === 'ready' && now >= b.until){
      b.status = 'missed';
      if (typeof socialBookingMissed === 'function') socialBookingMissed(b.name);
      // missing it while you were away stings less than a no-show while you were here
      if (r) adjustRel(r, offlineFastForward ? -4 : -10, offlineFastForward ? `You were away when ${b.name} was ready to film.` : `You didn't show up for the collab you booked with ${b.name}.`);
      pushNotification(ic('alert') + ` You missed your booked collab with ${b.name}. They're not impressed.`);
      if (!offlineFastForward) showToast(ic('alert') + ` Missed the collab with ${b.name}.`, true);
    }
  });

  // reminders: sponsor deadlines and a bill you can't cover
  if (typeof sponsorBook === 'function') sponsorBook().deals.forEach(d => {
    if (d.status === 'active' && !d.videoId && !d.reminded && d.dueAt - now <= 6 * 60 && d.dueAt > now){
      d.reminded = true;
      pushNotification(ic('gift') + ` ${d.brand} deadline ${calIn(d.dueAt)}: upload a ${TOPICS[d.topic].label} video with them attached.`);
      if (!offlineFastForward) showToast(ic('gift') + ` ${d.brand} deadline ${calIn(d.dueAt)}.`, true);
    }
  });
  const bill = EQUIPMENT.internet.tiers[state.equipTier.internet].monthlyBill;
  if (state.nextBillTick - now <= DAY_TICKS && state.money < bill && state.billWarnFor !== state.nextBillTick){
    state.billWarnFor = state.nextBillTick;
    pushNotification(ic('dollar') + ` Your $${bill} internet bill is due ${calIn(state.nextBillTick)} and you have $${state.money.toFixed(2)}.`);
  }
  calDirty = true;
}

/* ---------------- everything on the calendar between two days ---------------- */
function calendarEvents(fromDay, toDay){
  const now = state.totalTicks, start = Math.max(now, dayStartTick(fromDay)), end = dayStartTick(toDay + 1);
  const ev = [];
  const add = o => { if (o.at >= start && o.at < end) ev.push(o); };
  const niche = playerNiche();
  const T = k => TOPICS[k] ? TOPICS[k].label : k;
  if (state.rivalPlanDay === undefined){ state.rivalPlanDay = clockDay(); planRivalUploads(); }

  // trends: one line per day, today included
  for (let d = Math.max(fromDay, clockDay()); d <= toDay; d++){
    const sorted = Object.entries(moodsForDay(d)).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) continue;
    const [top, val] = sorted[0], [low, lowVal] = sorted[sorted.length - 1];
    const ahead = d - clockDay();
    ev.push({ day: d, allDay: true, at: dayStartTick(d), cat: 'trend',
      title: `${T(top)} ${ahead ? 'looks hot' : 'is trending'} (${ahead >= 2 ? '~' : ''}${val >= 0 ? '+' : ''}${val}%)`,
      sub: `${ARCH_LABEL[trendingArch(d)]} are the hot video type${lowVal <= -12 ? ` · ${T(low)} is cold` : ''}${ahead ? ' · ' + forecastLabel(ahead).toLowerCase() : ''}` });
  }
  // your scheduled uploads
  state.videos.forEach(v => {
    if (!v.publishAt || v.publishAt <= now || v.publishPhase === 'live' || !v.publishPhase) return;
    add({ at: v.publishAt, cat: 'upload', title: 'Your video goes live', sub: `"${v.title}"${v.publishPhase !== 'scheduled' ? ' · still uploading' : ''}${v.teased ? ' · teased on Social' : ''}`, action: v.teased ? { label: 'View', tab: 'content' } : { label: 'Tease it', tease: v.id } });
  });
  // sponsors
  if (typeof sponsorBook === 'function' && state.unlocks.sponsorships) sponsorBook().deals.forEach(d => {
    if (d.status === 'offer') add({ at: d.expiresAt, cat: 'sponsor', title: `${d.brand} offer expires`, sub: `$${fmt(d.payment)} for a ${T(d.topic)} video with ${fmt(d.minViews)}+ views`, action: { label: 'View offer', tab: 'monetization', sub: 'sponsor' } });
    if (d.status === 'active' && !d.videoId) add({ at: d.dueAt, cat: 'sponsor', warn: d.dueAt - now < 12 * 60, title: `${d.brand} deadline`, sub: `Upload a ${T(d.topic)} video with ${d.brand} picked under Sponsor`, action: { label: 'Create', tab: 'studio' } });
    if (d.status === 'active' && d.videoId){
      const v = state.videos.find(x => x.id === d.videoId);
      if (!v) return;
      const liveAt = (!v.publishPhase || v.publishPhase === 'live') ? now - v.age : (v.publishAt || now);
      add({ at: Math.min(liveAt + 2 * DAY_TICKS, d.dueAt + 2 * DAY_TICKS), cat: 'sponsor', warn: v.views < d.minViews * 0.6, title: `${d.brand} judges your video`, sub: `${fmt(v.views)} of ${fmt(d.minViews)} views so far` });
    }
  });
  // rival premieres
  rivalPlans().forEach(p => {
    if (p.done || !TOPICS[p.topic]) return;
    add({ at: p.at, cat: 'rival', face: p.rival, warn: p.big && p.topic === niche,
      title: `${p.rival} premieres a ${T(p.topic)} video`,
      sub: `"${p.title}"${p.big ? ` · big premiere: ${T(p.topic)} gets crowded after it` : ''}` });
  });
  // collabs: bookings, invites, creators coming off cooldown
  collabBookings().forEach(b => {
    if (b.status === 'booked') add({ at: b.at, cat: 'collab', face: b.name, title: `Collab with ${b.name}`, sub: `Booked · $${fmt(b.cost)} and ${COLLAB_ENERGY} energy · 6-hour window to film` });
    if (b.status === 'ready') add({ at: Math.max(start, now), cat: 'collab', face: b.name, warn: true, title: `Film with ${b.name} now`, sub: `Your booking closes ${calIn(b.until)}`, action: { label: 'Film', collab: b.name } });
  });
  ensureRivals().forEach(r => {
    if ((r.inviteUntil || 0) > now && !r.inviteUsed && !bookingFor(r.name)) add({ at: r.inviteUntil, cat: 'collab', face: r.name, title: `${r.name}'s collab invite expires`, sub: 'Free if you accept before then', action: { label: 'Accept', collab: r.name } });
    const ready = state.collabCooldowns[r.name] || 0;
    if (ready > now) add({ at: ready, cat: 'collab', face: r.name, minor: true, title: `${r.name} can collab again`, sub: `${T(r.topic)} · ${fmtCompact(r.subs)} subscribers` });
  });
  // the weekly internet bill and the data plan that renews with it
  const tier = EQUIPMENT.internet.tiers[state.equipTier.internet];
  for (let t = state.nextBillTick; t < end; t += BILL_CYCLE_TICKS){
    const short = state.money < tier.monthlyBill;
    add({ at: t, cat: 'bill', warn: short, title: `Internet bill: $${tier.monthlyBill}`, sub: short ? `You have $${state.money.toFixed(2)}. If you can't pay, your speed gets throttled.` : `${tier.name} · paid automatically` });
    const capped = Number.isFinite(tier.dataCapGB);
    add({ at: t, cat: 'bill', warn: capped && state.dataUsedGB >= tier.dataCapGB * 0.85,
      title: 'Data plan renews', sub: capped ? `${state.dataUsedGB.toFixed(1)} of ${tier.dataCapGB} GB used · resets when the bill is paid` : 'Unlimited data on your plan', action: capped ? { label: 'Shop', tab: 'shop' } : null });
  }
  // upload-plan checks (judged at midnight, shown at the end of the day they cover)
  if ((state.uploadLog || []).length){
    const C = cadence(), today = clockDay();
    for (let k = 1; k <= toDay - today + 1; k++){
      if (((state.cadDayCount || 0) + k) % C.windowDays !== 0) continue;
      const judge = dayStartTick(today + k), winStart = judge - C.windowDays * DAY_TICKS;
      const got = state.uploadLog.filter(t => t > winStart).length
        + state.videos.filter(v => v.publishAt && v.publishPhase !== 'live' && v.publishPhase && v.publishAt < judge && v.publishAt > winStart).length;
      const first = !ev.some(e => e.cat === 'plan');
      add({ at: judge - 1, cat: 'plan', warn: first && got < C.need,
        title: `${C.label} plan check`,
        sub: first ? `${Math.min(got, C.need)} of ${C.need} uploads counted${got >= C.need ? ': on track' : ''}${state.cadStreak ? ` · ${streakDays()}-day streak at stake` : ''}` : `Needs ${C.need} upload${C.need === 1 ? '' : 's'} in the ${C.windowDays === 2 ? '2 days' : 'day'} before`,
        action: { label: 'Create', tab: 'studio' } });
    }
  }
  if (typeof situationEvents === 'function') situationEvents(add);
  if (state.social && state.social.pendingTease) add({ at: state.social.pendingTease.until, cat: 'upload', warn: state.social.pendingTease.until - now < 6 * 60, title: 'Your teaser runs out', sub: 'Upload before then or some Pulse followers unfollow', action: { label: 'Create', tab: 'studio' } });
  return ev.sort((a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || a.at - b.at);
}

/* ---------------- scheduled videos land on their real day ----------------
   A video's topic mood, trending type and crowding were judged when you made it. When a
   scheduled one goes live on a different day, re-judge them against that day, so planning
   around the forecast actually pays off. */
function crowdPenalty(c){ return c > 0.05 ? Math.min(10, c * 10) : 0; }
function rebaseScheduledVideo(v){
  if (!v.wasScheduled || v.rebased || typeof v.madeAt !== 'number') return;
  v.rebased = true;
  if (clockDay(v.madeAt) === clockDay() && Math.abs(state.totalTicks - v.madeAt) < 6 * 60) return;   // same day, a few hours later: nothing changed
  const old = v.algorithmScore;
  const moodNow = ensureAudienceMood().moods[v.topic] || 0;
  let algo = (moodNow - (v.moodAtMake || 0)) * 0.3;
  algo += crowdPenalty(v.crowdAtMake || 0) - crowdPenalty((state.topicCrowd || {})[v.topic] || 0);
  const trendNow = !!v.ctArch && trendingArch() === v.ctArch;
  if (trendNow !== !!v.ctTrending){ algo += trendNow ? 5 : -5; v.ctr = clamp(v.ctr + (trendNow ? 2 : -2), 1, 97); v.ctTrending = trendNow; }
  v.algorithmScore = clamp(v.algorithmScore + algo, 0, 100);
  rescaleCapForScore(v, old);
}

/* ---------------- the Calendar tab ---------------- */
function calEventHTML(e){
  const C = CAL_CATS[e.cat];
  const act = e.action ? `<button class="mini-btn ce-act" data-cal-act="${calEsc(JSON.stringify(e.action))}">${e.action.label}</button>` : '';
  return `<div class="cal-ev c-${e.cat}${e.warn ? ' warn' : ''}${e.minor ? ' minor' : ''}">
    <div class="ce-time">${e.allDay ? 'All day' : calTime(e.at)}${e.allDay ? '' : `<small>${calIn(e.at)}</small>`}</div>
    <div class="ce-ic">${e.face ? `<span class="face-avatar">${thumbFace(e.face)}</span>` : ic(C.icon)}</div>
    <div class="ce-main"><div class="ce-title">${e.title}</div><div class="ce-sub">${e.sub || ''}</div></div>
    ${act}
  </div>`;
}
function calendarDays(){ const t = clockDay(); return Array.from({ length: CAL_DAYS }, (_, i) => t + i); }

function renderCalendar(force){
  const root = document.getElementById('cal-root');
  const tab = document.getElementById('tab-calendar');
  if (!root || !tab || !tab.classList.contains('active')) return;
  if (!force && ((!calDirty && Date.now() - calRenderedAt < 4000) || calPointerDown)) return;
  calDirty = false; calRenderedAt = Date.now();

  const days = calendarDays(), today = days[0];
  if (calSelDay === null || calSelDay < today || calSelDay > days[days.length - 1]) calSelDay = today;
  const sel = calSelDay, ahead = sel - today;
  const all = calendarEvents(today, days[days.length - 1]);
  const shown = all.filter(e => !calHidden[e.cat]);
  const niche = playerNiche();

  // week strip
  const week = days.map(d => {
    const moods = Object.entries(moodsForDay(d)).sort((a, b) => b[1] - a[1]);
    const top = moods[0];
    const evs = shown.filter(e => e.cat !== 'trend' && !e.minor && (e.allDay ? e.day === d : clockDay(e.at) === d));
    const cats = [...new Set(evs.map(e => e.cat))];
    const warn = evs.some(e => e.warn);
    return `<button class="cal-day${d === sel ? ' on' : ''}${d === today ? ' today' : ''}" data-cal-day="${d}">
      <span class="cd-name">${calDayName(d)}</span>
      <span class="cd-num">Day ${d + 1}</span>
      ${top ? `<span class="cd-trend ${top[1] >= 15 ? 'hot' : ''}">${ic(TOPIC_ICONS[top[0]] || 'fire')}${TOPICS[top[0]].label}</span>` : ''}
      <span class="cd-dots">${cats.map(c => `<i class="c-${c}"></i>`).join('')}${evs.length ? `<b>${evs.length}</b>` : '<em>Free</em>'}${warn ? '<span class="cd-warn">!</span>' : ''}</span>
    </button>`;
  }).join('');

  // agenda for the selected day
  const dayEv = shown.filter(e => e.allDay ? e.day === sel : clockDay(e.at) === sel);
  const rows = [];
  if (sel === today) rows.push(`<div class="cal-now"><span>Now</span>${calTime(state.totalTicks)}</div>`);
  let primeShown = false;
  const P = typeof primeHour === 'function' ? primeHour() : 19;
  const primeAt = tickAt(sel, P);
  const primeRow = `<div class="cal-prime"><span>${calTime(primeAt)}</span>Your viewers' prime time until ${hourLabel(P + 3)}: the best first day for new uploads and streams</div>`;
  dayEv.forEach(e => {
    if (!primeShown && !e.allDay && e.at >= primeAt && primeAt > state.totalTicks){ rows.push(primeRow); primeShown = true; }
    rows.push(calEventHTML(e));
  });
  if (!primeShown && primeAt > state.totalTicks) rows.push(primeRow);
  const busy = dayEv.filter(e => !e.allDay).length;

  // forecast panel
  const moods = Object.entries(moodsForDay(sel)).sort((a, b) => b[1] - a[1]);
  const bars = moods.map(([k, v]) => {
    const w = Math.min(50, Math.abs(v) / 35 * 50);
    return `<div class="cf-row${k === niche ? ' mine' : ''}">
      <span class="cf-name">${TOPICS[k].label}${k === niche ? ' <i>Your niche</i>' : ''}</span>
      <span class="cf-bar"><span class="cf-zero"></span><span class="cf-fill ${v >= 0 ? 'up' : 'down'}" style="${v >= 0 ? `left:50%;width:${w}%` : `right:50%;width:${w}%`}"></span></span>
      <b class="${v >= 0 ? 'up' : 'down'}">${ahead >= 2 ? '~' : ''}${v >= 0 ? '+' : ''}${v}%</b>
    </div>`;
  }).join('');

  // plan this day: schedule an upload, book a collab
  const qFull = scheduledVideos().length >= MAX_SCHEDULED;
  const crowdWarn = rivalPlans().filter(p => !p.done && p.big && clockDay(p.at) === sel);
  const slotList = [{ hour: P, label: hourLabel(P).replace(' ', ':00 '), prime: true }].concat(CAL_SLOTS.filter(s => !s.prime && Math.abs(s.hour - P) >= 2)).slice(0, 3).sort((a, b) => a.hour - b.hour);
  if (slotList.length < 3) slotList.push({ hour: (P + 12) % 24, label: hourLabel(P + 12).replace(' ', ':00 ') });
  const slots = slotList.sort((a, b) => a.hour - b.hour).map(s => {
    const at = tickAt(sel, s.hour);
    const ok = at > state.totalTicks + 60 && !qFull;
    return `<button class="cal-slot${s.prime ? ' prime' : ''}" data-cal-slot="${at}" ${ok ? '' : 'disabled'}>${s.label}${s.prime ? '<i>Prime</i>' : ''}</button>`;
  }).join('');
  const bAt = bookAt(sel);
  const canBook = activeBookings().length < MAX_BOOKINGS;
  const creators = bAt ? bookableCreators(bAt).slice(0, 4) : [];
  const bookList = !bAt ? `<div class="cal-hint">Too late to book anyone for today.</div>`
    : !canBook ? `<div class="cal-hint">You have ${MAX_BOOKINGS} collabs booked, the most you can plan at once.</div>`
    : !creators.length ? `<div class="cal-hint">No one's free to book yet. Creators will film with you once you have at least 1/50th of their subscribers.</div>`
    : creators.map(r => {
        const c = collabInfo(r);
        return `<div class="cal-book">
          <span class="face-avatar">${thumbFace(r.name)}</span>
          <div><div class="cb-name">${r.name}</div><div class="cb-sub">${TOPICS[r.topic].label} · ${fmtCompact(r.subs)} subs · ${relTier(r).label}</div></div>
          <button class="mini-btn" data-cal-book="${calEsc(r.name)}" data-at="${bAt}">Book $${fmt(Math.round(c.listCost * BOOK_DISCOUNT))}</button>
        </div>`;
      }).join('');

  root.innerHTML = `
    <div class="content-head-row">
      <div>
        <h2 class="shop-title">Calendar</h2>
        <div class="shop-sub">Plan your week around trends, deadlines and the creators around you.</div>
      </div>
    </div>
    <div class="cal-filters" id="cal-filters">${Object.entries(CAL_CATS).map(([k, c]) => `<button class="cal-filter c-${k}${calHidden[k] ? '' : ' on'}" data-cal-cat="${k}"><i></i>${c.label}</button>`).join('')}</div>
    <div class="cal-week" id="cal-week">${week}</div>
    <div class="cal-grid">
      <div class="panel-box cal-agenda">
        <h3>${calDayName(sel)}${sel !== today && sel !== today + 1 ? '' : ` · Day ${sel + 1}`}<span class="cal-count">${busy ? busy + ' planned' : 'Nothing planned'}</span></h3>
        <div class="cal-list">${rows.join('') || ''}${busy ? '' : `<div class="cal-hint">A free day is a good day to schedule an upload for prime time.</div>`}</div>
      </div>
      <div class="cal-side">
        <div class="panel-box cal-forecast">
          <h3>Audience forecast<span class="cal-conf a${Math.min(ahead, 4)}">${forecastLabel(ahead)}</span></h3>
          ${bars}
          <div class="cal-hot">${ic('sparkle')}<span><b>${ARCH_LABEL[trendingArch(sel)]}</b> are the hot video type ${ahead ? 'that day' : 'today'}.</span></div>
        </div>
        <div class="panel-box cal-plan">
          <h3>Plan ${ahead === 0 ? 'today' : ahead === 1 ? 'tomorrow' : calDayName(sel)}</h3>
          <div class="cal-sec">Schedule an upload</div>
          <div class="cal-slots">${slots}</div>
          ${qFull ? `<div class="cal-hint">You already have ${MAX_SCHEDULED} videos scheduled.</div>` : ''}
          ${crowdWarn.map(p => `<div class="cal-warn">${ic('alert')}<span>${p.rival}'s big ${TOPICS[p.topic].label} premiere lands at ${calTime(p.at)}. Uploading ${TOPICS[p.topic].label} right after it will be crowded.</span></div>`).join('')}
          <div class="cal-sec">Book a collab${bAt ? ` <em>${calTime(bAt)} · 15% off · film within 6h</em>` : ''}</div>
          ${bookList}
        </div>
      </div>
    </div>`;
}

/* ---------------- Home: coming up ---------------- */
function renderComingUp(){
  const el = document.getElementById('coming-up-list');
  if (!el) return;
  const today = clockDay();
  const evs = calendarEvents(today, today + 1).filter(e => !e.allDay && !e.minor).slice(0, 4);
  el.innerHTML = evs.length ? evs.map(e => `
    <div class="cu-row c-${e.cat}${e.warn ? ' warn' : ''}">
      <span class="cu-dot"></span>
      <div class="cu-main"><div class="cu-title">${e.title}</div><div class="cu-when">${calDayName(clockDay(e.at))}, ${calTime(e.at)} · ${calIn(e.at)}</div></div>
    </div>`).join('') : `<div class="cu-empty">Nothing scheduled in the next two days.</div>`;
}

/* ---------------- Studio hand-off ---------------- */
function calendarAfterUpload(){
  const last = state.videos[state.videos.length - 1];
  if (last && calendarPublishAt && last.publishAt === calendarPublishAt){
    calendarPublishAt = null;
    const sel = document.getElementById('publish-select');
    if (sel) sel.value = 'now';
    renderPublishSelect();
  }
}
function scheduleFromCalendar(at){
  if (at <= state.totalTicks + 60){ playErrorSound(); return; }
  calendarPublishAt = at;
  playClickSound();
  switchTab('studio');
  renderPublishSelect();
  const sel = document.getElementById('publish-select');
  if (sel){
    sel.value = 'cal';
    renderPublishSelect();
    const field = sel.closest('.form-field') || sel.parentElement;
    if (field){ field.scrollIntoView({ block: 'center', behavior: 'smooth' }); field.classList.add('cal-flash'); setTimeout(() => field.classList.remove('cal-flash'), 2200); }
  }
  showToast(ic('calendar') + ` Publish set to ${calWhen(at)}. Make the video and it goes live then.`);
}

function initCalendarUI(){
  const root = document.getElementById('cal-root');
  if (root){
    root.addEventListener('pointerdown', () => { calPointerDown = true; });
    window.addEventListener('pointerup', () => { if (calPointerDown){ calPointerDown = false; } });
    root.addEventListener('click', (e) => {
      const day = e.target.closest('[data-cal-day]');
      const cat = e.target.closest('[data-cal-cat]');
      const slot = e.target.closest('[data-cal-slot]');
      const book = e.target.closest('[data-cal-book]');
      const act = e.target.closest('[data-cal-act]');
      if (day){ calSelDay = +day.dataset.calDay; playClickSound(); renderCalendar(true); return; }
      if (cat){ calHidden[cat.dataset.calCat] = !calHidden[cat.dataset.calCat]; playClickSound(); renderCalendar(true); return; }
      if (slot && !slot.disabled){ scheduleFromCalendar(+slot.dataset.calSlot); return; }
      if (book){ bookCollab(book.dataset.calBook, +book.dataset.at); return; }
      if (act){
        let a = null; try { a = JSON.parse(act.dataset.calAct); } catch(err){}
        if (!a) return;
        playClickSound();
        if (a.collab){ startCollab(a.collab); renderCalendar(true); return; }
        if (a.sit){ showSituationCard(a.sit); return; }
        if (a.tease){ socialDraft = { type: 'tease', target: a.tease, caption: 0 }; switchTab('social'); return; }
        if (a.tab){ switchTab(a.tab); if (a.sub){ const s = document.querySelector(`[data-msub="${a.sub}"]`); if (s) s.click(); } }
      }
    });
  }
  const clock = document.getElementById('clock-chip');
  if (clock) clock.addEventListener('click', () => { playClickSound(); switchTab('calendar'); });
  const more = document.getElementById('coming-up-open');
  if (more) more.addEventListener('click', () => { playClickSound(); switchTab('calendar'); });
  if (state.rivalPlanDay === undefined){ state.rivalPlanDay = clockDay(); planRivalUploads(); }
  moodForecastBook();
}

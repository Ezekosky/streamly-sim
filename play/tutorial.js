/* =========================================================================
   STREAMLY SIM — GUIDED TUTORIAL
   A spotlight tour: dims the screen, cuts a hole around one element, and
   explains it in a small card. Runs once for new channels; replayable any
   time from Settings. Each step can switch tab first.
   ========================================================================= */
(function(){
  const STEPS = [
    { tab: 'home', target: null,
      title: 'Welcome to Streamly',
      body: "You're starting a channel from zero. This tour takes about a minute and shows you where everything is. You can skip it and replay it later from Settings." },
    { tab: 'home', target: '.stats-4',
      title: 'Your channel at a glance',
      body: 'Views, subscribers, money and watch time. New channels grow slowly, so expect small numbers at first. That is normal.' },
    { tab: 'home', target: '.topbar-right',
      title: 'The top bar',
      body: "In-game day and time, your cash, subscribers and energy. One real minute is one in-game hour. The bell holds your notifications." },
    { tab: 'studio', target: '#topic-tiles',
      title: 'Step 1: pick a topic',
      body: "Each topic has its own audience. Check which topics are trending today on Home before you choose; trending topics get a boost." },
    { tab: 'studio', target: '#ctype-chips',
      title: 'What kind of video?',
      body: 'Challenge, guide, review, news, reaction... each type behaves differently. News spikes and fades, guides start slow but keep getting found, challenges go viral more but cost more energy. Mix them up: repeating one type tires your audience.' },
    { tab: 'studio', target: '#format-tiles',
      title: 'Shorts or long-form',
      body: 'Shorts get pushed harder and are quick to make, but pay less. Long-form builds watch hours and earns more once you are monetized.' },
    { tab: 'studio', target: '.upload-form-grid',
      title: 'The details matter',
      body: 'Length, editing effort, thumbnail style and title style all change how many people click and how long they stay. Loud clickbait gets clicks but can annoy viewers.' },
    { tab: 'studio', target: '#studio-energy',
      title: 'Watch your energy',
      body: 'Every upload costs energy, and it refills over time. Uploading while exhausted makes rushed videos that do worse. Coffee helps a little.' },
    { tab: 'studio', target: '#upload-btn',
      title: 'Publish',
      body: "When you're happy, tap Start Creating. The video goes through editing, uploading and processing, then Streamly tests it with a small audience before deciding how far to push it." },
    { tab: 'content', target: '#content-subtabs',
      title: 'Your videos',
      body: 'Every upload lands here. Tap a video to see its comments and open its analytics. Playlists live here too; videos in a playlist pick up extra views.' },
    { tab: 'content', target: '[data-sub="live"]', needsLive: true,
      title: 'Go live',
      body: 'At 50 subscribers you can stream. Viewers drop in and out, chat reacts, and once you reach Partner Programme tier 1 they can send Super Chats. Streams cost a lot of energy.' },
    { tab: 'analytics', target: '#cadence-panel',
      title: 'Your upload plan',
      body: 'Pick Casual, Consistent or Aggressive. Keep to it and you build a streak: Streamly learns your rhythm and pushes your videos harder. Miss it and the streak resets. Pick the plan that matches how often you really upload. In the Studio you can also schedule videos to go live later, even while you are away.' },
    { tab: 'calendar', target: '#cal-week',
      title: 'Plan your week',
      body: "The Calendar shows the next 7 days: your scheduled uploads, sponsor deadlines, bills, rival premieres, booked collabs, and a forecast of which topics will be hot. Pick a day to schedule an upload or book a collab for it. Tap the clock in the top bar to open it any time." },
    { tab: 'analytics', target: '#spp-status',
      title: 'Getting paid',
      body: 'You earn nothing from views until you join the Partner Programme. Tier 1 (500 subs) unlocks memberships. Tier 2 (1,000 subs) unlocks ad money. Track your progress here.' },
    { tab: 'analytics', target: '#identity-card',
      title: 'Your channel identity',
      body: 'After 15 uploads your audience starts to see you as something: a Gaming channel known for guides, a Variety Creator, a Shorts channel. Every identity has perks and a cost, and it keeps shifting with what you make.' },
    { tab: 'analytics', target: '#aud-main',
      title: "Who's watching",
      body: "Your audience: their ages, how many are core fans, which countries they're in and when they're online. Older viewers and viewers from places like the US and UK earn more per view. Your viewers' prime time is the best time to publish or go live, and it moves as your audience changes." },
    { tab: 'analytics', target: '#an-range-btn',
      title: 'Change the time range',
      body: 'Switch between the last 48 hours, 7, 28 or 90 days, or lifetime.' },
    { tab: 'shop', target: '#equip-list',
      title: 'Better gear, better videos',
      body: 'Camera, mic and editing upgrades raise quality. Faster internet uploads quicker, and more storage means more videos. Watch your data cap on mobile internet.' },
    { tab: 'social', target: '.pp-composer',
      title: 'Post on Social',
      body: 'Your creator account on Pulse. Share videos, tease uploads, jump on trending topics and promote collabs. Teasers bring people back on release day, and posting when your audience is online reaches the most people. Don\'t spam: more than 3 posts a day reach fewer people.' },
    { tab: 'feed', target: '#collab-list',
      title: 'Rivals and collabs',
      body: "Rivals compete with you: they answer your videos, chase trends and overtake you. Every rival also has a relationship with you. Shout them out and collab to become friends (cheaper collabs, more shout-outs), or call them out for a burst of drama views and a rivalry." },
    { tab: 'settings', target: '#settings-level',
      title: 'Levels and XP',
      body: 'Almost everything you do earns XP: uploads, views, subscribers, viral hits. Every level pays a cash bonus. This table shows exactly what earns what.' },
    { tab: 'studio', target: '#upload-btn',
      title: "You're ready",
      body: 'Make your first video. Consistency beats perfection: keep uploading, learn from your analytics, and do not burn out. Good luck!', last: true },
  ];

  let idx = 0, active = false, onDone = null;
  let S = STEPS; // the steps for this run (steps for switched-off features are dropped)
  let overlay, hole, card;

  function build(){
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'tut-overlay';
    overlay.innerHTML = `
      <div class="tut-hole"></div>
      <div class="tut-card" role="dialog" aria-live="polite">
        <div class="tut-step"></div>
        <div class="tut-title"></div>
        <div class="tut-body"></div>
        <div class="tut-actions">
          <button class="tut-skip" type="button">Skip tour</button>
          <div class="tut-nav">
            <button class="tut-back" type="button">Back</button>
            <button class="tut-next" type="button">Next</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    hole = overlay.querySelector('.tut-hole');
    card = overlay.querySelector('.tut-card');
    overlay.querySelector('.tut-next').addEventListener('click', () => go(idx + 1));
    overlay.querySelector('.tut-back').addEventListener('click', () => go(idx - 1));
    overlay.querySelector('.tut-skip').addEventListener('click', () => end(true));
    window.addEventListener('resize', () => active && place());
    document.addEventListener('keydown', (e) => {
      if (!active) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'Escape') end(true);
    });
  }

  function go(i){
    if (i >= S.length){ end(false); return; }
    if (i < 0) return;
    idx = i;
    const s = S[idx];
    try { if (typeof playClickSound === 'function') playClickSound(); } catch(e){}
    if (s.tab && typeof switchTab === 'function') switchTab(s.tab);
    const el = s.target ? document.querySelector(s.target) : null;
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    overlay.querySelector('.tut-step').textContent = `${idx + 1} of ${S.length}`;
    overlay.querySelector('.tut-title').textContent = s.title;
    overlay.querySelector('.tut-body').textContent = s.body;
    overlay.querySelector('.tut-back').style.visibility = idx === 0 ? 'hidden' : 'visible';
    overlay.querySelector('.tut-next').textContent = s.last ? 'Start playing' : idx === 0 ? "Let's go" : 'Next';
    // let the tab render and scroll settle before measuring
    setTimeout(place, 120);
  }

  function place(){
    const s = S[idx];
    const el = s.target ? document.querySelector(s.target) : null;
    const vw = window.innerWidth, vh = window.innerHeight;
    const pad = 8;
    if (!el || el.offsetParent === null){
      hole.style.cssText = `left:${vw / 2}px; top:${vh / 2}px; width:0; height:0;`;
      card.style.left = Math.max(12, (vw - card.offsetWidth) / 2) + 'px';
      card.style.top = Math.max(12, (vh - card.offsetHeight) / 2) + 'px';
      return;
    }
    const r = el.getBoundingClientRect();
    const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad);
    const w = Math.min(vw - left - 4, r.width + pad * 2), h = Math.min(vh - top - 4, r.height + pad * 2);
    hole.style.cssText = `left:${left}px; top:${top}px; width:${w}px; height:${h}px;`;

    // Card goes below the spotlight if there's room, else above, else beside, else centered.
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 12;
    let cx = Math.min(Math.max(12, left), vw - cw - 12), cy;
    if (top + h + gap + ch <= vh - 8) cy = top + h + gap;
    else if (top - gap - ch >= 8) cy = top - gap - ch;
    else if (left + w + gap + cw <= vw - 8){ cx = left + w + gap; cy = Math.min(Math.max(8, top), vh - ch - 8); }
    else if (left - gap - cw >= 8){ cx = left - gap - cw; cy = Math.min(Math.max(8, top), vh - ch - 8); }
    else { cx = (vw - cw) / 2; cy = vh - ch - 12; }
    card.style.left = cx + 'px';
    card.style.top = cy + 'px';
  }

  function start(done){
    S = STEPS.filter(st => !st.needsLive || (typeof LIVE_ENABLED !== 'undefined' && LIVE_ENABLED));
    build();
    onDone = done || null;
    active = true;
    overlay.classList.add('show');
    go(0);
  }

  function end(skipped){
    active = false;
    if (overlay) overlay.classList.remove('show');
    if (typeof state !== 'undefined'){
      state.tutorialDone = true;
      try { saveState(); } catch(e){}
    }
    if (typeof switchTab === 'function') switchTab(skipped ? 'home' : 'studio');
    if (onDone) onDone(skipped);
  }

  window.Tutorial = { start, isActive: () => active };
})();

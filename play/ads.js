/* =========================================================================
   STREAMLY SIM — REWARDED ADS
   One call site for every "watch an ad for X" button:

     Ads.showRewarded('upload_skip', { onReward(){...}, onNoReward(){...} })

   The reward is ONLY granted inside onReward, which only fires when the
   ad network reports the ad was watched to the end. Closing early, an ad
   blocker, no fill or an SDK error all go to onNoReward.

   Which network runs is decided at startup:
     1. Inside the Android app            -> Google AdMob rewarded ads
                                             (IDs in app/streamly.config.json)
     2. CrazyGames SDK v3 is on the page  -> CrazyGames rewarded ads
     3. Poki SDK is on the page           -> Poki rewardedBreak
     4. None of these (a plain browser)   -> in-game "house ad" (a 15s
        sponsor spot for fictional brands). House ads keep the game fully
        playable while you develop, but they EARN NOTHING.

   onNoReward gets a reason: 'closed' (skipped early) or 'unavailable'
   (no ad to show right now: offline, no fill, or an SDK error).
   ========================================================================= */
(function(){
  const HOUSE_AD_SECONDS = 15;

  const HOUSE_SPOTS = [
    { brand: 'Voltwave', line: 'The energy drink for 3 AM edits.', color: '#ff5a3c', ink: '#fff' },
    { brand: 'PixelPad Pro', line: 'Edit anywhere. Render nowhere near as long.', color: '#2f6bff', ink: '#fff' },
    { brand: 'Crumbs & Co.', line: 'Snacks that survive a 6-hour stream.', color: '#ffc93c', ink: '#1a1a1a' },
    { brand: 'Loopline Fibre', line: 'Upload a 4K vlog before your tea cools.', color: '#35c48a', ink: '#0f2527' },
  ];

  const Ads = {
    provider: 'house',
    busy: false,
    hooks: { onStart: null, onEnd: null },

    init(hooks){
      this.hooks = Object.assign(this.hooks, hooks || {});
      try {
        if (window.Native && Native.isApp && Native.plugin('AdMob')){
          this.provider = 'admob';
          this.admobSetup();
        } else if (window.STREAMLY_ADSENSE && typeof window.adBreak === 'function'){
          // Google AdSense H5 Games Ads (Ad Placement API). Only works on a domain you own
          // that Google has approved — see README "Real ads".
          this.provider = 'adsense';
          window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
        } else if (window.CrazyGames && window.CrazyGames.SDK){
          this.provider = 'crazygames';
          Promise.resolve(window.CrazyGames.SDK.init()).catch(() => { this.provider = 'house'; });
        } else if (window.PokiSDK){
          this.provider = 'poki';
          window.PokiSDK.init().catch(() => { /* Poki still works for ads after a failed init in most cases */ });
        }
      } catch(e){ this.provider = 'house'; }
      return this.provider;
    },

    /* Portals like to know when active play starts/stops (they pace ads around it). */
    gameplayStart(){
      try {
        if (this.provider === 'crazygames') window.CrazyGames.SDK.game.gameplayStart();
        if (this.provider === 'poki') window.PokiSDK.gameplayStart();
      } catch(e){}
    },
    gameplayStop(){
      try {
        if (this.provider === 'crazygames') window.CrazyGames.SDK.game.gameplayStop();
        if (this.provider === 'poki') window.PokiSDK.gameplayStop();
      } catch(e){}
    },

    showRewarded(placement, cb){
      cb = cb || {};
      if (this.busy) return;
      this.busy = true;
      const finish = (rewarded, reason) => {
        this.busy = false;
        if (this.hooks.onEnd) this.hooks.onEnd(placement, rewarded);
        try { rewarded ? (cb.onReward && cb.onReward()) : (cb.onNoReward && cb.onNoReward(reason || 'closed')); } catch(e){ console.error(e); }
      };
      if (this.hooks.onStart) this.hooks.onStart(placement);

      if (this.provider === 'admob'){ this.admobShow(finish); return; }

      if (this.provider === 'crazygames'){
        try {
          window.CrazyGames.SDK.ad.requestAd('rewarded', {
            adStarted: () => {},
            adFinished: () => finish(true),
            adError: () => finish(false),
          });
        } catch(e){ finish(false); }
        return;
      }
      if (this.provider === 'adsense'){
        let shown = false, rewarded = false;
        try {
          window.adBreak({
            type: 'reward',
            name: placement,
            beforeReward: (showAdFn) => { shown = true; showAdFn(); },
            adViewed: () => { rewarded = true; },
            adDismissed: () => { rewarded = false; },
            adBreakDone: () => {
              // No fill (Google had no ad to show): fall back to the in-game sponsor spot so the button still works.
              if (!shown){ this.busy = false; this.houseAd((ok) => { this.busy = false; if (this.hooks.onEnd) this.hooks.onEnd(placement, ok); try { ok ? (cb.onReward && cb.onReward()) : (cb.onNoReward && cb.onNoReward()); } catch(e){} }); return; }
              finish(rewarded);
            },
          });
        } catch(e){ finish(false); }
        return;
      }
      if (this.provider === 'poki'){
        try {
          window.PokiSDK.rewardedBreak().then(ok => finish(!!ok)).catch(() => finish(false));
        } catch(e){ finish(false); }
        return;
      }
      this.houseAd(finish);
    },

    /* ---------- Google AdMob (Android app) ---------- */
    admob: { ready: false, loading: null, adId: '', testing: true },

    async admobSetup(){
      const AdMob = Native.plugin('AdMob');
      const cfg = Native.config || {};
      this.admob.testing = cfg.testAds !== false;
      // Google's sample rewarded unit: always fills, never pays. Used until real IDs are set.
      this.admob.adId = (!this.admob.testing && cfg.rewardedAdId) || 'ca-app-pub-3940256099942544/5224354917';
      try {
        await AdMob.initialize({ initializeForTesting: this.admob.testing });
        // Google's consent message (shown only where the law needs it, e.g. the EU/UK)
        try {
          let info = await AdMob.requestConsentInfo();
          if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await AdMob.showConsentForm();
          this.privacyOptionsRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
          if (this.privacyOptionsRequired && this.hooks.onPrivacyOptions) this.hooks.onPrivacyOptions();
        } catch(e){ /* no consent form available: ads still load in regions that don't need one */ }
        this.admobLoad();
      } catch(e){ console.warn('AdMob init failed', e); }
    },
    showPrivacyOptions(){
      const AdMob = window.Native && Native.plugin('AdMob');
      if (AdMob) AdMob.showPrivacyOptionsForm().catch(() => {});
    },
    admobLoad(){
      if (this.admob.ready) return Promise.resolve(true);
      if (this.admob.loading) return this.admob.loading;
      const AdMob = Native.plugin('AdMob');
      this.admob.loading = AdMob.prepareRewardVideoAd({ adId: this.admob.adId, isTesting: this.admob.testing })
        .then(() => { this.admob.ready = true; return true; })
        .catch(() => false)
        .finally(() => { this.admob.loading = null; });
      return this.admob.loading;
    },
    async admobShow(finish){
      const AdMob = Native.plugin('AdMob');
      let rewarded = false, settled = false;
      const handles = [];
      const done = (ok, reason) => {
        if (settled) return;
        settled = true;
        handles.forEach(h => { try { h.remove(); } catch(e){} });
        this.admob.ready = false;
        finish(ok, reason);
        setTimeout(() => this.admobLoad(), 1500); // have the next one ready
      };
      if (!this.admob.ready){
        if (window.showToast) showToast('Loading ad…');
        const ok = await this.admobLoad();
        if (!ok){ done(false, 'unavailable'); return; }
      }
      try {
        handles.push(await AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; }));
        handles.push(await AdMob.addListener('onRewardedVideoAdDismissed', () => done(rewarded, rewarded ? '' : 'closed')));
        handles.push(await AdMob.addListener('onRewardedVideoAdFailedToShow', () => done(false, 'unavailable')));
        // resolves only when the reward is earned; a skipped ad just fires Dismissed
        AdMob.showRewardVideoAd().then(() => { rewarded = true; }).catch(() => done(false, 'unavailable'));
      } catch(e){ done(false, 'unavailable'); }
    },

    /* In-game sponsor spot. Countdown must reach zero before the reward unlocks. */
    houseAd(done){
      const modal = document.getElementById('ad-modal');
      if (!modal){ done(false); return; }
      const spot = HOUSE_SPOTS[Math.floor(Math.random() * HOUSE_SPOTS.length)];
      const stage = modal.querySelector('.ad-stage');
      const timerEl = modal.querySelector('#ad-countdown');
      const barEl = modal.querySelector('#ad-bar');
      const claimBtn = modal.querySelector('#ad-claim');
      const closeBtn = modal.querySelector('#ad-close');

      stage.style.setProperty('--spot', spot.color);
      stage.style.setProperty('--spot-ink', spot.ink);
      stage.querySelector('.ad-brand').textContent = spot.brand;
      stage.querySelector('.ad-line').textContent = spot.line;
      claimBtn.disabled = true;
      claimBtn.textContent = 'Reward unlocks when the ad ends';
      closeBtn.textContent = 'Skip (no reward)';
      barEl.style.width = '0%';
      modal.classList.add('show');

      let left = HOUSE_AD_SECONDS;
      timerEl.textContent = left + 's';
      const iv = setInterval(() => {
        left--;
        timerEl.textContent = Math.max(0, left) + 's';
        barEl.style.width = Math.min(100, ((HOUSE_AD_SECONDS - left) / HOUSE_AD_SECONDS) * 100) + '%';
        if (left <= 0){
          clearInterval(iv);
          claimBtn.disabled = false;
          claimBtn.textContent = 'Claim reward';
          closeBtn.textContent = 'Close';
        }
      }, 1000);

      const cleanup = (rewarded) => {
        clearInterval(iv);
        modal.classList.remove('show');
        claimBtn.onclick = null; closeBtn.onclick = null;
        done(rewarded);
      };
      claimBtn.onclick = () => { if (left <= 0) cleanup(true); };
      closeBtn.onclick = () => cleanup(left <= 0); // closing after the countdown still pays out
    },
  };

  window.Ads = Ads;
})();

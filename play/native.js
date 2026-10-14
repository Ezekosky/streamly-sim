/* =========================================================================
   STREAMLY SIM — ANDROID APP LAYER
   Only does anything inside the Android app (Capacitor). In a browser it
   sets Native.isApp = false and stays out of the way.

   - Back button: closes the top popup, then goes to Home, then asks before
     leaving the game.
   - Leaving and returning: saves on the way out. Back after a minute or
     more, it catches up the time you were away (same as reopening).
   - Full screen: system bars stay hidden.

   Ad IDs and test mode come from window.STREAMLY_APP, which the app build
   writes from app/streamly.config.json. Nothing to edit in this file.
   ========================================================================= */
(function(){
  const cap = window.Capacitor;
  const isApp = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  const registered = {};
  function plugin(name){
    if (!isApp || !window.capacitorExports) return null;
    if (!registered[name]) registered[name] = window.capacitorExports.registerPlugin(name);
    return registered[name];
  }

  const CATCH_UP_AFTER_MS = 60 * 1000; // a quick app switch just carries on
  let pausedAt = 0;

  function hideBars(){
    try { const sb = window.capacitorExports && window.capacitorExports.SystemBars; if (sb) sb.hide(); } catch(e){}
  }

  /* Back button: undo the most recent thing on screen, one press at a time. */
  function handleBack(){
    if (window.Tutorial && Tutorial.isActive()) return;          // the tour has its own Back button
    if (window.Ads && Ads.busy) return;                           // an ad is on screen
    if (typeof GameSelect !== 'undefined' && GameSelect.isOpen()){ GameSelect.close(); return; }
    const openMenu = document.querySelector('.range-menu.open');
    if (openMenu){ openMenu.classList.remove('open'); return; }
    const sit = document.getElementById('sit-card');
    if (sit && sit.classList.contains('show')){ if (typeof hideSituationCard === 'function') hideSituationCard(); else sit.classList.remove('show'); return; }
    const modals = Array.from(document.querySelectorAll('.modal-overlay.show'));
    if (modals.length){
      const top = modals[modals.length - 1];
      if (top.id === 'setup-modal' || top.id === 'ad-modal') return; // can't be skipped
      top.classList.remove('show');
      return;
    }
    const moment = document.getElementById('moment-card');
    if (moment && moment.classList.contains('show')){ moment.classList.remove('show'); return; }
    if (typeof currentTab !== 'undefined' && currentTab !== 'home' && typeof switchTab === 'function'){ switchTab('home'); return; }
    askToLeave();
  }

  /* "Leave the game?" — shown when Back is pressed on Home with nothing else open */
  function askToLeave(){
    let m = document.getElementById('exit-modal');
    if (!m){
      m = document.createElement('div');
      m.className = 'modal-overlay';
      m.id = 'exit-modal';
      m.innerHTML = `
        <div class="modal-box exit-box">
          <h3>Leave Streamly Sim?</h3>
          <div class="away-time">Your progress is saved. Your videos keep getting views for up to 8 hours while you're away.</div>
          <div class="modal-btn-row">
            <button class="modal-close cancel" id="exit-stay">Keep playing</button>
            <button class="modal-close" id="exit-leave">Leave</button>
          </div>
        </div>`;
      document.body.appendChild(m);
      m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('show'); });
      m.querySelector('#exit-stay').addEventListener('click', () => { try { playClickSound(); } catch(e){} m.classList.remove('show'); });
      m.querySelector('#exit-leave').addEventListener('click', () => {
        m.classList.remove('show');
        try { saveState(); } catch(e){}
        const App = plugin('App');
        if (App) App.exitApp();
      });
    }
    try { playClickSound(); } catch(e){}
    m.classList.add('show');
  }

  function onPause(){
    if (window.Ads && Ads.busy) return; // an ad opens its own screen; that isn't leaving the game
    pausedAt = Date.now();
    try { if (typeof saveState === 'function') saveState(); } catch(e){}
  }
  function onResume(){
    hideBars();
    if (!pausedAt || (window.Ads && Ads.busy)) return;
    const away = Date.now() - pausedAt;
    pausedAt = 0;
    if (away >= CATCH_UP_AFTER_MS && typeof catchUpAfterResume === 'function') catchUpAfterResume();
  }

  const Native = {
    isApp,
    config: window.STREAMLY_APP || {},
    plugin,
    init(){
      if (!isApp) return;
      document.documentElement.classList.add('is-app');
      hideBars();
      const App = plugin('App');
      if (App){
        App.addListener('backButton', handleBack);
        App.addListener('pause', onPause);
        App.addListener('resume', onResume);
      }
      // Wording that only made sense in a browser
      document.querySelectorAll('#tab-settings .set-note').forEach(n => {
        if (/browser/.test(n.textContent)) n.textContent = 'Progress saves automatically on this phone. Uninstalling the app or clearing its data deletes it.';
      });
      const exportBtn = document.getElementById('export-save');
      if (exportBtn) exportBtn.style.display = 'none';
    },
  };

  window.Native = Native;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Native.init());
  else Native.init();
})();

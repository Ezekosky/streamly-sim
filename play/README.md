# Streamly Sim v1.0

Vanilla HTML/CSS/JS, no build step. Open `index.html` in a browser, or serve the folder with any static host.

## Files

| File | What it does |
|---|---|
| `index.html` | Markup for every tab and modal |
| `style.css` | Original layout plus the "Night shift" theme layer at the bottom |
| `game.js` | Simulation, rendering, saves (localStorage key `streamlySimSave_v2`) |
| `thumbs.js` | Procedural SVG thumbnails and creator faces |
| `music.js` | Generative lo-fi background music (Web Audio) |
| `social.js` | Creator relationships, sponsor contracts, creator moments |
| `cadence.js` | Upload plan, streaks, audience decay, scheduling |
| `identity.js` | Channel identity (specialization) and rival competition |
| `ctypes.js` | Content types: archetype mechanics, per-topic types, type titles and comments, Studio picker |
| `live.js` | Live streaming: setup, live dashboard, chat, Super Chats, replays |
| `audience.js` | Audience demographics: ages, countries, devices, active hours |
| `situations.js` | Creator drama: situations with Respond / Ignore / Apologize / Make a video |
| `socialmedia.js` | The Social tab (Pulse): posts, teasers, followers |
| `calendar.js` | Channel Calendar, mood forecast, rival premieres, collab bookings |
| `channel.js` | Your channel (picture, banner, about, category), weekly content plan, Studio plan card |
| `native.js` | Android app layer: back button, pause/resume catch-up, full screen (does nothing in a browser) |
| `tutorial.js` | First-run guided tour, replayable from Settings |
| `ads.js` | Rewarded-ad adapter (CrazyGames, Poki, or house-ad fallback) |
| `manifest.webmanifest`, `icon.svg` | PWA metadata, reused for app packaging |

Saves from v0.1 load fine. New fields are filled in by `sanitizeState()`.

## New in v1.0: your channel, archetypes, weekly plan (`channel.js`)
- **Customization → Your channel** (also the profile picture in the top bar, or Settings → Customize). Gear moved to the **Gear** switch on the same tab.
  - Profile picture: build a face (skin, hair style, hair colour, shirt, glasses, background) or use a logo (initials or a mark). The face is also the one on your thumbnails.
  - Banner: 8 styles x 6 colour sets, optional channel name. Halftone 100 subs, Contours 1K, Burst 10K, Aurora 100K, Gilded 1M. The gold picture background unlocks at 100K, the Crown logo at 1M. Unlocks stay unlocked.
  - About (150 characters), name, and **category**: uploads in your category get +3 algorithm; Variety gives +1 to everything. Category can change once a day.
- **Creator archetype** (`identity.js`): never picked, it comes from the last 30 uploads. Focus = Specialist or Variety Creator (as before). Timing = Trend Chaser (55%+ of uploads on a hot topic, a trending video type or a Pulse trend) or Evergreen Creator (55%+ guides, reviews, comparisons or lists made away from trends).
  - Trend Chaser: trending uploads +4 algorithm and +20% first-day views; videos fade faster; cold topics -3.
  - Evergreen: guides etc. +3; topic mood matters half as much; longer tail (+60% floor), slower decay, more comebacks; -8% first day.
  - Same half/full strength as identity (emerging at 15 uploads, established at 30). Shown on the channel page (lean meters) and in Analytics → Channel identity.
- **Weekly plan** (Calendar, and Your channel → Upload schedule): each weekday is a topic, any topic, a rest day or open. Day 1 is a Monday.
  - Uploading the planned topic: +5% views, 4 less energy. Any-topic days: +3%. Each full week without a missed planned day adds +1% (max +5%) and +1.5 algorithm rating.
  - Rest days (max 3): energy regen x1.5 until you upload that day; the Casual/Consistent/Aggressive plan doesn't judge them.
  - 7 straight days with uploads and no day off: energy regen x0.85 until a day with no uploads.
  - Today's plan locks at midnight (an open day can still be planned before the first upload). Missing a planned day only resets the plan streak.
  - Studio shows today's plan against the hottest topic and your energy: stick to the plan, chase the trend, or wait.
- New save fields: `channel`, `weekPlan`, `planDay`, `planStreak`, `planKept`, `grindDays`. Older saves get a one-time notification pointing to the feature.

## New in v1.0: creator reputation
Sponsorships now track two reputations (Monetization → Sponsorships → Reputation):
- **Sponsor reputation** (was "brand reputation"): how brands see you. Unchanged: hit view targets to raise it; Established brands at 40, Premium at 70.
- **Creator reputation** (new, starts at 70): how your audience takes sponsored videos.
  - Attaching a sponsor whose topic fits what your audience watches (30%+ of recent views): +3. Partial fit (10–30%): 0. Off-topic (<10%): −6.
  - A 4th sponsored upload within your last 6: −4 more, with a heads-up.
  - Delivering a fitting deal: +2. Sponsor-backlash choices: apologise +4, stand by the brand −3, ad-free follow-up video +5.
  - Recovers on its own by 2 a day up to 60. Floor 10.
  - Effects (gentle): Trusted 80+: offers pay +12% and come 25% more often, the ad read costs 1 retention. Steady 55–79: normal (2). Wary 35–54: offers −8%, ad read 3. Tuned out <35: offers −15%, ad read 4. Off-topic sponsors cost 1 more. A trusted creator with fitting sponsors rarely gets sponsor backlash.
  - Messages: "Your audience is becoming less responsive to sponsored content" below 45, "warming back up" at 60, "trusts your recommendations" at 80.
- Offers and unfilmed deals show their fit ("Fits your audience" / "Partial fit" / "Off-topic for your audience"), and the Studio sponsor hint repeats it, so it's always a choice you can see.

## v1.0 (Google Play launch build)
Same game as v0.9.5; version raised to 1.0.0 for the first Play release.

## New in v0.9.5: rewarded ads, live AdMob IDs
- Real AdMob app and rewarded unit IDs in `app/streamly.config.json`; package name `com.aetheredgestudios.streamlysim`.
- The test APK installs as `com.aetheredgestudios.streamlysim.debug` (side by side with the Play version) and always shows Google's test ads. Only the signed release build shows real ads.
- Upload wait between videos: Quick 60s, Standard 90s, Polished 2 min (was 20/45/90s). "Skip wait" ad unchanged.
- Offline "double" now doubles the money only; subscribers and watch time aren't doubled.
- New: a quick-sponsor cash offer pops up now and then (first after 10 minutes, then 20–30 minutes apart, max 3 per in-game day, never over another popup, during the tour, or while live). Amount scales with level and recent earnings ($25–$600).
- New: "Ask for 25% more" on sponsor offers (once per offer), also on the offer popup.
- New: "Power nap" in the Studio when energy is below 40: watch an ad for +25 energy, twice a day.
- All rewarded ads share the 12-a-day cap.

## New in v0.9.4: intro pacing, fixed sidebar
- Intro: the heavy setup (game state, first render, the title card's thumbnail wall) now runs before the intro starts, and every intro animation is held until then (`.boot-go`). In the app the phone's launch screen stays up during setup (Capacitor Splash Screen plugin) and fades straight into the studio logo. The per-second redraw pauses while the intro plays. On touch devices the two filter animations (logo glow, letter blur) are skipped.
- The sidebar no longer scrolls away at the bottom of long pages (a leftover 88px body padding made the page taller than the layout).
- Line charts: no dot at the end of the line.
- Headline numbers: the count-up no longer sits one below the real value (e.g. 999 subscribers when you have 1,000).

## New in v0.9.3: app feedback
- Thumbnails: gradients now live once in a shared, never-hidden SVG at the top of the page. Copies of a thumbnail inside hidden tabs were stealing the gradient ids, so skies and backgrounds went missing (very visible in light mode).
- In-game pickers replace the phone's system dropdowns (Length, Editing Effort, Thumbnail, Title Style, Publish, Sponsor, Social targets). The real selects stay hidden in the page, so game code is unchanged.
- Toasts sit at the bottom edge instead of mid-screen.
- Android back button on Home opens a "Leave Streamly Sim?" dialog.
- Settings save note in the app now correctly says "on this phone".

## New in v0.9.2: Android app
- The game now runs as an Android app (see `app/README.md` in the repo; GitHub Actions builds it).
- `native.js`: Android back button (closes popups, then Home, then "press back again to leave"), saves when you switch away and catches up the time you were gone when you come back after a minute or more, hides the system bars.
- `ads.js`: Google AdMob rewarded ads inside the app, with Google's consent message where required and an "Ad privacy choices" row in Settings when it applies. Test ads until real IDs are set in `app/streamly.config.json`.
- "No ad available" now has its own message instead of "the ad didn't finish".
- In the app, the save note says "on this phone" and the export button (which can't download in an app) is hidden.

## New in v0.9.1: UI polish
- **Partner Programme moved to Monetization.** It sits at the top of the Overview, with tier 1 and tier 2 side by side. An approved tier folds into a single green row; the next tier gets the full width. The old "Monetization Progress" list is gone (it repeated the same gates). Brand sponsorships show as a small unlock pill underneath. The tutorial's "Getting paid" step now points here.
- **Estimated Revenue** shows lifetime earnings with "+$X today" from today's revenue (it used to show the balance change).
- **Home:** progress and today's summary sit beside the chart; Situations, Coming up and Quick Actions share one row; Top video and Today's audience sit next to Notifications. The greeting uses your channel name. Notifications read left to right with a time on the right. The Channel Performance % compares this range with the one before it (no more "↑ 2936884%"; a new channel shows "New this period").
- **Analytics:** Growth (Upload plan | Algorithm, Audience Loyalty | Algorithm Learning) and Goals (Milestones | Achievements) are two-column groups.
- **Feed:** rivals and collabs moved to a full-width Creators row. Locked collab creators fold into one line ("6 more creators will collab as you grow. Next: …"). Activity sits in the side column.
- **Content:** upload/scheduled cards are a single row (thumbnail, details, actions).
- **Thumbnails:** "Clean" covers have no face, so the subject (controller, laptop, goal, pan...) is now centred in the frame. Covers with a face keep the subject on the left.
- **Icons:** topic tile icons are bigger and truly centred (inline icons carried a text margin that pushed them off-centre). New controller glyph.
- **Motion** (only in response to what you do, and off with reduced motion): tabs rise in with a light stagger and scroll to the top; headline numbers count up; modals pop in; buttons press; selected tiles pop; progress bars glide.

## v0.9 review fixes

- Time away is now replayed hour by hour, so upload-plan checks, rival history, premieres and bookings each happen at the right moment instead of all being judged by the time you came back.
- Situation follow-ups and Pulse teasers/trend tie-ins are claimed when you upload (scheduled videos count if they go live inside the window) and pay out when the video goes live; follow-ups now check what they ask for (no clickbait, no sponsor, a real reaction), collabs count, and one follow-up can't silently replace another.
- A collab can be promoted once; a missed booking or a cancelled/deleted teased video closes its post (half the followers it won unfollow). Pulse followers from small posts are no longer rounded away.
- Creators you've booked don't send invites (or cost goodwill for invites you couldn't take). "Next 9:00 AM" no longer skips today's 9 AM; publish options show the day; a Calendar slot that passes resets Publish with a message. Streaks show in days (a casual check is 2 days). Situations wait for your first 3 uploads, close the card when time runs out, and the Home list no longer loses taps. Older saves without the new audience data load fine.

## New in v0.9: Social (`socialmedia.js`)

A Social tab: your creator account on Pulse, an in-game network. Not a social-media simulator, a channel-growth tool. Pulse followers come from posts and from about 15% of every new subscriber.
- **Announcement:** wins the most followers, +1 loyalty in your niche (once a day).
- **Share a video:** link clicks become views on that video (fresh videos travel further), a few become subscribers. Each video can be shared once.
- **Tease an upload:** pick a scheduled video, or "my next upload" (upload within 24 hours). The people who click wait for it: when the video goes live they arrive as release-day viewers, about 2% subscribe, and the strong start gives it up to +6 algorithm. Tease "my next upload" and post nothing, and half the followers that post won unfollow.
- **Trending topic:** pick one of today's top 3 topics; reach scales with its mood, and your next video on that topic within 12 hours gets +4 algorithm and a little CTR.
- **Promote a collab:** a booked collab (release-day viewers like a teaser) or a live collab video (views); your partner's audience sees it too, and +3 relationship.
- **Reach** = followers x reshares + discovery, x how online your audience is right now (0.6x at a quiet hour to 1.2x at your prime time), x caption style (Hype: more clicks; Chill: more followers; Mysterious: swingy), x 0.6 for every post past 3 a day. Numbers reveal over about 3 in-game hours; 4% of posts blow up (4-7x). Each post costs 3 energy and pays 10 XP.
- The Calendar suggests teasing scheduled uploads and shows when a teaser runs out; the Studio's publish hint suggests it too.

## New in v0.9: Situations (`situations.js`)

Creator drama as a light choice system. A card slides in (bottom right) with the situation, the evidence, and up to four choices: **Respond, Apologize, Make another video, Ignore**. Consequences are small: a few subscribers (0.1-0.6%), 1-2 algorithm points, a relationship, brand reputation, loyalty, a burst of views.
- **Negative:** clickbait accusations (a shock thumbnail or curiosity title in the last day), a heated debate (opinion videos, controversies), a stolen-content claim (lazy reactions), sponsor backlash (sponsored videos), a rival calling you out (relationship -20 or worse).
- **Positive:** a creator shout-out (thank them, pitch a collab for a free invite, or say nothing), a fan edit blowing up.
- **Neutral:** an old clip going viral, viewers demanding part 2, fans asking if you've quit (after a break), your thumbnail becoming a meme.
- **Fair, not random punishment:** most situations come from what you actually did, and the card shows the evidence (CTR, how much people watched, satisfaction, the rival's size). Owning a fair accusation works and defending it backfires; defending an unfair one works and apologizing costs a little.
- **Make another video** sets a follow-up: upload a matching video within 12 in-game hours (shown at the top of the Studio, on the Calendar and on Home) and it gets an algorithm and click boost plus a title like "Part 2: ..." or "Responding to ...". Promise one and don't deliver, and it costs a little.
- **Pacing:** at most 2 open, 16 in-game hours between new ones, the same kind no more than every 1.5 days (shout-outs 2), none before 5 uploads or 30 subscribers, none spawned while you're away. Undecided situations close themselves after 8 in-game hours as "Ignore". A pink "to respond" pill in the top bar and a Situations panel on Home (open ones, your follow-up, the last 3 outcomes).
- Replaces the old flat controversy event (-5 algorithm), the hot-take and lazy-reaction toasts and the shout-out pop-up; those come back only when a situation can't open.

## New in v0.9: Audience (`audience.js`)

Analytics → Audience, modelled on a creator studio's audience tab but kept readable. Everything drifts a little every in-game hour toward where your last 30 videos point.
- **Age (13–17, 18–24, 25–34, 35+):** from each video's topic, format and type (gaming and comedy young, tech and cooking older; Shorts, challenges and reactions younger; news, guides and reviews older).
- **Viewer types (core fans, regulars, casual viewers):** built by long-form retention, satisfaction, your upload streak, a clear niche, streams and memberships; pulled toward casual by Shorts, viral hits and clickbait. Fans raise a new upload's first day and a stream's turnout (about 0.85x to 1.3x) and subscribe a bit more; a casual audience drifts away faster during breaks.
- **Top countries:** 10 countries. Small channels are mostly local (Nigeria, Ghana, Kenya, South Africa); as you grow (and with Shorts) your topics pull in their global crowd (tech: US and India; football: UK, Nigeria and Brazil; gaming: US, Philippines, Brazil...). US, UK and Canada are marked "High ad rates".
- **Ad rates** = age value x country value: roughly 0.7x for a young local audience up to about 1.5x for an older US/UK-heavy one. Applies to long-form and Shorts revenue and to sponsor offers.
- **When your viewers are on Streamly:** a 24-hour chart on your in-game clock, built from each country's evening peak and time zone (US viewers peak around 2 AM your time). It replaces the fixed 6–10 PM prime time: the first-day boost for uploads (0.72x–1.22x) and stream turnout (0.55x–1.3x) follow your audience, and the Studio's "Next prime time" slot, the Calendar's prime slot and its prime-time marker all use your viewers' busiest 3 hours. A global audience also makes off-peak hours less dead.
- **How they watch:** phone, computer, TV and tablet (Shorts are phone-only; long videos, cooking and football get more TV; streams, gaming and tech more computer), plus watch time from subscribers.
- **Your audience also watches:** the three rivals your viewers overlap with most. A collab with one of them brings 20% more subscribers.
- Moment cards for a new biggest age group, a new top country, and your core fans passing 15% and 25%; a notification when your prime time moves by 2+ hours. The Studio shows who a video type draws; video analytics shows who watched.

## New in v0.9: Channel Calendar (`calendar.js`)

A Calendar tab (sidebar, or tap the clock in the top bar) showing the next 7 days, plus a "Coming up" card on Home.
- **On the calendar:** scheduled uploads, sponsor offer expiries, deadlines and judging days, the daily trend (top topic, cold topic, hot video type), rival premieres, booked collabs, collab invites and creators coming off cooldown, the weekly internet bill and data renewal, and upload-plan checks with your current count. Filter chips per category; days with something that needs attention get a "!".
- **Audience forecast:** each day's mood is drawn a week ahead. Tomorrow is reliable; days 4+ are an early forecast that shifts a little every night (up to ±8). The real day lands within ±4 of its forecast.
- **Rival premieres:** creators announce uploads 1-4 days ahead (creators in your niche more often). When one drops, its topic gets crowded (+0.15, big premieres +0.45, fading 3%/hour), which costs uploads in that topic up to -10 algorithm score. Crowding now applies to every channel, not only once you have a channel identity.
- **Plan a day:** schedule an upload for your viewers' prime-time hour or one of two other slots (normally 9 AM and 1 PM) on any of the 7 days; the Studio's Publish menu is set for you. A scheduled video is judged against the day it actually goes live (that day's mood, hot video type and crowding), so planning around the forecast pays off. Book a collab for 7 PM (9 PM if it's late) at 15% off, up to 2 at a time; you get a 6-hour window on the day (+5 relationship for showing up, -10 for a no-show, -4 if you were away).
- **Reminders:** a notification 6 hours before a sponsor deadline, an hour before a premiere in your niche, and a day before a bill you can't cover.
- **Days now run midnight to midnight** on the in-game clock (before, they rolled over at 9 AM): trends, daily analytics, upload-plan checks, membership payouts, coffee and ad limits.
- Fixed: Today's Summary showed "+$-96.00" when your balance went down; it now shows "−$96.00".

## New in v0.8: live streaming is on

`LIVE_ENABLED = true` in `live.js`. Content → Live Streams, unlocks at 50 subscribers (details under v0.7.1 below). A finished stream now also counts as an upload for your upload plan.

## New in v0.7.7: relationships, sponsor contracts, creator moments (`social.js`)

- **Creator relationships:** every rival has a value from -100 to +100 (Major rivalry, Rival, Neutral, Friendly, Collaborator, Regular collaborator), shown with a bar in Feed → Your rivals. Collabs (+18, or +5 if they flop), accepting invites (+8), shout-outs both ways (+6 to +13) raise it; their answer-videos (-3/-6), overtakes (-3/-5), dominating your niche (-4), ignored invites (-6) and your call-outs (-14 to -20) lower it. Friendly cuts collab cost 25%, Collaborator 50%, Regular collaborator makes collabs free with no size requirement and up to 1.5x the subscriber pull. Rivals answer your videos 2-3x as often; friends shout you out and invite you. Your moves: **Shout out** (6 energy, +8-13, they may return it) and **Call out** (4 energy, -14-20, a burst of curious viewers on your latest video, they may answer).
- **Sponsor contracts** replace the old free brand-deal money: offers name a brand, product, required topic, payment, minimum views and a deadline. Accept (up to 2 active), then pick the sponsor in Studio → Sponsor on a matching upload (the ad read costs 2 retention/satisfaction). 2 days after it goes live: hit the target = full pay (+25% at 2x, +15% for reviews/unboxings) and reputation +8; 60%+ = 70% pay; below = 40% kill fee and -8; missing the deadline = nothing and -12. Brand reputation unlocks Established (40) and Premium (70) brands; satisfied brands come back with 20% bigger contracts each time.
- **Creator moments:** big cards for things the sim does on its own: an old video going viral (with yesterday vs today views), a rival video passing 500K or 1M, a creator shout-out (with their size), an audience shift toward a hot topic you don't make, sponsor offers, reputation tiers, relationship changes.

## New in v0.7.6: light mode, fixes

- **Light mode:** Settings → Appearance: Dark, Light or System (follows the device). Applied before first paint, so there's no dark flash. The loader keeps its own dark look.
- **Watch time:** average view duration lowered again: share of a video's retention actually watched is 86% (3 min), 68% (8 min), 55% (15 min), 45% (25 min), and about 15% of views bounce in the first seconds. A 15-minute video with 200K views now logs roughly 13-15K watch hours instead of about 22K.
- **Video analytics:** the chart can no longer spill over the comments; on narrow screens the header stacks and stats go 2 per row.
- **Home → Recent Videos → View all** now opens Content (it opened the Studio).

## New in v0.7.6: loader v2

- No tap-to-continue. A tap only switches sound on if the browser blocked audio (a small speaker icon shows when that happens).
- Studio splash effects: drifting particle field, slow camera push, hexagon glow once traced, dust bursts as each block lands, a teal spark burst and a halo bloom when the hero block lifts, a light sweep across the wordmark.
- Soundtrack (synthesized, no audio files): an ambient pad, a whoosh as the hexagon traces, a pitched "thock" for each landing block, a chime and rising tone when the teal block lifts, a whoosh for the wordmark and a resolving chord. The Streamly card has its own whoosh, pops, segment blips, counter ticks and a final ding. Respects the saved sound setting; the game's music takes over afterwards.
- New Streamly title card: left side has the new logo (a blue square with a play symbol made of three stream segments; it pops in with rings and a shine), the wordmark rising out of a blur, a glowing SIM badge, the tagline and a subscriber counter that rolls from 0 to 1,000,000. Right side: a tilted, endlessly scrolling wall of the game's generated thumbnails. The same new mark is used in the sidebar, favicon and website.

## New in v0.7.6: studio splash, blue brand

The Streamly mark is now blue and white (gradient #5b9bff to #1d4ed8) everywhere: sidebar, title card, favicon and website.


The game now opens on an animated AetherEdge Studios splash (the full-colour logo on dark navy, rebuilt in SVG; the AETHEREDGE / STUDIOS wordmark is vector-traced from the logo artwork so the letterforms are exact): the hexagon frame traces itself, eight purple blocks drop in back to front, the front-top block lights up teal and lifts out of its slot over a glowing floor, AETHEREDGE then STUDIOS rise in letter by letter, and the block hovers until the game is ready (about 6 s, then a 3 s Streamly title card). Loading is real: the bar and status line follow font loading ("Loading fonts"), the game starting up behind the splash ("Opening your studio") and "Ready". Tap to continue once loaded. It hands off to a Streamly title card in the same style (the red frame traces, the play mark pops, the wordmark rises), then the game. Reduced-motion users see the final frames without animation. The old console-style boot sequence, particle background and fake progress ticker are gone.

## New in v0.7.6: upload plan, scheduling, realistic watch time (`cadence.js`)

**Upload plan** (Analytics → Upload plan; status line in the Studio):

| Plan | Target | Kept: algorithm rating per check | Missed | Other |
|---|---|---|---|---|
| Casual | 1 upload per 2 days | +0.6 | -0.3 | Energy refills 15% faster; 3-day grace before your audience drifts |
| Consistent | 2 uploads a day | +1.4 | -1.0 | 2-day grace |
| Aggressive | 4 uploads a day | +2.2 | -1.8 | Each video reaches 15% fewer people (your videos compete), +3 energy per upload, 1-day grace |

Kept checks build a streak (each day adds +10% to the gain, up to 10) and a familiarity bonus on every upload (+0.4/+0.8/+1.0 algorithm per streak day). After the grace period without uploads, 0.4% of subscribers drift away per day and topic loyalty drops. The Analytics consistency meter now tracks your plan. Simulated: a player making 2 uploads a day does best on Consistent (~2x Casual or Aggressive); a player uploading as fast as possible lands within ~20% on any plan.

**Scheduling** (Studio → Publish): now, in 2 hours, next prime time, next 9 AM, prime time a day later (and a slot picked on the Calendar). Up to 5 scheduled; they go live on time even while you're away, count for your plan when they publish, and can be published early or cancelled from Content. Day-one audience by publish hour follows when your audience is online (v0.9: Analytics → Audience), from 0.72x at their quietest hour to 1.22x at their peak.

**Watch time:** average view duration now drops with length (people watch about 92% of the way through a 3-minute video's retention, 78% of an 8-minute one, 66% of a 15-minute one, 56% of a 25-minute one). Retention shown in the game is this average percentage viewed. A 15-minute video with 3,700 views now logs about 320 watch hours instead of about 525.

## New in v0.7.4: channel identity + rival competition (`identity.js`)

**Identity** is computed from your last 30 uploads: a topic (55%+ of uploads) or Variety Creator, plus one trait (high quality, Shorts, controversy, or your most-made content type). Emerging at 15 uploads (half strength), established at 30. Shown on Analytics → Channel identity, announced with a popup when it changes, and its effects appear as notes in the Studio.

| Identity | Upside | Cost |
|---|---|---|
| Specialist | +7 algorithm in your niche, sponsors pay +30% | Off-topic uploads: -4 satisfaction, -1 algorithm, a few subscribers leave; niche rivals crowd you |
| Variety | +5 algorithm on every upload, topic mood swings hurt half as much | Sponsors pay -10% |
| High quality | +2 CTR, sponsors +20% | Quick edits: -5 algorithm, -10 satisfaction |
| Shorts | Shorts: +5 algorithm, +50% reach, +80% subscribers | Long-form -6 algorithm |
| Controversial | +6 CTR, +6 algorithm, +40% reach, +30% comments | Sponsors pay -40% and 25% refuse; clickbait lowers satisfaction |
| Known for a type | That type +4, and repeating it no longer tires your audience | — |

**Balance (v0.7.5):** simulated 10 in-game days of sensible play (upload when ready, keep energy above 30, coffee when low), 2-4 runs each. Subscribers landed within roughly 0.6x-1.3x of each other, and each strategy wins something different: Variety most subscribers of the standard-effort styles, Specialist more revenue and sponsor money, High quality the best sponsor deals per upload, quick-edit spam the most views but the lowest satisfaction, Shorts the most views per subscriber but the least ad money (that's the Shorts trade-off). Upload saturation: past 3 uploads in 24 game-hours each extra one costs -4 algorithm and a smaller slice of your subscribers' attention. Quick edits -5 algorithm on top of their quality hit; Standard edits +4 quality.

**Rivals compete:** 3 peer rivals (2 in your niche, 1 elsewhere) appear after 5 uploads at about your size and grow at your pace, so you race them. Rivals answer your uploads with their own version (whichever does better gets a boost), chase the day's trend (crowding that topic for everyone), start dominating your category, overtake you or get overtaken, shout you out, invite you to free collabs, have breakouts, slump, and pivot to new topics. Feed → Your rivals shows who's ahead, weekly growth and status.

## New in v0.7.3: content types (`ctypes.js`)

Studio step 2, "What kind of video?": 5-7 types per topic (e.g. Tech: Review, Tutorial, Comparison, News, Opinion, Unboxing). Each maps to one of ten archetypes that carry the mechanics:

| Archetype | Plays like |
|---|---|
| News | Biggest first hours, fades within a day, no comebacks. Better on trending topics. |
| Guide (Tutorial, Recipe, Routine, Skills) | Slow start, rediscovered by search after a day, biggest week-one total and most subs. Weak as a Short. |
| Challenge (Prank) | Most viral hits. +8 energy; quick edits hurt it. |
| Review (Taste Test) | Good retention and subs; brands pay 40% more when you post reviews/unboxings. |
| Unboxing (Haul) | Clicky, sponsor-friendly, costs $15. |
| Comparison | Search-driven long tail, lots of debate. |
| Reaction | -8 energy, lower satisfaction and subs, 8% chance of a "lazy" backlash. |
| List (Top 10, Ranking) | Rarely flops, rarely goes viral. |
| Opinion (Hot Take, Storytime, Q&A) | ~2.4x comments, loyal subs, 10% chance of a debate (views up, rating down). |
| Casual (Gameplay, Vlog, Skit, Street Food) | Best for regulars (+25% subs), weaker with new viewers, great as Shorts. |

One archetype trends each in-game day (+5 algorithm, +2 CTR, shown in the picker). Posting the same archetype repeatedly costs -4 algorithm per repeat in your last 5 uploads. Titles (about 200 type-specific) and comments follow the type. The type shows in Content rows and video analytics. Tutorial has a step for it.

## New in v0.7.2

- **Titles:** 25 general titles per topic plus Shorts-only (10 per topic) and long-form-only (5 per topic) banks, picked by format and length, never repeating your last 20. Curiosity and question title styles now use several wordings.
- **Comments react to the video:** title keywords (ranked, recipe, setup, 5AM...), Shorts vs long-form, length (long videos praised or called too long depending on retention, 3-minute videos "too short"), timestamps that fall inside the real video length, editing effort, clickbait thumbnails, trending status, collab partner, tiny-channel "early gang". Per-topic positive/neutral/negative pools. Comments carry like counts.
- **Handles:** 6 patterns across 72 first names, 26 tails and topic-flavoured words (about 490 unique out of 500 generated).

## New in v0.7.1

- **Delete save fixed**: it now uses an in-game confirm (browser `confirm()` is blocked in some embeds) and blocks autosave while wiping, so the old save can't be written back on reload.
- **Live streaming is built but switched off** (`LIVE_ENABLED = false` at the top of `live.js`; the Live Streams tab says it's coming, its tutorial step, XP row and Super Chats row are hidden). Flip the flag to release it. Details: Content → Live Streams. Unlocks at 50 subscribers. Pick a topic and 30 min / 1 h / 2 h of game time; viewers arrive from notified subscribers and people browsing, shaped by time of day, topic mood, loyalty and energy. Live chat, one possible raid per stream, subscribers during the stream, and (with Partner Programme tier 1) Super Chats (creator keeps 70%) and new members. Ending a stream shows a summary and saves a replay (VOD) in Content. Uploading is blocked while live; a LIVE pill in the top bar links back to the stream.
- **Random events scale with channel size**: shout-outs are rare and small for new channels; view spikes can't hand out a whole audience.
- **Subscriber recount** (one-time): saves with full per-video tracking get inflated shout-out subscribers trimmed to what videos earned plus a fair allowance.
- Chart day labels no longer repeat "Day 1"; event subscribers count in daily totals.

## Tutorial (v0.7)

`tutorial.js` runs a 15-step spotlight tour the first time a new channel is created: it dims the screen, highlights one element per step, and switches tabs as it goes (Home stats, top bar, Studio topic/format/details/energy/upload, Content, Partner Programme, analytics ranges, gear, collabs, XP). Players can skip it any time (Esc also works) and replay it from Settings. Existing saves aren't forced through it; they get a one-time notification pointing to Settings. Steps live in the `STEPS` array at the top of the file.

## New in v0.7

- **Partner Programme in two tiers, like YouTube.** Tier 1 (fan funding): 500 subs, 3 uploads in the last 90 days, and 3,000 long-form watch hours or 75K Shorts views, unlocks Memberships. Tier 2 (ad revenue): 1,000 subs and 4,000 long-form watch hours or 250K Shorts views, unlocks ads on long-form and Shorts feed revenue. The 10K milestone is now a verified badge.
- **Fixed: money before approval.** Viral-moment and controversy events were paying ad money to non-partner channels. They no longer do, and old saves have that phantom revenue cleared from the ledgers (cash already earned is kept).
- **Analytics range picker:** Last 48 Hours, 7, 28, 90 days, Lifetime. Cards and chart follow the range, with change vs the previous period.
- **Video analytics page:** "View details" (Home latest upload, Analytics top video) and a button in each expanded Content row open a per-video page: views, watch time, average view duration, CTR and retention vs where they started, subscribers gained, likes, comments, revenue, and an hourly chart for views / CTR / retention.
- **Discover feed:** each rival upload has its own reach (scaled to the creator's size, with flops and hits), views that climb over time, its own length, and a timestamp spread across the hour.

## New in v0.6

- **Growth curve:** a new channel has about a 1% viral chance per upload (a breakout that beats its usual ceiling but stays small-channel sized). It climbs with subscribers and watch time: about 3% at 100 subs, 7% at 1K, 11% at 10K, 17% at 100K. Dead uploads get rarer as the channel grows, subscribers bring day-one views, and the reach ceiling rises with subscriber count.
- **Live video metrics:** CTR, retention (and so watch time), likes and comments move for the whole life of a video. Subscribers arrive first and click more; the wider audience later clicks less; a random walk keeps each curve different; recommendation pulses spike CTR. CTR feeds back into views.
- **Real durations:** every video gets its own length around the chosen option (25 min shows as e.g. 24:06), Shorts run 0:14 to 0:59. Old saves get re-rolled.
- **Comments:** about 150 lines across general, per-topic, clickbait and Shorts pools, each with a random @handle. New comments keep arriving as views come in.
- **Playlists:** create, add, remove, delete. Videos in a playlist get autoplay views (+1.5% per video, up to +12%) and a little extra retention.
- **Shorts monetization:** Partner Programme needs 1,000 subscribers plus either 4,000 long-form watch hours or 250K Shorts views in the last 90 in-game days. Once in, long-form earns ad revenue and Shorts earn from the Shorts feed, tracked separately.
- **Monetization sub-tabs** now each show their own view (Ad Revenue, Shorts, Sponsorships, Memberships).
- Fixed the Monetization Progress heading overlap.

## New in v0.5

- Landscape only: a "Rotate your phone" screen covers portrait on phones; landscape phones get an icon-only sidebar. Manifest orientation is `landscape` for the Play build.
- Thumbnails redrawn in the big-cartoon style: large expressive characters with white-sclera eyes, thick brows, open mouths, bold outlined captions with a shadow.
- Feed: Rank This Week removed, Activity Feed capped at 4 items.
- Monetization: proper dollar-sign icon on the empty chart, progress subtitle no longer overlaps the heading.

## New in v0.4

- **Levels run on XP now**, not subscribers, and go to 30. Every action that grows the channel pays XP (uploads, views, subs, viral hits, milestones, achievements, collabs, A/B tests); the full table is on the Settings tab with what you've earned from each. Each level pays a cash bonus. Equipment is no longer level-gated — money is the only limiter (itch.io feedback).
- **Settings is a real tab**: level and XP, channel rename, lifetime stats, sound/music, ad provider, export or delete save.
- **Channel Performance ranges work**: 7 / 28 / 90 in-game days from a real daily ledger.
- **Upload time bug fixed**: the estimate treated seconds as minutes (60x too long). Upload labels now say "of game time" so real vs in-game minutes are never mixed.
- Rank banner removed from Feed. Shop effects show percentages. Analytics meters and milestone ticks tidied. Cleaner thumbnails and avatars. New loading screen in the dashboard style.

## New in v0.3

- UI rebuilt to match the dashboard mockups: near-black surfaces, blue as the only accent, red kept for the brand mark, thin stroke icons, no emoji.
- Sidebar is Home / Content / Analytics / Monetization / Customization / Feed, with a channel-level XP block and a Settings panel (sound, music, ad provider, delete save). The bell opens the notification history. The Studio page is reached from any "Create video" button, and from the Create tab on phones.
- Shop became Customization, with equipment cards in the mockup style.
- Thumbnails redrawn: lit gradient scenes, shaded faces, side scrim, caption shadow.

## New in v0.2

- **Thumbnails**: every video, rival upload and avatar is drawn from its topic and thumbnail style. Your creator face is seeded from your channel name.
- **A/B thumbnail tests** (100 subs): two styles run during the testing phase, the higher CTR ships. Styles now fit some topics better (`THUMB_TOPIC_FIT`).
- **Energy**: uploads cost energy, which regenerates over game time. Ending an upload below 30 applies a fatigue penalty to score and retention. Hitting 0 means burnout (half-speed recovery until 50). Coffee: $8, +15, three per day.
- **Collabs**: pitch a rival in Discover once you have 1/50th of their subs. One-time subscriber pull, with a flop chance that falls as algorithm score rises.
- **Music**: separate toggle from sound effects, brighter loop after viral moments and collab hits.
- **Rewarded ads**: skip upload cooldown, double offline gains, free 1GB data. Reward fires only on a completed ad. Cap: 12 per in-game day.

Tuning constants live at the top of `game.js` (`ENERGY_*`, `COLLAB_*`, `ADS_PER_DAY`, `AB_TEST_*`).

## Real ads: which option works where

| Where the game runs | Ad option | Notes |
|---|---|---|
| itch.io | None that pays reliably | itch allows non-intrusive ads but prefers donations; networks like AdSense need a domain you own and the itch iframe isn't yours. Use pay-what-you-want. |
| Your own domain | Google AdSense H5 Games Ads | Apply for AdSense, then for H5 Games Ads. Paste your `ca-pub-` ID into the commented block in `index.html`. Test with `data-adbreak-test="on"` first. |
| CrazyGames / Poki | Their SDK | Uncomment their script tag. They host the game and pay a revenue share. |
| Google Play | AdMob | See the Google Play section. |

All four go through `Ads.showRewarded()`, so the reward logic never changes.

## Turning on real ads (web portals)

Without an SDK the game shows in-game house ads, which **earn nothing**. To earn:

1. Submit to CrazyGames or Poki.
2. Uncomment that portal's `<script>` tag in the `<head>` of `index.html`.
3. Nothing else changes. `Ads.init()` detects the SDK, and every button already goes through `Ads.showRewarded()`.

Check each portal's current SDK docs before submitting in case method names have changed; the calls are all in `ads.js`.

## Google Play (not done yet, outline)

Web portal SDKs do not work inside a Play Store app. The usual path:

1. Wrap the folder with Capacitor: `npm init -y`, `npm i @capacitor/core @capacitor/cli @capacitor/android`, `npx cap init`, set `webDir` to this folder, `npx cap add android`.
2. Add an AdMob plugin (for example `@capacitor-community/admob`) and add a third branch in `Ads.showRewarded()` that calls its rewarded ad, passing `finish(true)` on reward and `finish(false)` otherwise.
3. Self-host the two Google Fonts (or drop them) so the app works offline.
4. Generate PNG launcher icons from `icon.svg`, fill in the Play Console listing, content rating and data-safety form (AdMob collects data, so declare it), then upload an `.aab`.

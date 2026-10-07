/* =========================================================================
   STREAMLY SIM — CORE LOGIC
   Time scale: 1 real second = 1 in-game minute ("tick")
   ========================================================================= */

const SAVE_KEY = "streamlySimSave_v2";
const TESTING_TICKS = 10;              // Phase 1 length, per GDD ("first 10 minutes")
const MAX_OFFLINE_TICKS = 8 * 60 * 60; // cap offline sim at 8 real hours away (= 28,800 game minutes, 20 game days)
const EVENT_CHECK_MS = 15000;          // how often we roll for a random world event
const EVENT_CHANCE = 0.16;             // chance a random world event fires on each check
const DAY_TICKS = 1440;                // 1 in-game day = 1440 in-game minutes
const BILL_CYCLE_TICKS = 7 * DAY_TICKS; // internet bill comes due weekly

/* ---------- Inline icon library — replaces every emoji used as a UI glyph ---------- */
const ICON_PATHS = {
  fire: '<path d="M12 2c1 4-3 5-3 9a5.5 5.5 0 0011 0c0-2-1-3.5-1-3.5S17 9 16 9.5C16.5 7 14 3 12 2z"/>',
  heart: '<path d="M12 21s-7-4.5-9.5-9C1 8 2 4 5.5 4c2 0 3.5 1.2 4.5 2.7C11 5.2 12.5 4 14.5 4 18 4 19 8 17.5 12 15 16.5 12 21 12 21z"/>',
  trophy: '<path d="M8 4h8v4a4 4 0 01-8 0V4z"/><path d="M6 4H4v2a4 4 0 004 4"/><path d="M18 4h2v2a4 4 0 01-4 4"/><path d="M10 14h4v3h-4z"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M9 4l3 6 3-6"/><path d="M9.5 19.5L8 23l4-2 4 2-1.5-3.5"/>',
  chat: '<path d="M21 12a8 8 0 01-8 8H4l2-3.2A8 8 0 1121 12z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L2.7 18a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
  dollar: '<path d="M12 2v20"/><path d="M17 5.5H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H6.5"/>',
  bell: '<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"/><path d="M18 16v-5a6 6 0 00-12 0v5l-2 2h16z"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  upload: '<path d="M12 19V6"/><path d="M6 12l6-6 6 6"/>',
  play: '<path d="M7 5.5v13l11-6.5z"/>',
  calendar: '<rect x="3" y="4.8" width="18" height="16.2" rx="2.4"/><path d="M3 9.6h18M8 3v3.4M16 3v3.4"/>',
  star: '<path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  xCircle: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  disk: '<rect x="3" y="9" width="18" height="10" rx="2"/><line x1="3" y1="14" x2="21" y2="14"/>',
  wifi: '<path d="M2 8.5a15.4 15.4 0 0120 0"/><path d="M5.5 12.5a10.6 10.6 0 0113 0"/><path d="M9 16.5a5.8 5.8 0 016 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>',
  tv: '<rect x="2.5" y="5" width="19" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 18v3"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4.5a1 1 0 011-1h4a1 1 0 011 1V7"/><path d="M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/>',
  sparkle: '<path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/>',
  brain: '<path d="M9 3a3 3 0 00-3 3v1a3 3 0 00-2 2.8v2.4A3 3 0 006 15v1a3 3 0 003 3h1"/><path d="M15 3a3 3 0 013 3v1a3 3 0 012 2.8v2.4A3 3 0 0118 15v1a3 3 0 01-3 3h-1"/><path d="M9 3v16M15 3v16"/>',
  arrowUp: '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  gift: '<path d="M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z"/><path d="M2.5 6h19v3.5h-19z"/><path d="M12 6v15"/><path d="M12 6C12 3.5 9.8 2 8.2 2S5.5 3.3 5.5 4.7 7.2 6.8 8.5 6.8"/><path d="M12 6c0-2.5 2.2-4 3.8-4s2.7 1.3 2.7 2.7-1.7 2.1-3 2.1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  coffee: '<path d="M4 9h13v6a4 4 0 01-4 4H8a4 4 0 01-4-4z"/><path d="M17 10h1.5a2.5 2.5 0 010 5H17"/><path d="M7 3.5c-.5.8-.5 1.5 0 2.3M10.5 3.5c-.5.8-.5 1.5 0 2.3"/>',
  camera: '<path d="M4 8h3l2-2h6l2 2h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="14" r="3.5"/>',
  megaphone: '<path d="M3 10v4a1 1 0 001 1h2l5 4V5L6 9H4a1 1 0 00-1 1z"/><path d="M15 8a4 4 0 010 8"/>',
  chart: '<path d="M4 20V12M9.5 20V6M15 20v-8M20 20V4"/>',
  controller: '<path d="M7.2 7h9.6a5.2 5.2 0 0 1 5.2 5.2v1.4a3.4 3.4 0 0 1-6 2.2L14.6 14H9.4L8 15.8a3.4 3.4 0 0 1-6-2.2v-1.4A5.2 5.2 0 0 1 7.2 7z"/><path d="M7.5 9.6v3.6M5.7 11.4h3.6"/><circle cx="15.6" cy="10.4" r="1" fill="currentColor" stroke="none"/><circle cx="17.8" cy="12.6" r="1" fill="currentColor" stroke="none"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 8l2.5 1.8-1 3h-3l-1-3z"/><path d="M12 3.5v4.5M5 9l3 1M19 9l-3 1M8 20l1-4M16 20l-1-4"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  leaf: '<g transform="translate(1 -.5)"><path d="M5 21c8 0 14-6 14-14V4h-3C8 4 3 9 3 17v4z"/><path d="M5 21c4-6 8-10 14-14"/></g>',
  utensils: '<g transform="translate(1.5 0)"><path d="M6 2v7a2 2 0 002 2v11M6 2v6M9 2v6M4 2v6"/><path d="M17 2c-1.8 0-3 2.8-3 6s1.2 5 3 5v9"/></g>',
  bolt: '<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  shorts: '<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.5 9.5v5l4-2.5z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.4.2 4 1.7 4.5 4.4"/>',
  split: '<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
};
function ic(name, cls){
  const d = ICON_PATHS[name] || '';
  return `<svg class="inline-ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

const TOPICS = {
  gaming:    { label: "Gaming",    popularity: 82 },
  comedy:    { label: "Comedy",    popularity: 88 },
  football:  { label: "Football",  popularity: 74 },
  tech:      { label: "Tech",      popularity: 68 },
  lifestyle: { label: "Lifestyle", popularity: 60 },
  cooking:   { label: "Cooking",   popularity: 55 },
};
const TOPIC_ICONS = {
  gaming: 'controller', comedy: 'chat', football: 'ball',
  tech: 'chip', lifestyle: 'leaf', cooking: 'utensils',
};

/* Upload decisions — each choice trades off differently (per player-agency request) */
const THUMBNAILS = {
  shock:    { label: "Shock",    ctrBonus: 22, algoBonus: 3,  satisfactionPenalty: 14 },
  funny:    { label: "Funny",    ctrBonus: 14, algoBonus: 6,  satisfactionPenalty: 2  },
  action:   { label: "Action",   ctrBonus: 16, algoBonus: 7,  satisfactionPenalty: 5  },
  clean:    { label: "Clean",    ctrBonus: 5,  algoBonus: 4,  satisfactionPenalty: -6 }, // low CTR, builds trust
  gameplay: { label: "Gameplay", ctrBonus: 9,  algoBonus: 5,  satisfactionPenalty: 0  },
};
const LENGTHS = {
  m3:  { label: "3 min",  retentionBonus: 12, revenueMult: 0.65, durationSec: 180,  sizeGB: 0.12 },
  m8:  { label: "8 min",  retentionBonus: 6,  revenueMult: 1.0,  durationSec: 480,  sizeGB: 0.5  },
  m15: { label: "15 min", retentionBonus: -2, revenueMult: 1.35, durationSec: 900,  sizeGB: 1.2  },
  m25: { label: "25 min", retentionBonus: -10, revenueMult: 1.7,  durationSec: 1500, sizeGB: 3.0  }, // pays most, hardest to hold viewers
};
const FORMATS = {
  longform: { label: "Long-form", algoBonus: 0,  ctrBonus: 0,  revenueMult: 1.0  },
  shorts:   { label: "Shorts",    algoBonus: 3,  ctrBonus: 6,  revenueMult: 0.45, fixedDurationSec: 45, sizeGB: 0.03 }, // algorithm pushes hard, pays less
};
const EFFORTS = {
  quick:    { label: "Quick Edit",    qualityBonus: -8, cooldownTicks: 20 },
  standard: { label: "Standard Edit", qualityBonus: 4,  cooldownTicks: 45 },
  polished: { label: "Polished Edit", qualityBonus: 12, cooldownTicks: 90 }, // better score, longer cooldown
};

/* How well a thumbnail style suits a topic's audience — small CTR nudge, and the
   thing A/B tests actually discover (gameplay shots land for gaming, etc). */
const THUMB_TOPIC_FIT = {
  gaming:    { gameplay: 5, action: 3, shock: 1, funny: 0, clean: -2 },
  tech:      { clean: 5, shock: 2, action: 0, gameplay: -1, funny: -2 },
  lifestyle: { clean: 4, funny: 3, action: -1, shock: -2, gameplay: -4 },
  comedy:    { funny: 6, shock: 3, action: 0, clean: -3, gameplay: -3 },
  football:  { action: 6, shock: 2, gameplay: 1, funny: 0, clean: -1 },
  cooking:   { clean: 4, funny: 2, shock: 1, action: 0, gameplay: -4 },
};

/* =========================================================================
   CREATOR ENERGY — every upload costs energy, which comes back slowly over
   in-game time. Uploading while drained still works, but rushed, tired
   content scores worse no matter which edit effort you picked.
   ========================================================================= */
const ENERGY_MAX = 100;
const ENERGY_REGEN_PER_TICK = 1 / 6;          // +10 per in-game hour (one real minute)
const ENERGY_BURNOUT_REGEN_MULT = 0.5;        // burned out: recovery is slower until you're back above 50
const ENERGY_FATIGUE_LINE = 30;               // ending an upload below this starts to hurt it
const ENERGY_COST = { quick: 12, standard: 20, polished: 26 };
const ENERGY_LENGTH_EXTRA = { m3: 0, m8: 0, m15: 4, m25: 8 };
const AB_TEST_ENERGY = 4, AB_TEST_COOLDOWN = 10;
const COLLAB_ENERGY = 25;
const COFFEE_COST = 8, COFFEE_ENERGY = 15, COFFEE_PER_DAY = 3;

/* Collabs: a rival will only film with you once you're at least 1/50th of their size. */
const COLLAB_MIN_RATIO = 1 / 50;
const COLLAB_COST_PER_SUB = 0.0025;
const COLLAB_RIVAL_COOLDOWN_TICKS = 3 * 1440;

/* Rewarded ads: a daily cap so the ad button can't replace playing the game. */
const ADS_PER_DAY = 12;
const FREE_DATA_ADS_PER_CYCLE = 3;

const EQUIPMENT = {
  camera: {
    label: "Camera",
    tiers: [
      { name: "Phone Camera",        quality: 8,  cost: 0,   requiresLevel: 1 },
      { name: "DSLR",                 quality: 20, cost: 150, requiresLevel: 2 },
      { name: "Professional Camera",  quality: 34, cost: 600, requiresLevel: 4 },
    ]
  },
  mic: {
    label: "Microphone",
    tiers: [
      { name: "Basic Mic",  quality: 6,  cost: 0,   requiresLevel: 1 },
      { name: "Studio Mic", quality: 18, cost: 220, requiresLevel: 3 },
    ]
  },
  editing: {
    label: "Editing",
    tiers: [
      { name: "Free Editor",         quality: 6,  cost: 0,   requiresLevel: 1 },
      { name: "Professional Editor", quality: 22, cost: 400, requiresLevel: 3 },
    ]
  },
  internet: {
    label: "Internet",
    tiers: [
      { name: "Mobile Data (3G)",  quality: 0, cost: 0,    requiresLevel: 1, speedMbps: 2,    monthlyBill: 10,  dataCapGB: 5 },
      { name: "Basic Broadband",   quality: 0, cost: 150,  requiresLevel: 2, speedMbps: 10,   monthlyBill: 25,  dataCapGB: 100 },
      { name: "Fibre",             quality: 0, cost: 500,  requiresLevel: 3, speedMbps: 50,   monthlyBill: 45,  dataCapGB: 500 },
      { name: "High-Speed Fibre",  quality: 0, cost: 1500, requiresLevel: 4, speedMbps: 250,  monthlyBill: 80,  dataCapGB: 2000 },
      { name: "Creator Fibre",     quality: 0, cost: 5000, requiresLevel: 5, speedMbps: 1000, monthlyBill: 150, dataCapGB: Infinity },
    ]
  },
  storage: {
    label: "Storage",
    tiers: [
      { name: "256GB SSD", quality: 0, cost: 0,    requiresLevel: 1, capacityGB: 256 },
      { name: "512GB SSD", quality: 0, cost: 200,  requiresLevel: 2, capacityGB: 512 },
      { name: "1TB SSD",   quality: 0, cost: 500,  requiresLevel: 3, capacityGB: 1024 },
      { name: "2TB SSD",   quality: 0, cost: 1200, requiresLevel: 4, capacityGB: 2048 },
    ]
  },
};

/* Rival creators — a simulated ecosystem the player is competing inside of, not playing alone.
   growthRate is a rough per-hour multiplier; volatility adds occasional bigger jumps/dips. */
const RIVAL_CREATORS = [
  { name: "TechMaster",     topic: "tech",      subs: 850000, growthRate: 0.0016, volatility: 0.3 },
  { name: "GamingHub",      topic: "gaming",    subs: 420000, growthRate: 0.0022, volatility: 0.4 },
  { name: "ComedyCentral_", topic: "comedy",    subs: 610000, growthRate: 0.0018, volatility: 0.35 },
  { name: "FootballZone",   topic: "football",  subs: 210000, growthRate: 0.0014, volatility: 0.3 },
  { name: "LifestyleLuna",  topic: "lifestyle", subs: 150000, growthRate: 0.0013, volatility: 0.25 },
  { name: "CookingKing",    topic: "cooking",   subs: 95000,  growthRate: 0.0011, volatility: 0.3  },
  { name: "PixelQueen",     topic: "gaming",    subs: 45000,  growthRate: 0.0032, volatility: 0.55 }, // fast riser
  { name: "ChefAmara",      topic: "cooking",   subs: 28000,  growthRate: 0.0035, volatility: 0.6  }, // fast riser
];

/* =========================================================================
   CREATOR LEVEL — driven by XP, not subscribers. Every action that grows the
   channel pays XP, so the player always knows why the number went up.
   Levels no longer gate equipment; money is the limiter there.
   ========================================================================= */
const LEVEL_TITLES = [
  [1, 'Newcomer'], [4, 'Rising Creator'], [8, 'Established Creator'], [12, 'Pro Creator'],
  [16, 'Media Personality'], [21, 'Media Mogul'], [26, 'Streamly Legend'],
];
const MAX_LEVEL = 30;
/* XP needed to go from level n to n+1. Gentle early, steady later: 150, 240, 350 ... ~9,000 at 29. */
function xpToNext(level){ return Math.round(120 + 30 * Math.pow(level, 1.85)); }
function xpAtLevel(level){ let t = 0; for (let l = 1; l < level; l++) t += xpToNext(l); return t; }
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, k) => {
  const level = k + 1;
  const title = LEVEL_TITLES.filter(t => t[0] <= level).pop()[1];
  return { level, title, xp: xpAtLevel(level) };
});
/* What pays XP — shown to the player on the Settings page. */
const XP_RULES = [
  { key: 'upload',    label: 'Publish a video',            xp: '+40 (Quick +25, Polished +60)' },
  { key: 'views',     label: 'Every 100 views',           xp: '+5' },
  { key: 'subs',      label: 'Every new subscriber',       xp: '+3' },
  { key: 'viral',     label: 'A video goes viral',         xp: '+300' },
  { key: 'milestone', label: 'Subscriber milestone',       xp: '+250' },
  { key: 'achieve',   label: 'Achievement',                xp: '+150' },
  { key: 'collab',    label: 'Collab goes live',           xp: '+120' },
  { key: 'abtest',    label: 'A/B test resolved',          xp: '+30' },
  { key: 'live',      label: 'Go live',                    xp: '+60, then +1 per 5 peak viewers' },
  { key: 'social',    label: 'Post on Pulse',              xp: '+10' },
];
const XP_UPLOAD = { quick: 25, standard: 40, polished: 60 };
const LEVEL_CASH_BONUS = level => 25 * level;


const TITLE_STYLES = {
  normal:    { label: 'Normal — "I Tried the New Update"',                      ctrBonus: 0,  satisfactionBonus: 3  },
  curiosity: { label: 'Curiosity — "You Won\'t Believe What Happened..."',      ctrBonus: 12, satisfactionBonus: -6 },
  question:  { label: 'Question — "Is This the Best Update Ever?"',             ctrBonus: 6,  satisfactionBonus: 0  },
};

const MILESTONES = [
  { subs: 100,    type: "unlock", flag: "customThumbnails",   label: "Unlocked: Thumbnail A/B tests",   bonusMoney: 50   },
  { subs: 1000,   type: "unlock", flag: "sponsorships",       label: "Unlocked: Sponsorships",        bonusMoney: 0    },
  { subs: 10000,  type: "unlock", flag: "verified",           label: "Verified channel badge",        bonusMoney: 250  },
  { subs: 100000, type: "unlock", flag: "silverAward",        label: ic('medal') + " Silver Creator Award",       bonusMoney: 1000 },
];

// Non-subscriber goals — "don't let the game become upload forever"
const ACHIEVEMENTS = [
  { id: "first_upload",     label: "Upload your first video",      amount: 20,  check: () => state.uploadLog.length >= 1 },
  { id: "first_100_earned", label: "Earn your first $100",         amount: 25,  check: () => state.lifetimeRevenue >= 100 },
  { id: "first_viral",      label: "Go viral for the first time",  amount: 100, check: () => state.hasGoneViral },
  { id: "upload_25",        label: "Upload 25 videos",             amount: 150, check: () => state.uploadLog.length >= 25 },
  { id: "first_sponsor",    label: "Land your first sponsor deal", amount: 200, check: () => state.subs >= 1000 },
];

/* =========================================================================
   COMMENTS — general pools + per-topic pools + situational pools.
   Tone is chosen from the video's live satisfaction/CTR/retention.
   ========================================================================= */
const POSITIVE_COMMENTS = [
  "You deserve way more subscribers than this.", "Can't wait for the next upload!", "Underrated creator, for real.",
  "Quality content as always.", "This is exactly what I needed today.", "The editing on this is so clean.",
  "Instant sub. Didn't even finish the video.", "How does this only have this many views?", "Watched this twice already.",
  "This channel is going to blow up, calling it now.", "Your voice is so calming lol", "The pacing is perfect, no filler.",
  "I showed this to my whole group chat.", "Every upload gets better.", "Notification squad where you at",
  "Came for the thumbnail, stayed for the whole thing.", "This deserves to be on trending.", "Finally someone explains it properly.",
  "Genuinely made my day.", "The ending caught me off guard, well done.", "Been here since the first video, proud of you.",
  "Algorithm, do your thing and push this.", "10/10 no notes.", "Please never stop making these.",
  "I love how real you are on camera.", "Bookmarked this for later, so useful.", "This is my comfort channel now.",
  "Sharing this everywhere.", "Better than half the big channels honestly.", "Subscribed on my second account too.",
  "The music choice is perfect.", "You explain things so well.", "This is the content I signed up for.",
  "Watching from Abuja, keep going!", "Big channels wish they had this energy.", "I needed a laugh today, thank you.",
];
const NEUTRAL_COMMENTS = [
  "The algorithm brought me here.", "First!", "Saving this for later.", "Interesting take, never thought about it that way.",
  "Who's watching this at 3am?", "Anyone else here from the recommended page?", "What camera do you use?",
  "Part 2 when?", "Timestamp for the good part anyone?", "Can you do a tutorial on how you edit?",
  "Not sure I agree but respect the effort.", "Early squad.", "Your mic is a bit quiet, turned it all the way up.",
  "Where's this filmed?", "The intro could be shorter.", "Commenting for the algorithm.",
  "Watching this on my lunch break.", "Do a Q&A soon!", "What's the song at the start?", "Here before 1K views.",
  "Who else is watching with subtitles?", "Drop your setup in the description.", "How long did this take to make?",
  "Anyone here from Ghana?", "I'd love to see a collab with someone.", "Which video should I watch next?",
];
const NEGATIVE_COMMENTS = [
  "Clickbait title honestly...", "Thumbnail lied to me.", "Kinda mid, not gonna lie.", "Skip to the end, you're welcome.",
  "Too much talking, not enough doing.", "The audio is rough.", "Didn't deliver what the title promised.",
  "Felt like it could've been 3 minutes shorter.", "Unsubscribing if the next one is like this.", "Where's the actual content?",
  "The sponsor segment was longer than the video.", "Liked your older stuff better.", "Why is the music so loud?",
  "This felt rushed.", "Same video as last week honestly.", "I lost interest halfway through.",
];
const CLICKBAIT_COMMENTS = [
  "Waited the whole video for the thing in the thumbnail.", "The red circle was the only exciting part.",
  "Title said one thing, video said another.", "I got baited and I'm not even mad. Okay I'm a bit mad.",
  "Next time just show us the actual moment.", "Where was the thing from the thumbnail?", "Bro really put an arrow on nothing.",
];
const SHORTS_COMMENTS = [
  "Replayed this like 10 times.", "The loop is so smooth.", "Why is this so satisfying?", "Came from the Shorts feed, staying for the channel.",
  "Make a full video on this!", "Wait for it...", "Short but it hit.", "My thumb stopped scrolling for this one.",
  "The timing on this is perfect.", "Part 2 please", "I watched this 5 times before I noticed the ending", "Who else rewatched?",
];
const LONG_VIDEO_COMMENTS = {
  good: ["That was a long one but it flew by.", "Worth every minute.", "Perfect video to fall asleep to (in a good way).", "Didn't skip a single second.", "More long videos like this please.", "Watched the whole thing in one go."],
  bad:  ["This could have been half the length.", "Too long, I skipped around a lot.", "Needed chapters, I got lost.", "Great topic but way too drawn out."],
};
const QUICK_VIDEO_COMMENTS = ["Too short! Make it longer next time.", "Wait, that's it?", "Short and sweet, love it.", "Straight to the point, respect."];
const EDIT_COMMENTS = {
  polished: ["The editing is next level.", "How long did this take to edit??", "The transitions are so clean.", "This looks like a TV show."],
  quick:    ["The cuts are a bit rough.", "Audio jumps a few times.", "Kinda felt like a first draft.", "Needs a bit more editing, but good idea."],
};
const MOMENT_COMMENTS = ["{t} had me dying", "{t} is the best part", "Replayed {t} so many times", "The reaction at {t}", "{t} is where it gets good", "Nobody's talking about {t}", "{t} went crazy", "The editing at {t} though", "{t} I was not ready", "Came back just for {t}"];
const TOPIC_TONE = {
  gaming: {
    pos: ["That clutch at the end was insane.", "Your aim is actually cracked.", "The meta is broken and you proved it.", "That play deserves its own video.", "Finally a gaming channel that isn't just yelling.", "Commentary is top tier.", "This strategy actually works, went up two ranks."],
    neu: ["What sensitivity do you play on?", "Drop your loadout please.", "What rank are you right now?", "Which server do you play on?", "Controller or keyboard?"],
    neg: ["That was a throw lol", "You got lucky on that last round.", "This loadout got patched already.", "Mid gameplay, great editing though."],
  },
  tech: {
    pos: ["Finally a review that isn't sponsored to death.", "Great breakdown for non-tech people.", "Bought it because of this video, no regrets.", "That comparison was super helpful.", "Clear, honest and no fluff."],
    neu: ["Battery life test next?", "Is it worth it over last year's model?", "What about the thermals?", "Price in naira?", "Does it work with Android?"],
    neg: ["You didn't mention the price at all.", "This reads like an ad.", "Specs are outdated already.", "Skipped the most important feature."],
  },
  lifestyle: {
    pos: ["Your room setup is so cozy.", "Trying this routine tomorrow.", "This made me want to clean my whole apartment.", "Needed this motivation today.", "The morning light in this video is unreal."],
    neu: ["Where's that lamp from?", "Can you share your weekly planner?", "What time do you sleep?", "What app do you use for notes?"],
    neg: ["This routine is not realistic for most people.", "Feels a bit staged.", "Nobody wakes up looking like that lol"],
  },
  comedy: {
    pos: ["I'm crying.", "The editing timing on the jokes is perfect.", "My stomach hurts from laughing.", "This is peak comedy.", "Sent this to my mom and she laughed too.", "The accent at the end killed me."],
    neu: ["Do one about school next.", "Who else relates way too much?", "Tag someone who does this.", "Part 2 with your friends please."],
    neg: ["This joke has been done before.", "Trying too hard this time.", "Not your funniest, but okay."],
  },
  football: {
    pos: ["That free kick was filthy.", "Tactical breakdowns like this are so rare.", "The commentary voice is killing me.", "That skill move needs a slow-mo replay.", "Best football content on here."],
    neu: ["Rate the goalkeeper next!", "Who's your pick for the league this season?", "Do a 5-a-side challenge next.", "Which club do you support?", "Rate my team next."],
    neg: ["That ranking is biased.", "You left out the best player.", "That wasn't even a foul."],
  },
  cooking: {
    pos: ["Made this tonight, family loved it.", "The sizzle sound is everything.", "This is going in my weekly rotation.", "Easiest recipe I've followed.", "My mouth is watering."],
    neu: ["How long did you marinate it?", "Can I swap the butter for oil?", "Recipe in the description please!", "What brand of rice is that?", "How many people does this feed?"],
    neg: ["That's not how you make jollof.", "Too much oil for me.", "Tried it and burned it, my fault not yours.", "Where are the measurements?"],
  },
};
/* Comments that react to what the video is actually about (matched against the title). */
const KEYWORD_COMMENTS = [
  { re: /ranked|rank/i,            lines: ["What rank did you end on?", "Ranked is pain, respect for grinding it.", "I'm stuck in the same rank lol"] },
  { re: /setup|desk/i,             lines: ["Setup goals.", "Drop the setup list please.", "Cable management is clean."] },
  { re: /recipe|jollof|rice|suya|pancake|burger|noodle/i, lines: ["Trying this recipe this weekend.", "Measurements please!", "Jollof wars are about to start in the comments."] },
  { re: /5am|morning|routine/i,    lines: ["5AM? Respect, I can't.", "Trying this routine tomorrow, wish me luck.", "My alarm is already set."] },
  { re: /react/i,                  lines: ["Your reactions are the best part.", "React to more of these!", "Watching you react is funnier than the video."] },
  { re: /free kick|penalt|skill|goal/i, lines: ["Rate mine next!", "That technique is clean.", "I tried this and nearly broke my foot."] },
  { re: /budget|cheap|naira|expensive/i, lines: ["Budget content is the best content.", "The cheap one won honestly.", "Prices keep going up though."] },
  { re: /24 hours|week|30 days|month/i,  lines: ["The commitment is insane.", "Day 3 is where it got real.", "Do a 100 days version!"] },
  { re: /prank|roommate|friends/i, lines: ["Your friends are too patient with you.", "Their face at the end!", "Do another prank please."] },
  { re: /unbox|gadget|phone|laptop/i, lines: ["That unboxing was satisfying.", "Should I upgrade or wait?", "How's the battery life?"] },
  { re: /challenge/i,              lines: ["I tried this challenge and failed immediately.", "Harder challenge next time!", "Who else is trying this now?"] },
  { re: /tier|rank(ing|ed) every|rated|rate/i, lines: ["Your list is wrong and I respect it.", "Number 3 should be higher.", "Top 3 is correct though."] },
];

/* ---------- commenter handles: patterns x names x words ---------- */
const COMMENTER_FIRST = [
  'kay', 'tobi', 'lena', 'max', 'zara', 'dayo', 'nina', 'jay', 'amaka', 'leo', 'sade', 'chris', 'mira', 'femi', 'ola', 'riya', 'ben', 'ivy', 'kofi', 'eli',
  'noor', 'sam', 'yemi', 'tara', 'tunde', 'chioma', 'emeka', 'ada', 'bola', 'kemi', 'ifeoma', 'segun', 'zainab', 'musa', 'uche', 'nkechi', 'david', 'sarah',
  'mike', 'jess', 'omar', 'layla', 'kwame', 'akosua', 'priya', 'arjun', 'lucas', 'sofia', 'mateo', 'yuki', 'hana', 'jin', 'amir', 'fatima', 'josh', 'chloe',
  'dami', 'seun', 'tolu', 'ngozi', 'ike', 'bisi', 'wale', 'funmi', 'gbenga', 'halima', 'aisha', 'kelechi', 'obinna', 'rita', 'mary', 'john', 'grace', 'peter',
];
const COMMENTER_TAIL = ['_plays', 'watches', '99', 'x', '_tv', '.vibes', '2k', 'official', '_edits', 'lol', '_', 'fan', '07', 'irl', '23', '.real', '_ng', 'tv', '01', '_xo', 'hq', '.jpg', '247', '_again', 'ok', 'fr'];
const HANDLE_WORDS = {
  any:       ['night', 'lazy', 'daily', 'real', 'quiet', 'lucky', 'random', 'sleepy', 'spicy', 'chill', 'golden', 'midnight', 'cosmic', 'tiny', 'loud', 'soft'],
  nouns:     ['owl', 'fox', 'panda', 'mango', 'cloud', 'wave', 'pixel', 'comet', 'tiger', 'lemon', 'rocket', 'koala', 'ghost', 'bean', 'moon', 'sparrow'],
  gaming:    ['clutch', 'noscope', 'respawn', 'lagking', 'headshot', 'grinder', 'speedrun', 'gg', 'loot', 'tryhard'],
  tech:      ['byte', 'techie', 'pixel', 'wired', 'dev', 'circuit', 'gadget', 'reboot', 'kernel', 'hertz'],
  lifestyle: ['cozy', 'matcha', 'plant', 'journal', 'sunrise', 'minimal', 'daydream', 'linen', 'reset', 'bloom'],
  comedy:    ['meme', 'lmao', 'chaos', 'goofy', 'unserious', 'jokes', 'crying', 'silly', 'deadass', 'wahala'],
  football:  ['fc', 'striker', 'tekkers', 'nutmeg', 'topbins', 'keeper', 'ballon', 'derby', 'pitch', 'volley'],
  cooking:   ['chef', 'spice', 'jollof', 'pepper', 'kitchen', 'foodie', 'crumbs', 'sizzle', 'suya', 'bakes'],
};
const pickW = a => a[Math.floor(Math.random() * a.length)];
function randomHandle(topic){
  const first = pickW(COMMENTER_FIRST);
  const topicWords = HANDLE_WORDS[topic] || HANDLE_WORDS.any;
  const r = Math.random();
  let h;
  if (r < 0.3) h = first + pickW(COMMENTER_TAIL);
  else if (r < 0.45) h = first + '_' + pickW(COMMENTER_FIRST);
  else if (r < 0.62) h = pickW(HANDLE_WORDS.any) + pickW(HANDLE_WORDS.nouns) + (Math.random() < 0.5 ? Math.floor(Math.random() * 100) : '');
  else if (r < 0.82) h = (Math.random() < 0.5 ? pickW(topicWords) + '_' + first : first + '.' + pickW(topicWords));
  else if (r < 0.9) h = 'the' + first.charAt(0).toUpperCase() + first.slice(1) + pickW(['Show', 'Life', 'Files', 'Diaries', 'Zone']);
  else h = first + Math.floor(1990 + Math.random() * 20);
  return '@' + h.replace(/\s/g, '');
}

function getLevelInfo(xp){
  xp = typeof xp === 'number' ? xp : (state.xp || 0);
  let current = LEVELS[0];
  for (const l of LEVELS){ if (xp >= l.xp) current = l; }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] || null;
  return { level: current.level, title: current.title, current, next };
}
function gainXP(amount, key){
  if (!amount || amount <= 0) return;
  state.xp = (state.xp || 0) + Math.round(amount);
  state.xpLog = state.xpLog || {};
  state.xpLog[key] = (state.xpLog[key] || 0) + Math.round(amount);
  checkLevelUp();
}

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function rand(min, max){ return min + Math.random() * (max - min); }
function fmt(n){ return Math.floor(n).toLocaleString(); }
function fmtCompact(n){
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/* =========================================================================
   SOUND — all synthesized via Web Audio (no external files, nothing to load
   or fail to fetch). Browsers refuse to run an AudioContext until a genuine
   user gesture occurs, and if it's first created OUTSIDE one (e.g. a sound
   triggered automatically by offline-progress on page load, before the
   player has clicked anything), it can get stuck suspended forever. So we
   deliberately do NOT create the context until the very first real click/tap
   anywhere on the page — every play*Sound() call before that is a no-op.
   ========================================================================= */
let audioCtx = null;
let audioUnlocked = false;

function unlockAudio(){
  if (audioUnlocked) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume().catch(() => {});
    audioUnlocked = true;
    if (window.Music){
      Music.attach(audioCtx);
      if (state.musicEnabled && !window.__bootActive) Music.start(); // the loader has its own soundtrack
    }
  } catch(e){ /* Web Audio unavailable in this environment — sound just stays off */ }
}
['pointerdown', 'click', 'touchstart', 'keydown'].forEach(evt => {
  document.addEventListener(evt, unlockAudio, { once: true, capture: true, passive: true });
});

function ensureAudio(){
  if (!state.soundEnabled || !audioUnlocked || !audioCtx) return null;
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playTone(freq, startSec, durSec, type, peakVol){
  const ctx = ensureAudio();
  if (!ctx || ctx.state !== 'running') return; // still locked/suspended — skip rather than schedule into silence
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + startSec;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peakVol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durSec);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + durSec + 0.03);
  } catch(e){ /* audio is a nice-to-have, never let it break gameplay */ }
}

function playClickSound(){ playTone(600, 0, 0.07, 'sine', 0.14); }
function playErrorSound(){ playTone(190, 0, 0.16, 'sawtooth', 0.14); }
function playCoinSound(){ playTone(988, 0, 0.05, 'square', 0.1); playTone(1319, 0.05, 0.09, 'square', 0.13); }
function playNotifSound(){ playTone(740, 0, 0.09, 'sine', 0.12); }
function playSuccessSound(){ playTone(523, 0, 0.11, 'sine', 0.18); playTone(659, 0.08, 0.11, 'sine', 0.18); playTone(784, 0.16, 0.16, 'sine', 0.2); }
function playLevelUpSound(){ [523, 659, 784, 1047].forEach((f, i) => playTone(f, i * 0.09, 0.14, 'sine', 0.19)); }

function toggleSound(){
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled) playClickSound(); // audible confirmation it's back on
  renderSoundToggle();
}

/* ---------- Music toggle (separate from sound effects) ---------- */
function toggleMusic(){
  state.musicEnabled = !state.musicEnabled;
  unlockAudio();
  if (window.Music){
    if (audioCtx) Music.attach(audioCtx);
    state.musicEnabled ? Music.start() : Music.stop();
  }
  playClickSound();
  renderMusicToggle();
}
function renderMusicToggle(){
  const btn = document.getElementById('music-toggle');
  if (btn){
    btn.classList.toggle('muted', !state.musicEnabled);
    btn.setAttribute('aria-pressed', state.musicEnabled ? 'true' : 'false');
    btn.title = state.musicEnabled ? 'Music on' : 'Music off';
  }
}
// Phones: stop the loop when the tab/app is backgrounded, pick it back up on return.
document.addEventListener('visibilitychange', () => {
  if (!window.Music || !Music.ctx) return;
  if (document.hidden) Music.stop();
  else if (state.musicEnabled && !Ads.busy) Music.start();
});
let hypeMusicUntil = 0; // real-time ms — music switches to the brighter loop for a while after a big moment
function triggerHypeMusic(){
  hypeMusicUntil = Date.now() + 120000;
  if (window.Music) Music.setMood('hype');
}
function renderSoundToggle(){
  const btn = document.getElementById('sound-toggle');
  const icon = document.getElementById('sound-icon');
  if (!btn || !icon) return;
  btn.classList.toggle('muted', !state.soundEnabled);
  icon.innerHTML = state.soundEnabled
    ? `<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8a5 5 0 0 1 0 8"/>`
    : `<path d="M4 9v6h4l5 4V5L8 9H4z"/><line x1="16" y1="9" x2="21" y2="14"/><line x1="21" y1="9" x2="16" y2="14"/>`;
}


/* ---------- State ---------- */
let state = {
  channelName: null,       // set during first-run onboarding
  money: 100,
  subs: 0,
  totalViews: 0,
  watchHours: 0,           // cumulative public watch hours — drives Partner Programme eligibility
  isMonetized: false,      // ad revenue only flows once the Streamly Partner Programme is joined
  partnerAnnounced: false, // guards the one-time congratulations modal
  algoRating: 0,           // channel-level algorithm rating, 0-100 — starts at zero, has to be earned
  level: 1,
  equipTier: { camera: 0, mic: 0, editing: 0, internet: 0, storage: 0 },
  storageUsedGB: 0,
  dataUsedGB: 0,           // resets when the internet bill is paid (fresh billing cycle)
  ispThrottled: false,     // true when a bill went unpaid — speed drops until next payment
  nextBillTick: BILL_CYCLE_TICKS,
  videos: [],
  totalTicks: 0,                                  // global in-game minute counter
  dailySnapshot: { tick: 0, views: 0, subs: 0, money: 100, watchHours: 0 },
  uploadLog: [],                                  // totalTicks of each upload, for "consistency" stat
  uploadCooldownTicksLeft: 0,
  milestonesReached: [],
  achievementsReached: [],
  unlocks: {},
  subFraction: 0,          // carries rounding remainder so tiny per-tick views still add up to subs
  lifetimeRevenue: 0,      // cumulative earnings, never decreases even when money is spent
  adRevenueTotal: 0,       // cumulative ad revenue only — one of the three tracked monetization sources
  sponsorshipRevenue: 0,   // cumulative sponsorship/brand-deal payouts
  membershipRevenue: 0,    // cumulative channel membership payouts (unlocked at 10,000 subs)
  currentHourRevenue: 0,   // ad-revenue accumulator for the in-progress hour, mirrors currentHourViews
  transactions: [],        // recent monetization events, most-recent-first — {type, label, amount, tick}
  hasGoneViral: false,
  audienceMood: null,      // { day, moods: {topicKey: +/-%} } — regenerated once per in-game day
  notifications: [],       // recent event feed, most-recent-first
  soundEnabled: true,
  hourlyViews: [],         // views gained per in-game hour, most-recent-last, capped at 48
  hourlyRevenue: [],       // money earned per in-game hour, most-recent-last, capped at 48 (Monetization chart)
  currentHourViews: 0,     // accumulator for the in-progress hour bucket
  rivals: null,            // lazily initialized from RIVAL_CREATORS on first tick
  creatorFeed: [],         // the in-game "social timeline" — most-recent-first
  lastRankAnnounceDay: -1, // avoids spamming the weekly-rank post more than once/day
  lastUploadTick: 0,       // drives Channel Authority decay after a long break
  topicAffinity: {},       // per-topic learned recommendation boost, 0+
  topicAffinityAnnounced: {}, // one-time "Streamly noticed..." flag per topic
  audienceLoyalty: {},     // per-topic loyalty %, established only once you've posted in that niche
  musicEnabled: true,
  energy: ENERGY_MAX,      // creator energy, 0-100 — drains per upload, regenerates over in-game time
  burnedOut: false,        // hit 0 energy: recovery runs at half speed until back above 50
  coffeeDay: -1,           // in-game day of the last coffee purchase (coffee is capped per day)
  coffeeCount: 0,
  adDay: -1,               // in-game day the rewarded-ad counter belongs to
  adCount: 0,              // rewarded ads watched that day
  freeDataAds: 0,          // "free data" ads used this billing cycle
  collabCooldowns: {},     // rival name -> totalTicks when they'll film with you again
  collabCount: 0,
  xp: 0, xpLog: {}, xpViewCarry: 0,
  dailyHistory: [],        // per in-game day: { views, subs, money } gained, most-recent-last, capped at 90
  dayViews: 0, daySubs: 0, dayMoney: 0, dayShortsViews: 0, dayWatch: 0,
  hourlySubs: [], hourlyWatch: [], currentHourSubs: 0, currentHourWatch: 0,
  fanFunding: false,
  tutorialDone: false,
  theme: 'dark',
  cadence: 'casual', cadStreak: 0, cadDayCount: 0,  // upload plan + streak (see cadence.js)
  live: null,              // the stream in progress, if any
  streamCount: 0, bestStreamPeak: 0, superChatRevenue: 0,
  lfWatchHours: 0,          // long-form watch hours only (Partner Programme path 1)
  shortsRevenueTotal: 0, pendingShortsRevenue: 0,
  playlists: [],            // [{ id, name, videoIds }]
  lastSaved: Date.now(),
};

/* ---------- Channel Authority: the hidden trust score that gates everything ---------- */
// Deliberately punishing near zero — a new channel has to earn its way up.
// Player never sees this number directly; it only shows up as "the algorithm trusts you more."
function getAuthorityMultiplier(){
  return 0.04 + 0.96 * Math.pow(clamp(state.algoRating, 0, 100) / 100, 1.6);
}

/* ---------- Audience Loyalty: subscribers belong to a niche, and pivoting costs you ---------- */
function updateAudienceLoyalty(topicKey, satisfaction){
  const before = typeof state.audienceLoyalty[topicKey] === 'number' ? state.audienceLoyalty[topicKey] : 55;
  const target = clamp(satisfaction, 0, 100);
  state.audienceLoyalty[topicKey] = clamp(before + (target - before) * 0.25, 5, 98);

  // Uploading elsewhere lets loyalty in your OTHER niches drift down — a real dilemma.
  Object.keys(state.audienceLoyalty).forEach(k => {
    if (k === topicKey) return;
    const prev = state.audienceLoyalty[k];
    state.audienceLoyalty[k] = clamp(prev * 0.97, 5, 98);
    [70, 55, 40].forEach(threshold => {
      if (prev >= threshold && state.audienceLoyalty[k] < threshold){
        pushNotification(ic('alert') + ` Your ${TOPICS[k].label} audience loyalty dropped to ${Math.round(state.audienceLoyalty[k])}% — they're not seeing your usual content.`);
      }
    });
  });
}

/* ---------- Algorithm learning: consistently good performance in a topic earns a standing boost ---------- */
function updateTopicAffinity(topicKey, video){
  if (video.retention < 60 && video.satisfaction < 65) return;
  state.topicAffinity[topicKey] = clamp((state.topicAffinity[topicKey] || 0) + rand(1.5, 3.5), 0, 25);
  if (state.topicAffinity[topicKey] >= 12 && !state.topicAffinityAnnounced[topicKey]){
    state.topicAffinityAnnounced[topicKey] = true;
    pushNotification(ic('brain') + ` Streamly has noticed viewers enjoy your ${TOPICS[topicKey].label} videos. ${TOPICS[topicKey].label} uploads now receive a small recommendation boost.`);
  }
}

function channelQuality(){
  const e = state.equipTier;
  return EQUIPMENT.camera.tiers[e.camera].quality
       + EQUIPMENT.mic.tiers[e.mic].quality
       + EQUIPMENT.editing.tiers[e.editing].quality; // max ~76
}

/* ---------- Notifications feed ---------- */
function pushNotification(text){
  state.notifications.unshift({ text, tick: state.totalTicks });
  if (state.notifications.length > 30) state.notifications.length = 30;
}

/* ---------- Monetization transaction ledger (Monetization tab — Recent Transactions) ---------- */
function pushTransaction(type, label, amount){
  state.transactions.unshift({ type, label, amount, tick: state.totalTicks });
  if (state.transactions.length > 30) state.transactions.length = 30;
}

/* ---------- Audience mood: which topics are hot today, regenerates once per in-game day ---------- */
function ensureAudienceMood(){
  const day = clockDay();
  if (!state.audienceMood || state.audienceMood.day !== day){
    // the day plays out close to the Calendar's forecast, give or take a few points
    const fc = typeof forecastMoods === 'function' ? forecastMoods(day) : null;
    const moods = {};
    Object.keys(TOPICS).forEach(k => { moods[k] = fc && typeof fc[k] === 'number' ? clamp(Math.round(fc[k] + rand(-4, 4)), -25, 35) : Math.round(rand(-25, 35)); });
    state.audienceMood = { day, moods };
    if (typeof reviseForecasts === 'function') reviseForecasts(day);
    const [bestKey, bestVal] = Object.entries(moods).sort((a, b) => b[1] - a[1])[0];
    if (bestVal >= 20){
      showToast(ic('fire') + ` ${TOPICS[bestKey].label} is trending today (+${bestVal}%)`, true);
    }
  }
  return state.audienceMood;
}

/* ---------- Video factory ---------- */
/* =========================================================================
   TITLES — a general bank per topic, plus Shorts-only and long-form-only
   banks. generateTitle() picks by format and length and avoids repeating
   anything you've posted recently. Rivals draw from TITLE_BANK too.
   ========================================================================= */
const TITLE_BANK = {
  gaming: [
    "Trying a New Gaming Setup", "I Broke the Meta in Ranked", "This Loadout is Actually Broken", "I Played Ranked for 10 Hours Straight",
    "The Most Toxic Lobby I've Ever Been In", "Ranking Every Weapon From Worst to Best", "I Only Used the Worst Gun All Game",
    "Carrying My Little Brother to Victory", "This Glitch Should Not Exist", "I Tried the Hardest Challenge in the Game",
    "Beating the Game Without Taking Damage", "My First Time Playing This Game", "Pro Tips Nobody Tells You",
    "I Copied a Pro Player's Settings", "Playing With Random Teammates Until We Win", "Is This the Best Update Ever?",
    "I Lost Every Match, Then This Happened", "Budget Gaming Setup vs Expensive Setup", "The Clutch That Saved My Rank",
    "Speedrunning a Game I've Never Played", "I Hosted a Tournament for My Subscribers", "Why Everyone Is Quitting This Game",
    "Reacting to My First Ever Gameplay", "One Life Only Challenge", "Unlocking Everything in One Day",
  ],
  comedy: [
    "I Was NOT Ready For This", "Reacting to My Old Videos", "This Went Wrong Immediately", "Pranking My Roommate for a Week",
    "Trying Weird Life Hacks So You Don't Have To", "Reading Your Worst Comments Out Loud", "I Let My Subscribers Control My Day",
    "Things Every Nigerian Parent Says", "Types of People at a Wedding", "I Tried Stand-Up Comedy for the First Time",
    "Acting Out My Childhood Memories", "Rating Viral Videos With My Friends", "If Streamers Worked Normal Jobs",
    "The Most Awkward Moment of My Life", "Speaking Only in Movie Quotes for a Day", "My Friends Roasted My Channel",
    "Trying to Make My Mum Laugh", "Recreating Old Memes in Real Life", "Every Group Chat Has These People",
    "I Said Yes to Everything for 24 Hours", "Bad Advice Only", "Guess Who Is Lying", "Explaining the Internet to My Grandma",
    "Worst Job Interview Ever", "Things That Just Make Sense",
  ],
  football: [
    "This Skill Move NOBODY Expected", "Rating Free Kicks From 0-100", "The Craziest Comeback I've Seen", "I Trained Like a Pro for a Week",
    "Crossbar Challenge With My Friends", "Top 10 Goals of the Season", "Reacting to the Worst Referee Decisions",
    "Can I Score From the Halfway Line?", "Sunday League vs Academy Players", "Predicting the Whole Season",
    "Recreating Iconic Goals", "1v1 Against a Former Pro", "The Best Tekkers in the Street", "Every Penalty Taker Ranked",
    "Transfer Window Winners and Losers", "My Dream Team Lineup", "Why This Team Keeps Losing", "Learning a Skill in 7 Days",
    "Street Football in Lagos", "Goalkeeper for a Day", "The Most Underrated Player Right Now", "Watching the Derby Live Reaction",
    "Juggling Challenge: Can I Beat My Record?", "Fans Picked My Team", "Rating Every Kit This Season",
  ],
  tech: [
    "I Tried the New Setup for a Week", "This Gadget Changed My Workflow", "Unboxing the Weirdest Tech I Own", "Cheap vs Expensive Earbuds",
    "I Used a Budget Phone for 30 Days", "My Desk Setup Tour", "Tech I Regret Buying", "Is This Laptop Worth the Hype?",
    "Building a PC for My Little Brother", "10 Apps You Need on Your Phone", "I Fixed My Broken Phone Myself",
    "Testing Viral Gadgets From the Internet", "The Best Budget Mic for Creators", "How I Edit My Videos", "Phone Camera Test at Night",
    "Smartwatch After 6 Months", "Every Phone I've Owned Ranked", "Wireless Charging Is a Scam?", "Testing the Fastest Charger",
    "My Streaming Setup on a Budget", "Tech Under 10K Naira", "I Tried Living Without My Phone", "Upgrading My Old Laptop",
    "Gadgets That Actually Make Life Easier", "Explaining AI in 10 Minutes",
  ],
  lifestyle: [
    "A Day in My Life as a Creator", "I Tried Waking Up at 5AM", "Redesigning My Whole Room", "My Morning Routine That Changed Everything",
    "What I Eat in a Day", "Cleaning My Entire Apartment", "Living on a Tight Budget for a Week", "My Night Routine",
    "Moving Into My First Apartment", "Things I Wish I Knew at 18", "Organizing My Life for the New Year", "A Week of Studying",
    "My Honest Thoughts on Hustle Culture", "Trying a Digital Detox", "Weekend Vlog: Just Vibes", "Room Tour 2026",
    "How I Stay Productive", "I Went to the Gym Every Day for a Month", "Answering Your Questions", "Budget Room Makeover",
    "Spend the Day With Me", "Habits That Changed My Life", "My Skincare Routine", "Rating My Old Outfits", "Rainy Day Reset",
  ],
  cooking: [
    "1 AM Cooking Stream Gone Wrong", "Cooking With Only 3 Ingredients", "I Tried a Viral Recipe", "Making Jollof for the First Time",
    "Cheap vs Expensive Burger", "Cooking My Mum's Recipe", "Street Food Taste Test", "I Cooked for My Friends and They Rated It",
    "Perfect Fried Rice Every Time", "Easy Meals for Students", "Trying Food From 5 Countries", "Making Pancakes 3 Ways",
    "The Spiciest Thing I've Ever Cooked", "One Pot Meals for Lazy Days", "Recreating a Restaurant Dish at Home",
    "Cooking With Leftovers Only", "My Go-To Breakfast", "Baking Without an Oven", "Making Suya at Home", "Meal Prep for the Week",
    "Rating Instant Noodles", "Chef vs Home Cook", "I Only Ate Homemade Food for a Week", "Quick Snacks Under 10 Minutes",
    "The Ultimate Pepper Soup",
  ],
};
const SHORTS_TITLES = {
  gaming:    ["Wait for the ending", "This clutch was insane", "1 HP comeback", "POV: your teammate finally plays", "Rate this play 1-10", "How did this hit?", "The cleanest shot of my life", "Nobody saw this coming", "Lag or skill?", "When the game glitches perfectly"],
  comedy:    ["POV: your mum sees the light bill", "When the teacher says 'group work'", "Every Nigerian aunty at a party", "Me pretending to understand", "Wait for it", "When the WiFi dies mid-game", "Things that just make sense", "Bro thought he did something", "Why is this so true?", "The awkward handshake"],
  football:  ["Top bins", "Did he really just do that?", "Rate this free kick", "Nutmeg of the year", "Keeper had no chance", "The ref missed this", "Skill check", "One touch finish", "Wait for the celebration", "Corner kick straight in"],
  tech:      ["This gadget is too smart", "Hidden phone trick", "3 settings to change right now", "Cheap vs expensive in 30 seconds", "You're charging wrong", "Satisfying unboxing", "This app is free?", "Tiny gadget, big upgrade", "Desk setup glow up", "Try this shortcut"],
  lifestyle: ["5AM check-in", "Room reset in 60 seconds", "Small habit, big change", "What I spent today", "Get ready with me", "Clean with me", "My desk before and after", "Tiny apartment hack", "Morning motivation", "The 2 minute rule"],
  cooking:   ["Crispiest eggs ever", "3 ingredient snack", "Wait for the sizzle", "The only way to cook rice", "Rate this plate", "Midnight noodles", "Don't skip this step", "Quick breakfast hack", "Is this too much pepper?", "The perfect flip"],
};
const LONG_TITLES = {
  gaming:    ["I Played 24 Hours Straight: Here's What Happened", "The Complete Beginner's Guide", "From Worst to Best: Full Ranked Journey", "Every Secret in the Game Explained", "The Full Story of My Worst Losing Streak"],
  comedy:    ["24 Hours of Saying Yes", "The Longest Prank I've Ever Pulled", "Reacting to Every Video I've Ever Made", "Our Most Chaotic Group Trip", "One Full Day as My Little Brother"],
  football:  ["Full Season Review: Every Team Rated", "I Trained With an Academy for a Whole Day", "The Complete History of the Derby", "Tactics Explained for Beginners", "Every Goal I Scored This Year"],
  tech:      ["The Ultimate Buying Guide", "My Complete Editing Workflow", "30 Days With a Budget Phone: Full Review", "Building My Dream Setup From Scratch", "Every Gadget on My Desk Explained"],
  lifestyle: ["A Full Week in My Life", "I Changed My Whole Routine for 30 Days", "The Complete Room Transformation", "Honest Q&A: Everything You Asked", "Moving Out: The Full Story"],
  cooking:   ["Cooking a Full Party Menu", "The Complete Guide to Jollof", "7 Days, 7 Countries, 7 Dishes", "Feeding My Whole Family for a Week", "Everything I Learned From Culinary School Videos"],
};
function generateTitle(topicKey, formatKey, lengthKey, typeId){
  let pool;
  const typed = typeId && TYPE_TITLES[topicKey] && TYPE_TITLES[topicKey][typeId];
  if (typed && formatKey === 'shorts') pool = Math.random() < 0.55 ? SHORTS_TITLES[topicKey] : typed;
  else if (typed) pool = Math.random() < 0.85 ? typed : ((lengthKey === 'm15' || lengthKey === 'm25') ? LONG_TITLES[topicKey] : TITLE_BANK[topicKey]);
  else if (formatKey === 'shorts') pool = Math.random() < 0.75 ? SHORTS_TITLES[topicKey] : TITLE_BANK[topicKey];
  else if (lengthKey === 'm15' || lengthKey === 'm25') pool = Math.random() < 0.45 ? LONG_TITLES[topicKey] : TITLE_BANK[topicKey];
  else pool = TITLE_BANK[topicKey];
  pool = pool || TITLE_BANK.gaming;
  // don't repeat any of your last 20 titles if there's something fresh left
  const recent = new Set((state.videos || []).slice(-20).map(v => v.title));
  const fresh = pool.filter(t => ![...recent].some(r => r.indexOf(t) !== -1));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}
const CURIOSITY_WRAPS = ["You Won't Believe What Happened: {t}", "{t} (Gone Wrong)", "Nobody Expected This: {t}", "{t}... The Ending Shocked Me", "I Can't Believe This Worked: {t}", "{t} (Watch Till the End)"];
const QUESTION_WRAPS = ["{t}?", "{t}... Am I Wrong?", "Why Does Nobody Talk About This? {t}", "{t} (Honest Opinion?)", "Be Honest: {t}?"];
function applyTitleStyle(title, styleKey){
  const wrap = (list) => list[Math.floor(Math.random() * list.length)].replace('{t}', title);
  if (styleKey === 'curiosity') return wrap(CURIOSITY_WRAPS);
  if (styleKey === 'question') return /\?$/.test(title) ? title : wrap(QUESTION_WRAPS);
  return title;
}

/* When something changes a video's algorithm score after it was created (content type, channel
   identity), its reach ceiling has to follow, or the bonus would never show up in views. */
function rescaleCapForScore(v, oldScore){
  if (!Number.isFinite(v.authorityCap)) return;
  const qf = s => clamp(0.15 + (s / 100) * 0.85, 0.15, 1.0);
  v.authorityCap *= qf(v.algorithmScore) / qf(oldScore);
}

/* One thumbnail variant's CTR — shared by normal uploads and both sides of an A/B test. */
function variantCTR(thumbKey, topicKey, titleStyle, format, algorithmScore, loyalty){
  const thumb = THUMBNAILS[thumbKey] || THUMBNAILS.clean;
  const fit = (THUMB_TOPIC_FIT[topicKey] || {})[thumbKey] || 0;
  return clamp(5 + thumb.ctrBonus * 0.55 + fit + titleStyle.ctrBonus * 0.5 + format.ctrBonus * 0.4
             + algorithmScore * 0.15 + (loyalty - 55) * 0.15 + rand(-3, 3), 1, 97);
}

/* Average share of a video people actually watch. Retention (the algorithm's view of how well
   a video holds people) stays the same; longer videos just get watched less of the way through. */
const LENGTH_VIEW_FACTOR = { m3: 0.86, m8: 0.68, m15: 0.55, m25: 0.45 };
const BOUNCE_FACTOR = 0.85; // ~15% of views leave in the first few seconds (wrong click, wrong video)
function viewFraction(v){
  const r = (v.retention || 0) / 100;
  if (v.format === 'shorts') return clamp(r * 0.92, 0, 1);
  return clamp(r * (LENGTH_VIEW_FACTOR[v.length] || 0.6) * BOUNCE_FACTOR, 0, 1);
}
function calcWatchTimeSec(v){ return Math.round((v.durationSec || 0) * viewFraction(v)); }
function shownRetention(v){ return Math.round(viewFraction(v) * 100); }

/* extras: { fatigue, abThumb, collab: { name, subs, topic } } — all optional */
function createVideo(topicKey, thumbKey, lengthKey, effortKey, titleStyleKey, formatKey, extras){
  extras = extras || {};
  titleStyleKey = titleStyleKey || 'normal';
  formatKey = FORMATS[formatKey] ? formatKey : 'longform';
  const topic = TOPICS[topicKey];
  const thumb = THUMBNAILS[thumbKey];
  const length = LENGTHS[lengthKey];
  const effort = EFFORTS[effortKey];
  const titleStyle = TITLE_STYLES[titleStyleKey] || TITLE_STYLES.normal;
  const format = FORMATS[formatKey];
  const quality = channelQuality();
  const mood = ensureAudienceMood();
  const moodPct = mood.moods[topicKey] || 0;
  const loyalty = typeof state.audienceLoyalty[topicKey] === 'number' ? state.audienceLoyalty[topicKey] : 55;
  const affinityBonus = state.topicAffinity[topicKey] || 0;

  // A brand new channel (algoRating 0, base equipment) should score low —
  // traction has to be earned by building algoRating and upgrading gear/choices.
  const base = topic.popularity * 0.22 + quality * 0.35 + state.algoRating * 0.45
             + thumb.algoBonus + effort.qualityBonus + format.algoBonus + moodPct * 0.3
             + (loyalty - 55) * 0.22 + affinityBonus * 0.6;
  const fatigue = extras.fatigue || 0;             // tired creator = rushed content, whatever the edit effort
  const collabBoost = extras.collab ? 8 : 0;       // a bigger creator's audience gives the algorithm a head start
  const algorithmScore = clamp(base + rand(-8, 8) - fatigue * 0.45 + collabBoost, 0, 100);

  // A/B test: both variants get their own CTR; while testing, the video shows the average.
  const ctrA = variantCTR(thumbKey, topicKey, titleStyle, format, algorithmScore, loyalty);
  let ctr = ctrA, ab = null;
  if (extras.abThumb && THUMBNAILS[extras.abThumb] && extras.abThumb !== thumbKey){
    const ctrB = variantCTR(extras.abThumb, topicKey, titleStyle, format, algorithmScore, loyalty);
    ab = { a: thumbKey, b: extras.abThumb, ctrA, ctrB, resolved: false, winner: null };
    ctr = (ctrA + ctrB) / 2;
  }
  // Shorts naturally hold attention differently than long-form, so they get their own retention baseline.
  const retention = clamp((format.fixedDurationSec
    ? clamp(58 + quality * 0.2 + effort.qualityBonus * 0.4 + rand(-8, 8), 10, 98)
    : clamp(40 + length.retentionBonus + quality * 0.3 + effort.qualityBonus * 0.5, 5, 98)) - fatigue * 0.25, 5, 98);

  const video = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
    title: extras.collab
      ? `Ft. ${extras.collab.name} — ${applyTitleStyle(generateTitle(topicKey, formatKey, lengthKey, findType(topicKey, extras.ctype).id), titleStyleKey)}`
      : applyTitleStyle(generateTitle(topicKey, formatKey, lengthKey, findType(topicKey, extras.ctype).id), titleStyleKey),
    ab,
    collab: extras.collab ? { name: extras.collab.name, subs: extras.collab.subs, resolved: false } : null,
    fatigued: fatigue > 0,
    topic: topicKey, thumb: thumbKey, length: lengthKey, effort: effortKey, titleStyle: titleStyleKey, format: formatKey,
    algorithmScore, ctr, retention,
    authorityCap: (() => {
      // Nth upload sets the base ceiling; a real subscriber base lifts it (they show up for you).
      const raw = Math.max(authorityCeiling(state.uploadLog.length + 1), state.subs * 0.6);
      if (!Number.isFinite(raw)) return Infinity;
      // Quality known immediately — a weak video shouldn't get to "wait and see" its way to the max.
      const qualityFrac = clamp(0.15 + (algorithmScore / 100) * 0.85, 0.15, 1.0);
      // A collab borrows a bigger channel's reach, so it isn't held to your own authority ceiling as tightly.
      return raw * qualityFrac * (extras.collab ? 4 : 1);
    })(),
    revenueMult: length.revenueMult * format.revenueMult,
    age: 0,               // ticks since upload
    status: "testing",    // testing -> recommended -> slowing -> trending -> quiet (never fully "done")
    views: 0,
    rate: 0,
    baseRate: 0,
    peakRate: 0,
    rateCeiling: 0,
    floorRate: 0,
    rampTicks: 0,
    decayFactor: 0.975,
    pulseChance: 0,
    outcomeDecided: false,
    pulseCount: 0,
    viewMilestonesHit: [],
    expanded: false,
    publishPhase: 'live', // overwritten to 'uploading' by the upload sequence for a freshly-created video
  };

  video.madeAt = state.totalTicks; video.moodAtMake = moodPct; video.crowdAtMake = (state.topicCrowd || {})[topicKey] || 0;   // re-judged if it's scheduled for another day
  applyContentTypePre(video, extras.ctype);   // what the video is about: challenge, guide, review...
  applyIdentityPre(video);                    // what your channel is known for
  deriveVideoFlavor(video); // sets entertainment/educational/satisfaction/watchTime + generates comments
  applyContentTypePost(video);
  applyIdentityPost(video);
  updateAudienceLoyalty(topicKey, video.satisfaction);
  updateTopicAffinity(topicKey, video);
  state.lastUploadTick = state.totalTicks;

  if (video.satisfaction >= 88){
    showToast(ic('heart') + ` Your audience loved "${video.title}"`, true);
  }

  return video;
}

/* Computes the hidden personality traits + comments for a video, from whatever
   topic/thumb/length/retention it has. Used both for brand-new uploads AND to
   backfill legacy videos from a save made before this feature existed — so an
   old video never just sits flat at 50/50/0, it gets a real, varied profile. */
function deriveVideoFlavor(v){
  const thumb = THUMBNAILS[v.thumb] || THUMBNAILS.clean;
  const length = LENGTHS[v.length] || LENGTHS.m8;
  const effort = EFFORTS[v.effort] || EFFORTS.standard;
  const titleStyle = TITLE_STYLES[v.titleStyle] || TITLE_STYLES.normal;
  const format = FORMATS[v.format] || FORMATS.longform;
  const retention = typeof v.retention === 'number' ? v.retention : 50;

  v.entertainment = clamp(35 + (v.topic === 'comedy' || v.topic === 'gaming' ? 15 : 0) + thumb.ctrBonus * 0.5 + rand(-15, 15), 5, 100);
  v.educational = clamp(25 + (v.topic === 'tech' || v.topic === 'cooking' ? 20 : 0) + effort.qualityBonus * 0.8 + rand(-15, 15), 5, 100);
  v.satisfaction = clamp(
    50 + (retention - 50) * 0.6 + (v.entertainment - 50) * 0.2
       - (thumb.satisfactionPenalty || 0) * 0.4 + (titleStyle.satisfactionBonus || 0) * 0.6
       + rand(-8, 8),
    5, 99
  );
  if (!v.durationSec || v.durationSec === length.durationSec || v.durationSec === format.fixedDurationSec){
    v.durationSec = format.fixedDurationSec
      ? seededInt(v.id + ':dur', 14, 59)                                                   // Shorts: 0:14 - 0:59
      : Math.round(length.durationSec * (0.9 + seededInt(v.id + ':dur', 0, 1000) / 1000 * 0.14)); // 25 min -> 22:30 - 26:00
  }
  v.watchTimeSec = calcWatchTimeSec(v);
  v.comments = generateComments(v);
}

/* One comment that fits THIS video: its topic, what the title is about, Shorts vs long-form,
   length, editing effort, whether the thumbnail over-promised, and how it's doing right now. */
function makeComment(v){
  const sat = v.satisfaction || 50, ret = v.retention || 50, ctr = v.ctr || 5;
  const posChance = clamp(0.35 + (sat - 50) / 130, 0.12, 0.92);
  const tone = Math.random() < posChance ? 'pos' : Math.random() < 0.55 ? 'neu' : 'neg';
  const baited = ctr >= 18 && ret < 42 && (v.thumb === 'shock' || v.titleStyle === 'curiosity');
  const isShort = v.format === 'shorts';
  const longForm = !isShort && (v.length === 'm15' || v.length === 'm25');
  const title = v.title || '';
  const say = (text) => ({ by: randomHandle(v.topic), text, likes: Math.floor(Math.pow(Math.random(), 3) * Math.max(3, (v.views || 0) * 0.02)) });
  const r = Math.random();

  if (baited && r < 0.35) return say(pickW(CLICKBAIT_COMMENTS));
  if (r < 0.2){
    const kw = KEYWORD_COMMENTS.filter(k => k.re.test(title));
    if (kw.length) return say(pickW(pickW(kw).lines));
  }
  if (r < 0.32){
    if (isShort) return say(pickW(SHORTS_COMMENTS));
    if (longForm) return say(pickW(ret >= 45 ? LONG_VIDEO_COMMENTS.good : LONG_VIDEO_COMMENTS.bad));
    if (v.length === 'm3') return say(pickW(QUICK_VIDEO_COMMENTS));
  }
  if (r < 0.42 && !isShort && (v.durationSec || 0) >= 120){
    // timestamps always land inside the real video length
    const t = Math.floor(rand(15, (v.durationSec || 120) - 5));
    return say(pickW(MOMENT_COMMENTS).replace('{t}', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`));
  }
  if (r < 0.5 && (v.effort === 'polished' || v.effort === 'quick')) return say(pickW(EDIT_COMMENTS[v.effort]));
  if (r < 0.56){
    if (v.status === 'trending') return say(pickW(["Who's here after this blew up?", "The algorithm finally did its job.", "From 0 to trending, crazy.", "This is everywhere on my feed."]));
    if (v.collab && v.collab.name) return say(pickW([`Came from ${v.collab.name}'s channel, instant sub.`, `You and ${v.collab.name} need to do this again.`, `${v.collab.name} brought me here!`]));
    if (state.subs < 100) return say(pickW(["Early gang, you're going to blow up.", "Found you before you got big.", "Only this many subs?? Criminal."]));
  }
  if (v.ctArch && TYPE_COMMENTS[v.ctArch] && Math.random() < 0.35) return say(pickW(TYPE_COMMENTS[v.ctArch][tone]));
  const topicPool = TOPIC_TONE[v.topic] && TOPIC_TONE[v.topic][tone];
  if (topicPool && Math.random() < 0.55) return say(pickW(topicPool));
  return say(pickW(tone === 'pos' ? POSITIVE_COMMENTS : tone === 'neu' ? NEUTRAL_COMMENTS : NEGATIVE_COMMENTS));
}
function generateComments(v){
  const n = Math.floor(rand(2, 4));
  const out = [];
  for (let i = 0; i < n; i++) out.push(makeComment(v));
  return out;
}
function commentHTML(c){
  if (typeof c === 'string') return `<div class="comment-line">${c}</div>`; // saves from before handles existed
  return `<div class="comment-line"><span class="c-by">${c.by}</span><span class="c-text">${c.text}</span>${c.likes ? `<span class="c-likes">${ic('heart')}${fmtCompact(c.likes)}</span>` : ''}</div>`;
}

/* ---------- Outcome roll: decides the video's growth "personality", not a single number ---------- */
/* A brand-new channel simply can't reach big numbers yet, no matter how the score rolls —
   this hard-caps how far a video CAN grow based on how many videos have been posted so far,
   independent of algorithmScore. Anchors match the requested progression:
   #1: 5-50, #5: 20-200, #10: 100-1,000, #30: 1,000-8,000, #100+: uncapped. */
function authorityCeiling(uploadNumber){
  const anchors = [ { n: 1, max: 50 }, { n: 5, max: 200 }, { n: 10, max: 1000 }, { n: 30, max: 8000 }, { n: 100, max: 5000000 } ];
  if (uploadNumber >= 100) return Infinity;
  for (let i = 0; i < anchors.length - 1; i++){
    const a = anchors[i], b = anchors[i + 1];
    if (uploadNumber <= b.n){
      const t = clamp((uploadNumber - a.n) / (b.n - a.n), 0, 1);
      return Math.exp(Math.log(a.max) + t * (Math.log(b.max) - Math.log(a.max)));
    }
  }
  return Infinity;
}

/* 0 for a brand-new channel, ~0.75 around 1K subs / 4K hours, ~1 at 100K subs.
   Bigger channels get fewer dead uploads, more viral rolls and more day-one views. */
function channelStrength(){
  const subsPart = Math.log10(state.subs + 1) / 5;
  const hoursPart = Math.log10(state.watchHours + 1) / 4.6;
  return clamp(subsPart * 0.65 + hoursPart * 0.35, 0, 1.2);
}

function decideOutcome(v){
  const score = v.algorithmScore;
  const strength = channelStrength();
  // Viral chance: ~1% brand new, ~3% at 100 subs, ~7% at 1K, ~11% at 10K, ~17% at 100K+.
  const CT = archOf(v);
  const deadChance  = clamp(45 - score * 0.42 - strength * 14, 5, 45) * (CT ? CT.dead : 1);
  const viralChance = clamp(0.8 + strength * strength * 14 + Math.max(0, score - 45) * 0.15, 0.8, 20) * (CT ? CT.viral : 1);
  const roll = rand(0, 100);

  let outcomeType, floorFrac;
  if (roll < deadChance) {
    outcomeType = "dead";
    v.baseRate = rand(4, 12);
    v.rateCeiling = rand(400, 1200);
    v.decayFactor = 0.965;
    v.pulseChance = 0.0002 + score / 600000;
    floorFrac = rand(0.08, 0.25);
    state.algoRating = clamp(state.algoRating - 1, 0, 100);
    showToast(ic('chat') + ` "${v.title}" isn't getting picked up... yet.`);
  } else if (roll > 100 - viralChance) {
    outcomeType = "viral";
    v.baseRate = 320 + score * 14;
    v.rateCeiling = rand(900000, 3000000);
    // A small channel going viral is a breakout: it outgrows its authority ceiling, but not to
    // big-creator numbers. The bigger the channel, the bigger a viral hit can get.
    if (Number.isFinite(v.authorityCap)){
      v.authorityCap = Math.max(v.authorityCap, rand(3000, 15000) * (1 + strength * 4));
      v.breakout = strength < 0.5;
    }
    v.decayFactor = 0.958;
    v.pulseChance = 0.0012 + score / 70000;
    floorFrac = rand(0.01, 0.04);
    state.algoRating = clamp(state.algoRating + 3, 0, 100);
    state.hasGoneViral = true;
    showToast(ic('fire') + (v.breakout ? ` Breakout! "${v.title}" is blowing up way past your usual numbers.` : ` "${v.title}" went viral!`), true);
    gainXP(300, 'viral');
    triggerHypeMusic();
  } else {
    outcomeType = "normal";
    v.baseRate = 14 + score * 1.0 + Math.min(state.subs * 0.001, 400) * (v.notifyShare || 1) * (typeof demoFanMult === 'function' ? demoFanMult() : 1); // subscribers see it on day one, fans most of all (less so if you've flooded their feed)
    v.rateCeiling = rand(15000, 90000) * (1 + strength);
    v.decayFactor = 0.978;
    v.pulseChance = 0.0006 + score / 150000;
    floorFrac = rand(0.03, 0.10);
    state.algoRating = clamp(state.algoRating + 0.6, 0, 100);
  }

  // Content type shapes the curve: news spikes and dies, guides start slow and last.
  {
    const r = applyContentTypeOutcome(v, { baseRate: v.baseRate, floorFrac, decayFactor: v.decayFactor, pulseChance: v.pulseChance });
    v.baseRate = r.baseRate; floorFrac = r.floorFrac; v.decayFactor = r.decayFactor; v.pulseChance = r.pulseChance;
    v.spikeMult = r.spike || 1;
  }
  v.baseRate *= timeOfDayMult(typeof v.publishHour === 'number' ? v.publishHour : Math.floor(clockMinute(state.totalTicks) / 60));
  // Retention and satisfaction nudge decay speed: sticky, well-loved videos decline slower.
  v.decayFactor = clamp(v.decayFactor + (v.retention - 50) / 2500 + (v.satisfaction - 50) / 4000, 0.92, 0.996);

  // A new channel's video genuinely cannot exceed this yet (already quality-scaled at creation time).
  if (Number.isFinite(v.authorityCap)){
    v.rateCeiling = Math.min(v.rateCeiling, v.authorityCap);
    v.baseRate = Math.min(v.baseRate, v.authorityCap * 0.12 * Math.max(1, v.spikeMult || 1)); // news gets its day-one burst
  }
  v.floorRate = v.baseRate * floorFrac; // a real trickle — always less than the starting rate
  v.rate = v.baseRate;
  v.peakRate = v.baseRate;
  v.outcomeType = outcomeType;
  v.outcomeDecided = true;
  contentTypeAftermath(v);

  // Explicit quality penalty: a genuinely low-scoring upload dents authority even when it
  // doesn't happen to hit the "dead" roll — consistently mismatched/rushed content adds up.
  if (score < 25){
    state.algoRating = clamp(state.algoRating - 0.8, 0, 100);
  }

  // Subscribers, narrated instead of a bare number — real creators reason about *why*.
  if (outcomeType !== "dead"){
    if (v.retention >= 62){
      pushNotification(ic('fire') + ` People are subscribing because they're enjoying "${v.title}".`);
    } else if (v.ctr >= 25 && v.retention < 45){
      pushNotification(ic('eye') + ` Lots of clicks on "${v.title}", but not many stayed to subscribe. Maybe the thumbnail overpromised.`);
    } else {
      pushNotification(ic('eye') + ` Many viewers watched "${v.title}" but didn't subscribe. Maybe improve your call to action.`);
    }
  }
}

/* ---------- A/B thumbnail test: runs during the testing phase, the better CTR wins ---------- */
function resolveABTest(v){
  const ab = v.ab;
  const winnerIsB = ab.ctrB > ab.ctrA;
  const winKey = winnerIsB ? ab.b : ab.a, loseKey = winnerIsB ? ab.a : ab.b;
  const winCtr = Math.max(ab.ctrA, ab.ctrB), loseCtr = Math.min(ab.ctrA, ab.ctrB);
  ab.resolved = true;
  ab.winner = winnerIsB ? 'b' : 'a';
  gainXP(30, 'abtest');
  v.ctr = clamp(winCtr + 1.5, 1, 97); // shipping the proven thumbnail beats guessing
  v.baseCtr = v.ctr; v.ctrDrift = 0;
  if (winnerIsB){
    const A = THUMBNAILS[ab.a], B = THUMBNAILS[ab.b];
    v.thumb = ab.b;
    v.algorithmScore = clamp(v.algorithmScore + (B.algoBonus - A.algoBonus), 0, 100);
    v.satisfaction = clamp(v.satisfaction + (A.satisfactionPenalty - B.satisfactionPenalty) * 0.4, 5, 99);
  }
  pushNotification(ic('split') + ` A/B test on "${v.title}": ${THUMBNAILS[winKey].label} beat ${THUMBNAILS[loseKey].label} (${winCtr.toFixed(1)}% vs ${loseCtr.toFixed(1)}% CTR).`);
  if (!offlineFastForward) showToast(ic('split') + ` A/B test done — the ${THUMBNAILS[winKey].label} thumbnail won with ${winCtr.toFixed(1)}% CTR`, true);
}

/* ---------- Collab payoff: a one-time pull from the partner's audience ---------- */
function resolveCollab(v){
  const c = v.collab;
  c.resolved = true;
  const flopChance = clamp(40 - v.algorithmScore * 0.45, 8, 40);
  const rival = ensureRivals().find(r => r.name === c.name);
  let gained;
  if (rand(0, 100) < flopChance){
    gained = Math.round(c.subs * rand(0.0003, 0.001));
    c.flopped = true;
    if (rival) adjustRel(rival, 5);
    pushNotification(ic('users') + ` The collab with ${c.name} didn't land — their audience wasn't feeling it. +${fmt(gained)} subscribers.`);
    if (!offlineFastForward) showToast(ic('users') + ` Collab with ${c.name} flopped — only +${fmt(gained)} subs`, true);
  } else {
    gained = Math.round(c.subs * rand(0.004, 0.012) * (0.5 + v.algorithmScore / 100) * (rival ? relCollabPullMult(rival) : 1)
      * (typeof audienceAlsoWatches === 'function' && audienceAlsoWatches().some(r => r.name === c.name) ? 1.2 : 1)); // your viewers already watch them
    if (rival) adjustRel(rival, 18, `Your collab with ${rival.name} worked for both of you.`);
    pushNotification(ic('users') + ` ${c.name}'s viewers followed you over — +${fmt(gained)} subscribers from the collab.`);
    if (!offlineFastForward){
      showToast(ic('users') + ` Collab hit! +${fmt(gained)} subscribers from ${c.name}'s audience`, true);
      playLevelUpSound();
      triggerHypeMusic();
    }
    if (rival) rival.subs += gained * 0.3; // it's a two-way street
    pushFeedItem({ name: c.name, text: `collabed with ${state.channelName || 'you'} — the video is doing numbers.`, badge: { label: 'Collab', type: 'trend' } });
  }
  c.gained = gained;
  state.subs += gained;
  gainXP(120, 'collab');
}

/* Human-readable "algorithm status" for a video — real creators don't see a raw score. */
function algoStatusMessage(v){
  if (v.status === "testing") return { dot: "yellow", text: "Streamly is testing this with a small audience." };
  if (v.status === "trending") return { dot: "green", text: "The algorithm is actively recommending your content!" };
  if (v.status === "recommended"){
    if (v.retention >= 65) return { dot: "green", text: "Watch time is above average — people are sticking around." };
    if (v.ctr >= 18) return { dot: "green", text: "People are clicking your thumbnail more than usual." };
    return { dot: "green", text: "Your audience is enjoying this video." };
  }
  if (v.status === "slowing") return { dot: "yellow", text: "Interest is cooling off — reach is starting to slow." };
  return { dot: "red", text: "This video has mostly stopped finding new viewers." };
}

/* Classify the on-screen badge from current momentum, not a fixed final state */
function classifyStatus(v, justPulsed){
  if (justPulsed) return "trending";
  const ratio = v.peakRate > 0 ? v.rate / v.peakRate : 0;
  if (ratio >= 0.55) return "recommended";
  if (ratio >= 0.15) return "slowing";
  return "quiet";
}

function testingRate(v){
  const raw = (3 + v.algorithmScore * 0.15) * (1 + v.ctr / 150);
  return Number.isFinite(v.authorityCap) ? Math.min(raw, v.authorityCap * 0.3) : raw;
}

/* Small chance each tick of a "Streamly recommends you again" pulse — this is what
   creates the unpredictable plateau -> sudden climb -> plateau pattern requested. */
function maybeApplyPulse(v){
  const ct = v.ctArch && ARCHETYPES[v.ctArch];
  if (ct && ct.pulseDelay && v.age < ct.pulseDelay) return false; // search traffic finds guides later, not on day one
  if (Math.random() >= v.pulseChance) return false;
  const surge = Math.max(v.rate, v.baseRate * 1.2) * rand(3, 9);
  v.rate = Math.min(surge, v.rateCeiling);
  if (v.rate > v.peakRate) v.peakRate = v.rate;
  v.pulseCount++;
  showToast(ic('fire') + ` Streamly is recommending "${v.title}" again — it's climbing.`, true);
  return true;
}

/* Subscriber conversion is per-video now, driven by THAT video's retention/satisfaction —
   the same view count from a 22%-retention video and a 78%-retention video should convert
   wildly differently, not by a flat channel-wide ratio. */
function subConversionRate(v){
  const quality = channelQuality();
  const retention = clamp(v.retention || 0, 0, 100);
  const satisfaction = clamp(v.satisfaction || 50, 0, 100);
  const retentionFactor = Math.pow(retention / 100, 2.2);      // low retention converts far worse, not linearly
  const satisfactionMult = 0.6 + (satisfaction / 100) * 0.8;    // 0.6x-1.4x on top of retention
  const qualityMult = 1 + quality / 300;                        // good gear makes the "subscribe" ask land better
  const ct = archOf(v);
  // Shorts viewers scroll on: lots of views, far fewer of them subscribe than on long-form.
  const formatMult = v.format === 'shorts' ? 0.13 : 1;
  return clamp(0.0006 + retentionFactor * 0.045, 0, 0.06) * satisfactionMult * qualityMult * (ct ? ct.subs : 1) * identitySubsMult(v) * formatMult * (typeof demoSubMult === 'function' ? demoSubMult() : 1);
}

/* Fractional subscribers accumulate (a single tick's gain is usually well under 1 whole
   person) and only cross over into state.subs once they add up to a real person. */
function applyFractionalSubs(rawAmount){
  if (rawAmount <= 0) return 0;
  state.subFraction += rawAmount;
  const whole = Math.floor(state.subFraction);
  if (whole <= 0) return 0;
  state.subFraction -= whole;
  state.subs += whole;

  if (whole >= 25){
    showToast(ic('fire') + ` ${fmt(whole)} people subscribed because they loved your content.`, true);
  } else if (Math.random() < 0.04){
    pushNotification(ic('sparkle') + ` ${whole} new ${whole === 1 ? 'subscriber' : 'subscribers'} — your content is connecting.`);
  }
  return whole;
}

/* ---------- Advance a video by N ticks (live tick AND offline fast-forward use this) ---------- */
const VIEW_MILESTONES = [1000, 10000, 100000, 1000000];

/* Live per-video metrics: CTR, retention (watch time), likes and comments all move over the
   video's life. Early viewers are subscribers who click and stay more; the wider audience that
   comes later clicks less. A small random walk on top keeps every video's curve its own, and
   the CTR it lands on feeds straight back into how many views it gets. */
function initLiveMetrics(v){
  if (typeof v.baseCtr !== 'number') v.baseCtr = v.ctr;
  if (typeof v.baseRetention !== 'number') v.baseRetention = v.retention;
  if (typeof v.ctrDrift !== 'number') v.ctrDrift = 0;
  if (typeof v.retDrift !== 'number') v.retDrift = 0;
  if (typeof v.likes !== 'number') v.likes = v.views * ((v.satisfaction || 50) / 100) * 0.045;
  if (typeof v.commentCount !== 'number') v.commentCount = Math.max((v.comments || []).length, v.views * ((v.ctr || 5) / 300));
}
function stepLiveMetrics(v, justPulsed){
  const audienceMult = 0.82 + 0.45 * Math.exp(-v.age / 240);
  v.ctrDrift = clamp(v.ctrDrift * 0.996 + rand(-0.14, 0.14) + (justPulsed ? 2.5 : 0), -4, 6);
  v.ctr = clamp(v.baseCtr * audienceMult + v.ctrDrift, 0.5, 60);
  v.retDrift = clamp(v.retDrift * 0.997 + rand(-0.09, 0.09), -7, 7);
  v.retention = clamp(v.baseRetention + v.playlistRet - 4 * (1 - Math.exp(-v.age / 400)) + v.retDrift, 3, 98);
  v.watchTimeSec = calcWatchTimeSec(v);
}

function advanceVideo(v, ticks){
  let viewsGained = 0, moneyGained = 0, subsGainedRaw = 0, watchHoursGained = 0;
  initLiveMetrics(v);
  v.playlistRet = v.playlistRet || 0;
  let subRate = subConversionRate(v);
  const isShort = v.format === 'shorts';
  const ageRpm = typeof demoRpmMult === 'function' ? demoRpmMult() : 1;  // your audience's age and countries set what a view is worth
  for (let i = 0; i < ticks; i++){
    v.age++;
    let justPulsed = false;

    if (v.age <= TESTING_TICKS){
      v.status = "testing";
      v.rate = testingRate(v);
    } else {
      if (!v.outcomeDecided){
        if (v.ab && !v.ab.resolved) resolveABTest(v);
        decideOutcome(v);
        if (v.collab && !v.collab.resolved) resolveCollab(v);
      }
      v.rate = Math.max(v.rate * v.decayFactor, v.floorRate); // decay, never hits true zero
      justPulsed = maybeApplyPulse(v);                         // small chance of a comeback
      v.status = classifyStatus(v, justPulsed);
    }
    stepLiveMetrics(v, justPulsed);
    if (i % 30 === 29) subRate = subConversionRate(v);

    // CTR above/below where it started pulls views up/down; playlists add autoplay sessions.
    let applied = v.rate * (0.5 + 0.5 * clamp(v.ctr / Math.max(0.5, v.baseCtr), 0.4, 1.8)) * (1 + (v.playlistBoost || 0));
    if (Number.isFinite(v.authorityCap) && v.authorityCap > 0){
      const progress = v.views / v.authorityCap;
      // Free growth until ~65% of the range, then throttles hard — but it can still
      // crawl past the "ceiling" at a slow trickle, it's a pace guide, not a wall.
      const throttle = progress <= 0.65 ? 1 : 1 / (1 + (progress - 0.65) * 6);
      applied = applied * Math.max(throttle, 0.02);
    }

    v.views += applied;
    viewsGained += applied;
    const hours = applied * (v.watchTimeSec || 0) / 3600;
    watchHoursGained += hours;
    if (isShort) state.dayShortsViews += applied;   // Shorts path to the Partner Programme
    else state.lfWatchHours += hours;               // long-form path counts long-form watch time only

    // likes and comments accrue at rates that track the live numbers
    const likeRate = (0.012 + (v.satisfaction / 100) * 0.05) * (0.75 + v.retention / 200);
    v.likes += applied * likeRate;
    const commentRate = (0.0015 + v.ctr / 5000 + Math.abs(v.satisfaction - 50) / 15000) * (v.ctArch && ARCHETYPES[v.ctArch] ? ARCHETYPES[v.ctArch].comments : 1) * identityCommentsMult();
    const newComments = applied * commentRate;
    v.commentCount += newComments;
    if (Math.random() < Math.min(0.5, newComments * 0.08)){
      v.comments.push(makeComment(v));
      if (v.comments.length > 12) v.comments.shift();
    }

    if (state.isMonetized){
      // Long-form earns ad revenue; Shorts earn a smaller share from the Shorts feed pool.
      const tickRevenue = (isShort ? applied * 0.00042 : applied * 0.0018 * v.revenueMult) * ageRpm;
      moneyGained += tickRevenue;
      v.revenueEarned = (v.revenueEarned || 0) + tickRevenue;
      if (isShort){ state.shortsRevenueTotal += tickRevenue; state.pendingShortsRevenue += tickRevenue; }
      else state.adRevenueTotal += tickRevenue;
    }
    subsGainedRaw += applied * subRate;
    v.subsRaw = (v.subsRaw || 0) + applied * subRate;
  }

  VIEW_MILESTONES.forEach(m => {
    if (v.views >= m && !v.viewMilestonesHit.includes(m)){
      v.viewMilestonesHit.push(m);
      showToast(ic('bell') + ` "${v.title}" just reached ${fmt(m)} views!`, true);
    }
  });

  state.lifetimeRevenue += moneyGained;
  return { viewsGained, moneyGained, subsGainedRaw, watchHoursGained };
}

/* ---------- Day/hour tracking (drives "Today's Analytics" + the views sparkline) ---------- */
const HOUR_TICKS = 60;         // 1 in-game hour = 60 in-game minutes
const SPARKLINE_HOURS = 48;    // rolling 48-hour window, per the dashboard design

/* =========================================================================
   CREATOR FEED — a simulated ecosystem of rival creators, so the player
   isn't just playing against a number, but inside a living ranked field.
   ========================================================================= */
function ensureRivals(){
  if (!state.rivals){
    state.rivals = RIVAL_CREATORS.map(r => ({ ...r }));
  }
  return state.rivals;
}
/* A brand-new save shouldn't open on an empty Discover page: backfill a few
   uploads the rivals "posted" over the last day. Runs once per save. */
/* A rival upload's own numbers: final reach scales with the creator's size, with big variance
   (most videos do okay, some flop, a few pop off). Views then climb toward that over time. */
const RIVAL_SUBS_CAP = 15000000;
function rivalVideoStats(r){
  // Typical upload reaches 3%-25% of subscribers; big channels a bit less (audiences saturate).
  const sizeDamp = r.subs > 1e6 ? 0.7 : 1;
  let reach = Math.min(r.subs, RIVAL_SUBS_CAP) * Math.exp(rand(-3.5, -1.4)) * sizeDamp;
  if (Math.random() < 0.07) reach *= rand(2, 5);               // occasional hit
  const short = Math.random() < 0.18;
  return {
    finalViews: Math.max(120, Math.round(reach)),
    halfLife: Math.round(rand(180, 1200)),                     // in-game minutes to ~63% of final
    durSec: short ? Math.floor(rand(15, 60)) : Math.floor(rand(4 * 60, 26 * 60)),
    style: DISCOVER_STYLES[Math.floor(Math.random() * DISCOVER_STYLES.length)],
  };
}
function rivalVideoViews(e){
  const age = Math.max(0, state.totalTicks - e.tick);
  return Math.round(e.vid.finalViews * (1 - Math.exp(-age / e.vid.halfLife)) + Math.min(age, 30) * 2);
}
function seedRivalUploads(){
  const hasUploads = state.creatorFeed.some(i => i.text && i.text.indexOf('just uploaded a new video') === 0);
  if (hasUploads) return;
  const rivals = ensureRivals();
  const picks = rivals.slice().sort(() => Math.random() - 0.5).slice(0, 6);
  const items = picks.map((r, i) => {
    const bank = TITLE_BANK[r.topic];
    return { name: r.name, text: `just uploaded a new video — "${bank[Math.floor(Math.random() * bank.length)]}"`, tick: Math.round(state.totalTicks - (i + 1) * rand(90, 240)), vid: rivalVideoStats(r) };
  });
  state.creatorFeed = state.creatorFeed.concat(items.sort((a, b) => b.tick - a.tick));
}

/* ---------- Creator Feed avatars: deterministic initials + color per name ---------- */
const AVATAR_PALETTE = ['#2fd08c', '#ffb020', '#7c5cff', '#ff4d5e', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b'];
function avatarInitials(name){
  if (!name) return '??';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const seg = name.match(/[A-Z][a-z0-9]*/g);
  if (seg && seg.length >= 2) return (seg[0][0] + seg[1][0]).toUpperCase();
  if (seg && seg.length === 1) return seg[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function avatarColor(name){
  if (!name) return AVATAR_PALETTE[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function feedTimeAgo(tick){
  const diff = Math.max(0, state.totalTicks - tick);
  if (diff < 1) return 'just now';
  if (diff < 60) return Math.round(diff) + 'm ago';
  if (diff < DAY_TICKS) return Math.round(diff / 60) + 'h ago';
  return Math.round(diff / DAY_TICKS) + 'd ago';
}
/* Formats a plain duration in in-game minutes (e.g. a video's age) as "Xm"/"Xh"/"Xd" */
function formatDuration(minutes){
  const m = Math.max(0, minutes);
  if (m < 60) return Math.round(m) + 'm';
  if (m < DAY_TICKS) return Math.round(m / 60) + 'h';
  return Math.round(m / DAY_TICKS) + 'd';
}

/* ---------- Video thumbnails: real illustrated thumbnails from thumbs.js ---------- */
function videoThumb(v){
  return thumbSVG({
    seed: v.id, topic: v.topic, style: v.thumb, title: v.title,
    face: state.channelName || 'me',
    guestFace: v.collab ? v.collab.name : null,
  }) + (v.ab && !v.ab.resolved ? `<span class="thumb-tag ab">A/B</span>` : '')
     + (v.format === 'shorts' ? `<span class="thumb-tag shorts">Short</span>` : '')
     + (v.isVod ? `<span class="thumb-tag vod">Stream</span>` : '');
}
function thumbFace(seed){ return faceSVG(seed); }
/* legacy gradient kept only as a fallback background behind the SVG */
const THUMB_GRADIENTS = [
  ['#4d8dff', '#7c5cff'], ['#7c5cff', '#ec4899'], ['#ec4899', '#fb7185'],
  ['#14b8a6', '#2fd08c'], ['#fb923c', '#f59e0b'], ['#3b82f6', '#06b6d4'],
];
function thumbGradient(seed){
  let h = 0;
  const s = String(seed || 'x');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const [a, b] = THUMB_GRADIENTS[h % THUMB_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

/* entry can be a plain string (legacy) or a structured object:
   { name, text, badge:{label,type}, iconName, noSpace } */
function pushFeedItem(entry){
  const item = typeof entry === 'string' ? { text: entry } : { ...entry };
  // rivals don't all post on the hour: spread their timestamps across the last hour
  item.tick = typeof entry.tick === 'number' ? entry.tick : state.totalTicks - (item.name && item.name !== state.channelName ? Math.floor(rand(0, 55)) : 0);
  state.creatorFeed.unshift(item);
  if (state.creatorFeed.length > 40) state.creatorFeed.length = 40;
}

function computePlayerRank(){
  const rivals = ensureRivals();
  const all = rivals.map(r => r.subs).concat([state.subs]).sort((a, b) => b - a);
  return { rank: all.indexOf(state.subs) + 1, total: rivals.length + 1 };
}

const FEED_MILESTONE_STEPS = [10000, 50000, 100000, 250000, 500000, 1000000, 5000000];

/* Runs once per in-game hour crossed (handles live play AND offline fast-forward alike). */
function tickCreatorFeed(){
  const rivals = ensureRivals();

  rivals.forEach(r => {
    if (!r.peer){ // peer rivals grow alongside you in tickRivalry
      const jitter = 1 + rand(-r.volatility, r.volatility * 1.6); // slightly upward-skewed, like real growth
      // Growth slows as a rival approaches the ceiling, so nobody runs away to billions.
      r.subs = clamp(r.subs * (1 + r.growthRate * jitter * (1 - r.subs / RIVAL_SUBS_CAP)), 500, RIVAL_SUBS_CAP);
    }

    const crossed = FEED_MILESTONE_STEPS.find(m => r.subs >= m && (r.lastMilestone || 0) < m);
    if (crossed){
      r.lastMilestone = crossed;
      pushFeedItem({ name: r.name, text: `just reached ${fmt(crossed)} subscribers!`, badge: { label: 'Milestone', type: 'gain' } });
    }

    const roll = Math.random();
    if (roll < 0.02){
      const bank = TITLE_BANK[r.topic];
      const title = bank ? bank[Math.floor(Math.random() * bank.length)] : null;
      pushFeedItem({ name: r.name, text: title ? `just uploaded a new video — "${title}"` : 'just uploaded a new video.', vid: rivalVideoStats(r) });
    } else if (roll < 0.03){
      pushFeedItem({ name: r.name, text: `'s latest upload is trending right now.`, noSpace: true, badge: { label: 'Trending', type: 'trend' } });
    } else if (roll < 0.035 && r.subs > 50000){
      const amount = Math.round(rand(500, 8000) / 100) * 100;
      pushFeedItem({ name: r.name, text: `accepted a $${fmt(amount)} sponsorship deal.` });
    }
  });
}

/* Runs once per in-game day crossed — posts the player's own weekly-flavored rank update. */
function nextRivalToOvertake(){
  const rivals = ensureRivals();
  const above = rivals.filter(r => r.subs > state.subs).sort((a, b) => a.subs - b.subs);
  return above[0] || null;
}
function announcePlayerRank(){ /* creator rank removed from the game */ }

/* A long gap with no uploads erodes trust too — consistency matters, not just quality. */
const BREAK_GRACE_TICKS = 2 * DAY_TICKS; // 2 in-game days of silence before it starts to bite
/* The internet bill comes due weekly — pay it and get a fresh data allowance,
   miss it and the ISP throttles your speed until you catch up. */
function applyInternetBill(){
  const tier = EQUIPMENT.internet.tiers[state.equipTier.internet];
  const bill = tier.monthlyBill;
  if (state.money >= bill){
    state.money -= bill;
    state.dataUsedGB = 0;
    state.ispThrottled = false;
    state.freeDataAds = 0;
    pushNotification(ic('dollar') + ` Paid your $${bill} internet bill — data reset for the new cycle.`);
  } else {
    state.ispThrottled = true;
    pushNotification(ic('alert') + ` Your ISP has reduced your speed — you couldn't cover the $${bill} bill this cycle.`);
  }
}

function applyInactivityPenalty(){
  if (state.uploadLog.length === 0) return; // no channel activity yet — nothing to erode
  const silence = state.totalTicks - (typeof lastUploadAt === 'function' ? lastUploadAt() : state.lastUploadTick);
  if (silence <= BREAK_GRACE_TICKS) { state.inBreakPenalty = false; return; }
  state.algoRating = clamp(state.algoRating - 1.2, 0, 100);
  if (!state.inBreakPenalty){
    state.inBreakPenalty = true;
    pushNotification(ic('alert') + ` It's been a while since your last upload — Streamly's trust in your channel is starting to fade.`);
  }
}

/* ---------- Creator energy ---------- */
function energyCostFor(effortKey, lengthKey, formatKey, withAB, topicKey, typeId){
  let cost = (ENERGY_COST[effortKey] || 20) + (formatKey === 'shorts' ? -3 : (ENERGY_LENGTH_EXTRA[lengthKey] || 0));
  if (withAB) cost += AB_TEST_ENERGY;
  if (topicKey) cost += ARCHETYPES[findType(topicKey, typeId).arch].energy;
  return Math.max(6, cost + cadence().energyExtra);
}
/* How much a given upload will be hurt: 0 when you finish above the fatigue line. */
function fatigueFor(cost){
  return clamp(ENERGY_FATIGUE_LINE - (state.energy - cost), 0, 50);
}
function spendEnergy(cost){
  state.energy = Math.max(0, state.energy - cost);
  if (state.energy <= 0 && !state.burnedOut){
    state.burnedOut = true;
    pushNotification(ic('bolt') + ` You're burned out. Energy recovers at half speed until you're back above 50 — take a breather.`);
  }
}
function regenEnergy(ticks){
  if (state.energy >= ENERGY_MAX) return;
  const rate = ENERGY_REGEN_PER_TICK * (state.burnedOut ? ENERGY_BURNOUT_REGEN_MULT : 1) * cadence().energyRegen;
  state.energy = Math.min(ENERGY_MAX, state.energy + ticks * rate);
  if (state.burnedOut && state.energy >= 50){
    state.burnedOut = false;
    pushNotification(ic('bolt') + ` You're feeling like yourself again — energy recovery is back to normal.`);
  }
}
function buyCoffee(){
  const day = clockDay();
  if (state.coffeeDay !== day){ state.coffeeDay = day; state.coffeeCount = 0; }
  if (state.coffeeCount >= COFFEE_PER_DAY){
    playErrorSound();
    showToast(ic('coffee') + ` That's ${COFFEE_PER_DAY} coffees today. Your hands are shaking — try again tomorrow.`);
    return;
  }
  if (state.energy >= ENERGY_MAX){ playErrorSound(); showToast(ic('bolt') + ' Energy is already full.'); return; }
  if (state.money < COFFEE_COST){ playErrorSound(); showToast(ic('dollar') + ` Coffee costs $${COFFEE_COST}.`); return; }
  state.money -= COFFEE_COST;
  state.coffeeCount++;
  state.energy = Math.min(ENERGY_MAX, state.energy + COFFEE_ENERGY);
  playCoinSound();
  showToast(ic('coffee') + ` Coffee break: +${COFFEE_ENERGY} energy`);
  safeRenderAll();
}

function advanceGlobalTicks(n){
  // Step hour by hour, so every daily and hourly check sees the time it is actually about
  // (a long absence replays in order, instead of judging every skipped day by the moment you return).
  regenEnergy(n);
  const end = state.totalTicks + n;
  while (state.totalTicks < end){
    const prevTicks = state.totalTicks;
    state.totalTicks = Math.min(end, (Math.floor(prevTicks / HOUR_TICKS) + 1) * HOUR_TICKS);
    advanceGlobalStep(prevTicks);
  }
  if (typeof tickSocial === 'function') tickSocial();
}
function advanceGlobalStep(prevTicks){

  // Roll rank announcements + inactivity penalty once per in-game day actually crossed
  // (so a big offline jump applies the real cumulative effect, not just one flat tick).
  // days roll over at midnight on the in-game clock
  const daysBefore = clockDay(prevTicks);
  const daysAfter = clockDay(state.totalTicks);
  for (let d = daysBefore; d < daysAfter; d++){
    announcePlayerRank();
    applyInactivityPenalty();
    checkCadence();
    audienceDecay();
    payoutMembershipRevenue();
  }
  if (daysAfter > daysBefore){
    for (let d = daysBefore; d < daysAfter; d++){
      state.dailyHistory.push({ views: state.dayViews, subs: state.daySubs, money: state.dayMoney, shortsViews: state.dayShortsViews, watch: state.dayWatch });
      state.dayViews = 0; state.daySubs = 0; state.dayMoney = 0; state.dayShortsViews = 0; state.dayWatch = 0;
      if (state.dailyHistory.length > 90) state.dailyHistory.shift();
    }
    state.dailySnapshot = { tick: state.totalTicks, views: state.totalViews, subs: state.subs, money: state.money, watchHours: state.watchHours };
  }

  // Roll one hourly sparkline bucket + one Creator Feed tick per HOUR_TICKS boundary crossed
  // (handles offline fast-forward too — a big jump still gets one roll per hour, not one giant roll).
  const hoursBefore = Math.floor(prevTicks / HOUR_TICKS);
  const hoursAfter = Math.floor(state.totalTicks / HOUR_TICKS);
  for (let h = hoursBefore; h < hoursAfter; h++){
    state.hourlyViews.push(state.currentHourViews);
    state.currentHourViews = 0;
    if (state.hourlyViews.length > SPARKLINE_HOURS) state.hourlyViews.shift();
    state.hourlySubs.push(state.currentHourSubs); state.currentHourSubs = 0;
    if (state.hourlySubs.length > SPARKLINE_HOURS) state.hourlySubs.shift();
    state.hourlyWatch.push(state.currentHourWatch); state.currentHourWatch = 0;
    if (state.hourlyWatch.length > SPARKLINE_HOURS) state.hourlyWatch.shift();
    // per-video hourly history for the video analytics page
    state.videos.forEach(v => {
      if (v.publishPhase && v.publishPhase !== 'live') return;
      if (!Array.isArray(v.hist)) v.hist = [];
      v.hist.push([Math.round(v.views), Math.round(v.ctr * 10) / 10, Math.round(v.retention * 10) / 10]);
      if (v.hist.length > 48) v.hist.shift();
    });
    state.hourlyRevenue.push(state.currentHourRevenue);
    if (state.hourlyRevenue.length > SPARKLINE_HOURS) state.hourlyRevenue.shift();
    if (state.currentHourRevenue > 0.01){
      const shortsPart = Math.min(state.pendingShortsRevenue, state.currentHourRevenue);
      const adPart = state.currentHourRevenue - shortsPart;
      if (adPart > 0.01) pushTransaction('ad', 'Ad Revenue', adPart);
      if (shortsPart > 0.01) pushTransaction('shorts', 'Shorts Feed revenue', shortsPart);
    }
    state.pendingShortsRevenue = 0;
    state.currentHourRevenue = 0;
    tickCreatorFeed();
    tickRivalry();
    tickSponsors();
    tickMoments();
    if (typeof tickCalendar === 'function') tickCalendar();
    if (typeof tickDemographics === 'function') tickDemographics();
    if (typeof tickSituations === 'function') tickSituations();
  }

  // Internet bill — handles multiple missed cycles correctly if a big offline jump crosses several.
  while (state.totalTicks >= state.nextBillTick){
    applyInternetBill();
    state.nextBillTick += BILL_CYCLE_TICKS;
  }
}

/* ---------- Live tick (runs every real second) ---------- */
function liveTick(){
  let totalViews = 0, totalMoney = 0, totalSubsRaw = 0, totalWatchHours = 0;
  state.videos.forEach(v => {
    if (v.publishPhase && v.publishPhase !== 'live') return; // still mid upload-animation, don't tick it yet
    const r = advanceVideo(v, 1);
    totalViews += r.viewsGained;
    totalMoney += r.moneyGained;
    totalSubsRaw += r.subsGainedRaw;
    totalWatchHours += r.watchHoursGained;
  });
  state.totalViews += totalViews;
  state.money += totalMoney;
  state.watchHours += totalWatchHours;
  state.currentHourViews += totalViews;
  state.currentHourRevenue += totalMoney;
  state.currentHourWatch += totalWatchHours;
  state.dayViews += totalViews; state.dayMoney += totalMoney; state.dayWatch += totalWatchHours;
  const liveSubs = applyFractionalSubs(totalSubsRaw);
  state.daySubs += liveSubs; state.currentHourSubs += liveSubs;
  accrueViewXP(totalViews, liveSubs);

  advanceGlobalTicks(1);
  publishDueVideos();
  if (state.uploadCooldownTicksLeft > 0) state.uploadCooldownTicksLeft--;
  if (state.live){ tickLiveStream(); renderLivePill(); }
  if (hypeMusicUntil && Date.now() > hypeMusicUntil){
    hypeMusicUntil = 0;
    if (window.Music) Music.setMood('calm');
  }

  safeRenderAll();
}
let offlineFastForward = false; // true while replaying time you were away — suppresses per-event toasts
let lastOfflineGains = null;    // what the "welcome back" modal showed, for the watch-an-ad double
function runOfflineProgress(){
  const elapsedSec = Math.floor((Date.now() - state.lastSaved) / 1000);
  if (elapsedSec < 5) return; // not worth a popup
  const ticks = Math.min(elapsedSec, MAX_OFFLINE_TICKS);
  offlineFastForward = true;

  let totalViews = 0, totalMoney = 0, totalSubsRaw = 0, totalWatchHours = 0;
  // scheduled videos that went live while you were away only run from their publish time
  const startTick = state.totalTicks, partial = {};
  scheduledVideos().forEach(v => {
    if (v.publishAt <= startTick + ticks){ goLive(v, Math.max(startTick, v.publishAt)); partial[v.id] = startTick + ticks - Math.max(startTick, v.publishAt); }
  });
  state.videos.forEach(v => {
    if (v.publishPhase && v.publishPhase !== 'live') return; // still mid-pipeline, handled on next load instead
    const r = advanceVideo(v, partial[v.id] !== undefined ? partial[v.id] : ticks);
    totalViews += r.viewsGained;
    totalMoney += r.moneyGained;
    totalSubsRaw += r.subsGainedRaw;
    totalWatchHours += r.watchHoursGained;
  });
  state.totalViews += totalViews;
  state.money += totalMoney;
  state.watchHours += totalWatchHours;
  state.currentHourViews += totalViews;
  const subsGained = applyFractionalSubs(totalSubsRaw);
  state.dayViews += totalViews; state.dayMoney += totalMoney; state.daySubs += subsGained; state.dayWatch += totalWatchHours;
  state.currentHourWatch += totalWatchHours; state.currentHourSubs += subsGained;
  accrueViewXP(totalViews, subsGained);

  advanceGlobalTicks(ticks);
  state.uploadCooldownTicksLeft = Math.max(0, state.uploadCooldownTicksLeft - ticks);
  offlineFastForward = false;

  if (totalViews > 0 || subsGained > 0){
    lastOfflineGains = { subs: subsGained, money: totalMoney, doubled: false };
    showOfflineModal(elapsedSec, totalViews, subsGained, totalMoney);
  }
}

/* ---------- Equipment upgrades ---------- */
function upgradeEquipment(type){
  const cfg = EQUIPMENT[type];
  const curTier = state.equipTier[type];
  const nextTier = cfg.tiers[curTier + 1];
  if (!nextTier) return;
  // equipment is money-gated only — no creator-level check (it felt arbitrary to players)
  if (state.money < nextTier.cost) return;           // locked by cash
  state.money -= nextTier.cost;
  state.equipTier[type] = curTier + 1;
  playCoinSound();
  showToast(ic('camera') + ` Upgraded ${cfg.label} to ${nextTier.name}`);
  renderEquipment();
  renderStats();
}

/* ---------- Creator level ---------- */
/* Views and subs pay XP in batches so the counter doesn't twitch every tick. */
function accrueViewXP(views, subs){
  state.xpViewCarry = (state.xpViewCarry || 0) + views;
  const hundreds = Math.floor(state.xpViewCarry / 100);
  if (hundreds > 0){ state.xpViewCarry -= hundreds * 100; gainXP(hundreds * 5, 'views'); }
  if (subs > 0) gainXP(subs * 3, 'subs');
}
function checkLevelUp(){
  const info = getLevelInfo(state.xp || 0);
  while (info.level > state.level){
    state.level++;
    const bonus = LEVEL_CASH_BONUS(state.level);
    state.money += bonus;
    playLevelUpSound();
    const t = LEVELS[state.level - 1].title;
    showToast(ic('arrowUp') + ` Level ${state.level}! ${t} (+$${bonus})`, true);
    pushNotification(ic('arrowUp') + ` You reached level ${state.level} — ${t}. Bonus: $${bonus}.`);
  }
}

/* ---------- Milestones ---------- */
function checkMilestones(){
  MILESTONES.forEach(m => {
    if (state.subs >= m.subs && !state.milestonesReached.includes(m.subs)){
      state.milestonesReached.push(m.subs);
      state.unlocks[m.flag] = true;
      if (m.bonusMoney){
        state.money += m.bonusMoney;
        state.lifetimeRevenue += m.bonusMoney;
      }
      showToast(ic('trophy') + ` Milestone! ${fmt(m.subs)} subs — ${m.label}`, true);
      gainXP(250, 'milestone');
      pushFeedItem({ name: state.channelName || 'Your channel', text: `just reached ${fmt(m.subs)} subscribers — ${m.label}!`, badge: { label: 'Milestone', type: 'gain' } });
      playCoinSound();
    }
  });
}

/* ---------- Achievements (non-subscriber goals) ---------- */
function checkAchievements(){
  ACHIEVEMENTS.forEach(a => {
    if (!state.achievementsReached.includes(a.id) && a.check()){
      state.achievementsReached.push(a.id);
      state.money += a.amount;
      showToast(ic('trophy') + ` Achievement unlocked: ${a.label} (+$${a.amount})`, true);
      gainXP(150, 'achieve');
      pushFeedItem({ name: state.channelName || 'Your channel', text: `unlocked: ${a.label}`, badge: { label: 'Achievement', type: 'trend' } });
      playCoinSound();
    }
  });
}

/* ---------- Streamly Partner Programme (monetization gate) ---------- */
/* Streamly Partner Programme mirrors YouTube's two tiers:
   Tier 1 (fan funding): 500 subs + 3 uploads in the last 90 days + 3,000 long-form watch hours OR 75K Shorts views → Memberships
   Tier 2 (ad revenue):  1,000 subs + 4,000 long-form watch hours OR 250K Shorts views → ads on long-form + Shorts feed revenue
   (Shorts thresholds are YouTube's 3M / 10M, scaled to the game's audience size.) */
const FAN_SUBS_REQUIRED = 500;
const FAN_UPLOADS_REQUIRED = 3;
const FAN_WATCH_HOURS_REQUIRED = 3000;
const FAN_SHORTS_VIEWS_REQUIRED = 75000;
const SPP_SUBS_REQUIRED = 1000;
const SPP_WATCH_HOURS_REQUIRED = 4000;          // long-form public watch hours
const SPP_SHORTS_VIEWS_REQUIRED = 250000;       // OR this many Shorts views in the last 90 in-game days
function uploads90(){ return state.uploadLog.filter(t => state.totalTicks - t <= 90 * DAY_TICKS).length; }
function checkFanFunding(){
  if (state.fanFunding) return;
  const pathMet = state.lfWatchHours >= FAN_WATCH_HOURS_REQUIRED || shortsViews90() >= FAN_SHORTS_VIEWS_REQUIRED;
  if (state.subs >= FAN_SUBS_REQUIRED && uploads90() >= FAN_UPLOADS_REQUIRED && pathMet){
    state.fanFunding = true;
    state.unlocks.channelMemberships = true;
    playLevelUpSound();
    showToast(ic('medal') + ` Partner Programme, tier 1: channel memberships are now on`, true);
    pushNotification(ic('mail') + ` You're in the Streamly Partner Programme (fan funding). Viewers can now join your channel as members. Ads unlock at 1,000 subscribers.`);
  }
}
function shortsViews90(){
  return state.dailyHistory.slice(-89).reduce((a, d) => a + (d.shortsViews || 0), 0) + state.dayShortsViews;
}
function checkMonetization(){
  checkFanFunding();
  if (state.isMonetized) return;
  const lfPath = state.lfWatchHours >= SPP_WATCH_HOURS_REQUIRED;
  const shortsPath = shortsViews90() >= SPP_SHORTS_VIEWS_REQUIRED;
  if (state.subs >= SPP_SUBS_REQUIRED && (lfPath || shortsPath)){
    state.isMonetized = true;
    state.monetizedVia = lfPath ? 'long-form watch hours' : 'Shorts views';
    playLevelUpSound();
    if (!state.partnerAnnounced){
      state.partnerAnnounced = true;
      document.getElementById('partner-modal').classList.add('show');
    }
    pushNotification(ic('mail') + ` Your application to the Streamly Partner Programme has been approved — ads are now enabled!`);
    pushFeedItem({ name: state.channelName || 'Your channel', text: `just joined the Streamly Partner Programme!`, badge: { label: 'Partner', type: 'gain' } });
  }
}

/* ---------- Channel Memberships (Monetization tab) — unlocks at 10,000 subs via the existing
   MILESTONES flag, then pays out a small passive daily amount based on channel size. ---------- */
const MEMBERSHIP_RATE_PER_SUB_PER_DAY = 0.006;
function payoutMembershipRevenue(){
  if (!state.fanFunding) return;
  const payout = state.subs * MEMBERSHIP_RATE_PER_SUB_PER_DAY;
  if (payout <= 0.01) return;
  state.money += payout;
  state.lifetimeRevenue += payout;
  state.membershipRevenue += payout;
  pushTransaction('membership', 'Membership Payment', payout);
}

/* =========================================================================
   RANDOM WORLD EVENTS — Viral Moment, Controversy, Brand Deal, Celebrity Share
   ========================================================================= */
function maybeTriggerEvent(){
  if (state.videos.length === 0) return;
  if (Math.random() > EVENT_CHANCE) return;

  const activeVideos = state.videos.filter(v => v.outcomeDecided);
  const roll = Math.random();
  // Every event scales with the channel. A 20-sub channel gets small bumps, not a free career.
  const liveCount = state.videos.filter(v => !v.publishPhase || v.publishPhase === 'live').length;
  const countEventSubs = (n) => { state.daySubs += n; state.currentHourSubs += n; };

  if (roll < 0.22 && activeVideos.length){
    const v = activeVideos[Math.floor(Math.random() * activeVideos.length)];
    const bonus = Math.round(Math.max(v.rate * 12, v.views * rand(0.4, 1.1), 40 + state.subs * rand(0.3, 1.2)));
    v.rateCeiling = Math.max(v.rateCeiling, v.views + bonus * 1.5);
    v.views += bonus;
    v.rate = Math.max(v.rate, bonus / 20);
    if (v.rate > v.peakRate) v.peakRate = v.rate;
    state.totalViews += bonus;
    if (state.isMonetized && v.format !== 'shorts'){ // no ad money before Partner Programme approval
      const earned1 = bonus * 0.0018 * v.revenueMult;
      state.money += earned1;
      state.lifetimeRevenue += earned1;
      state.adRevenueTotal += earned1;
      v.revenueEarned = (v.revenueEarned || 0) + earned1;
    }
    state.dayViews += bonus; state.currentHourViews += bonus;
    countEventSubs(applyFractionalSubs(Math.min(bonus * subConversionRate(v), 20 + state.subs * 0.04))); // capped: a spike brings viewers, not a whole new audience
    showToast(ic('fire') + ` Trending! "${v.title}" just got a viral moment — +${fmt(bonus)} views`, true);

  } else if (roll < 0.44 && activeVideos.length){
    const v = activeVideos[Math.floor(Math.random() * activeVideos.length)];
    const bonus = Math.round((60 + state.subs * rand(0.5, 2)) * rand(0.8, 1.3));
    v.views += bonus;
    state.totalViews += bonus;
    if (state.isMonetized && v.format !== 'shorts'){
      const earned2 = bonus * 0.0018 * v.revenueMult;
      state.money += earned2;
      state.lifetimeRevenue += earned2;
      state.adRevenueTotal += earned2;
      v.revenueEarned = (v.revenueEarned || 0) + earned2;
    }
    state.dayViews += bonus; state.currentHourViews += bonus;
    countEventSubs(applyFractionalSubs(Math.min(bonus * subConversionRate(v), 20 + state.subs * 0.04))); // capped: a spike brings viewers, not a whole new audience
    // the controversy is now a Situation you get to handle; the old flat hit only if one can't open right now
    const baity = v.thumb === 'shock' || v.titleStyle === 'curiosity';
    const handled = typeof queueSituation === 'function' && (baity
      ? queueSituation('clickbait', { videoId: v.id, topic: v.topic, title: v.title, justified: shownRetention(v) < 33 })
      : queueSituation('hotTake', { videoId: v.id, topic: v.topic, title: v.title, opinion: v.ctArch === 'opinion' }));
    if (!handled){
      state.algoRating = clamp(state.algoRating - 3, 0, 100);
      showToast(ic('alert') + ` Controversy around "${v.title}" — views spiked, rating took a hit`, true);
    }

  } else if (roll < 0.78 && state.unlocks.sponsorships){
    // brands now send contract offers (Monetization → Sponsorships) instead of free money
    if (identitySponsorRefuses()){ showToast(ic('gift') + ' A brand passed on working with you after your recent controversies.'); return; }
    if (sponsorBook().deals.filter(d => d.status === 'offer' || d.status === 'active').length < 3){ const d = makeSponsorOffer(); if (d) announceOffer(d); }

  } else if (roll >= 0.9 && liveCount >= 3){
    // Rare. A shout-out brings a trickle to a tiny channel (15-35) and ~2-8% more to an established one.
    const subBonus = Math.floor(rand(15, 35) + state.subs * rand(0.02, 0.08));
    state.subs += subBonus;
    countEventSubs(subBonus);
    if (!(typeof queueSituation === 'function' && queueSituation('shoutout', { gain: subBonus })))
      showToast(ic('star') + ` A bigger creator shared your channel! +${fmt(subBonus)} subscribers`, true);
  } else {
    return; // nothing happened this time
  }

  renderStats();
  renderVideos();
  renderHome();
}

/* ---------- Count-up for headline numbers (skipped for reduced motion / hidden elements) ---------- */
const REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function tweenNum(el, value, fmtFn){
  if (!el) return;
  const from = el._tv;
  if (from == null || from === value || REDUCE_MOTION || document.hidden || el.offsetParent === null || !isFinite(from)){
    if (el._tvRaf){ cancelAnimationFrame(el._tvRaf); el._tvRaf = 0; }
    el._tv = value;
    const t = fmtFn(value);
    if (el.textContent !== t) el.textContent = t;
    return;
  }
  if (el._tvRaf) cancelAnimationFrame(el._tvRaf);
  const start = performance.now(), dur = 650;
  const step = now => {
    const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
    const cur = k < 1 ? from + (value - from) * e : value;
    el._tv = cur;
    el.textContent = fmtFn(cur);
    el._tvRaf = k < 1 ? requestAnimationFrame(step) : 0;
  };
  el._tvRaf = requestAnimationFrame(step);
}
const fmtInt = v => fmt(v);
const fmtCash = v => '$' + v.toFixed(2);

/* ---------- Rendering: stat strip + topbar ---------- */
function renderStats(){
  checkLevelUp();
  checkMilestones();
  checkAchievements();
  checkMonetization();
  tweenNum(document.getElementById('stat-money'), state.money, fmtCash);
  tweenNum(document.getElementById('stat-subs'), state.subs, fmtInt);
  tweenNum(document.getElementById('stat-views'), state.totalViews, fmtInt);
  tweenNum(document.getElementById('stat-watchtime'), state.watchHours * 60, v => fmtInt(v) + ' min');
  tweenNum(document.getElementById('topbar-money'), state.money, fmtCash);
  tweenNum(document.getElementById('topbar-subs'), state.subs, fmtInt);
  const info = getLevelInfo(state.xp || 0);
  const lvEl = document.getElementById('creator-level');
  if (lvEl) lvEl.textContent = `Lv. ${state.level}`;
  const cur = info.current, next = info.next;
  const fillEl = document.getElementById('xp-fill');
  const countEl = document.getElementById('xp-count');
  if (fillEl && countEl){
    if (!next){ fillEl.style.width = '100%'; countEl.textContent = 'Max level'; }
    else {
      fillEl.style.width = clamp(((state.xp - cur.xp) / (next.xp - cur.xp)) * 100, 0, 100) + '%';
      countEl.textContent = `${fmt(state.xp - cur.xp)} / ${fmt(next.xp - cur.xp)} XP`;
    }
  }
  const dot = document.getElementById('bell-dot');
  if (dot) dot.style.display = state.notifications.length && lastSeenNotif < state.notifications.length ? 'block' : 'none';
}
let lastSeenNotif = 0;

/* ---------- Home: Recent videos (compact table, real per-video fields only) ---------- */
function renderRecentVideos(){
  const el = document.getElementById('recent-videos-table');
  if (!el) return;
  if (state.videos.length === 0){
    el.innerHTML = `<div class="empty-hint">No uploads yet.</div>`;
    return;
  }
  const recent = state.videos.slice().reverse().filter(v => !v.publishPhase || v.publishPhase === 'live').slice(0, 5);
  el.innerHTML = recent.map(v => `
    <div class="rv-row">
      <div class="rv-video-cell">
        <div class="rv-thumb">${videoThumb(v)}</div>
        <div class="rv-main">
          <div class="rv-title">${v.title}</div>
          <div class="rv-sub">${formatDuration(v.age)} ago</div>
        </div>
      </div>
      <span class="rv-col mono">${fmt(v.views)}</span>
      <span class="rv-col mono">${Math.round(v.ctr)}%</span>
      <span class="rv-col mono rv-revenue">$${(v.revenueEarned || 0).toFixed(2)}</span>
      <span class="rv-col rv-status-col">${statusPill(v.status)}</span>
    </div>
  `).join('');
}

/* ---------- Home: Channel progress toward the next unreached milestone ---------- */
function renderChannelProgress(){
  const el = document.getElementById('channel-progress-card');
  if (!el) return;
  const next = MILESTONES.find(m => state.subs < m.subs);
  if (!next){
    el.innerHTML = `
      <div class="cp-row">
        <div class="cp-emblem">${ic('trophy')}</div>
        <div>
          <div class="cp-sub">All milestones reached</div>
          <div class="cp-goal">You're a Streamly legend</div>
        </div>
      </div>
    `;
    return;
  }
  const pct = clamp((state.subs / next.subs) * 100, 0, 100);
  el.innerHTML = `
    <div class="cp-row">
      <div class="cp-emblem">${ic('star')}</div>
      <div>
        <div class="cp-sub">Next milestone</div>
        <div class="cp-goal">${fmt(next.subs)} subscribers</div>
      </div>
    </div>
    <div class="cp-track"><div class="cp-fill" style="width:${pct}%"></div></div>
    <div class="cp-count">${fmt(state.subs)} / ${fmt(next.subs)}</div>
  `;
}


/* ---------- In-game clock: Day N · H:MM AM/PM, derived from the existing tick scale ---------- */
const CLOCK_START_OFFSET_MIN = 9 * 60; // the channel's very first day starts at 9:00 AM

function formatGameClock(){
  const totalMin = state.totalTicks + CLOCK_START_OFFSET_MIN;
  const day = Math.floor(totalMin / DAY_TICKS) + 1;
  const minutesIntoDay = totalMin % DAY_TICKS;
  const hour24 = Math.floor(minutesIntoDay / 60);
  const minute = minutesIntoDay % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const ampm = hour24 < 12 ? 'AM' : 'PM';
  return `Day ${day} · ${hour12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function renderGameClock(){
  const el = document.getElementById('game-clock');
  if (el) el.textContent = formatGameClock();
}

function renderIdentity(){
  const name = state.channelName || 'My Channel';
  const setChannel = document.getElementById('set-channel');
  if (setChannel) setChannel.textContent = name;
  const av = document.getElementById('channel-avatar');
  if (av && av.dataset.face !== name){ av.innerHTML = faceSVG(name); av.dataset.face = name; }
  const sf = document.getElementById('sidebar-face');
  if (sf && sf.dataset.face !== name){ sf.innerHTML = faceSVG(name); sf.dataset.face = name; }
}

/* ---------- Rendering: video list (Studio tab) ---------- */
function badgeLabel(status){
  return {
    testing: "Testing",
    recommended: "Recommended",
    slowing: "Slowing",
    trending: "Trending",
    quiet: "Quiet",
  }[status];
}

const STATUS_PILL = {
  testing:     { label: 'Testing',   cls: 'info' },
  recommended: { label: 'Stable',    cls: 'good' },
  trending:    { label: 'Growing',   cls: 'good' },
  slowing:     { label: 'Fading',    cls: 'warn' },
  quiet:       { label: 'Quiet',     cls: 'mute' },
};
function statusPill(status){
  const s = STATUS_PILL[status] || STATUS_PILL.quiet;
  return `<span class="status-pill ${s.cls}"><i></i>${s.label}</span>`;
}

const UPLOAD_PHASE_LABEL = {
  scheduled:    (v) => `Scheduled for ${formatTick(v.publishAt)}`,
  editing:      () => `Editing...`,
  rendering:    () => `Rendering...`,
  exporting:    () => `Exporting...`,
  uploading: (v) => {
    const remaining = Math.max(0, Math.round((v.estUploadSec || 0) * (1 - v.publishProgress / 100)));
    const h = Math.floor(remaining / 3600), m = Math.floor((remaining % 3600) / 60);
    return `Uploading... ${v.publishProgress}% · ${h ? h + 'h ' : ''}${m}m of game time left`;
  },
  processingSD: () => `Processing SD...`,
  processingHD: () => `Processing HD...`,
  copyright:    () => `Checking Copyright...`,
  publishing:   () => `Publishing...`,
  revealing:    () => `Video Live! ` + ic('sparkle'),
};

let contentSubTab = 'videos'; // UI-only filter for the Content tab's Videos/Shorts sub-tabs

/* =========================================================================
   PLAYLISTS — group videos; each playlist drives autoplay sessions, so its
   videos get extra views and a little extra watch time. Bigger playlists
   binge better (up to +12% views, +3 retention).
   ========================================================================= */
let playlistsDirty = true, playlistsRenderedAt = 0;
function syncPlaylistBoosts(){
  state.videos.forEach(v => { v.playlistBoost = 0; v.playlistRet = 0; });
  state.playlists.forEach(pl => {
    const live = pl.videoIds.map(id => state.videos.find(v => v.id === id)).filter(Boolean);
    const boost = Math.min(0.12, 0.015 * live.length);
    const ret = Math.min(3, 0.5 * live.length);
    live.forEach(v => { v.playlistBoost = Math.max(v.playlistBoost, boost); v.playlistRet = Math.max(v.playlistRet, ret); });
  });
}
function renderPlaylists(el){
  playlistsDirty = false; playlistsRenderedAt = Date.now();
  const liveVids = state.videos.filter(v => !v.publishPhase || v.publishPhase === 'live');
  const cards = state.playlists.map(pl => {
    const vids = pl.videoIds.map(id => state.videos.find(v => v.id === id)).filter(Boolean);
    const views = vids.reduce((a, v) => a + v.views, 0);
    const boost = Math.round(Math.min(0.12, 0.015 * vids.length) * 100);
    const addable = liveVids.filter(v => !pl.videoIds.includes(v.id)).slice().reverse();
    const cover = vids[0] ? videoThumb(vids[0]) : '';
    return `
      <div class="pl-card">
        <div class="pl-cover">${cover}<span class="pl-count">${ic('list')}${vids.length}</span></div>
        <div class="pl-body">
          <div class="pl-head">
            <div>
              <div class="pl-name">${pl.name}</div>
              <div class="pl-meta">${vids.length} video${vids.length === 1 ? '' : 's'} &middot; ${fmt(views)} views &middot; +${boost}% autoplay views</div>
            </div>
            <button class="mini-btn danger" data-pl-del="${pl.id}">Delete</button>
          </div>
          <div class="pl-items">
            ${vids.length ? vids.map(v => `
              <div class="pl-item">
                <div class="rv-thumb">${videoThumb(v)}</div>
                <div class="pl-item-main"><div class="rv-title">${v.title}</div><div class="rv-sub">${fmt(v.views)} views</div></div>
                <button class="icon-btn" data-pl-remove="${pl.id}|${v.id}" aria-label="Remove from playlist">${ic('x')}</button>
              </div>`).join('') : `<div class="empty-hint">No videos yet. Add one below.</div>`}
          </div>
          ${addable.length ? `
          <div class="pl-add">
            <select id="pl-select-${pl.id}">${addable.map(v => `<option value="${v.id}">${v.title.replace(/"/g, '&quot;')}</option>`).join('')}</select>
            <button class="mini-btn" data-pl-add="${pl.id}">${ic('plus')}Add</button>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');
  el.innerHTML = `
    <div class="pl-create">
      <input class="setup-input small" id="pl-name-input" maxlength="40" placeholder="New playlist name, e.g. Ranked Grind">
      <button class="mini-btn" id="pl-create-btn">${ic('plus')}Create playlist</button>
    </div>
    <div class="pl-hint">Videos in a playlist autoplay into each other, so they pick up extra views and watch time. Bigger playlists binge better.</div>
    ${cards || `<div class="empty-hint">No playlists yet. Name one above to get started.</div>`}`;
}
function handlePlaylistClick(e){
  const t = e.target.closest('button');
  if (!t) return false;
  if (t.id === 'pl-create-btn'){
    const input = document.getElementById('pl-name-input');
    const name = (input.value || '').trim().slice(0, 40);
    if (!name){ playErrorSound(); input.focus(); return true; }
    state.playlists.unshift({ id: 'pl' + Date.now().toString(36), name, videoIds: [] });
    playSuccessSound();
    showToast(ic('list') + ` Playlist "${name}" created`);
  } else if (t.dataset.plAdd){
    const pl = state.playlists.find(p => p.id === t.dataset.plAdd);
    const sel = document.getElementById('pl-select-' + t.dataset.plAdd);
    if (pl && sel && sel.value && !pl.videoIds.includes(sel.value)){ pl.videoIds.push(sel.value); playClickSound(); }
  } else if (t.dataset.plRemove){
    const [pid, vid] = t.dataset.plRemove.split('|');
    const pl = state.playlists.find(p => p.id === pid);
    if (pl){ pl.videoIds = pl.videoIds.filter(x => x !== vid); playClickSound(); }
  } else if (t.dataset.plDel){
    state.playlists = state.playlists.filter(p => p.id !== t.dataset.plDel);
    playClickSound();
  } else return false;
  syncPlaylistBoosts();
  playlistsDirty = true;
  renderPlaylists(document.getElementById('video-list'));
  return true;
}
let contentPage = 1;          // UI-only pagination cursor — doesn't touch game state
const CONTENT_PAGE_SIZE = 6;

function renderVideos(){
  const listEl = document.getElementById('video-list');
  const pagerEl = document.getElementById('content-pager');
  const pipeline = state.videos.filter(v => v.publishPhase && v.publishPhase !== 'live').slice().reverse();
  const pipelineHTML = pipeline.map(v => {
    const label = (UPLOAD_PHASE_LABEL[v.publishPhase] || (() => 'Uploading...'))(v);
    const stage = pipelineStageLabel(v.publishPhase);
    return `
      <div class="video-card uploading-card uc-row phase-${v.publishPhase}">
        <div class="uc-thumb">${videoThumb(v)}</div>
        <div class="uc-main">
          ${stage ? `<div class="pipeline-stage">${stage}</div>` : ''}
          <div class="video-title">${v.title}</div>
          <div class="upload-progress-label">${label}</div>
          ${v.publishPhase === 'uploading' ? `<div class="upload-progress-track"><div class="fill" style="width:${v.publishProgress}%"></div></div>` : ''}
        </div>
        ${v.publishPhase === 'scheduled' ? `<div class="sched-actions"><button class="mini-btn" data-sched-now="${v.id}">Publish now</button><button class="mini-btn danger" data-sched-cancel="${v.id}">Cancel</button></div>` : ''}
        ${v.publishPhase === 'revealing' ? `
          <div class="live-counter">
            <span class="rec"><span class="rdot"></span>LIVE</span>
            <span class="num mono">${fmt(v.views)}</span>
            <span class="sub">views</span>
          </div>` : ''}
      </div>
    `;
  }).join('');

  // Sub-tab filter — Live Streams / Playlists aren't systems this sim tracks, so they get an honest empty state.
  let liveVideos = [];
  if (contentSubTab === 'videos') liveVideos = state.videos.filter(v => (!v.publishPhase || v.publishPhase === 'live') && v.format !== 'shorts');
  else if (contentSubTab === 'shorts') liveVideos = state.videos.filter(v => (!v.publishPhase || v.publishPhase === 'live') && v.format === 'shorts');
  liveVideos = liveVideos.slice().reverse();

  if (contentSubTab === 'playlists'){
    if (pagerEl) pagerEl.innerHTML = '';
    // Don't rebuild the form under the player's fingers; refresh numbers every few seconds otherwise.
    const typing = listEl.contains(document.activeElement);
    if (!typing && (playlistsDirty || Date.now() - playlistsRenderedAt > 4000)) renderPlaylists(listEl);
    return;
  }
  playlistsRenderedAt = 0;
  if (contentSubTab === 'live'){ renderLiveTab(); return; }
  liveUIBuiltFor = null; // leaving the live tab: rebuild it fresh next time

  if (liveVideos.length === 0 && pipeline.length === 0){
    listEl.innerHTML = `<div class="empty-hint">No uploads yet. Head to the Studio tab and post your first video.</div>`;
    if (pagerEl) pagerEl.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(liveVideos.length / CONTENT_PAGE_SIZE));
  contentPage = clamp(contentPage, 1, totalPages);
  const startIdx = (contentPage - 1) * CONTENT_PAGE_SIZE;
  const pageVideos = liveVideos.slice(startIdx, startIdx + CONTENT_PAGE_SIZE);

  const tableHead = liveVideos.length ? `
    <div class="rv-table-head content-table-head">
      <span>Video</span><span>Views</span><span>Retention</span><span>CTR</span><span>Revenue</span><span>Status</span><span></span>
    </div>
  ` : '';

  const rowsHTML = pageVideos.map(v => {
    const watchMin = Math.floor(v.watchTimeSec / 60), watchSec = v.watchTimeSec % 60;
    const durMin = Math.floor((v.durationSec || 0) / 60), durSec = (v.durationSec || 0) % 60;
    const durLabel = `${durMin}:${String(durSec).padStart(2, '0')}`;
    return `
      <div class="content-row-wrap">
        <div class="content-row" data-toggle="${v.id}">
          <div class="rv-video-cell">
            <div class="rv-thumb">${videoThumb(v)}<span class="lu-dur">${durLabel}</span></div>
            <div class="rv-main">
              <div class="rv-title">${v.title} <span class="expand-caret">${v.expanded ? ic('chevronDown') : ic('chevronRight')}</span></div>
              <div class="rv-sub">${fmt(v.views)} views${v.ctName ? ` &middot; ${v.ctName}` : ''}</div>
            </div>
          </div>
          <span class="rv-col mono">${fmt(v.views)}</span>
          <span class="rv-col mono">${shownRetention(v)}%</span>
          <span class="rv-col mono">${Math.round(v.ctr)}%</span>
          <span class="rv-col mono rv-revenue">$${(v.revenueEarned || 0).toFixed(2)}</span>
          <span class="rv-col rv-status-col">${statusPill(v.status)}</span>
          <button class="delete-btn" data-delete="${v.id}" aria-label="Delete video">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
        ${v.expanded ? `
          <div class="video-details content-details">
            <div class="trait-grid">
              <div class="trait"><span class="t-label">${ic('star')} Entertainment</span><span class="t-val">${Math.round(v.entertainment)}</span></div>
              <div class="trait"><span class="t-label">${ic('brain')} Educational</span><span class="t-val">${Math.round(v.educational)}</span></div>
              <div class="trait"><span class="t-label">${ic('heart')} Satisfaction</span><span class="t-val">${Math.round(v.satisfaction)}%</span></div>
              <div class="trait"><span class="t-label">${ic('play')} Watch Time</span><span class="t-val">${watchMin}m ${watchSec}s</span></div>
            </div>
            <div class="comments-list">
              ${v.comments.slice(-8).reverse().map(commentHTML).join('')}
            </div>
            <button class="mini-btn va-open" data-va="${v.id}">${ic('chart')}Open video analytics</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  listEl.innerHTML = pipelineHTML + tableHead + (rowsHTML || `<div class="empty-hint">No ${contentSubTab} yet.</div>`);

  if (pagerEl){
    if (liveVideos.length === 0){
      pagerEl.innerHTML = '';
    } else {
      const rangeStart = startIdx + 1;
      const rangeEnd = Math.min(liveVideos.length, startIdx + CONTENT_PAGE_SIZE);
      let pageBtns = '';
      for (let p = 1; p <= totalPages; p++){
        pageBtns += `<button class="page-btn ${p === contentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      }
      pagerEl.innerHTML = `
        <div class="pager-info">Showing ${rangeStart}&ndash;${rangeEnd} of ${liveVideos.length} video${liveVideos.length === 1 ? '' : 's'}</div>
        <div class="pager-controls">
          <button class="page-arrow" data-page="${Math.max(1, contentPage - 1)}" ${contentPage === 1 ? 'disabled' : ''}>${ic('chevronRight', 'flip')}</button>
          ${pageBtns}
          <button class="page-arrow" data-page="${Math.min(totalPages, contentPage + 1)}" ${contentPage === totalPages ? 'disabled' : ''}>${ic('chevronRight')}</button>
        </div>
      `;
    }
  }
}

function buyData(){
  if (state.money < 6){
    playErrorSound();
    showToast(ic('dollar') + ' Not enough money for a data top-up.');
    return;
  }
  state.money -= 6;
  state.dataUsedGB = Math.max(0, state.dataUsedGB - 2);
  playCoinSound();
  showToast(ic('wifi') + ' Bought 2GB of extra data for this cycle.');
  renderEquipment();
  renderStats();
}

function computeVideoSizeGB(formatKey, lengthKey){
  const format = FORMATS[formatKey] || FORMATS.longform;
  if (format.sizeGB) return format.sizeGB; // Shorts: fixed size, ignores the length picker
  const length = LENGTHS[lengthKey] || LENGTHS.m8;
  return length.sizeGB;
}

function toggleVideoDetails(id){
  const v = state.videos.find(video => video.id === id);
  if (!v) return;
  v.expanded = !v.expanded;
  renderVideos();
}

let pendingDeleteId = null;

function dropFromPlaylists(id){
  state.playlists.forEach(pl => { pl.videoIds = pl.videoIds.filter(x => x !== id); });
  playlistsDirty = true;
}
function requestDeleteVideo(id){
  const v = state.videos.find(video => video.id === id);
  if (!v) return;
  pendingDeleteId = id;
  document.getElementById('delete-confirm-title').textContent = `"${v.title}" — this can't be undone.`;
  document.getElementById('delete-confirm-modal').classList.add('show');
}

function cancelDeleteVideo(){
  pendingDeleteId = null;
  document.getElementById('delete-confirm-modal').classList.remove('show');
}

function confirmDeleteVideo(){
  if (!pendingDeleteId) return;
  playClickSound();
  const v = state.videos.find(video => video.id === pendingDeleteId);
  if (v && v.sizeGB){
    state.storageUsedGB = Math.max(0, state.storageUsedGB - v.sizeGB);
  }
  state.videos = state.videos.filter(video => video.id !== pendingDeleteId);
  dropFromPlaylists(pendingDeleteId);
  if (typeof socialVideoGone === 'function') socialVideoGone(pendingDeleteId);
  syncPlaylistBoosts();
  pendingDeleteId = null;
  document.getElementById('delete-confirm-modal').classList.remove('show');
  showToast(ic('trash') + ' Video deleted — storage freed up.');
  safeRenderAll();
}

/* Animates a freshly-created video through Uploading% -> Processing -> Copyright ->
   Publishing -> Live, then lets the real per-second tick take over. A "first comment"
   toast fires a couple seconds after it goes live, using one of its own generated comments. */
const PIPELINE_PHASES = ['editing', 'rendering', 'exporting', 'uploading', 'processingSD', 'processingHD', 'copyright', 'publishing'];
function pipelineStageLabel(phase){
  const idx = PIPELINE_PHASES.indexOf(phase);
  return idx === -1 ? '' : `Stage ${idx + 1} of ${PIPELINE_PHASES.length}`;
}

const GAME_MIN_TO_REAL_MS = 1000; // matches the core clock: 1 real second = 1 in-game minute

function beginUploadSequence(v){
  const internetTier = EQUIPMENT.internet.tiers[state.equipTier.internet];
  const effectiveSpeed = internetTier.speedMbps * (state.ispThrottled ? 0.3 : 1);
  // Realistic transfer time, in game-minutes — this is the actual "1 real min = 1 game hour" ratio
  // applied to uploading specifically, so a Mobile 3G plan is a genuinely felt cost, not cosmetic.
  // sizeGB * 8000 Mb / Mbps = seconds of transfer; the old code treated that as minutes (60x too long).
  const uploadGameMin = Math.max(1, (v.sizeGB * 8000) / effectiveSpeed / 60);

  const effortMult = { quick: 0.5, standard: 1, polished: 2 }[v.effort] || 1;
  const editingGameMin   = clamp(15 * effortMult, 6, 45);
  const renderingGameMin = clamp(v.sizeGB * 10, 3, 60);
  const exportingGameMin = clamp(v.sizeGB * 6,  2, 30);
  const sdGameMin        = 10;
  const hdGameMin        = clamp(v.sizeGB * 8,  4, 40);
  const copyrightGameMin = 8;
  const publishGameMin   = 6;

  // The upload itself is the one leg that can genuinely run long on bad internet — this is
  // where "upload speed matters" lives. Capped at 8 real minutes worst-case (Mobile 3G +
  // a 25-min video) so it's a real cost, not a wall — and it runs in the background, so
  // the player can keep using the rest of the app while it finishes.
  const uploadRealMs = clamp(uploadGameMin * GAME_MIN_TO_REAL_MS, 1500, 480000);
  v.estUploadSec = uploadRealMs / 1000 * (60 / (GAME_MIN_TO_REAL_MS / 1000)); // in-game seconds, matches the real timer exactly

  const PRE_STEPS = [
    { phase: 'editing',   ms: editingGameMin * GAME_MIN_TO_REAL_MS },
    { phase: 'rendering', ms: renderingGameMin * GAME_MIN_TO_REAL_MS },
    { phase: 'exporting', ms: exportingGameMin * GAME_MIN_TO_REAL_MS },
  ];
  const POST_STEPS = [
    { phase: 'processingSD', ms: sdGameMin * GAME_MIN_TO_REAL_MS },
    { phase: 'processingHD', ms: hdGameMin * GAME_MIN_TO_REAL_MS },
    { phase: 'copyright',    ms: copyrightGameMin * GAME_MIN_TO_REAL_MS },
    { phase: 'publishing',   ms: publishGameMin * GAME_MIN_TO_REAL_MS },
    { phase: 'revealing',    ms: 3 * GAME_MIN_TO_REAL_MS },
  ];

  const stepMs = 250;
  const uploadSteps = Math.max(4, Math.round(uploadRealMs / stepMs));
  const stepPct = 100 / uploadSteps;

  function runPre(i){
    if (i >= PRE_STEPS.length){
      startUpload();
      return;
    }
    v.publishPhase = PRE_STEPS[i].phase;
    renderVideos();
    renderHome();
    setTimeout(() => runPre(i + 1), PRE_STEPS[i].ms);
  }

  function startUpload(){
    v.publishPhase = 'uploading';
    v.publishProgress = 0;
    v.publishProgressRaw = 0; // unrounded accumulator — tiny per-tick gains (slow/throttled internet)
                               // must not get wiped by rounding v.publishProgress every tick
    renderVideos();
    renderHome();

    const uploadTimer = setInterval(() => {
      v.publishProgressRaw = Math.min(100, v.publishProgressRaw + stepPct * rand(0.7, 1.3));
      v.publishProgress = Math.round(v.publishProgressRaw); // rounded value only used for display
      renderVideos();
      renderHome();
      if (v.publishProgressRaw >= 100){
        clearInterval(uploadTimer);
        runPost(0);
      }
    }, stepMs);
  }

  function runPost(i){
    if (i >= POST_STEPS.length){
      if (v.publishAt && v.publishAt > state.totalTicks){
        v.publishPhase = 'scheduled';
        playSuccessSound();
        showToast(ic('calendar') + ` Scheduled: "${v.title}" goes live ${formatTick(v.publishAt)}`, true);
        renderVideos(); renderHome(); renderCooldown();
        return;
      }
      goLive(v);
      playSuccessSound();
      renderVideos();
      renderHome();
      renderCooldown();
      setTimeout(() => {
        if (v.comments && v.comments.length){
          const c0 = v.comments[0];
          showToast(ic('chat') + ` First comment: ${typeof c0 === 'string' ? c0 : c0.by + ' — "' + c0.text + '"'}`, true);
        }
      }, 2200);
      return;
    }
    v.publishPhase = POST_STEPS[i].phase;
    renderVideos();
    renderHome();
    setTimeout(() => runPost(i + 1), POST_STEPS[i].ms);
  }

  runPre(0);
}

/* ---------- Rendering: equipment (Shop tab) ---------- */
const EQUIP_ICONS = {
  camera: `<path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="14" r="3.5"/>`,
  mic: `<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>`,
  editing: `<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><line x1="20" y1="4" x2="8.5" y2="15.5"/><line x1="8.5" y1="8.5" x2="20" y2="20"/>`,
  internet: `<path d="M2 8.5a15.4 15.4 0 0 1 20 0"/><path d="M5.5 12.5a10.6 10.6 0 0 1 13 0"/><path d="M9 16.5a5.8 5.8 0 0 1 6 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>`,
  storage: `<rect x="3" y="9" width="18" height="10" rx="2"/><line x1="3" y1="14" x2="21" y2="14"/><circle cx="7" cy="16.5" r="0.6" fill="currentColor" stroke="none"/>`,
};

let shopFilterCat = 'all'; // UI-only filter for the Shop tab category tabs — doesn't touch game state

function renderEquipment(){
  const el = document.getElementById('equip-list');
  const shopBalanceEl = document.getElementById('shop-balance');
  if (shopBalanceEl) shopBalanceEl.textContent = '$' + state.money.toFixed(2);
  el.innerHTML = Object.entries(EQUIPMENT).filter(([type]) => shopFilterCat === 'all' || shopFilterCat === type).map(([type, cfg]) => {
    const tierIdx = state.equipTier[type];
    const cur = cfg.tiers[tierIdx];
    const next = cfg.tiers[tierIdx + 1];
    const maxed = !next;
    const levelLocked = false; // levels no longer gate gear
    const canAfford = next && !levelLocked && state.money >= next.cost;

    const effectText = (() => {
      if (!next) return 'Fully upgraded';
      if (type === 'internet') return `+${Math.round((next.speedMbps / cur.speedMbps - 1) * 100)}% upload speed`;
      if (type === 'storage') return `+${Math.round((next.capacityGB / cur.capacityGB - 1) * 100)}% storage`;
      const label = type === 'mic' ? 'audio quality' : type === 'editing' ? 'editing quality' : 'video quality';
      return `+${next.quality - cur.quality}% ${label}`;
    })();
    let btnLabel = 'Fully upgraded', btnDisabled = true, btnClass = 'maxed';
    if (next){
      if (levelLocked){ btnLabel = `Unlocks at Lv. ${next.requiresLevel}`; btnClass = 'locked'; }
      else { btnLabel = `$${fmt(next.cost)}`; btnClass = canAfford ? 'buy' : 'broke'; btnDisabled = !canAfford; }
    }
    const progressBar2 = next && !levelLocked && !canAfford
      ? `<div class="equip-progress"><div class="fill" style="width:${Math.min(100, Math.round((state.money / next.cost) * 100))}%"></div></div>` : '';

    let extra = '';
    if (type === 'storage'){
      const capGB = cur.capacityGB;
      const usedPct = Math.min(100, Math.round((state.storageUsedGB / capGB) * 100));
      extra = `
        <div class="usage-panel">
          <div class="usage-label"><span>Storage used</span><span>${state.storageUsedGB.toFixed(2)}GB / ${capGB}GB</span></div>
          <div class="usage-track"><div class="bar ${usedPct >= 90 ? 'danger' : ''}" style="width:${usedPct}%"></div></div>
        </div>
      `;
    } else if (type === 'internet'){
      const capGB = cur.dataCapGB;
      const capped = Number.isFinite(capGB);
      const usedPct = capped ? Math.min(100, Math.round((state.dataUsedGB / capGB) * 100)) : 0;
      const daysUntilBill = Math.max(0, Math.ceil((state.nextBillTick - state.totalTicks) / DAY_TICKS));
      extra = `
        <div class="usage-panel">
          <div class="usage-label"><span>Data this cycle</span><span>${capped ? state.dataUsedGB.toFixed(2) + 'GB / ' + capGB + 'GB' : 'Unlimited'}</span></div>
          ${capped ? `<div class="usage-track"><div class="bar ${usedPct >= 90 ? 'danger' : ''}" style="width:${usedPct}%"></div></div>` : ''}
          <div class="usage-sub">Bill: $${cur.monthlyBill} — due in ${daysUntilBill}d${state.ispThrottled ? ` · <span class="throttle-warn">${ic('alert')} Throttled</span>` : ''}</div>
          ${capped ? `<div class="data-btn-row"><button class="buy-data-btn" id="buy-data-btn">${ic('wifi')}Buy 2GB for $6</button><button class="buy-data-btn ad" id="free-data-btn" ${state.freeDataAds >= FREE_DATA_ADS_PER_CYCLE ? 'disabled' : ''}>${ic('tv')}Watch ad for 1GB <span>${FREE_DATA_ADS_PER_CYCLE - state.freeDataAds} left</span></button></div>` : ''}
        </div>
      `;
    }

    const wide = (type === 'internet' || type === 'storage') ? 'wide' : '';

    return `
      <div class="equip-card ${wide} ${levelLocked ? 'locked' : ''}" data-equip-cat="${type}">
        <div class="equip-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${EQUIP_ICONS[type] || ''}</svg>
        </div>
        <div class="equip-body">
          <div class="equip-category">${cfg.label}</div>
          <div class="equip-tier-name">${cur.name}</div>
          <div class="equip-level">Level ${tierIdx + 1}</div>
          <div class="equip-effect">${next ? effectText : 'Fully upgraded'}</div>
          ${progressBar2}
          <button class="equip-buy ${btnClass}" data-type="${type}" ${btnDisabled ? 'disabled' : ''}>${btnLabel}</button>
          ${extra}
        </div>
      </div>
    `;
  }).join('');
  const buyDataBtn = document.getElementById('buy-data-btn');
  if (buyDataBtn) buyDataBtn.addEventListener('click', buyData);
  const freeDataBtn = document.getElementById('free-data-btn');
  if (freeDataBtn) freeDataBtn.addEventListener('click', freeDataAd);
  el.querySelectorAll('button[data-type]').forEach(btn => {
    btn.addEventListener('click', () => upgradeEquipment(btn.dataset.type));
  });
}

/* ---------- Rendering: Home tab (analytics, top video, algorithm, milestones) ---------- */
/* ---------- Shared inline line/area chart builder (Home performance + Analytics revenue) ---------- */
function buildLineChartSVG(values, colorHex, gradId){
  const max = Math.max(1, ...values);
  const W = 480, H = 120, PAD = 6;
  const stepX = (W - PAD * 2) / (values.length - 1 || 1);
  const pts = values.map((v, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (1 - v / max) * (H - PAD * 2);
    return [x, y];
  });
  const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const areaPath = linePath + ` L${pts[pts.length - 1][0].toFixed(1)},${H - PAD} L${pts[0][0].toFixed(1)},${H - PAD} Z`;
  const last = pts[pts.length - 1];
  return `
    <svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${colorHex}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${colorHex}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#${gradId})" stroke="none"/>
      <path d="${linePath}" fill="none" stroke="${colorHex}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="${colorHex}" stroke="#141414" stroke-width="2"/>
    </svg>
  `;
}

let perfRangeDays = 7;
function renderHome(){
  // Greeting — derived from the real in-game clock hour, no fabricated state
  const greetEl = document.getElementById('greet-time');
  if (greetEl){
    const totalMin = state.totalTicks + CLOCK_START_OFFSET_MIN;
    const hour24 = Math.floor((totalMin % DAY_TICKS) / 60);
    greetEl.textContent = hour24 < 12 ? 'morning' : hour24 < 18 ? 'afternoon' : 'evening';
  }
  const greetName = document.getElementById('greet-name');
  if (greetName){
    const nm = (state.channelName || 'Creator').trim() || 'Creator';
    if (greetName.textContent !== nm) greetName.textContent = nm;
  }

  // Views by in-game day for the selected range (today included, still filling)
  const sparkEl = document.getElementById('views-sparkline');
  const days = perfRangeDays;
  const hist = state.dailyHistory.slice(-(days - 1)).concat([{ views: state.dayViews, subs: state.daySubs, money: state.dayMoney }]);
  const bars = hist.map(d => d.views);
  const total48h = bars.reduce((a, b) => a + b, 0);
  const rangeSubs = hist.reduce((a, d) => a + d.subs, 0);
  const rangeMoney = hist.reduce((a, d) => a + d.money, 0);
  const totalEl = document.getElementById('spark-total');
  if (totalEl) totalEl.textContent = fmt(total48h);
  const emptyEl = document.getElementById('chart-empty');
  if (emptyEl && sparkEl){
    const isEmpty = total48h <= 0;
    emptyEl.style.display = isEmpty ? 'flex' : 'none';
    sparkEl.style.display = isEmpty ? 'none' : 'flex';
  }
  if (sparkEl){
    const padded = Array(Math.max(0, days - bars.length)).fill(0).concat(bars);
    sparkEl.innerHTML = buildLineChartSVG(padded, '#3b82f6', 'sparkFill');

    // Y-axis labels (top to bottom) derived from the real max of the plotted window
    const yAxisEl = document.getElementById('perf-y-axis');
    if (yAxisEl){
      const maxV = Math.max(1, ...padded);
      const steps = 4;
      let labels = [];
      for (let i = steps; i >= 0; i--) labels.push(Math.round((maxV * i) / steps));
      yAxisEl.innerHTML = labels.map(v => `<span>${v >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'K' : v}</span>`).join('');
    }

    // X-axis — real current in-game day number, spread across the visible window
    const xAxisEl = document.getElementById('perf-x-axis');
    if (xAxisEl){
      const totalMinNow = state.totalTicks + CLOCK_START_OFFSET_MIN;
      const currentDay = Math.floor(totalMinNow / DAY_TICKS) + 1;
      const xLabels = [];
      const step = days <= 7 ? 1 : days <= 28 ? 4 : 15;
      for (let i = days - 1; i >= 0; i -= step) xLabels.push(currentDay - i >= 1 ? 'Day ' + (currentDay - i) : '');
      if (xLabels[xLabels.length - 1] !== 'Day ' + currentDay) xLabels.push('Day ' + currentDay);
      xAxisEl.innerHTML = xLabels.map(l => `<span>${l}</span>`).join('');
    }

    // Floating tooltip pinned near the last plotted point, showing the real current-hour value
    const tipEl = document.getElementById('perf-tooltip');
    if (tipEl){
      const lastVal = padded[padded.length - 1];
      const maxV = Math.max(1, ...padded);
      const topPct = 10 + (1 - lastVal / maxV) * 75;
      tipEl.style.top = topPct + '%';
      tipEl.style.left = 'calc(100% - 46px)';
      tipEl.textContent = fmt(lastVal);
      tipEl.style.display = total48h > 0 ? 'block' : 'none';
    }
  }

  // Channel Performance mini-stats — this range vs the same-length range before it
  const prevHist = state.dailyHistory.slice(-(2 * days - 1), -(days - 1) || undefined);
  const perfViewsEl = document.getElementById('perf-views');
  const perfSubsEl = document.getElementById('perf-subs');
  const perfRevenueEl = document.getElementById('perf-revenue');
  if (perfViewsEl) perfViewsEl.textContent = fmtCompact(total48h);
  if (perfSubsEl) perfSubsEl.textContent = '+' + fmt(rangeSubs);
  if (perfRevenueEl) perfRevenueEl.textContent = '$' + rangeMoney.toFixed(2);
  const setDelta = (id, cur, field) => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = prevHist.reduce((a, d) => a + (d[field] || 0), 0);
    // Not enough history for a fair comparison yet (a new channel, or nothing last period)
    if (prevHist.length < Math.min(days, 2) || prev <= 0){
      el.textContent = cur > 0 ? 'New this period' : '';
      el.className = 'd flat';
      return;
    }
    const val = Math.round(((cur - prev) / prev) * 100);
    el.textContent = Math.abs(val) >= 1000 ? (val > 0 ? '↑ 10x+' : '↓ 90%+') : (val >= 0 ? '↑ ' : '↓ ') + Math.abs(val) + '%';
    el.className = 'd ' + (val >= 0 ? 'up' : 'down');
    el.title = 'Compared with the ' + days + ' days before';
  };
  setDelta('perf-views-d', total48h, 'views');
  setDelta('perf-subs-d', rangeSubs, 'subs');
  setDelta('perf-revenue-d', rangeMoney, 'money');

  // Trending Topics — ranked by today's real audience mood + base popularity, no fabricated counts
  renderTrendingTopicsList('trending-topics-list');

  // Latest Upload
  const luEl = document.getElementById('latest-upload-card');
  const luBadgeEl = document.getElementById('latest-upload-badge');
  if (luEl){
    if (state.videos.length === 0){
      luEl.innerHTML = `<div class="empty-hint">No uploads yet — head to the Studio tab.</div>`;
      if (luBadgeEl) luBadgeEl.innerHTML = '';
    } else {
      const v = state.videos[state.videos.length - 1];
      const durMin = Math.floor((v.durationSec || 0) / 60), durSec = (v.durationSec || 0) % 60;
      const durLabel = `${durMin}:${String(durSec).padStart(2, '0')}`;
      if (v.publishPhase && v.publishPhase !== 'live'){
        const label = (UPLOAD_PHASE_LABEL[v.publishPhase] || (() => 'Uploading...'))(v);
        const stage = pipelineStageLabel(v.publishPhase);
        if (luBadgeEl) luBadgeEl.innerHTML = '';
        luEl.innerHTML = `
          <div class="latest-upload">
            <div class="lu-row">
              <div class="lu-thumb pending">${videoThumb(v)}<span class="pending-veil">${ic('upload')}</span><span class="lu-dur">${durLabel}</span></div>
              <div class="lu-row-main">
                <div class="lu-title">${v.title}</div>
                ${stage ? `<div class="pipeline-stage">${stage}</div>` : ''}
                <div class="lu-algo">${label}</div>
              </div>
            </div>
          </div>
        `;
      } else {
        initLiveMetrics(v);
        const likes = Math.round(v.likes);
        const commentCount = Math.round(v.commentCount);
        const algoMsg = algoStatusMessage(v);
        if (luBadgeEl) luBadgeEl.innerHTML = `${statusPill(v.status)}`;
        luEl.innerHTML = `
          <div class="latest-upload">
            <div class="lu-row">
              <div class="lu-thumb">${videoThumb(v)}<span class="lu-dur">${durLabel}</span></div>
              <div class="lu-row-main">
                <div class="lu-title">${v.title}</div>
                <div class="lu-meta-line">${fmt(v.views)} views · ${formatDuration(v.age)} ago</div>
                <div class="lu-topstats">
                  <span>${ic('heart')}${fmt(likes)}</span>
                  <span>${ic('chat')}${fmt(commentCount)}</span>
                </div>
              </div>
            </div>
            <div class="lu-meters">
              <div class="lu-meter">
                <div class="lu-meter-label"><span>Retention</span><span class="mono">${shownRetention(v)}%</span></div>
                <div class="lu-meter-track"><div class="fill retention" style="width:${shownRetention(v)}%"></div></div>
              </div>
              <div class="lu-meter">
                <div class="lu-meter-label"><span>CTR</span><span class="mono">${Math.round(v.ctr)}%</span></div>
                <div class="lu-meter-track"><div class="fill ctr" style="width:${Math.round(v.ctr)}%"></div></div>
              </div>
            </div>
            <div class="lu-algo"><span class="sdot ${algoMsg.dot}"></span>${algoMsg.text}</div>
          </div>
        `;
      }
    }
  }

  // Today's analytics
  const viewsDelta = state.totalViews - state.dailySnapshot.views;
  const subsDelta = state.subs - state.dailySnapshot.subs;
  const moneyDelta = state.money - state.dailySnapshot.money;
  document.getElementById('today-views').textContent = '+' + fmt(viewsDelta);
  document.getElementById('today-subs').textContent = '+' + fmt(subsDelta);
  document.getElementById('today-money').textContent = (moneyDelta < 0 ? '−$' : '+$') + Math.abs(moneyDelta).toFixed(2);

  const moneyDeltaEl = document.getElementById('stat-money-delta');
  const subsDeltaEl = document.getElementById('stat-subs-delta');
  const viewsDeltaEl = document.getElementById('stat-views-delta');
  const deltaArrow = ic('arrowUp', 'delta-ic');
  if (moneyDeltaEl) moneyDeltaEl.innerHTML = moneyDelta > 0 ? `${deltaArrow}+$${moneyDelta.toFixed(2)} today` : '';
  if (subsDeltaEl) subsDeltaEl.innerHTML = subsDelta > 0 ? `${deltaArrow}+${fmt(subsDelta)}` : '';
  if (viewsDeltaEl) viewsDeltaEl.innerHTML = viewsDelta > 0 ? `${deltaArrow}+${fmt(viewsDelta)}` : '';

  // Top performing video
  const topEl = document.getElementById('top-video-card');
  if (state.videos.length === 0){
    topEl.innerHTML = `<div class="empty-hint">No uploads yet.</div>`;
  } else {
    const top = state.videos.reduce((a, b) => (b.views > a.views ? b : a));
    const growing = top.rate >= 5;
    topEl.innerHTML = `
      <div class="top-video">
        <div>
          <div class="title">${top.title}</div>
          <div class="status-line">${badgeLabel(top.status)} · ${top.rate >= 1 ? Math.round(top.rate) + ' views per game-minute' : 'still trickling'}</div>
        </div>
        <div>
          <div class="count mono">${fmt(top.views)}</div>
          ${growing ? `<div class="still-growing">${ic('arrowUp')} Still Growing</div>` : ''}
        </div>
      </div>
    `;
  }

  // Algorithm stars + stats
  const starsFilled = clamp(Math.round(state.algoRating / 20), 0, 5);
  document.getElementById('algo-stars').innerHTML = ic('star', 'star-filled').repeat(starsFilled) + ic('star', 'star-empty').repeat(5 - starsFilled);

  const avgRetention = state.videos.length
    ? state.videos.reduce((sum, v) => sum + viewFraction(v) * 100, 0) / state.videos.length
    : 0;
  const avgCtr = state.videos.length
    ? state.videos.reduce((sum, v) => sum + v.ctr, 0) / state.videos.length
    : 0;
  const C = cadence();
  const consistency = clamp((uploadsInLastDays(C.windowDays) / C.need) * 100, 0, 100);

  document.getElementById('stat-retention').textContent = state.videos.length ? Math.round(avgRetention) + '%' : '—';
  document.getElementById('fill-retention').style.width = avgRetention + '%';
  document.getElementById('stat-ctr').textContent = state.videos.length ? Math.round(avgCtr) + '%' : '—';
  document.getElementById('fill-ctr').style.width = avgCtr + '%';
  document.getElementById('stat-consistency').textContent = Math.round(consistency) + '%';
  document.getElementById('fill-consistency').style.width = consistency + '%';

  const statusTag = (val) => val >= 50 ? { label: 'Healthy', cls: 'good' } : val >= 20 ? { label: 'OK', cls: 'mid' } : { label: 'Cold', cls: 'cold' };
  [['tag-retention', avgRetention], ['tag-ctr', avgCtr], ['tag-consistency', consistency]].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const t = statusTag(val);
    el.textContent = t.label;
    el.className = 'tag ' + t.cls;
  });

  // Milestones
  const msEl = document.getElementById('milestone-list');
  msEl.innerHTML = MILESTONES.map(m => {
    const done = state.subs >= m.subs;
    return `
      <div class="milestone-item ${done ? 'done' : ''}">
        <div class="milestone-check">${done ? ic('check') : ''}</div>
        <div class="m-label">${m.label}<div class="m-sub">${fmt(m.subs)} subscribers</div></div>
      </div>
    `;
  }).join('');

  // Achievements (non-subscriber goals)
  const achEl = document.getElementById('achievement-list');
  if (achEl){
    achEl.innerHTML = ACHIEVEMENTS.map(a => {
      const done = state.achievementsReached.includes(a.id);
      return `
        <div class="milestone-item ${done ? 'done' : ''}">
          <div class="milestone-check">${done ? ic('check') : ''}</div>
          <div class="m-label">${a.label}<div class="m-sub">+$${a.amount} reward</div></div>
        </div>
      `;
    }).join('');
  }

  // Today's Audience (topic mood)
  const moodEl = document.getElementById('audience-mood-list');
  if (moodEl){
    const mood = ensureAudienceMood();
    moodEl.innerHTML = Object.entries(mood.moods)
      .sort((a, b) => b[1] - a[1])
      .map(([key, pct]) => {
        const up = pct >= 0;
        return `
          <div class="mood-row">
            <span class="mood-topic">${TOPICS[key].label}</span>
            <span class="mood-pct ${up ? 'up' : 'down'}">${up ? '+' : ''}${pct}%</span>
          </div>
        `;
      }).join('');
  }

  // Notifications feed
  const notifEl = document.getElementById('notifications-list');
  if (notifEl){
    if (state.notifications.length === 0){
      notifEl.innerHTML = `<div class="empty-hint">Nothing yet — upload your first video to get things moving.</div>`;
    } else {
      const html = state.notifications.slice(0, 8).map(n => `<div class="notif-line"><span class="nl-text">${n.text}</span>${n.tick != null ? `<span class="notif-time">${feedTimeAgo(n.tick)}</span>` : ''}</div>`).join('');
      if (notifEl._html !== html){ notifEl.innerHTML = html; notifEl._html = html; }
    }
  }
}

/* ---------- Rendering: Revenue over time (Analytics tab) — derived from real tracked hourlyViews,
   using the same per-view monetization rate the sim already applies, so nothing is fabricated. ---------- */
/* ---------- Rendering: Analytics header — 4 stat cards + Views Over Time chart + Top Performing Video ---------- */
/* ---------- Rendering: Monetization tab — revenue chart, progress, sources, transactions ---------- */
let monetizationSubTab = 'overview'; // UI-only filter, doesn't touch game state

function monStat(label, value, sub){
  return `<div class="stat-card"><div class="stat-top"><span class="stat-lbl">${label}</span></div><div class="stat-val mono">${value}</div>${sub ? `<div class="stat-delta muted">${sub}</div>` : ''}</div>`;
}
function monTxList(types, empty){
  const tx = state.transactions.filter(t => types.includes(t.type)).slice(0, 8);
  if (!tx.length) return `<div class="empty-hint">${empty}</div>`;
  return tx.map(t => `
    <div class="mon-tx-row">
      <span class="mon-source-ic">${ic(MON_TX_ICON[t.type] || 'dollar')}</span>
      <div class="mon-tx-main"><div class="mon-tx-label">${t.label}</div><div class="mon-tx-time">${feedTimeAgo(t.tick)}</div></div>
      <div class="mon-tx-amt mono ${t.amount < 0 ? 'spend' : ''}">${t.amount < 0 ? '−' : '+'}$${Math.abs(t.amount).toFixed(2)}</div>
    </div>`).join('');
}
function monVideoTable(vids, empty){
  if (!vids.length) return `<div class="empty-hint">${empty}</div>`;
  return `<div class="mon-vtable">` + vids.map(v => `
    <div class="mon-vrow">
      <div class="rv-thumb">${videoThumb(v)}</div>
      <div class="pl-item-main"><div class="rv-title">${v.title}</div><div class="rv-sub">${fmt(v.views)} views &middot; RPM $${v.views > 0 ? ((v.revenueEarned || 0) / v.views * 1000).toFixed(2) : '0.00'}</div></div>
      <div class="mon-tx-amt mono">$${(v.revenueEarned || 0).toFixed(2)}</div>
    </div>`).join('') + `</div>`;
}
function lockedPanel(title, text, current, target){
  const pct = Math.min(100, Math.round(current / target * 100));
  return `<div class="panel-box mon-locked">
    <h3>${title}</h3>
    <div class="set-note">${text}</div>
    <div class="meter-row" style="margin-top:14px"><div class="meter-label"><span class="name">Subscribers</span><span class="val">${fmt(current)} / ${fmt(target)}</span></div>
    <div class="meter-track"><div class="fill" style="width:${pct}%"></div></div></div>
  </div>`;
}
function renderMonetizationDetail(el){
  const t = monetizationSubTab;
  const live = state.videos.filter(v => !v.publishPhase || v.publishPhase === 'live');
  if (t === 'ad'){
    const lf = live.filter(v => v.format !== 'shorts');
    const lfViews = lf.reduce((a, v) => a + v.views, 0);
    const rpm = lfViews > 0 ? state.adRevenueTotal / lfViews * 1000 : 0;
    const top = lf.slice().sort((a, b) => (b.revenueEarned || 0) - (a.revenueEarned || 0)).slice(0, 6);
    el.innerHTML = `
      <div class="stats-4">
        ${monStat('Ad revenue', '$' + state.adRevenueTotal.toFixed(2), state.isMonetized ? 'Long-form videos' : 'Starts after Partner Programme approval')}
        ${monStat('RPM', '$' + rpm.toFixed(2), 'Per 1,000 long-form views')}
        ${monStat('Long-form views', fmtCompact(lfViews), fmt(lf.length) + ' videos')}
        ${monStat('Watch hours', fmt(state.lfWatchHours), 'Long-form only')}
      </div>
      <div class="an-duo-grid">
        <div class="panel-box"><h3>Top earning videos</h3>${monVideoTable(top, state.isMonetized ? 'No long-form revenue yet.' : 'Ad revenue unlocks with the Partner Programme: 1,000 subscribers plus 4,000 long-form watch hours or 250K Shorts views.')}</div>
        <div class="panel-box"><h3>Ad payouts</h3>${monTxList(['ad'], 'No ad payouts yet.')}</div>
      </div>`;
  } else if (t === 'shorts'){
    const sh = live.filter(v => v.format === 'shorts');
    const sv = shortsViews90();
    const top = sh.slice().sort((a, b) => b.views - a.views).slice(0, 6);
    el.innerHTML = `
      <div class="stats-4">
        ${monStat('Shorts feed revenue', '$' + state.shortsRevenueTotal.toFixed(2), state.isMonetized ? 'Paid from the Shorts pool' : 'Starts after approval')}
        ${monStat('Shorts views, 90 days', fmtCompact(sv), fmtCompact(SPP_SHORTS_VIEWS_REQUIRED) + ' qualifies you')}
        ${monStat('Shorts published', fmt(sh.length), '')}
        ${monStat('Avg views per Short', sh.length ? fmtCompact(sh.reduce((a, v) => a + v.views, 0) / sh.length) : '0', '')}
      </div>
      <div class="an-duo-grid">
        <div class="panel-box"><h3>Top Shorts</h3>${monVideoTable(top, 'No Shorts yet. Pick the Shorts format in the Studio.')}</div>
        <div class="panel-box"><h3>Shorts payouts</h3>${monTxList(['shorts'], state.isMonetized ? 'No Shorts payouts yet.' : 'Shorts pay out once your channel is in the Partner Programme.')}</div>
      </div>`;
  } else if (t === 'sponsor'){
    if (!state.unlocks.sponsorships){ el.innerHTML = lockedPanel('Sponsorships', 'Brands start sending contract offers once you hit 1,000 subscribers: promote a product in a video, hit the view target, get paid. Do well and they come back with bigger deals.', state.subs, 1000); return; }
    renderSponsorDetail(el); return;
    const deals = state.transactions.filter(x => x.type === 'sponsor');
    el.innerHTML = `
      <div class="stats-4">
        ${monStat('Sponsorship revenue', '$' + state.sponsorshipRevenue.toFixed(2), '')}
        ${monStat('Deals this save', fmt(deals.length), 'Most recent 30 kept')}
        ${monStat('Average deal', deals.length ? '$' + (deals.reduce((a, d) => a + d.amount, 0) / deals.length).toFixed(2) : '$0.00', '')}
        ${monStat('Status', 'Open to offers', 'Deals arrive as events')}
      </div>
      <div class="panel-box"><h3>Deals</h3>${monTxList(['sponsor'], 'No deals yet. Keep uploading, brands notice active channels.')}</div>`;
  } else if (t === 'membership'){
    if (!state.fanFunding){ el.innerHTML = lockedPanel('Memberships', 'Memberships come with Partner Programme tier 1: 500 subscribers, 3 uploads in the last 90 days, and 3,000 long-form watch hours or 75K Shorts views.', state.subs, FAN_SUBS_REQUIRED); return; }
    const daily = state.subs * MEMBERSHIP_RATE_PER_SUB_PER_DAY;
    el.innerHTML = `
      <div class="stats-4">
        ${monStat('Membership revenue', '$' + state.membershipRevenue.toFixed(2), '')}
        ${monStat('Est. members', fmt(state.subs * 0.012), 'About 1.2% of subscribers')}
        ${monStat('Daily payout', '$' + daily.toFixed(2), 'Grows with subscribers')}
        ${monStat('Next payout', 'Midnight', 'In-game time')}
      </div>
      <div class="panel-box"><h3>Payments</h3>${monTxList(['membership'], 'No membership payments yet.')}</div>`;
  }
}

const MON_SOURCE_META = {
  ad:         { label: 'Ad Revenue',         icon: 'tv',       field: 'adRevenueTotal' },
  shorts:     { label: 'Shorts Feed',        icon: 'shorts',   field: 'shortsRevenueTotal' },
  superchat:  { label: 'Super Chats',        icon: 'chat',     field: 'superChatRevenue' },
  sponsor:    { label: 'Sponsorships',       icon: 'gift',     field: 'sponsorshipRevenue' },
  membership: { label: 'Memberships',        icon: 'medal',    field: 'membershipRevenue' },
};
const MON_TX_ICON = { ad: 'tv', shorts: 'shorts', superchat: 'chat', sponsor: 'gift', membership: 'medal', collab: 'users' };

function renderMonetization(){
  const bigEl = document.getElementById('mon-revenue-big');
  if (!bigEl) return;
  const grid = document.querySelector('#tab-monetization .mon-grid');
  const detail = document.getElementById('mon-detail');
  if (grid && detail){
    const overview = monetizationSubTab === 'overview';
    grid.style.display = overview ? '' : 'none';
    const sppPanel = document.getElementById('spp-panel');
    if (sppPanel) sppPanel.style.display = overview ? '' : 'none';
    detail.style.display = overview ? 'none' : '';
    if (!overview){ renderMonetizationDetail(detail); return; }
  }

  bigEl.textContent = '$' + state.lifetimeRevenue.toFixed(2);
  const todayRev = Math.max(0, state.dayMoney || 0);
  const deltaEl = document.getElementById('mon-revenue-delta');
  if (deltaEl) deltaEl.innerHTML = todayRev > 0.005 ? `${ic('arrowUp')} +$${todayRev.toFixed(2)} today` : '';

  // Revenue-over-time chart — real hourlyRevenue ledger
  const bars = state.hourlyRevenue.concat([state.currentHourRevenue]);
  const total48h = bars.reduce((a, b) => a + b, 0);
  const sparkEl = document.getElementById('mon-sparkline');
  const emptyEl = document.getElementById('mon-chart-empty');
  if (emptyEl && sparkEl){
    const isEmpty = total48h <= 0.005;
    emptyEl.style.display = isEmpty ? 'flex' : 'none';
    sparkEl.style.display = isEmpty ? 'none' : 'block';
  }
  if (sparkEl && total48h > 0.005){
    const padded = Array(Math.max(0, SPARKLINE_HOURS - bars.length)).fill(0).concat(bars);
    sparkEl.innerHTML = buildLineChartSVG(padded, '#3b82f6', 'monSparkFill');
    const yAxisEl = document.getElementById('mon-y-axis');
    if (yAxisEl){
      const maxV = Math.max(0.01, ...padded);
      const steps = 3;
      let labels = [];
      for (let i = steps; i >= 0; i--) labels.push('$' + Math.round((maxV * i) / steps));
      yAxisEl.innerHTML = labels.map(v => `<span>${v}</span>`).join('');
    }
    const xAxisEl = document.getElementById('mon-x-axis');
    if (xAxisEl) xAxisEl.innerHTML = ['48h ago', '36h ago', '24h ago', '12h ago', 'Now'].map(l => `<span>${l}</span>`).join('');
    const tipEl = document.getElementById('mon-tooltip');
    if (tipEl){
      const lastVal = padded[padded.length - 1];
      const maxV = Math.max(0.01, ...padded);
      tipEl.style.top = (10 + (1 - lastVal / maxV) * 75) + '%';
      tipEl.style.left = 'calc(100% - 46px)';
      tipEl.textContent = '$' + lastVal.toFixed(2);
      tipEl.style.display = 'block';
    }
  }

  // Revenue Sources — real cumulative totals per stream
  const sourcesEl = document.getElementById('mon-sources-list');
  if (sourcesEl){
    const total = Math.max(0.01, state.lifetimeRevenue);
    sourcesEl.innerHTML = Object.entries(MON_SOURCE_META).filter(([key]) => key !== 'superchat' || LIVE_ENABLED).map(([key, meta]) => {
      const amount = state[meta.field] || 0;
      const pctOfTotal = Math.round((amount / total) * 1000) / 10;
      return `
        <div class="mon-source-row">
          <span class="mon-source-ic">${ic(meta.icon)}</span>
          <div class="mon-source-main">
            <div class="mon-source-label">${meta.label}</div>
            <div class="mon-source-sub">${pctOfTotal}% of total</div>
          </div>
          <div class="mon-source-right">
            <div class="mon-source-amt mono">$${amount.toFixed(2)}</div>
            <div class="mon-source-pct mono">${pctOfTotal}%</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Recent Transactions — filtered by the active sub-tab
  const txEl = document.getElementById('mon-transactions-list');
  if (txEl){
    const filtered = monetizationSubTab === 'overview'
      ? state.transactions
      : state.transactions.filter(t => t.type === monetizationSubTab);
    if (filtered.length === 0){
      txEl.innerHTML = `<div class="empty-hint">No transactions yet.</div>`;
    } else {
      txEl.innerHTML = filtered.slice(0, 8).map(t => `
        <div class="mon-tx-row">
          <span class="mon-source-ic">${ic(MON_TX_ICON[t.type] || 'dollar')}</span>
          <div class="mon-source-main">
            <div class="mon-source-label">${t.label}</div>
            <div class="mon-source-sub">${feedTimeAgo(t.tick)}</div>
          </div>
          <div class="mon-tx-amt mono ${t.amount < 0 ? 'spend' : ''}">${t.amount < 0 ? '−' : '+'}$${Math.abs(t.amount).toFixed(2)}</div>
        </div>
      `).join('');
    }
  }
}

/* =========================================================================
   VIDEO ANALYTICS — per-video page (opened from "View details" and content rows)
   ========================================================================= */
let vaVideoId = null, vaMetric = 'views';
function openVideoAnalytics(id){
  const v = id ? state.videos.find(x => x.id === id) : state.videos.slice().reverse().find(x => !x.publishPhase || x.publishPhase === 'live');
  if (!v){ showToast(ic('play') + ' Upload a video first to see its analytics.'); return; }
  vaVideoId = v.id; vaMetric = 'views';
  playClickSound();
  renderVideoAnalytics();
  document.getElementById('video-modal').classList.add('show');
}
function renderVideoAnalytics(){
  const el = document.getElementById('video-modal-body');
  const v = state.videos.find(x => x.id === vaVideoId);
  if (!el || !v) return;
  initLiveMetrics(v);
  const dur = v.durationSec || 0, avd = v.watchTimeSec || 0;
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
  const hist = (v.hist || []).concat([[Math.round(v.views), v.ctr, v.retention]]);
  let series, fmtY;
  if (vaMetric === 'views'){ series = hist.map((h, k) => k === 0 ? h[0] : Math.max(0, h[0] - hist[k - 1][0])); fmtY = x => fmtCompact(x); }
  else if (vaMetric === 'ctr'){ series = hist.map(h => h[1]); fmtY = x => x.toFixed(1) + '%'; }
  else { const f = viewFraction(v) / Math.max(0.01, v.retention / 100); series = hist.map(h => h[2] * f); fmtY = x => Math.round(x) + '%'; }
  if (series.length < 2) series = [series[0] || 0, series[0] || 0];
  const maxV = Math.max(0.1, ...series);
  const subs = Math.floor(v.subsRaw || 0);
  const monetized = state.isMonetized;
  const algo = algoStatusMessage(v);
  const card = (k, val, sub) => `<div class="va-stat"><div class="va-k">${k}</div><div class="va-v mono">${val}</div>${sub ? `<div class="va-s">${sub}</div>` : ''}</div>`;
  el.innerHTML = `
    <div class="va-head">
      <div class="va-thumb">${videoThumb(v)}<span class="lu-dur">${mmss(dur)}</span></div>
      <div class="va-head-main">
        <div class="va-title">${v.title}</div>
        <div class="va-meta">${TOPICS[v.topic] ? TOPICS[v.topic].label : ''}${v.ctName ? ' ' + v.ctName : ''} &middot; ${v.format === 'shorts' ? 'Short' : 'Long-form'} &middot; published ${formatDuration(v.age)} ago${typeof videoAgeMix === 'function' ? ' &middot; viewers mostly ' + AGE_GROUPS[topAgeIndex(videoAgeMix(v))] : ''}</div>
        <div class="va-status">${statusPill(v.status)}<span class="va-algo">${algo.text}</span></div>
      </div>
    </div>
    <div class="va-grid">
      ${card('Views', fmt(v.views), '')}
      ${card('Watch time', fmt(v.views * avd / 3600) + 'h', 'Avg view ' + mmss(avd) + ' of ' + mmss(dur))}
      ${card('CTR', v.ctr.toFixed(1) + '%', 'Started at ' + v.baseCtr.toFixed(1) + '%')}
      ${card('Retention', shownRetention(v) + '%', 'Started at ' + Math.round(v.baseRetention * viewFraction(v) / Math.max(0.01, v.retention / 100)) + '%')}
      ${card('Subscribers', '+' + fmt(subs), '')}
      ${card('Likes', fmt(v.likes), '')}
      ${card('Comments', fmt(v.commentCount), '')}
      ${card('Revenue', monetized ? '$' + (v.revenueEarned || 0).toFixed(2) : '—', monetized ? 'RPM $' + (v.views > 0 ? ((v.revenueEarned || 0) / v.views * 1000).toFixed(2) : '0.00') : 'Not in the Partner Programme yet')}
    </div>
    <div class="va-chart-box">
      <div class="va-tabs">
        <button class="range-tab ${vaMetric === 'views' ? 'active' : ''}" data-va-metric="views">Views per hour</button>
        <button class="range-tab ${vaMetric === 'ctr' ? 'active' : ''}" data-va-metric="ctr">CTR</button>
        <button class="range-tab ${vaMetric === 'ret' ? 'active' : ''}" data-va-metric="ret">Retention</button>
      </div>
      <div class="va-chart">
        <div class="va-y">${[1, .5, 0].map(f => `<span>${fmtY(maxV * f)}</span>`).join('')}</div>
        <div class="va-plot">${buildLineChartSVG(series, '#3b82f6', 'vaFill')}</div>
      </div>
      <div class="va-x"><span>${hist.length > 1 ? (hist.length - 1) + 'h ago' : 'Upload'}</span><span>Now</span></div>
    </div>
    <div class="va-comments">
      <h4>Latest comments</h4>
      ${(v.comments || []).slice(-6).reverse().map(commentHTML).join('') || '<div class="empty-hint">No comments yet.</div>'}
    </div>`;
}

let analyticsRange = '48h';
const AN_RANGES = { '48h': 'Last 48 Hours', '7d': 'Last 7 Days', '28d': 'Last 28 Days', '90d': 'Last 90 Days', 'life': 'Lifetime' };
/* Returns { series (chart points), labels, totals {views, watchH, subs, money}, prev (same metrics for the previous period or null) } */
function analyticsWindow(range){
  if (range === '48h'){
    const pad = a => Array(Math.max(0, SPARKLINE_HOURS - a.length)).fill(0).concat(a);
    const views = pad(state.hourlyViews.concat([state.currentHourViews]).slice(-SPARKLINE_HOURS));
    const subs = pad(state.hourlySubs.concat([state.currentHourSubs]).slice(-SPARKLINE_HOURS));
    const watch = pad(state.hourlyWatch.concat([state.currentHourWatch]).slice(-SPARKLINE_HOURS));
    const money = pad(state.hourlyRevenue.concat([state.currentHourRevenue]).slice(-SPARKLINE_HOURS));
    const sum = a => a.reduce((x, y) => x + y, 0);
    return { series: views, labels: ['48h ago', '36h ago', '24h ago', '12h ago', 'Now'],
      totals: { views: sum(views), watchH: sum(watch), subs: sum(subs), money: sum(money) }, prev: null };
  }
  const today = { views: state.dayViews, subs: state.daySubs, money: state.dayMoney, watch: state.dayWatch };
  const all = state.dailyHistory.concat([today]);
  const n = range === '7d' ? 7 : range === '28d' ? 28 : range === '90d' ? 90 : all.length;
  const win = all.slice(-n);
  const prevWin = range === 'life' ? [] : all.slice(-2 * n, -n);
  const tot = w => ({ views: w.reduce((a, d) => a + d.views, 0), watchH: w.reduce((a, d) => a + (d.watch || 0), 0), subs: w.reduce((a, d) => a + d.subs, 0), money: w.reduce((a, d) => a + d.money, 0) });
  const day0 = Math.floor((state.totalTicks + CLOCK_START_OFFSET_MIN) / DAY_TICKS) + 1;
  const labels = [];
  const span = Math.max(1, win.length);
  for (let k = 0; k < 5; k++){ const back = Math.round((span - 1) * (1 - k / 4)); labels.push(back === 0 ? 'Today' : 'Day ' + Math.max(1, day0 - back)); }
  const series = win.map(d => d.views);
  return { series: series.length > 1 ? series : [0].concat(series), labels, totals: range === 'life'
      ? { views: state.totalViews, watchH: state.watchHours, subs: state.subs, money: state.lifetimeRevenue }
      : tot(win), prev: prevWin.length >= Math.min(n, 2) ? tot(prevWin) : null };
}

function renderAnalyticsOverview(){
  const viewsEl = document.getElementById('an-stat-views');
  if (!viewsEl) return; // Analytics tab markup not present (shouldn't happen, but keep safe)
  const W = analyticsWindow(analyticsRange);
  const rangeLbl = document.getElementById('an-range-label');
  if (rangeLbl) rangeLbl.textContent = AN_RANGES[analyticsRange];
  {
    const setD = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const delta = (cur, prev, money) => {
      if (!prev && prev !== 0) return '';
      const d = cur - prev;
      if (Math.abs(d) < (money ? 0.01 : 1)) return `<span class="muted">No change vs previous period</span>`;
      const pctTxt = prev > 0 ? ` (${d > 0 ? '+' : ''}${Math.round(d / prev * 100)}%)` : '';
      return `${ic(d > 0 ? 'arrowUp' : 'arrowDown')} ${money ? '$' + Math.abs(d).toFixed(2) : fmt(Math.abs(d))}${pctTxt}`;
    };
    viewsEl.textContent = fmt(W.totals.views);
    document.getElementById('an-stat-watchtime').textContent = fmt(Math.round(W.totals.watchH * 60));
    document.getElementById('an-stat-subs').textContent = (analyticsRange === 'life' ? '' : '+') + fmt(W.totals.subs);
    document.getElementById('an-stat-revenue').textContent = '$' + W.totals.money.toFixed(2);
    const P = W.prev;
    setD('an-stat-views-delta', P ? delta(W.totals.views, P.views) : `<span class="muted">${AN_RANGES[analyticsRange]}</span>`);
    setD('an-stat-watchtime-delta', P ? delta(Math.round(W.totals.watchH * 60), Math.round(P.watchH * 60)) : '');
    setD('an-stat-subs-delta', P ? delta(W.totals.subs, P.subs) : '');
    setD('an-stat-revenue-delta', P ? delta(W.totals.money, P.money, true) : '');
    const sparkEl = document.getElementById('an-views-sparkline');
    const emptyEl = document.getElementById('an-chart-empty');
    const total = W.series.reduce((a, b) => a + b, 0);
    if (emptyEl && sparkEl){ emptyEl.style.display = total <= 0 ? 'flex' : 'none'; sparkEl.style.display = total <= 0 ? 'none' : 'block'; }
    if (sparkEl && total > 0){
      sparkEl.innerHTML = buildLineChartSVG(W.series, '#3b82f6', 'anSparkFill');
      const maxV = Math.max(1, ...W.series);
      const yAxisEl = document.getElementById('an-y-axis');
      if (yAxisEl){ const l = []; for (let i = 3; i >= 0; i--) l.push(fmtCompact(Math.round(maxV * i / 3))); yAxisEl.innerHTML = l.map(v => `<span>${v}</span>`).join(''); }
      const xAxisEl = document.getElementById('an-x-axis');
      if (xAxisEl) xAxisEl.innerHTML = W.labels.map(l => `<span>${l}</span>`).join('');
      const tipEl = document.getElementById('an-tooltip');
      if (tipEl){ const lastVal = W.series[W.series.length - 1]; tipEl.style.top = (10 + (1 - lastVal / maxV) * 75) + '%'; tipEl.style.left = 'calc(100% - 46px)'; tipEl.textContent = fmt(lastVal); tipEl.style.display = 'block'; }
    }
  }
  renderAnalyticsTopVideo();
}
function renderAnalyticsTopVideo(){
  // Top Performing Video — richer card (thumbnail + meters), same underlying "top video" as Home
  const topEl = document.getElementById('an-top-video-card');
  if (topEl){
    if (state.videos.length === 0){
      topEl.innerHTML = `<div class="empty-hint">No uploads yet.</div>`;
    } else {
      const top = state.videos.filter(v => !v.publishPhase || v.publishPhase === 'live').reduce((a, b) => (!a || b.views > a.views ? b : a), null);
      if (!top){
        topEl.innerHTML = `<div class="empty-hint">No uploads yet.</div>`;
      } else {
        const durMin = Math.floor((top.durationSec || 0) / 60), durSec = (top.durationSec || 0) % 60;
        const durLabel = `${durMin}:${String(durSec).padStart(2, '0')}`;
        topEl.innerHTML = `
          <div class="lu-row">
            <div class="lu-thumb">${videoThumb(top)}<span class="lu-dur">${durLabel}</span></div>
            <div class="lu-row-main">
              <div class="lu-title">${top.title}</div>
              <div class="lu-meta-line">${fmt(top.views)} views</div>
              <a class="full-analytics-link" href="javascript:void(0)" onclick="openVideoAnalytics('${top.id}')">View details
                <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="M9 6l6 6-6 6"/></svg>
              </a>
            </div>
          </div>
          <div class="lu-meters" style="margin-top:14px;">
            <div class="lu-meter">
              <div class="lu-meter-label"><span>Retention</span><span class="mono">${shownRetention(top)}%</span></div>
              <div class="lu-meter-track"><div class="fill retention" style="width:${shownRetention(top)}%"></div></div>
            </div>
            <div class="lu-meter">
              <div class="lu-meter-label"><span>CTR</span><span class="mono">${Math.round(top.ctr)}%</span></div>
              <div class="lu-meter-track"><div class="fill ctr" style="width:${Math.round(top.ctr)}%"></div></div>
            </div>
          </div>
        `;
      }
    }
  }
}

/* ---------- Rendering: video status breakdown donut (Analytics tab) — real algo-status distribution ---------- */
const STATUS_COLORS = { testing: '#f59e0b', recommended: '#3b82f6', trending: '#60a5fa', slowing: '#6b7280', quiet: '#3f3f46' };
function renderStatusDonut(){
  const el = document.getElementById('status-donut-card');
  if (!el) return;
  const liveVideos = state.videos.filter(v => !v.publishPhase || v.publishPhase === 'live');
  if (liveVideos.length === 0){
    el.innerHTML = `<div class="empty-hint">Upload videos to see their algorithm status breakdown.</div>`;
    return;
  }
  const counts = {};
  liveVideos.forEach(v => { counts[v.status] = (counts[v.status] || 0) + 1; });
  const order = ['recommended', 'trending', 'testing', 'slowing', 'quiet'];
  const total = liveVideos.length;
  let acc = 0;
  const R = 40, CX = 50, CY = 50, CIRC = 2 * Math.PI * R;
  const segments = order.filter(k => counts[k]).map(k => {
    const frac = counts[k] / total;
    const dash = frac * CIRC;
    const seg = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${STATUS_COLORS[k]}" stroke-width="14"
      stroke-dasharray="${dash.toFixed(2)} ${(CIRC - dash).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${CX} ${CY})"/>`;
    acc += dash;
    return seg;
  }).join('');
  const legend = order.filter(k => counts[k]).map(k => `
    <div class="donut-legend-row">
      <span class="donut-dot" style="background:${STATUS_COLORS[k]}"></span>
      <span class="donut-label">${badgeLabel(k)}</span>
      <span class="donut-pct">${Math.round((counts[k] / total) * 100)}%</span>
    </div>
  `).join('');
  el.innerHTML = `
    <div class="donut-row">
      <svg class="donut-svg" viewBox="0 0 100 100">${segments}</svg>
      <div class="donut-legend">${legend}</div>
    </div>
  `;
}

/* ---------- Rendering: Streamly Partner Programme (Monetization tab) ---------- */
let _sppHtml = '';
function renderPartnerProgramme(){
  const el = document.getElementById('spp-status');
  if (!el) return;
  const sv = shortsViews90();
  const up90 = uploads90();
  const bar = (label, cur, target, fmtFn) => {
    const f = fmtFn || fmt, met = cur >= target;
    return `<div class="meter-row spp-bar ${met ? 'met' : ''}"><div class="meter-label"><span class="name">${met ? ic('check') : ''}${label}</span><span class="val">${f(Math.min(cur, target * 9.99))} / ${f(target)}</span></div><div class="meter-track"><div class="fill ${met ? 'met' : ''}" style="width:${Math.min(100, Math.round(cur / target * 100))}%"></div></div></div>`;
  };
  const t1Path = state.lfWatchHours >= FAN_WATCH_HOURS_REQUIRED || sv >= FAN_SHORTS_VIEWS_REQUIRED;
  const t1Met = (state.subs >= FAN_SUBS_REQUIRED) + (up90 >= FAN_UPLOADS_REQUIRED) + t1Path;
  const t2Path = state.lfWatchHours >= SPP_WATCH_HOURS_REQUIRED || sv >= SPP_SHORTS_VIEWS_REQUIRED;
  const t2Met = (state.subs >= SPP_SUBS_REQUIRED) + t2Path;
  const done = state.fanFunding && state.isMonetized;

  const tier = (cls, n, name, unlocks, approved, met, total, body) => `
    <div class="spp-tier ${cls} ${approved ? 'done' : ''}">
      <div class="spp-tier-head">
        <span class="spp-tier-badge">${approved ? ic('check') : n}</span>
        <div class="spp-tier-text"><div class="spp-tier-name">${name}</div><div class="spp-tier-unlocks">${unlocks}</div></div>
        <span class="spp-tier-state">${approved ? 'Approved' : `${met} of ${total} met`}</span>
      </div>
      ${approved ? '' : `<div class="spp-tier-body">${body}</div>`}
    </div>`;

  const t1 = tier('t1', 1, 'Fan funding', 'Unlocks channel memberships', state.fanFunding, t1Met, 3,
    `<div class="spp-req">` + bar('Subscribers', state.subs, FAN_SUBS_REQUIRED) +
    bar('Uploads, last 90 days', up90, FAN_UPLOADS_REQUIRED) + `</div>` +
    `<div class="spp-path"><div class="spp-or-label">Then either one</div>` +
    bar('Long-form watch hours', state.lfWatchHours, FAN_WATCH_HOURS_REQUIRED) +
    `<div class="spp-or">or</div>` +
    bar('Shorts views, last 90 days', sv, FAN_SHORTS_VIEWS_REQUIRED, fmtCompact) + `</div>`);
  const t2 = tier('t2', 2, 'Ad revenue', 'Unlocks ads on long-form and the Shorts feed', state.isMonetized, t2Met, 2,
    `<div class="spp-req">` + bar('Subscribers', state.subs, SPP_SUBS_REQUIRED) + `</div>` +
    `<div class="spp-path"><div class="spp-or-label">Then either one</div>` +
    bar('Long-form watch hours', state.lfWatchHours, SPP_WATCH_HOURS_REQUIRED) +
    `<div class="spp-or">or</div>` +
    bar('Shorts views, last 90 days', sv, SPP_SHORTS_VIEWS_REQUIRED, fmtCompact) + `</div>`);

  const spons = !!state.unlocks.sponsorships;
  const note = state.isMonetized
    ? `Approved through ${state.monetizedVia || 'long-form watch hours'}. Long-form videos earn ad revenue and Shorts earn from the Shorts feed.`
    : 'Views earn nothing until tier 2. Tier 1 lets fans support you through memberships first.';
  const html = `
    <div class="spp-tiers ${done ? 'compact' : (state.fanFunding || state.isMonetized) ? 'stack' : ''}">${state.isMonetized && !state.fanFunding ? t2 + t1 : t1 + t2}</div>
    <div class="spp-foot">
      <div class="spp-extra ${spons ? 'done' : ''}">${spons ? ic('check') : ic('megaphone')}<span>Brand sponsorships</span><span class="spp-extra-val mono">${spons ? 'Unlocked' : `${fmt(state.subs)} / ${fmt(1000)} subs`}</span></div>
      <div class="spp-note">${note}</div>
    </div>`;
  if (html !== _sppHtml){ el.innerHTML = html; _sppHtml = html; }
  const stEl = document.getElementById('spp-panel-state');
  if (stEl){
    const txt = done ? 'Fully monetized' : state.fanFunding ? 'Tier 1 approved' : 'Not eligible yet';
    if (stEl.textContent !== txt){ stEl.textContent = txt; stEl.className = 'spp-panel-state ' + (done ? 'good' : state.fanFunding ? 'mid' : ''); }
  }
}

/* ---------- Rendering: Audience Loyalty + Algorithm Learning (Analytics tab) ---------- */
function renderNicheStatus(){
  const loyaltyEl = document.getElementById('loyalty-list');
  if (loyaltyEl){
    const entries = Object.entries(state.audienceLoyalty);
    if (entries.length === 0){
      loyaltyEl.innerHTML = `<div class="empty-hint">Upload in a niche to start building an audience there.</div>`;
    } else {
      loyaltyEl.innerHTML = entries.sort((a, b) => b[1] - a[1]).map(([key, val]) => {
        const tier = val >= 70 ? 'high' : val >= 40 ? 'mid' : 'low';
        const tierLabel = tier === 'high' ? 'Loyal' : tier === 'mid' ? 'Mixed' : 'At risk';
        const label = TOPICS[key] ? TOPICS[key].label : key;
        const topicIcon = ic(TOPIC_ICONS[key] || 'star');
        return `
          <div class="loyalty-row">
            <div class="loyalty-head">
              <span class="loyalty-topic">${topicIcon}${label}</span>
              <span class="loyalty-right"><span class="loyalty-pct ${tier}">${Math.round(val)}%</span><span class="loyalty-tag ${tier}">${tierLabel}</span></span>
            </div>
            <div class="loyalty-track"><div class="bar ${tier}" style="width:${val}%"></div></div>
          </div>
        `;
      }).join('');
    }
  }

  const affinityEl = document.getElementById('affinity-list');
  if (affinityEl){
    const entries = Object.entries(state.topicAffinity).filter(([, v]) => v > 0);
    if (entries.length === 0){
      affinityEl.innerHTML = `<div class="empty-hint">Post consistently and well in a niche to earn a recommendation boost.</div>`;
    } else {
      affinityEl.innerHTML = entries.sort((a, b) => b[1] - a[1]).map(([key, val]) => {
        const boosted = !!state.topicAffinityAnnounced[key];
        const pct = Math.min(100, Math.round((val / 12) * 100));
        const label = TOPICS[key] ? TOPICS[key].label : key;
        return `
          <div class="affinity-row">
            <div class="affinity-head">
              <span class="affinity-topic">${label}</span>
              <span class="affinity-tag ${boosted ? 'boosted' : ''}">${boosted ? ic('check') + ' Boosted' : pct + '% to boost'}</span>
            </div>
            <div class="affinity-track"><div class="bar" style="width:${Math.min(100, Math.round((val / 25) * 100))}%"></div></div>
          </div>
        `;
      }).join('');
    }
  }
}

/* ---------- Rendering: Creator Feed tab ---------- */
/* ---------- Shared: Trending Topics list (Home + Discover) — real popularity + today's mood, no fabricated counts ---------- */
function renderTrendingTopicsList(elId){
  const trendEl = document.getElementById(elId);
  if (!trendEl) return;
  const mood = ensureAudienceMood();
  const ranked = Object.entries(TOPICS)
    .map(([key, t]) => ({ key, label: t.label, score: t.popularity + (mood.moods[key] || 0), moodPct: mood.moods[key] || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  trendEl.innerHTML = ranked.map((t, i) => `
    <div class="trend-row">
      <span class="trend-rank">${i + 1}</span>
      <div class="trend-main">
        <div class="trend-name">${t.label}</div>
        <div class="trend-sub">${fmtCompact(Math.round(t.score * 140))} videos &middot; ${t.moodPct >= 0 ? '+' : ''}${t.moodPct}% today</div>
      </div>
      <svg class="ic trend-arrow ${t.moodPct >= 0 ? 'up' : 'down'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">${t.moodPct >= 0 ? '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>' : '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>'}</svg>
    </div>
  `).join('');
}

/* Deterministic pseudo-random int in [min,max] from a string seed — stable across re-renders
   since it's derived from real, already-fixed data (a feed entry's tick/name), not Math.random(). */
function seededInt(seed, min, max){
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

/* ---------- Discover feed — rival "uploads" pulled from the real Creator Feed event log ---------- */
let discoverSubTab = 'foryou'; // UI-only filter
const DISCOVER_TOPIC_MAP = { gaming: 'gaming', tech: 'tech', entertainment: 'comedy' };
const DISCOVER_STYLES = ['shock', 'funny', 'action', 'clean', 'gameplay', 'action', 'funny'];

function renderDiscoverFeed(){
  const el = document.getElementById('discover-feed-list');
  if (!el) return;
  ensureRivals();
  renderTrendingTopicsList('discover-trending-topics');

  const uploadEntries = state.creatorFeed
    .map(item => {
      if (!item.name || !item.text) return null;
      const match = item.text.match(/just uploaded a new video — "(.+)"/);
      if (!match) return null;
      const rival = state.rivals.find(r => r.name === item.name);
      if (!rival) return null;
      if (!item.vid) item.vid = rivalVideoStats(rival); // older saves: give the upload its own numbers once
      return { name: item.name, title: match[1], tick: item.tick, topic: rival.topic, subs: rival.subs, vid: item.vid };
    })
    .filter(Boolean);

  let filtered = uploadEntries;
  if (discoverSubTab === 'trending'){
    filtered = filtered.slice().sort((a, b) => rivalVideoViews(b) - rivalVideoViews(a));
  } else if (DISCOVER_TOPIC_MAP[discoverSubTab]){
    filtered = filtered.filter(e => e.topic === DISCOVER_TOPIC_MAP[discoverSubTab]);
  }

  if (filtered.length === 0){
    el.innerHTML = `<div class="empty-hint">Nothing here yet — check back after rival creators post a few videos.</div>`;
    return;
  }

  el.innerHTML = filtered.slice(0, 12).map(e => {
    const views = rivalVideoViews(e);
    const durSec = e.vid.durSec;
    const durLabel = `${Math.floor(durSec / 60)}:${String(durSec % 60).padStart(2, '0')}`;
    const style = e.vid.style;
    return `
      <article class="dfeed-row">
        <div class="dfeed-thumb">
          ${thumbSVG({ seed: e.name + e.tick, topic: e.topic, style, title: e.title, face: e.name })}
          <span class="dc-dur">${durLabel}</span>
        </div>
        <div class="dfeed-main">
          <div class="dfeed-title">${e.title}</div>
          <div class="dc-creator-row">
            <span class="dc-avatar face-avatar">${thumbFace(e.name)}</span>
            <span class="dc-creator-name">${e.name}</span>
            <span class="dc-creator-subs">${fmtCompact(e.subs)} subscribers</span>
          </div>
          <div class="dc-meta">${fmtCompact(views)} views &middot; ${feedTimeAgo(e.tick)}</div>
        </div>
      </article>
    `;
  }).join('');
}

/* ---------- Who to Follow — top rivals by subscriber count, purely cosmetic follow toggle ---------- */
const followedCreators = new Set(); // session-only UI state, never saved — no game effect
function renderWhoToFollow(){
  const el = document.getElementById('who-to-follow-list');
  if (!el) return;
  ensureRivals();
  const top = state.rivals.slice().sort((a, b) => b.subs - a.subs).slice(0, 3);
  el.innerHTML = top.map(r => {
    const initials = avatarInitials(r.name);
    const color = avatarColor(r.name);
    const following = followedCreators.has(r.name);
    return `
      <div class="wtf-row">
        <span class="dc-avatar face-avatar">${thumbFace(r.name)}</span>
        <div class="wtf-main">
          <div class="dc-creator-name">${r.name}</div>
          <div class="dc-creator-subs">${fmt(Math.round(r.subs))} subscribers</div>
        </div>
        <button class="follow-btn ${following ? 'following' : ''}" data-follow="${r.name}">${following ? 'Following' : 'Follow'}</button>
      </div>
    `;
  }).join('');
}

function renderCreatorFeed(){
  const rankEl = null; // rank banner removed from the Feed
  if (rankEl){
    ensureRivals();
    const { rank, total } = computePlayerRank();
    const tier = rank <= 3 ? 'top' : rank <= Math.ceil(total / 2) ? 'mid' : 'low';
    rankEl.className = 'feed-rank-banner ' + tier;
    const gapRival = nextRivalToOvertake();
    const subtext = gapRival
      ? `Gain +${fmt(Math.ceil(gapRival.subs - state.subs))} subs to overtake <b>${gapRival.name}</b>`
      : `You're the top creator this week!`;
    rankEl.innerHTML = `
      <div class="frb-rank">#${rank}</div>
      <div class="frb-text">
        <div class="frb-label">of ${total} creators this week</div>
        <div class="frb-sub">${subtext}</div>
      </div>
    `;
  }

  const feedEl = document.getElementById('creator-feed-list');
  if (feedEl){
    if (state.creatorFeed.length === 0){
      feedEl.innerHTML = `<div class="empty-hint">The feed is quiet — check back after your first upload.</div>`;
    } else {
      feedEl.innerHTML = state.creatorFeed.slice(0, 6).map(item => {
        const time = feedTimeAgo(item.tick);
        const badge = item.badge ? `<span class="feed-badge ${item.badge.type}">${item.badge.label}</span>` : '';
        if (item.name){
          const initials = avatarInitials(item.name);
          const color = avatarColor(item.name);
          const sep = item.noSpace ? '' : ' ';
          return `
            <div class="feed-item has-avatar">
              <div class="feed-avatar face-avatar">${thumbFace(item.name)}</div>
              <div class="feed-body">
                <div class="feed-text"><b>${item.name}</b>${sep}${item.text}</div>
                <div class="feed-meta"><span class="feed-time">${time}</span>${badge}</div>
              </div>
            </div>
          `;
        }
        return `
          <div class="feed-item has-avatar system">
            <div class="feed-avatar system">${ic(item.iconName || 'bell')}</div>
            <div class="feed-body">
              <div class="feed-text">${item.text}</div>
              <div class="feed-meta"><span class="feed-time">${time}</span>${badge}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}


/* =========================================================================
   UPLOADING — shared by the Studio button and collabs
   ========================================================================= */
function performUpload(o){
  if (state.uploadCooldownTicksLeft > 0) return null;
  if (o.publishAt && scheduledVideos().length >= MAX_SCHEDULED){ playErrorSound(); showToast(ic('calendar') + ` You already have ${MAX_SCHEDULED} videos scheduled.`); return null; }
  if (state.live){ playErrorSound(); showToast(ic('tv') + " You're live right now. End the stream before uploading."); return null; }
  const { topicKey, thumbKey, lengthKey, effortKey, titleStyleKey, formatKey } = o;
  const abThumb = o.abThumb && o.abThumb !== thumbKey ? o.abThumb : '';

  const sizeGB = computeVideoSizeGB(formatKey, lengthKey);
  const storageCap = EQUIPMENT.storage.tiers[state.equipTier.storage].capacityGB;
  if (state.storageUsedGB + sizeGB > storageCap){
    playErrorSound();
    showToast(ic('disk') + ` Not enough storage for this upload — delete an old video or upgrade your SSD.`, true);
    return null;
  }
  const internetTier = EQUIPMENT.internet.tiers[state.equipTier.internet];
  if (Number.isFinite(internetTier.dataCapGB) && state.dataUsedGB + sizeGB > internetTier.dataCapGB){
    playErrorSound();
    showToast(ic('wifi') + ` Not enough data left this cycle — buy more data or upgrade your plan in the Shop.`, true);
    return null;
  }

  const cost = o.collab ? COLLAB_ENERGY : energyCostFor(effortKey, lengthKey, formatKey, !!abThumb, topicKey, o.ctype);
  const fatigue = fatigueFor(cost);
  const typeArch = ARCHETYPES[findType(topicKey, o.ctype).arch];
  if (typeArch.cost && !o.collab){
    if (state.money < typeArch.cost){ playErrorSound(); showToast(ic('dollar') + ` You need $${typeArch.cost} to buy something to unbox.`); return null; }
    state.money -= typeArch.cost;
    pushTransaction('purchase', 'Bought a product to unbox', -typeArch.cost);
  }

  playClickSound();
  const lastBefore = state.lastUploadTick;
  const v = createVideo(topicKey, thumbKey, lengthKey, effortKey, titleStyleKey, formatKey, { fatigue, abThumb, collab: o.collab, ctype: o.ctype });
  if (o.sponsorDeal) attachSponsor(v, o.sponsorDeal);
  if (o.publishAt && o.publishAt > state.totalTicks){
    v.publishAt = o.publishAt; v.wasScheduled = true;
    state.lastUploadTick = lastBefore;           // it only counts once it actually goes live
  }
  if (typeof claimFollowUp === 'function') claimFollowUp(v);   // a follow-up you promised in a Situation
  if (typeof claimSocial === 'function') claimSocial(v);       // a waiting teaser or trend tie-in on Pulse
  spendEnergy(cost);
  gainXP(XP_UPLOAD[effortKey] || 40, 'upload');
  if (fatigue > 0){
    showToast(ic('bolt') + ` Running on empty — this one was rushed and it'll show. Rest up before the next upload.`, true);
  }
  v.sizeGB = sizeGB;
  state.storageUsedGB += sizeGB;
  if (Number.isFinite(internetTier.dataCapGB)) state.dataUsedGB += sizeGB;

  state.videos.push(v);
  onPlayerUpload(v);
  if (!v.wasScheduled){ state.uploadLog.push(state.totalTicks); v.logged = true; }
  state.uploadCooldownTicksLeft = EFFORTS[effortKey].cooldownTicks + (abThumb ? AB_TEST_COOLDOWN : 0);

  renderCooldown();
  renderEquipment();
  renderStudioEnergy();
  beginUploadSequence(v);
  return v;
}

/* ---------- Collabs with rival creators ---------- */
function collabInfo(r){
  const needSubs = Math.ceil(r.subs * COLLAB_MIN_RATIO);
  const cost = Math.round(Math.max(40, Math.round(r.subs * COLLAB_COST_PER_SUB)) * relCollabCostMult(r));
  const readyAt = state.collabCooldowns[r.name] || 0;
  const invited = (r.inviteUntil || 0) > state.totalTicks;   // they asked you: free, and size doesn't matter
  // a collab booked on the Calendar: price locked in, and on the day nothing else stands in the way
  const booking = typeof bookingFor === 'function' ? bookingFor(r.name) : null;
  const bookedNow = !!(booking && booking.status === 'ready');
  const price = bookedNow ? booking.cost : invited ? 0 : cost;
  return {
    needSubs, cost: price, listCost: cost, invited, rel: relTier(r), booking, bookedNow,
    tooSmall: !invited && !bookedNow && !relSizeWaived(r) && state.subs < needSubs,
    broke: !invited && state.money < price,
    resting: !bookedNow && state.totalTicks < readyAt,
    readyAt,
    daysLeft: Math.max(1, Math.ceil((readyAt - state.totalTicks) / DAY_TICKS)),
  };
}
function startCollab(name){
  const r = ensureRivals().find(x => x.name === name);
  if (!r) return;
  const c = collabInfo(r);
  if (c.booking && !c.bookedNow){ playErrorSound(); showToast(ic('calendar') + ` You've booked ${r.name} for ${formatTick(c.booking.at)}. Film then.`); return; }
  if (c.tooSmall || c.broke || c.resting){ playErrorSound(); return; }
  if (state.uploadCooldownTicksLeft > 0){
    playErrorSound();
    showToast(ic('users') + ` Finish your current upload first — ${r.name} can film once you're free.`);
    return;
  }
  const v = performUpload({
    topicKey: r.topic,
    thumbKey: document.getElementById('thumbnail-select').value || 'action',
    lengthKey: 'm15', effortKey: 'standard', titleStyleKey: 'normal', formatKey: 'longform',
    collab: { name: r.name, subs: r.subs },
  });
  if (!v) return;
  state.money -= c.cost;
  state.collabCount++;
  state.collabCooldowns[r.name] = state.totalTicks + COLLAB_RIVAL_COOLDOWN_TICKS;
  if ((r.inviteUntil || 0) > state.totalTicks) adjustRel(r, 8, `You took ${r.name} up on their invite.`);
  if (c.bookedNow){ c.booking.status = 'done'; adjustRel(r, 5, `You showed up for the collab you planned with ${r.name}.`); if (typeof linkCollabPromo === 'function') linkCollabPromo(v, r.name); }
  r.inviteUntil = 0; r.inviteUsed = true; // invitation used
  pushTransaction('collab', `Collab with ${r.name}`, -c.cost);
  showToast(ic('users') + ` Filming with ${r.name}. It goes live once the upload finishes.`, true);
  safeRenderAll();
}
function renderCollabs(){
  const el = document.getElementById('collab-list');
  if (!el) return;
  const rivals = ensureRivals().slice().sort((a, b) => a.subs - b.subs);
  const locked = rivals.filter(r => { const c = collabInfo(r); return c.tooSmall && !c.booking && !c.invited; });
  const open = rivals.filter(r => !locked.includes(r));
  let html = open.map(r => {
    const c = collabInfo(r);
    let status, btn;
    if (c.bookedNow){
      status = `Collab day! Film before ${formatTick(c.booking.until).replace(/^Day \d+ · /, '')} · $${fmt(c.cost)}`;
      btn = `<button class="collab-btn ready" data-collab="${r.name}" ${c.broke || state.uploadCooldownTicksLeft > 0 ? 'disabled' : ''}>Film</button>`;
    } else if (c.booking){
      status = `Booked for ${formatTick(c.booking.at)} · $${fmt(c.booking.cost)}`;
      btn = `<button class="collab-btn" disabled>Booked</button>`;
    } else if (c.invited && !c.resting){
      status = `Invited you! Free for ${Math.max(1, Math.ceil((r.inviteUntil - state.totalTicks) / 60))} more hours`;
      btn = `<button class="collab-btn ready" data-collab="${r.name}" ${state.uploadCooldownTicksLeft > 0 ? 'disabled' : ''}>Accept</button>`;
    } else if (c.tooSmall){
      status = `Needs ${fmt(c.needSubs)} subscribers`;
      btn = `<button class="collab-btn" disabled>Locked</button>`;
    } else if (c.resting){
      status = `Busy for ${c.daysLeft} more day${c.daysLeft === 1 ? '' : 's'}`;
      btn = `<button class="collab-btn" disabled>Busy</button>`;
    } else {
      status = `$${fmt(c.cost)} and ${COLLAB_ENERGY} energy`;
      btn = `<button class="collab-btn ready" data-collab="${r.name}" ${c.broke || state.uploadCooldownTicksLeft > 0 ? 'disabled' : ''}>Pitch</button>`;
    }
    return `
      <div class="collab-row ${c.tooSmall ? 'locked' : ''}">
        <span class="dc-avatar face-avatar">${thumbFace(r.name)}</span>
        <div class="wtf-main">
          <div class="dc-creator-name">${r.name}</div>
          <div class="dc-creator-subs">${TOPICS[r.topic].label}, ${fmtCompact(r.subs)} subs</div>
          <div class="collab-status">${status}</div>
        </div>
        ${btn}
      </div>`;
  }).join('');
  if (!open.length) html = `<div class="empty-hint">No one will collab yet. Grow a little and creators start answering.</div>`;
  if (locked.length){
    const next = locked[0], need = collabInfo(next).needSubs;
    html += `
      <div class="collab-locked">
        <div class="cl-faces">${locked.slice(0, 5).map(r => `<span class="dc-avatar face-avatar">${thumbFace(r.name)}</span>`).join('')}</div>
        <div class="cl-text"><b>${locked.length} more creator${locked.length === 1 ? '' : 's'}</b> will collab as you grow. Next: ${next.name} at ${fmt(need)} subscribers.</div>
      </div>`;
  }
  if (el._html !== html){ el.innerHTML = html; el._html = html; }
}

/* ---------- Rewarded ads: daily cap + one entry point ---------- */
function adsLeftToday(){
  const day = clockDay();
  if (state.adDay !== day){ state.adDay = day; state.adCount = 0; }
  return Math.max(0, ADS_PER_DAY - state.adCount);
}
function requestRewardedAd(placement, onReward){
  if (adsLeftToday() <= 0){
    playErrorSound();
    showToast(ic('tv') + ` That's all the ads for today. More tomorrow (in-game).`);
    return;
  }
  Ads.showRewarded(placement, {
    onReward(){
      state.adCount++;
      onReward();
    },
    onNoReward(reason){
      showToast(ic('tv') + (reason === 'unavailable'
        ? ` No ad available right now. Check your connection and try again in a minute.`
        : ` The ad didn't finish, so there's no reward this time.`));
    },
  });
}
function freeDataAd(){
  if (state.freeDataAds >= FREE_DATA_ADS_PER_CYCLE){
    playErrorSound();
    showToast(ic('wifi') + ` Free data used up for this billing cycle.`);
    return;
  }
  playClickSound();
  requestRewardedAd('free_data', () => {
    state.freeDataAds++;
    state.dataUsedGB = Math.max(0, state.dataUsedGB - 1);
    playCoinSound();
    showToast(ic('wifi') + ` +1GB data for this cycle.`);
    renderEquipment();
  });
}

/* ---------- Studio: energy panel + thumbnail preview + A/B picker ---------- */
function currentStudioPicks(){
  const g = id => (document.getElementById(id) || {}).value;
  return {
    topicKey: g('topic-select'), thumbKey: g('thumbnail-select'), lengthKey: g('length-select'),
    effortKey: g('effort-select'), formatKey: g('format-select'), titleStyleKey: g('titlestyle-select'),
    abThumb: state.unlocks.customThumbnails ? (g('ab-thumbnail-select') || '') : '',
  };
}
function renderStudioEnergy(){
  const el = document.getElementById('studio-energy');
  if (!el) return;
  const p = currentStudioPicks();
  const withAB = !!(p.abThumb && p.abThumb !== p.thumbKey);
  const cost = energyCostFor(p.effortKey, p.lengthKey, p.formatKey, withAB, p.topicKey, currentCtype(p.topicKey));
  const after = Math.max(0, state.energy - cost);
  const fatigue = fatigueFor(cost);
  const e = Math.round(state.energy);
  el.innerHTML = `
    <div class="energy-head">
      <span class="energy-title">${ic('bolt')}Energy</span>
      <span class="energy-num">${e}<small>/100</small></span>
    </div>
    <div class="energy-track">
      <div class="energy-fill ${state.burnedOut ? 'burnt' : e < ENERGY_FATIGUE_LINE ? 'low' : ''}" style="width:${e}%"></div>
      <div class="energy-cost" style="left:${Math.round(after)}%; width:${Math.round(Math.min(cost, state.energy))}%"></div>
      <div class="energy-line" style="left:${ENERGY_FATIGUE_LINE}%"></div>
    </div>
    <div class="energy-note ${fatigue > 0 ? 'warn' : ''}">
      ${fatigue > 0
        ? `This upload costs ${cost} and leaves you at ${Math.round(after)}. Below ${ENERGY_FATIGUE_LINE}, rushed work scores lower.`
        : `This upload costs ${cost} energy. You'll be at ${Math.round(after)} afterwards.`}
      ${state.burnedOut ? ' You\'re burned out, so recovery is slower right now.' : ''}
    </div>`;
  const tb = document.getElementById('topbar-energy');
  if (tb){
    tb.textContent = e;
    tb.parentElement.classList.toggle('low', e < ENERGY_FATIGUE_LINE);
  }
  const coffee = document.getElementById('coffee-btn');
  if (coffee){
    const day = clockDay();
    const used = state.coffeeDay === day ? state.coffeeCount : 0;
    coffee.innerHTML = `${ic('coffee')}Coffee break <span>$${COFFEE_COST}, +${COFFEE_ENERGY}</span><em>${COFFEE_PER_DAY - used} left today</em>`;
    coffee.disabled = used >= COFFEE_PER_DAY || state.energy >= ENERGY_MAX;
  }
  const abField = document.getElementById('ab-field');
  if (abField){
    const unlocked = !!state.unlocks.customThumbnails;
    abField.classList.toggle('locked', !unlocked);
    const sel = document.getElementById('ab-thumbnail-select');
    if (sel) sel.disabled = !unlocked;
    const hint = document.getElementById('ab-hint');
    if (hint) hint.textContent = unlocked
      ? (withAB ? `Both thumbnails run during testing. Costs +${AB_TEST_ENERGY} energy and ${AB_TEST_COOLDOWN}s.` : 'Pick a second style to test against the first.')
      : 'Unlocks at 100 subscribers.';
  }
}
function renderThumbPreview(){
  const el = document.getElementById('thumb-preview');
  if (!el) return;
  const p = currentStudioPicks();
  const typed = TYPE_TITLES[p.topicKey] && TYPE_TITLES[p.topicKey][currentCtype(p.topicKey)];
  const sampleTitle = (typed || TITLE_BANK[p.topicKey] || ['New Video'])[0];
  const withAB = !!(p.abThumb && p.abThumb !== p.thumbKey);
  const one = (style, tag) => `
    <figure class="tp-item">
      <div class="thumb-frame">${thumbSVG({ seed: 'preview', topic: p.topicKey, style, title: applyTitleStyle(sampleTitle, p.titleStyleKey), face: state.channelName })}</div>
      <figcaption>${tag ? `<b>${tag}</b> ` : ''}${THUMBNAILS[style].label}</figcaption>
    </figure>`;
  el.classList.toggle('duo', withAB);
  el.innerHTML = withAB ? one(p.thumbKey, 'A') + one(p.abThumb, 'B') : one(p.thumbKey, '');
}

function renderCooldown(){
  const row = document.getElementById('cooldown-row');
  const btn = document.getElementById('upload-btn');
  if (state.uploadCooldownTicksLeft > 0){
    row.style.display = 'block';
    btn.disabled = true;
    document.getElementById('cooldown-timer').textContent = state.uploadCooldownTicksLeft + 's';
  } else {
    row.style.display = 'none';
    btn.disabled = false;
  }
}

/* ---------- Tabs ---------- */
let currentTab = 'home';
function switchTab(tab){
  const changed = tab !== currentTab;
  currentTab = tab;
  ['home', 'content', 'studio', 'analytics', 'calendar', 'social', 'monetization', 'shop', 'feed', 'settings'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  if (tab === 'settings') renderSettings();
  if (tab === 'calendar') renderCalendar(true);
  if (tab === 'social') renderSocial(true);
  if (changed) animateTabIn(document.getElementById('tab-' + tab));
}
/* Entering a tab: its top-level blocks rise in, lightly staggered. Skipped during the tour
   (the spotlight measures positions straight away) and for reduced motion. */
function animateTabIn(el){
  if (!el) return;
  try { window.scrollTo(0, 0); } catch(e){}
  if (REDUCE_MOTION || (window.Tutorial && Tutorial.isActive())) return;
  el.classList.remove('tab-enter');
  void el.offsetWidth;
  Array.from(el.children).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 7)));
  el.classList.add('tab-enter');
  clearTimeout(el._enterT);
  el._enterT = setTimeout(() => el.classList.remove('tab-enter'), 700);
}
/* ---------- Appearance: dark / light / system ---------- */
function resolvedTheme(){
  const t = state.theme || 'dark';
  if (t === 'system') return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  return t;
}
function applyTheme(){
  const t = resolvedTheme();
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'light' ? '#f6f7f9' : '#0f2527');
  document.querySelectorAll('[data-theme-pick]').forEach(b => b.classList.toggle('on', b.dataset.themePick === (state.theme || 'dark')));
}
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: light)').addEventListener && window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (state.theme === 'system') applyTheme(); });

function renderSettings(){
  const el = document.getElementById('settings-level');
  if (!el) return;
  const info = getLevelInfo(state.xp);
  const cur = info.current, next = info.next;
  const pct = next ? clamp(((state.xp - cur.xp) / (next.xp - cur.xp)) * 100, 0, 100) : 100;
  const log = state.xpLog || {};
  el.innerHTML = `
    <div class="lvl-head">
      <div>
        <div class="lvl-big">Level ${info.level}</div>
        <div class="lvl-title">${info.title}${next ? ` · next: ${LEVELS[info.level].title === info.title ? 'Level ' + (info.level + 1) : LEVELS[info.level].title}` : ' · max level'}</div>
      </div>
      <div class="lvl-xp">${fmt(state.xp)} XP</div>
    </div>
    <div class="xp-track big"><div class="xp-fill" style="width:${pct}%"></div></div>
    <div class="lvl-sub">${next ? `${fmt(next.xp - state.xp)} XP to level ${info.level + 1} · every level pays a $${LEVEL_CASH_BONUS(info.level + 1)} bonus` : 'You have maxed out the creator ladder.'}</div>
    <div class="xp-table">
      ${XP_RULES.filter(r => r.key !== 'live' || LIVE_ENABLED).map(r => `<div class="xp-row"><span>${r.label}</span><span class="xp-rate">${r.xp}</span><span class="xp-earned">${log[r.key] ? fmt(log[r.key]) + ' earned' : ''}</span></div>`).join('')}
    </div>`;
  const nameIn = document.getElementById('set-name-input');
  if (nameIn && document.activeElement !== nameIn) nameIn.value = state.channelName || '';
  const prov = document.getElementById('set-ad-provider');
  if (prov) prov.textContent = { admob: 'Short video ads, only when you choose to watch', adsense: 'Google AdSense rewarded ads', crazygames: 'CrazyGames rewarded ads', poki: 'Poki rewarded ads', house: 'House ads while in development (no revenue yet)' }[Ads.provider] || 'House ads';
  const sw = (id, on) => { const b = document.getElementById(id); if (b){ b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); } };
  sw('set-sound', state.soundEnabled); sw('set-music', state.musicEnabled);
  const stats = document.getElementById('settings-stats');
  if (stats) stats.innerHTML = `
    <div class="set-stat"><span>Videos published</span><b>${fmt(state.uploadLog.length)}</b></div>
    <div class="set-stat"><span>Lifetime views</span><b>${fmt(state.totalViews)}</b></div>
    <div class="set-stat"><span>Lifetime revenue</span><b>$${state.lifetimeRevenue.toFixed(2)}</b></div>
    <div class="set-stat"><span>Days on Streamly</span><b>${Math.floor(state.totalTicks / DAY_TICKS) + 1}</b></div>`;
}

/* ---------- Modal / toast ---------- */
function showOfflineModal(elapsedSec, viewsGained, subsGained, moneyGained){
  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  document.getElementById('away-time').textContent = `You were away for ${label}`;
  document.getElementById('off-views').textContent = '+' + fmt(viewsGained);
  document.getElementById('off-subs').textContent = '+' + fmt(subsGained);
  document.getElementById('off-money').textContent = '+$' + moneyGained.toFixed(2);
  const dbl = document.getElementById('offline-double');
  if (dbl){
    dbl.disabled = false;
    dbl.innerHTML = ic('tv') + 'Watch an ad to double subs and revenue';
    dbl.style.display = (subsGained > 0 || moneyGained > 0.01) ? '' : 'none';
  }
  document.getElementById('offline-modal').classList.add('show');
}

let toastTimer = null;
function showToast(msg, isEvent){
  pushNotification(msg);
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  el.classList.toggle('event', !!isEvent);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

/* ---------- Save / load ---------- */
let saveBlocked = false; // set while deleting a save, so the unload/interval autosave can't write it back
function saveState(){
  if (saveBlocked) return;
  state.lastSaved = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch(e){
    // localStorage unavailable (e.g. a sandboxed preview) — game still runs, just won't persist.
  }
}
function loadState(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const loaded = JSON.parse(raw);
    state = Object.assign(state, loaded);
    sanitizeState();
    return true;
  } catch(e){
    return false;
  }
}

// Defense-in-depth: coerce any corrupted numeric field (null/NaN, which is how
// JSON.stringify silently represents a NaN) back to a safe default so a single
// bad value can never crash rendering or block navigation.
function sanitizeState(){
  const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v)) ? v : fallback;
  state.money = num(state.money, 100);
  state.subs = num(state.subs, 0);
  state.totalViews = num(state.totalViews, 0);
  state.watchHours = num(state.watchHours, 0);
  state.storageUsedGB = num(state.storageUsedGB, 0);
  state.dataUsedGB = num(state.dataUsedGB, 0);
  state.nextBillTick = num(state.nextBillTick, state.totalTicks + BILL_CYCLE_TICKS);
  if (typeof state.ispThrottled !== 'boolean') state.ispThrottled = false;
  if (typeof state.isMonetized !== 'boolean') state.isMonetized = false;
  if (typeof state.fanFunding !== 'boolean') state.fanFunding = false;
  if (state.live && (typeof state.live !== 'object' || !TOPICS[state.live.topic])) state.live = null;
  state.streamCount = num(state.streamCount, 0);
  if (!Array.isArray(state.pendingResponses)) state.pendingResponses = [];
  if (!state.topicCrowd || typeof state.topicCrowd !== 'object') state.topicCrowd = {};
  if (state.peersSpawned && !(state.rivals || []).some(r => r.peer)) state.peersSpawned = false;
  if (Array.isArray(state.rivals)) state.rivals.forEach(r => { if (!Array.isArray(r.hist)) r.hist = []; if (r.topic && !TOPICS[r.topic]) r.topic = 'gaming'; });
  state.bestStreamPeak = num(state.bestStreamPeak, 0);
  state.superChatRevenue = num(state.superChatRevenue, 0);
  // v0.9 systems: drop anything corrupted rather than let it break a tab
  if (state.social && typeof state.social === 'object'){
    const so = state.social;
    so.followers = num(so.followers, 0);
    if (!Array.isArray(so.posts)) so.posts = [];
    so.posts = so.posts.filter(p => p && p.final && Number.isFinite(p.final.impressions) && POST_TYPES[p.type]);
  } else state.social = undefined;
  if (state.sit && typeof state.sit === 'object'){
    if (!Array.isArray(state.sit.open)) state.sit.open = [];
    state.sit.open = state.sit.open.filter(s => s && SITUATIONS[s.key] && s.ctx);
    if (state.sit.followUp && (!SITUATIONS[state.sit.followUp.key] || !Number.isFinite(state.sit.followUp.until))) state.sit.followUp = null;
  }
  if (state.demo && (!Array.isArray(state.demo.age) || state.demo.age.length !== 4 || state.demo.age.some(x => !Number.isFinite(x)))) state.demo = null;
  if (!Array.isArray(state.collabBookings)) state.collabBookings = [];
  if (!Array.isArray(state.rivalPlans)) state.rivalPlans = [];
  if (state.moodForecast && typeof state.moodForecast !== 'object') state.moodForecast = {};
  // One-time recount for saves made after per-video subscriber tracking existed: subscribers the
  // old flat "celebrity shout-out" event handed out (80-500 at a time) are trimmed to what the
  // channel actually earned plus a fair allowance for shout-outs under the new rules.
  if (!state.subRecount1){
    state.subRecount1 = true;
    const vids = state.videos || [];
    const tracked = vids.length > 0 && vids.every(v => typeof v.subsRaw === 'number' && (v.views < 200 || v.subsRaw >= v.views * 0.0003));
    if (tracked && state.subs < 20000){
      const organic = vids.reduce((a, v) => a + v.subsRaw + (v.collab && v.collab.gained ? v.collab.gained : 0), 0);
      const fair = Math.round(organic * 1.25 + 40);
      if (state.subs > fair + 50){
        const removed = state.subs - fair;
        state.subs = fair;
        if (Array.isArray(state.notifications)) state.notifications.unshift({ text: ic('users') + ` Subscriber recount: ${fmt(removed)} subscribers from an old shout-out bug were removed. Your channel now reflects what your videos earned.`, tick: state.totalTicks });
      }
    }
  }
  if (!CADENCES[state.cadence]) state.cadence = 'casual';
  if (!['dark', 'light', 'system'].includes(state.theme)) state.theme = 'dark';
  sponsorBook();
  (state.rivals || []).forEach(r => { r.rel = clamp(num(r.rel, r.peer ? -10 : 0), -100, 100); });
  if (!Array.isArray(state.pendingMoments)) state.pendingMoments = [];
  state.cadStreak = num(state.cadStreak, 0); state.cadDayCount = num(state.cadDayCount, 0);
  if (typeof state.tutorialDone !== 'boolean'){
    // Existing players aren't forced through the tour; they get told it exists.
    state.tutorialDone = true;
    if (state.channelName && Array.isArray(state.notifications)) state.notifications.unshift({ text: ic('sparkle') + ' New: a guided tour of the game. Open Settings and tap Replay tour.', tick: state.totalTicks });
  }
  if (Array.isArray(state.rivals)){
    // Saves from before the cap: rivals that ran away get re-spread under 15M, keeping their order.
    if (state.rivals.some(r => num(r.subs, 0) > RIVAL_SUBS_CAP)){
      const tiers = [0.93, 0.78, 0.62, 0.48, 0.36, 0.26, 0.18, 0.12, 0.08, 0.05];
      state.rivals.slice().sort((a, b) => num(b.subs, 0) - num(a.subs, 0)).forEach((r, i) => {
        r.subs = Math.round(RIVAL_SUBS_CAP * (tiers[i] || 0.04) * rand(0.94, 1.04));
      });
    }
    state.rivals.forEach(r => { r.subs = clamp(num(r.subs, 1000), r.peer ? 5 : 500, RIVAL_SUBS_CAP); });
  }
  if (Array.isArray(state.creatorFeed)){
    state.creatorFeed = state.creatorFeed.filter(i => !(i && typeof i.text === 'string' && /^You are #\d+ of \d+ creators/.test(i.text)));
    state.creatorFeed.forEach(i => {
      if (!i || !i.vid) return;
      const r = (state.rivals || []).find(x => x.name === i.name);
      if (!r) return;
      if (i.vid.finalViews > r.subs * 1.25 || i.vid.finalViews > 60000000) i.vid = rivalVideoStats(r);
    });
  }
  if (!state.fanFunding) state.unlocks.channelMemberships = false;
  state.hourlySubs = Array.isArray(state.hourlySubs) ? state.hourlySubs.filter(Number.isFinite) : [];
  state.hourlyWatch = Array.isArray(state.hourlyWatch) ? state.hourlyWatch.filter(Number.isFinite) : [];
  state.currentHourSubs = num(state.currentHourSubs, 0); state.currentHourWatch = num(state.currentHourWatch, 0);
  state.dayWatch = num(state.dayWatch, 0);
  if (!state.isMonetized && !state.revenueLeakFixed){
    // Older builds paid ad money from viral/controversy events before approval. Clear that from the ledgers
    // (the cash already in the bank stays — no one likes losing money).
    const leaked = (state.adRevenueTotal || 0) + (state.shortsRevenueTotal || 0);
    state.lifetimeRevenue = Math.max(0, (state.lifetimeRevenue || 0) - leaked);
    state.adRevenueTotal = 0; state.shortsRevenueTotal = 0;
    (state.videos || []).forEach(v => { v.revenueEarned = 0; });
    state.transactions = (state.transactions || []).filter(t => t.type !== 'ad' && t.type !== 'shorts');
  }
  state.revenueLeakFixed = true;
  if (typeof state.soundEnabled !== 'boolean') state.soundEnabled = true;
  if (typeof state.partnerAnnounced !== 'boolean') state.partnerAnnounced = state.isMonetized;
  state.algoRating = num(state.algoRating, 0);
  if (!Array.isArray(state.creatorFeed)) state.creatorFeed = [];
  if (!Array.isArray(state.rivals) || state.rivals.filter(r => !r.peer).length !== RIVAL_CREATORS.length){
    state.rivals = RIVAL_CREATORS.map(r => ({ ...r }));
  } else {
    state.rivals.forEach(r => { r.subs = num(r.subs, 10000); });
  }
  state.level = num(state.level, 1);
  state.uploadCooldownTicksLeft = num(state.uploadCooldownTicksLeft, 0);
  state.totalTicks = num(state.totalTicks, 0);
  state.lastUploadTick = num(state.lastUploadTick, 0);
  if (!state.audienceLoyalty || typeof state.audienceLoyalty !== 'object') state.audienceLoyalty = {};
  if (!state.topicAffinity || typeof state.topicAffinity !== 'object') state.topicAffinity = {};
  if (!state.topicAffinityAnnounced || typeof state.topicAffinityAnnounced !== 'object') state.topicAffinityAnnounced = {};
  if (typeof state.inBreakPenalty !== 'boolean') state.inBreakPenalty = false;
  state.lifetimeRevenue = num(state.lifetimeRevenue, state.money);
  state.adRevenueTotal = num(state.adRevenueTotal, 0);
  state.sponsorshipRevenue = num(state.sponsorshipRevenue, 0);
  state.membershipRevenue = num(state.membershipRevenue, 0);
  state.currentHourRevenue = num(state.currentHourRevenue, 0);
  if (!Array.isArray(state.transactions)) state.transactions = [];
  if (typeof state.hasGoneViral !== 'boolean') state.hasGoneViral = false;
  if (typeof state.musicEnabled !== 'boolean') state.musicEnabled = true;
  state.energy = clamp(num(state.energy, ENERGY_MAX), 0, ENERGY_MAX);
  if (typeof state.burnedOut !== 'boolean') state.burnedOut = false;
  state.coffeeDay = num(state.coffeeDay, -1);
  state.coffeeCount = num(state.coffeeCount, 0);
  state.adDay = num(state.adDay, -1);
  state.adCount = num(state.adCount, 0);
  state.freeDataAds = num(state.freeDataAds, 0);
  state.collabCount = num(state.collabCount, 0);
  state.xp = num(state.xp, 0);
  if (!state.xpLog || typeof state.xpLog !== 'object') state.xpLog = {};
  state.xpViewCarry = num(state.xpViewCarry, 0);
  if (!Array.isArray(state.dailyHistory)) state.dailyHistory = [];
  state.dailyHistory = state.dailyHistory.filter(d => d && typeof d === 'object').map(d => ({ views: num(d.views, 0), subs: num(d.subs, 0), money: num(d.money, 0), shortsViews: num(d.shortsViews, 0), watch: num(d.watch, 0) }));
  state.dayViews = num(state.dayViews, 0); state.daySubs = num(state.daySubs, 0); state.dayMoney = num(state.dayMoney, 0);
  state.dayShortsViews = num(state.dayShortsViews, 0);
  if (typeof state.lfWatchHours !== 'number' || !Number.isFinite(state.lfWatchHours)) state.lfWatchHours = state.watchHours || 0;
  state.shortsRevenueTotal = num(state.shortsRevenueTotal, 0);
  state.pendingShortsRevenue = num(state.pendingShortsRevenue, 0);
  if (!Array.isArray(state.playlists)) state.playlists = [];
  state.playlists = state.playlists.filter(pl => pl && typeof pl.name === 'string').map(pl => ({ id: pl.id || String(Math.random()), name: pl.name.slice(0, 40), videoIds: Array.isArray(pl.videoIds) ? pl.videoIds : [] }));
  // Old saves levelled on subscribers; convert once so nobody loses their level.
  if (state.xp === 0 && state.subs > 0 && !state.xpMigrated){
    state.xp = Math.round(state.subs * 3 + state.totalViews / 20 + state.uploadLog.length * 40);
    state.xpMigrated = true;
  }
  state.level = getLevelInfo(state.xp).level;
  if (!state.collabCooldowns || typeof state.collabCooldowns !== 'object') state.collabCooldowns = {};
  if (!state.equipTier || typeof state.equipTier !== 'object') state.equipTier = {};
  ['camera', 'mic', 'editing', 'internet', 'storage'].forEach(k => {
    state.equipTier[k] = num(state.equipTier[k], 0);
  });
  if (!Array.isArray(state.videos)) state.videos = [];
  if (!Array.isArray(state.uploadLog)) state.uploadLog = [];
  if (!Array.isArray(state.milestonesReached)) state.milestonesReached = [];
  if (!Array.isArray(state.achievementsReached)) state.achievementsReached = [];
  if (!Array.isArray(state.notifications)) state.notifications = [];
  if (!Array.isArray(state.hourlyViews)) state.hourlyViews = [];
  state.hourlyViews = state.hourlyViews.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!Array.isArray(state.hourlyRevenue)) state.hourlyRevenue = [];
  state.hourlyRevenue = state.hourlyRevenue.filter(v => typeof v === 'number' && Number.isFinite(v));
  state.currentHourViews = num(state.currentHourViews, 0);
  if (!state.audienceMood || typeof state.audienceMood !== 'object') state.audienceMood = null;
  if (!state.dailySnapshot || typeof state.dailySnapshot !== 'object'){
    state.dailySnapshot = { tick: state.totalTicks, views: state.totalViews, subs: state.subs, money: state.money, watchHours: state.watchHours };
  } else {
    state.dailySnapshot.views = num(state.dailySnapshot.views, state.totalViews);
    state.dailySnapshot.subs = num(state.dailySnapshot.subs, state.subs);
    state.dailySnapshot.money = num(state.dailySnapshot.money, state.money);
    state.dailySnapshot.tick = num(state.dailySnapshot.tick, state.totalTicks);
    state.dailySnapshot.watchHours = num(state.dailySnapshot.watchHours, state.watchHours);
  }
  state.videos.forEach(v => {
    v.views = num(v.views, 0);
    v.revenueEarned = num(v.revenueEarned, 0);
    v.rate = num(v.rate, 0);
    v.peakRate = num(v.peakRate, Math.max(v.rate, 1));
    v.age = num(v.age, 0);
    const hasRealFlavor = typeof v.entertainment === 'number' && Number.isFinite(v.entertainment)
                        && Array.isArray(v.comments) && v.comments.length > 0;
    if (!hasRealFlavor){
      deriveVideoFlavor(v); // legacy video from before this feature existed — backfill a real profile
    }
    if (!Array.isArray(v.viewMilestonesHit)) v.viewMilestonesHit = [];
    {
      const L = LENGTHS[v.length] || LENGTHS.m8;
      if (v.format === 'shorts' ? (v.durationSec === 45 || !v.durationSec) : (v.durationSec === L.durationSec || !v.durationSec)){
        v.durationSec = v.format === 'shorts' ? seededInt(v.id + ':dur', 14, 59) : Math.round(L.durationSec * (0.9 + seededInt(v.id + ':dur', 0, 1000) / 1000 * 0.14));
      }
    }
    if (v.ab && (typeof v.ab !== 'object' || !THUMBNAILS[v.ab.a] || !THUMBNAILS[v.ab.b])) v.ab = null;
    if (v.ab && v.outcomeDecided && !v.ab.resolved) v.ab.resolved = true; // a save from mid-test: keep the average CTR
    if (v.collab && (typeof v.collab !== 'object' || !v.collab.name)) v.collab = null;
    if (v.collab && v.outcomeDecided) v.collab.resolved = true;
    if (!THUMBNAILS[v.thumb]) v.thumb = 'clean';
    if (typeof v.expanded !== 'boolean') v.expanded = false;
    // a scheduled video saved mid-pipeline goes back to waiting for its slot (publishDueVideos runs on start)
    if (v.wasScheduled && !v.logged && typeof v.publishAt === 'number' && v.publishPhase !== 'live') v.publishPhase = 'scheduled';
    if (v.publishPhase && v.publishPhase !== 'live' && v.publishPhase !== 'scheduled'){ v.publishPhase = 'live'; v.needsLiveHooks = true; }   // saved mid-upload
    if (v.publishPhase === 'scheduled' && typeof v.publishAt !== 'number') v.publishPhase = 'live';
    if (v.publishPhase === 'live' && !v.wasScheduled) v.logged = true;
    if (v.publishPhase === 'live' && v.wasScheduled && !v.logged){ state.uploadLog.push(v.publishAt || state.totalTicks); v.logged = true; }
  });
}

/* ---------- Init ---------- */
function init(){
  const hadSave = loadState();

  if (!state.channelName){
    document.getElementById('setup-modal').classList.add('show');
    document.getElementById('start-channel-btn').addEventListener('click', submitChannelName);
    document.getElementById('channel-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitChannelName();
    });
    return; // don't start the game loop until a name is confirmed
  }

  startGame(hadSave);
}

function submitChannelName(){
  const input = document.getElementById('channel-name-input');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }
  state.channelName = name;
  document.getElementById('setup-modal').classList.remove('show');
  saveState();
  startGame(false);
  if (!state.tutorialDone && window.Tutorial) setTimeout(() => Tutorial.start(), 700);
}

function startGame(hadSave){
  // Attach every listener FIRST — before any rendering — so a rendering error
  // can never prevent navigation or the upload button from working.
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) soundBtn.addEventListener('click', toggleSound); // topbar toggle is optional — Settings has one too

  document.getElementById('video-list').addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete]');
    if (delBtn){ requestDeleteVideo(delBtn.dataset.delete); return; }
    const el = e.target.closest('[data-toggle]');
    if (el) toggleVideoDetails(el.dataset.toggle);
  });

  document.getElementById('delete-cancel-btn').addEventListener('click', cancelDeleteVideo);
  document.getElementById('partner-close').addEventListener('click', () => {
    document.getElementById('partner-modal').classList.remove('show');
  });
  document.getElementById('delete-confirm-btn').addEventListener('click', confirmDeleteVideo);

  document.getElementById('format-select').addEventListener('change', (e) => {
    const lengthSelect = document.getElementById('length-select');
    const isShorts = e.target.value === 'shorts';
    lengthSelect.disabled = isShorts;
    lengthSelect.title = isShorts ? 'Shorts have a fixed ~45s length' : '';
  });

  /* ---- Topic tiles (Studio) — drive the hidden native <select> so all existing
     upload logic reads state exactly as before ---- */
  const topicSelectEl = document.getElementById('topic-select');
  const topicTiles = document.querySelectorAll('#topic-tiles .topic-tile');
  topicTiles.forEach(tile => {
    tile.querySelector('.tile-icon').innerHTML = ic(TOPIC_ICONS[tile.dataset.value] || 'star');
    tile.addEventListener('click', () => {
      topicSelectEl.value = tile.dataset.value;
      topicTiles.forEach(t => t.classList.toggle('active', t === tile));
      playClickSound();
    });
  });
  if (topicTiles[0]) topicTiles[0].classList.add('active');
  topicSelectEl.value = topicTiles[0] ? topicTiles[0].dataset.value : topicSelectEl.value;

  /* ---- Format tiles (Studio) ---- */
  const formatSelectEl = document.getElementById('format-select');
  const formatTiles = document.querySelectorAll('#format-tiles .format-tile');
  formatTiles.forEach(tile => {
    tile.addEventListener('click', () => {
      formatSelectEl.value = tile.dataset.value;
      formatSelectEl.dispatchEvent(new Event('change'));
      formatTiles.forEach(t => t.classList.toggle('active', t === tile));
      playClickSound();
    });
  });
  formatTiles.forEach(t => t.classList.toggle('active', t.dataset.value === formatSelectEl.value));

  /* ---- Content tab sub-tabs (Videos/Live Streams/Shorts/Playlists) ---- */
  const contentSubtabsEl = document.getElementById('content-subtabs');
  if (contentSubtabsEl){
    contentSubtabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sub]');
      if (!btn) return;
      contentSubTab = btn.dataset.sub;
      contentPage = 1;
      contentSubtabsEl.querySelectorAll('[data-sub]').forEach(t => t.classList.toggle('active', t === btn));
      playClickSound();
      renderVideos();
    });
  }

  /* ---- Content tab pagination ---- */
  const contentPagerEl = document.getElementById('content-pager');
  if (contentPagerEl){
    contentPagerEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      contentPage = parseInt(btn.dataset.page, 10) || 1;
      playClickSound();
      renderVideos();
    });
  }

  /* ---- Discover feed sub-tabs ---- */
  const discoverSubtabsEl = document.getElementById('discover-subtabs');
  if (discoverSubtabsEl){
    discoverSubtabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dsub]');
      if (!btn) return;
      discoverSubTab = btn.dataset.dsub;
      discoverSubtabsEl.querySelectorAll('[data-dsub]').forEach(t => t.classList.toggle('active', t === btn));
      playClickSound();
      renderDiscoverFeed();
    });
  }

  /* ---- Who to Follow (cosmetic session-only toggle, no game effect) ---- */
  const whoToFollowEl = document.getElementById('who-to-follow-list');
  if (whoToFollowEl){
    whoToFollowEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-follow]');
      if (!btn) return;
      const name = btn.dataset.follow;
      if (followedCreators.has(name)) followedCreators.delete(name);
      else followedCreators.add(name);
      playClickSound();
      renderWhoToFollow();
    });
  }

  /* ---- Monetization sub-tabs (filter Recent Transactions) ---- */
  const monetizationSubtabsEl = document.getElementById('monetization-subtabs');
  if (monetizationSubtabsEl){
    monetizationSubtabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-msub]');
      if (!btn) return;
      monetizationSubTab = btn.dataset.msub;
      monetizationSubtabsEl.querySelectorAll('[data-msub]').forEach(t => t.classList.toggle('active', t === btn));
      playClickSound();
      renderMonetization();
    });
  }

  /* ---- Shop category tabs ---- */
  document.getElementById('shop-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.shop-tab');
    if (!btn) return;
    shopFilterCat = btn.dataset.cat;
    document.querySelectorAll('#shop-tabs .shop-tab').forEach(t => t.classList.toggle('active', t === btn));
    playClickSound();
    renderEquipment();
  });

  /* ---- Channel Performance range tabs: 7 / 28 / 90 in-game days from the daily ledger ---- */
  const rangeTabsEl = document.getElementById('range-tabs');
  if (rangeTabsEl){
    rangeTabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.range-tab');
      if (!btn) return;
      rangeTabsEl.querySelectorAll('.range-tab').forEach(t => t.classList.toggle('active', t === btn));
      perfRangeDays = parseInt(btn.dataset.days || btn.textContent.replace(/\D/g, ''), 10) || 7;
      playClickSound();
      renderHome();
    });
  }

  document.getElementById('upload-btn').addEventListener('click', () => {
    const abSel = document.getElementById('ab-thumbnail-select');
    performUpload({
      topicKey: document.getElementById('topic-select').value,
      thumbKey: document.getElementById('thumbnail-select').value,
      lengthKey: document.getElementById('length-select').value,
      effortKey: document.getElementById('effort-select').value,
      titleStyleKey: document.getElementById('titlestyle-select').value,
      formatKey: document.getElementById('format-select').value,
      abThumb: state.unlocks.customThumbnails && abSel ? abSel.value : '',
      ctype: currentCtype(document.getElementById('topic-select').value),
      sponsorDeal: (document.getElementById('sponsor-select') || {}).value || '',
      publishAt: chosenPublishAt(),
    });
    if (typeof calendarAfterUpload === 'function') calendarAfterUpload();
  });

  /* Rewarded ad: skip the upload cooldown. The reward only lands in onReward. */
  document.getElementById('ad-skip-btn').addEventListener('click', () => {
    playClickSound();
    requestRewardedAd('upload_skip', () => {
      state.uploadCooldownTicksLeft = 0;
      renderCooldown();
      showToast(ic('tv') + ` Thanks for watching — you can upload now.`);
    });
  });

  document.getElementById('offline-close').addEventListener('click', () => {
    playClickSound();
    document.getElementById('offline-modal').classList.remove('show');
  });
  document.getElementById('video-list').addEventListener('click', (e) => {
    if (contentSubTab === 'playlists' && handlePlaylistClick(e)) e.stopPropagation();
  }, true);
  document.getElementById('video-list').addEventListener('click', (e) => {
    const now = e.target.closest('[data-sched-now]'), cancel = e.target.closest('[data-sched-cancel]');
    if (!now && !cancel) return;
    e.stopPropagation();
    const id = (now || cancel).dataset[now ? 'schedNow' : 'schedCancel'];
    const v = state.videos.find(x => x.id === id);
    if (!v || v.publishPhase !== 'scheduled') return;
    if (now){ v.publishAt = state.totalTicks; goLive(v); playSuccessSound(); }
    else {
      state.videos = state.videos.filter(x => x.id !== id);
      state.storageUsedGB = Math.max(0, state.storageUsedGB - (v.sizeGB || 0));
      dropFromPlaylists(id);
      if (typeof socialVideoGone === 'function') socialVideoGone(id);
      if (typeof sponsorBook === 'function') sponsorBook().deals.forEach(d => { if (d.videoId === id && d.status === 'active') d.videoId = null; });   // the deal waits for another video
      playClickSound(); showToast(ic('calendar') + ` Cancelled "${v.title}".`);
    }
    safeRenderAll();
  }, true);
  document.getElementById('video-list').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'pl-name-input') document.getElementById('pl-create-btn').click();
  });
  const rangeBtn = document.getElementById('an-range-btn');
  const rangeMenu = document.getElementById('an-range-menu');
  if (rangeBtn && rangeMenu){
    rangeBtn.addEventListener('click', (e) => { e.stopPropagation(); playClickSound(); rangeMenu.classList.toggle('open'); });
    rangeMenu.addEventListener('click', (e) => {
      const b = e.target.closest('[data-range]');
      if (!b) return;
      analyticsRange = b.dataset.range;
      rangeMenu.querySelectorAll('[data-range]').forEach(x => x.classList.toggle('active', x === b));
      rangeMenu.classList.remove('open');
      playClickSound();
      renderAnalyticsOverview();
    });
    document.addEventListener('click', () => rangeMenu.classList.remove('open'));
  }
  document.getElementById('video-modal').addEventListener('click', (e) => {
    const m = e.target.closest('[data-va-metric]');
    if (m){ vaMetric = m.dataset.vaMetric; playClickSound(); renderVideoAnalytics(); return; }
    if (e.target.id === 'video-modal' || e.target.closest('#video-modal-close')){
      playClickSound();
      document.getElementById('video-modal').classList.remove('show');
      vaVideoId = null;
    }
  });
  document.getElementById('video-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-va]');
    if (b){ e.stopPropagation(); openVideoAnalytics(b.dataset.va); }
  }, true);
  const offlineDoubleBtn = document.getElementById('offline-double');
  if (offlineDoubleBtn) offlineDoubleBtn.addEventListener('click', () => {
    if (!lastOfflineGains || lastOfflineGains.doubled) return;
    playClickSound();
    requestRewardedAd('offline_double', () => {
      const g = lastOfflineGains;
      g.doubled = true;
      state.subs += g.subs;
      state.money += g.money;
      state.lifetimeRevenue += g.money;
      state.adRevenueTotal += g.money;
      if (g.money > 0.01) pushTransaction('ad', 'Welcome-back bonus', g.money);
      document.getElementById('off-subs').textContent = '+' + fmt(g.subs * 2);
      document.getElementById('off-money').textContent = '+$' + (g.money * 2).toFixed(2);
      offlineDoubleBtn.disabled = true;
      offlineDoubleBtn.textContent = 'Doubled';
      playCoinSound();
      safeRenderAll();
    });
  });

  document.getElementById('theme-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-pick]');
    if (!b) return;
    state.theme = b.dataset.themePick;
    playClickSound(); applyTheme(); saveState();
    safeRenderAll();
  });
  document.getElementById('set-sound').addEventListener('click', () => { toggleSound(); renderSettings(); });
  document.getElementById('set-music').addEventListener('click', () => { toggleMusic(); renderSettings(); });
  document.getElementById('settings-btn').addEventListener('click', () => { playClickSound(); switchTab('settings'); });
  document.getElementById('set-name-save').addEventListener('click', () => {
    const v = document.getElementById('set-name-input').value.trim().slice(0, 24);
    if (!v){ playErrorSound(); return; }
    state.channelName = v;
    playCoinSound();
    showToast(ic('check') + ` Channel renamed to ${v}`);
    safeRenderAll();
  });
  // Delete save: an in-game confirm (browser confirm() is blocked inside some embeds, e.g. itch.io)
  document.getElementById('reset-save').addEventListener('click', () => {
    playClickSound();
    document.getElementById('reset-modal').classList.add('show');
  });
  document.getElementById('reset-cancel').addEventListener('click', () => {
    playClickSound();
    document.getElementById('reset-modal').classList.remove('show');
  });
  document.getElementById('reset-confirm').addEventListener('click', () => {
    saveBlocked = true;                                   // stop every autosave path first
    try { localStorage.removeItem(SAVE_KEY); } catch(e){}
    window.removeEventListener('beforeunload', saveState);
    location.reload();
  });
  document.getElementById('replay-tutorial').addEventListener('click', () => { if (window.Tutorial) Tutorial.start(); });
  const privacyBtn = document.getElementById('privacy-options-btn');
  if (privacyBtn) privacyBtn.addEventListener('click', () => { playClickSound(); Ads.showPrivacyOptions && Ads.showPrivacyOptions(); });
  document.getElementById('export-save').addEventListener('click', () => {
    try {
      const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `streamly-save-${Date.now()}.json`;
      a.click();
      playClickSound();
    } catch(e){ showToast('Could not export the save on this device.'); }
  });
  document.getElementById('bell-btn').addEventListener('click', () => {
    playClickSound();
    const list = document.getElementById('notif-modal-list');
    list.innerHTML = state.notifications.length
      ? state.notifications.slice(0, 25).map(n => `<div class="notif-line">${n.text}<span class="notif-time">${feedTimeAgo(n.tick)}</span></div>`).join('')
      : `<div class="empty-hint">Nothing yet. Upload a video to get things moving.</div>`;
    lastSeenNotif = state.notifications.length;
    const dot = document.getElementById('bell-dot');
    if (dot) dot.style.display = 'none';
    document.getElementById('notif-modal').classList.add('show');
  });
  document.getElementById('notif-close').addEventListener('click', () => {
    playClickSound();
    document.getElementById('notif-modal').classList.remove('show');
  });

  /* Studio: live thumbnail preview + energy forecast follow every picker */
  ['topic-select', 'thumbnail-select', 'ab-thumbnail-select', 'length-select', 'effort-select', 'titlestyle-select', 'format-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { renderCtypeChips(); renderThumbPreview(); renderStudioEnergy(); });
  });
  document.getElementById('topic-tiles').addEventListener('click', () => { renderCtypeChips(); renderThumbPreview(); renderStudioEnergy(); });
  document.getElementById('format-tiles').addEventListener('click', () => { renderThumbPreview(); renderStudioEnergy(); });
  document.getElementById('coffee-btn').addEventListener('click', buyCoffee);

  /* Discover: collab pitches */
  document.getElementById('collab-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-collab]');
    if (!btn || btn.disabled) return;
    startCollab(btn.dataset.collab);
  });

  Ads.init({
    onStart(){ if (window.Music) Music.duck(true); },
    onEnd(){
      if (!window.Music) return;
      Music.duck(false);
      // a full-screen app ad pauses the game screen, which stops the music; pick it back up
      if (state.musicEnabled && !document.hidden && Music.ctx && !Music.playing) Music.start();
    },
    onPrivacyOptions(){ const row = document.getElementById('privacy-options-row'); if (row) row.style.display = ''; },
  });
  Ads.gameplayStart();

  setInterval(() => { liveTick(); }, 1000);
  setInterval(saveState, 5000);
  setInterval(maybeTriggerEvent, EVENT_CHECK_MS);
  window.addEventListener('beforeunload', saveState);

  // Rendering happens after listeners are safely attached. Any single render
  // error is caught and logged instead of aborting the rest of startup.
  seedRivalUploads();
  syncPlaylistBoosts();
  initLiveUI();
  initCtypeUI();
  initCadenceUI();
  initSocialUI();
  initCalendarUI();
  initSituationsUI();
  initSocialMediaUI();
  applyTheme();
  publishDueVideos();
  state.videos.forEach(v => { if (v.needsLiveHooks){ delete v.needsLiveHooks; if (typeof videoLiveHooks === 'function') videoLiveHooks(v); } });
  refreshIdentity(false);
  const idClose = document.getElementById('identity-close');
  if (idClose) idClose.addEventListener('click', () => { playClickSound(); document.getElementById('identity-modal').classList.remove('show'); });
  if (state.live) endLiveStream(true); // the game was closed mid-stream: wrap it up with what it had
  safeRenderAll();
  if (hadSave) runOfflineProgress();
  safeRenderAll();
  try { renderThumbPreview(); } catch(e){ console.error(e); }
  gameRunning = true;
}

/* Android app: back after a while in another app. Same catch-up as reopening the game. */
var gameRunning = false;
function catchUpAfterResume(){
  if (!gameRunning) return;
  if (state.live) endLiveStream(true); // a stream can't keep going while the app is closed
  runOfflineProgress();
  safeRenderAll();
}

function refreshVideoModal(){
  const m = document.getElementById('video-modal');
  if (m && m.classList.contains('show') && vaVideoId) renderVideoAnalytics();
}
function safeRenderAll(){
  const renders = [renderIdentity, renderEquipment, renderStats, renderVideos, renderHome, renderRecentVideos, renderChannelProgress, renderAnalyticsOverview, renderStatusDonut, renderMonetization, renderCooldown, renderCreatorFeed, renderDiscoverFeed, renderWhoToFollow, renderNicheStatus, renderPartnerProgramme, renderSoundToggle, renderMusicToggle, renderGameClock, renderCollabs, renderStudioEnergy, renderCadencePanel, renderStudioCadence, renderPublishSelect, renderSponsorSelect, refreshVideoModal, renderIdentityCard, renderRivalWatch, renderCalendar, renderComingUp, renderDemographics, renderSituations, renderSocial];
  renders.forEach(fn => {
    try { fn(); } catch(e){ console.error('Render error in', fn.name, e); }
  });
}

/* =========================================================================
   BOOT / LOADING SCREEN
   First-ever visit: a short fake "boot sequence" (console-style checklist),
   shown once and remembered via localStorage. Every visit: a cinematic
   loader (logo, sub/like/notification stat trio, progress bar, rotating
   tips) before handing off to the real game via init(). The progress here
   is a fake, eased ticker (our real init is synchronous with nothing to
   actually wait for) — if that ever changes, swap tick() for real
   setProgress(n) calls from actual load events.
   ========================================================================= */
(function bootLoader(){
  /* AetherEdge Studios splash (~6.3s) -> Streamly title card (~4.3s) -> game.
     Real loading drives the bar; a synthesized soundtrack and a particle layer
     follow the animation. No tap-to-skip: a tap only switches sound on if the
     browser blocked it. */
  const $ = (id) => document.getElementById(id);
  window.__bootActive = true;
  const root = $('boot-loader');
  const fill = $('ae-fill'), status = $('ae-status');
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STUDIO_MS = REDUCED ? 600 : 6300, TITLE_MS = REDUCED ? 800 : 4300;
  let ready = false, studioDone = false, leaving = false;
  const t0 = performance.now();
  const setProgress = (pct, text) => { fill.style.width = pct + '%'; if (text) status.textContent = text; };

  /* ---------------- sound ---------------- */
  let soundOn = true;
  try { const sv = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (sv && sv.soundEnabled === false) soundOn = false; } catch(e){}
  const AC = window.AudioContext || window.webkitAudioContext;
  let ac = null, master = null, noise = null;
  if (AC && soundOn && !REDUCED){
    try {
      ac = new AC(); master = ac.createGain(); master.gain.value = 0.42; master.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch(e){ ac = null; }
  }
  const live = () => ac && ac.state === 'running';
  function tone(freq, start, dur, type, vol, freqEnd, attack){
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + start;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (attack || 0.008)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function hiss(start, dur, vol, type, f0, f1, q){
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + start;
    src.buffer = noise; f.type = type; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master); src.start(t, Math.random() * 0.4); src.stop(t + dur + 0.05);
  }
  const SFX = {
    pad(){ [220, 261.63, 329.63, 392, 493.88].forEach((f, i) => tone(f, i * 0.04, 6.2, 'triangle', 0.035, null, 1.6)); tone(110, 0, 6.2, 'sine', 0.06, null, 1.8); },
    whoosh(dur, f0, f1, vol){ hiss(0, dur, vol || 0.12, 'bandpass', f0, f1, 1.2); },
    thock(i){ const f = 150 * Math.pow(1.06, i); tone(f, 0, 0.16, 'sine', 0.32, f * 0.45); hiss(0, 0.05, 0.08, 'highpass', 2500); },
    chime(){ [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => { tone(f, i * 0.07, 1.4, 'sine', 0.09); tone(f * 2.01, i * 0.07, 0.6, 'sine', 0.025); }); },
    rise(){ tone(380, 0, 0.55, 'sine', 0.08, 980, 0.05); hiss(0, 0.6, 0.06, 'bandpass', 900, 5000, 1.5); },
    resolve(){ [220, 277.18, 329.63, 440, 554.37].forEach((f, i) => tone(f, i * 0.02, 2.6, 'triangle', 0.05, null, 0.05)); tone(880, 0.05, 1.6, 'sine', 0.05); },
    pop(){ tone(520, 0, 0.18, 'sine', 0.22, 980); tone(1040, 0.02, 0.12, 'triangle', 0.05); },
    seg(i){ tone(700 + i * 160, 0, 0.09, 'triangle', 0.08, 900 + i * 180); },
    tick(){ tone(1600 + Math.random() * 300, 0, 0.03, 'square', 0.018); },
    ding(){ tone(1318.5, 0, 1.6, 'sine', 0.14); tone(2637, 0, 0.8, 'sine', 0.04); tone(659.25, 0.01, 1.4, 'triangle', 0.05); },
  };
  // fire a cue at an offset from the start of a section; skipped if sound isn't on yet by then
  const cue = (atMs, fn, base) => setTimeout(() => { if (live()) try { fn(); } catch(e){} }, Math.max(0, atMs - (performance.now() - (base || t0))));
  // browsers can block audio until the first tap: show a small speaker; a tap anywhere switches sound on
  let soundBtn = null;
  if (ac && ac.state !== 'running'){
    ac.resume().catch(() => {});
    setTimeout(() => {
      if (live()) return;
      soundBtn = document.createElement('div');
      soundBtn.className = 'boot-sound show';
      soundBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';
      root.appendChild(soundBtn);
    }, 250);
  }
  const wake = () => { if (ac && ac.state !== 'running') ac.resume().then(() => { if (soundBtn) soundBtn.classList.remove('show'); }).catch(() => {}); };
  root.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);

  /* ---------------- particles ---------------- */
  const amb = $('ae-amb');
  const cv = document.createElement('canvas'); amb.appendChild(cv);
  const cx = cv.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { W = root.clientWidth; H = root.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); window.addEventListener('resize', size);
  const dots = Array.from({ length: REDUCED ? 0 : 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, s: 0.00004 + Math.random() * 0.00012, a: 0.15 + Math.random() * 0.45, c: Math.random() < 0.25 ? '63,227,207' : '139,92,246' }));
  const sparks = [];
  function burst(x, y, color, n, speed){
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, v = (speed || 1.6) * (0.4 + Math.random());
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.8, life: 1, c: color, r: 1 + Math.random() * 1.8 });
    }
  }
  let rafOn = true;
  (function frame(){
    if (!rafOn) return;
    cx.clearRect(0, 0, W, H);
    dots.forEach(d => { d.y -= d.s * 16; if (d.y < -0.02) d.y = 1.02; cx.beginPath(); cx.arc(d.x * W, d.y * H, d.r, 0, 6.283); cx.fillStyle = `rgba(${d.c},${d.a})`; cx.fill(); });
    for (let i = sparks.length - 1; i >= 0; i--){
      const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life -= 0.022;
      if (p.life <= 0){ sparks.splice(i, 1); continue; }
      cx.beginPath(); cx.arc(p.x, p.y, p.r * p.life + 0.3, 0, 6.283); cx.fillStyle = `rgba(${p.c},${p.life})`; cx.fill();
    }
    requestAnimationFrame(frame);
  })();
  const at = (el, fx, fy) => { const r = el.getBoundingClientRect(), rr = root.getBoundingClientRect(); return [r.left - rr.left + r.width * fx, r.top - rr.top + r.height * fy]; };

  /* ---------------- studio timeline (matches the CSS delays) ---------------- */
  if (!REDUCED){
    cue(80, () => SFX.pad());
    cue(200, () => SFX.whoosh(1.25, 300, 2600, 0.1));
    const blocks = [...document.querySelectorAll('.ae-blk')];
    blocks.forEach((b, i) => {
      const land = 1200 + i * 200 + 330;
      setTimeout(() => { const [x, y] = at(b, 0.5, 0.85); burst(x, y, '167,139,250', 7, 1.2); }, land);
      cue(land, () => SFX.thock(i));
    });
    setTimeout(() => { const hero = document.querySelector('.ae-hero'); if (hero){ const [x, y] = at(hero, 0.5, 0.5); burst(x, y, '94,234,212', 26, 2.2); } }, 3400);
    cue(3300, () => SFX.chime());
    cue(3420, () => SFX.rise());
    cue(3900, () => SFX.whoosh(0.9, 600, 4000, 0.07));
    cue(5000, () => SFX.resolve());
  }

  /* ---------------- real loading ---------------- */
  async function load(){
    setProgress(8, 'Loading fonts');
    const fontJobs = ['400 14px Inter', '500 14px Inter', '600 14px Inter', '800 14px Inter'];
    let done = 0;
    try {
      if (document.fonts && document.fonts.load){
        await Promise.race([
          Promise.all(fontJobs.map(f => document.fonts.load(f).then(() => { done++; setProgress(8 + Math.round(done / fontJobs.length * 37)); }).catch(() => {}))),
          new Promise(r => setTimeout(r, 2500)),
        ]);
      }
    } catch(e){}
    setProgress(50, 'Opening your studio');
    await new Promise(r => setTimeout(r, 30));
    try { init(); } catch(e){ console.error(e); }
    setProgress(75);
    await new Promise(r => setTimeout(r, 30));
    // fill the Streamly title card's thumbnail wall now, while the studio logo is still playing
    try { buildWall(); } catch(e){ console.error(e); }
    try { if (typeof safeRenderAll === 'function') safeRenderAll(); } catch(e){}
    setProgress(100, 'Ready');
    ready = true;
    maybeLeave();
  }
  function buildWall(){
    const topics = ['gaming', 'comedy', 'football', 'tech', 'cooking', 'lifestyle'];
    const styles = ['shock', 'funny', 'action', 'gameplay', 'clean', 'funny', 'shock', 'action'];
    const faces = ['PixelQueen', 'TechMaster', 'LifestyleLuna', 'ComedyCentral_', 'FootballZone', 'ChefAmara', 'GamingHub', 'CookingKing', 'Marcus Plays'];
    const tile = (i) => {
      const topic = topics[i % topics.length];
      const bank = (TITLE_BANK[topic] || ['New video']);
      const d = 60 * (2 + (i * 7) % 23) + (i * 17) % 60;
      return `<div class="st2-th">${thumbSVG({ seed: 'boot' + i, topic, style: styles[i % styles.length], title: bank[(i * 5) % bank.length], face: faces[i % faces.length] })}<span class="d">${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}</span></div>`;
    };
    ['st2-col-a', 'st2-col-b', 'st2-col-c'].forEach((id, c) => {
      const el = $(id); if (!el) return;
      const tiles = []; for (let k = 0; k < 6; k++) tiles.push(tile(c * 6 + k));
      el.innerHTML = tiles.join('') + tiles.join('');   // doubled so the scroll loops seamlessly
    });
  }

  /* ---------------- Streamly title card ---------------- */
  function maybeLeave(){ if (ready && studioDone) toGame(); }
  function toGame(){
    if (leaving) return;
    leaving = true;
    root.classList.add('to-game');
    const T = performance.now();
    if (!REDUCED){
      cue(100, () => SFX.whoosh(1.0, 200, 1800, 0.12), T);
      cue(420, () => SFX.pop(), T);
      [0, 1, 2].forEach(i => cue(900 + i * 140, () => SFX.seg(i), T));
      cue(1250, () => SFX.whoosh(0.7, 1200, 6000, 0.05), T);
      cue(1880, () => SFX.pop(), T);
      // subscriber counter: 0 -> 1,000,000 with ticks that slow down as it lands
      const num = $('st2-num');
      setTimeout(() => {
        const start = performance.now(), DUR = 1500, TARGET = 1000000;
        let lastTick = 0;
        (function step(){
          const k = Math.min(1, (performance.now() - start) / DUR), e = 1 - Math.pow(1 - k, 3);
          num.textContent = Math.round(TARGET * e).toLocaleString();
          if (live() && performance.now() - lastTick > 60 + k * 120){ lastTick = performance.now(); SFX.tick(); }
          if (k < 1) requestAnimationFrame(step); else if (live()) SFX.ding();
        })();
      }, 2350);
    } else {
      const num = $('st2-num'); if (num) num.textContent = '1,000,000';
    }
    setTimeout(finish, TITLE_MS);
  }
  function finish(){
    root.classList.add('hide');
    setTimeout(() => {
      root.style.display = 'none';
      rafOn = false;
      window.__bootActive = false;
      if (master && ac){ try { master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4); setTimeout(() => ac.close(), 600); } catch(e){} }
      // hand over to the game's own music if sound has been unlocked
      try { if (audioUnlocked && state.musicEnabled && window.Music){ Music.attach(audioCtx); Music.start(); } } catch(e){}
    }, 480);
  }
  setTimeout(() => { studioDone = true; maybeLeave(); }, STUDIO_MS);
  try { localStorage.setItem('streamly_booted', '1'); } catch(e){}
  load();
})();

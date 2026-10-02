/* =========================================================================
   STREAMLY SIM — CONTENT TYPES ("what is the video actually about?")
   Each topic offers 5-7 video types. Every type maps to one of ten
   archetypes, and the archetype carries the mechanics, so a Cooking
   "Recipe" and a Tech "Tutorial" both behave like a Guide: slow start,
   long search tail. Loaded before game.js; functions only run after the
   game starts, so game.js globals (state, rand, clamp...) are available.
   ========================================================================= */

/* spike: day-one views x · tail: long-tail floor x · decay: + slower / - faster fade
   viral/dead: chance multipliers · subs/comments: rate multipliers · energy: extra cost
   algo/ctr/ret/sat/edu: flat bonuses · shortsRet: retention bonus when made as a Short */
const ARCHETYPES = {
  casual:     { pulse: 1.0, capMult: 1.0, algo: 0,  ctr: -1, ret: 2,  sat: 2,  edu: 0,  spike: 1.0, tail: 1.0, decay: 0,      viral: 0.9, dead: 1.0, subs: 1.25, comments: 1.0, energy: -2, shortsRet: 5,
                pro: 'Your regulars love these', con: 'weaker at pulling in new viewers' },
  challenge:  { pulse: 1.0, capMult: 1.1, algo: 4,  ctr: 4,  ret: 0,  sat: 2,  edu: 0,  spike: 1.2, tail: 0.9, decay: 0,      viral: 1.6, dead: 1.1, subs: 1.0,  comments: 1.2, energy: 8,  shortsRet: 0, needsEffort: true,
                pro: 'High clicks, best viral odds', con: 'costs extra energy, and rushed edits flop' },
  guide:      { pulseDelay: 720, pulse: 1.5, capMult: 1.3, algo: 0,  ctr: -2, ret: 4,  sat: 3,  edu: 20, spike: 0.6, tail: 2.4, decay: 0.007,  viral: 0.6, dead: 0.9, subs: 1.15, comments: 0.9, energy: 2,  shortsRet: -6,
                pro: 'Keeps getting found for weeks', con: 'slow start, and weak as a Short' },
  review:     { pulse: 1.3, capMult: 1.1, algo: 1,  ctr: 1,  ret: 3,  sat: 3,  edu: 10, spike: 1.0, tail: 1.5, decay: 0.003,  viral: 0.8, dead: 0.9, subs: 1.1,  comments: 1.1, energy: 0,  shortsRet: 0, sponsor: true,
                pro: 'Strong retention, and sponsors notice', con: 'rarely explodes' },
  unboxing:   { pulse: 1.0, capMult: 1.0, algo: 2,  ctr: 3,  ret: 2,  sat: 2,  edu: 5,  spike: 1.1, tail: 1.3, decay: 0,      viral: 0.9, dead: 0.9, subs: 1.0,  comments: 1.0, energy: 0,  shortsRet: 2, sponsor: true, cost: 15,
                pro: 'Clicky and sponsor-friendly', con: 'you have to buy the product first ($15)' },
  comparison: { pulseDelay: 720, pulse: 1.4, capMult: 1.2, algo: 1,  ctr: 1,  ret: 3,  sat: 2,  edu: 12, spike: 0.9, tail: 2.0, decay: 0.005,  viral: 0.7, dead: 0.9, subs: 1.05, comments: 1.3, energy: 2,  shortsRet: -3,
                pro: 'Searched for weeks, sparks debates', con: 'quiet first day' },
  reaction:   { pulse: 0.8, capMult: 0.9, algo: -1, ctr: 2,  ret: -2, sat: -5, edu: 0,  spike: 1.1, tail: 0.8, decay: -0.003, viral: 1.0, dead: 1.0, subs: 0.85, comments: 1.2, energy: -8, shortsRet: 4, backlash: 0.08,
                pro: 'Quick and cheap to make', con: 'lower satisfaction, and lazy reactions can backfire' },
  news:       { pulse: 0.25, capMult: 0.85, algo: 2,  ctr: 3,  ret: 0,  sat: 0,  edu: 8,  spike: 3.0, tail: 0.3, decay: -0.004, viral: 1.1, dead: 1.1, subs: 0.95, comments: 1.3, energy: 0,  shortsRet: 2, trendy: true,
                pro: 'Huge day-one spike, best on trending topics', con: 'fades within a day or two' },
  list:       { pulse: 1.0, capMult: 0.95, algo: 1,  ctr: 1,  ret: 1,  sat: 1,  edu: 5,  spike: 1.0, tail: 1.0, decay: 0.002,  viral: 0.6, dead: 0.75, subs: 1.0,  comments: 1.2, energy: 0,  shortsRet: 0,
                pro: 'Safe and reliable, rarely flops', con: 'rarely goes viral either' },
  opinion:    { pulse: 1.0, capMult: 1.0, algo: 0,  ctr: 1,  ret: 1,  sat: 0,  edu: 0,  spike: 1.0, tail: 1.0, decay: 0,      viral: 0.9, dead: 1.0, subs: 1.15, comments: 2.4, energy: -2, shortsRet: 0, controversy: 0.1,
                pro: 'Floods the comments, builds a loyal core', con: 'hot takes can start a controversy' },
};
const ARCH_LABEL = { casual: 'Casual', challenge: 'Challenges', guide: 'Guides', review: 'Reviews', unboxing: 'Unboxings', comparison: 'Comparisons', reaction: 'Reactions', news: 'News', list: 'Lists', opinion: 'Opinion videos' };

/* What each topic calls its types. id is unique within the topic; arch picks the mechanics. */
const TOPIC_TYPES = {
  gaming:    [{ id: 'gameplay', name: 'Gameplay', arch: 'casual' }, { id: 'challenge', name: 'Challenge', arch: 'challenge' }, { id: 'guide', name: 'Guide', arch: 'guide' },
              { id: 'review', name: 'Review', arch: 'review' }, { id: 'reaction', name: 'Reaction', arch: 'reaction' }, { id: 'news', name: 'News', arch: 'news' }, { id: 'list', name: 'List', arch: 'list' }],
  tech:      [{ id: 'review', name: 'Review', arch: 'review' }, { id: 'tutorial', name: 'Tutorial', arch: 'guide' }, { id: 'comparison', name: 'Comparison', arch: 'comparison' },
              { id: 'news', name: 'News', arch: 'news' }, { id: 'opinion', name: 'Opinion', arch: 'opinion' }, { id: 'unboxing', name: 'Unboxing', arch: 'unboxing' }],
  lifestyle: [{ id: 'vlog', name: 'Vlog', arch: 'casual' }, { id: 'routine', name: 'Routine', arch: 'guide' }, { id: 'challenge', name: 'Challenge', arch: 'challenge' },
              { id: 'haul', name: 'Haul', arch: 'unboxing' }, { id: 'qa', name: 'Q&A', arch: 'opinion' }, { id: 'list', name: 'Tips List', arch: 'list' }],
  comedy:    [{ id: 'skit', name: 'Skit', arch: 'casual' }, { id: 'prank', name: 'Prank', arch: 'challenge' }, { id: 'reaction', name: 'Reaction', arch: 'reaction' },
              { id: 'storytime', name: 'Storytime', arch: 'opinion' }, { id: 'ranking', name: 'Ranking', arch: 'list' }],
  football:  [{ id: 'skills', name: 'Skills Tutorial', arch: 'guide' }, { id: 'challenge', name: 'Challenge', arch: 'challenge' }, { id: 'matchreaction', name: 'Match Reaction', arch: 'reaction' },
              { id: 'transfernews', name: 'Transfer News', arch: 'news' }, { id: 'top10', name: 'Top 10', arch: 'list' }, { id: 'hottake', name: 'Hot Take', arch: 'opinion' }],
  cooking:   [{ id: 'recipe', name: 'Recipe', arch: 'guide' }, { id: 'tastetest', name: 'Taste Test', arch: 'review' }, { id: 'challenge', name: 'Challenge', arch: 'challenge' },
              { id: 'streetfood', name: 'Street Food', arch: 'casual' }, { id: 'reaction', name: 'Recipe Reaction', arch: 'reaction' }, { id: 'haul', name: 'Grocery Haul', arch: 'unboxing' }],
};

/* Titles written for each type, so a Guide sounds like a guide. */
const TYPE_TITLES = {
  gaming: {
    gameplay:  ['Just Vibing in Ranked', 'Chill Late Night Gameplay', 'Road to Top 500: Episode 12', 'Full Match, No Commentary Cuts', 'Playing the New Map for the First Time', 'Duo Queue With My Brother'],
    challenge: ['I Only Used the Worst Gun All Game', 'One Life Only Challenge', 'Winning Without Taking Damage', 'Every Death = Harder Settings', 'I Can Only Use What I Find', 'Beating the Game Blindfolded'],
    guide:     ['How to Rank Up Fast This Season', 'The Complete Beginner\'s Guide', '10 Settings Every Player Should Change', 'How to Aim Better in 7 Days', 'Every Map Secret Explained', 'How Pros Actually Rotate'],
    review:    ['Is the New Update Worth It?', 'Honest Review After 50 Hours', 'I Tried the Most Hyped Game This Year', 'Is This Controller Worth It?', 'Should You Buy This Game in 2026?'],
    reaction:  ['Reacting to My First Ever Gameplay', 'Pro Player Reacts to My Worst Plays', 'Reacting to the New Trailer', 'Watching Your Best Clips', 'Reacting to Viral Gaming Moments'],
    news:      ['Huge Update Just Dropped', 'Everything New in the Patch', 'They Just Nerfed My Main', 'New Season Leaks Explained', 'This Changes Everything for Ranked'],
    list:      ['Every Weapon Ranked Worst to Best', 'Top 10 Plays of the Week', '5 Mistakes Every New Player Makes', 'Tier List: Every Character', 'Top 10 Hardest Bosses'],
  },
  tech: {
    review:     ['Honest Review After 30 Days', 'Is This Laptop Worth the Hype?', 'Smartwatch After 6 Months', 'The Budget Phone That Surprised Me', 'Are These Earbuds Worth It?', 'This Charger Is Actually Good'],
    tutorial:   ['How to Speed Up Your Old Phone', 'How I Edit My Videos', 'Set Up Your Desk the Right Way', 'How to Back Up Everything', '10 Hidden Settings You Should Change', 'Build Your First PC: Step by Step'],
    comparison: ['Cheap vs Expensive Earbuds', 'Budget vs Flagship Phone', 'Android vs iPhone: One Week Each', 'Laptop A vs Laptop B for Students', 'Which Mic Should Creators Buy?'],
    news:       ['New Phone Just Announced', 'Everything From the Tech Event', 'Prices Are Going Up Again', 'The Update Everyone Is Talking About', 'This Leak Changes Everything'],
    opinion:    ['Smartphones Are Getting Boring', 'Stop Buying the Newest Phone', 'The Tech Nobody Actually Needs', 'Is AI Overhyped?', 'Why I Switched Back'],
    unboxing:   ['Unboxing the Weirdest Tech I Own', 'Unboxing a Mystery Tech Box', 'Unboxing My New Setup', 'First Look: Unboxing the New Phone', 'Unboxing Cheap Gadgets From Online'],
  },
  lifestyle: {
    vlog:      ['A Day in My Life as a Creator', 'Weekend Vlog: Just Vibes', 'Spend the Day With Me', 'Rainy Day Vlog', 'Week in My Life', 'Come Shopping With Me'],
    routine:   ['My Morning Routine That Changed Everything', 'My Night Routine', 'How I Stay Productive', 'My Study Routine', 'Sunday Reset Routine', 'My Realistic Gym Routine'],
    challenge: ['I Tried Waking Up at 5AM', 'No Phone for 7 Days', 'Living on a Tight Budget for a Week', 'I Went to the Gym Every Day for a Month', 'Saying Yes to Everything for a Day'],
    haul:      ['Huge Thrift Haul', 'Everything I Bought This Month', 'Room Decor Haul', 'Budget Skincare Haul', 'Market Haul in Lagos'],
    qa:        ['Answering Your Questions', 'Things I Wish I Knew at 18', 'My Honest Thoughts on Hustle Culture', 'Q&A: How I Started', 'Get to Know Me'],
    list:      ['10 Habits That Changed My Life', '7 Things I Stopped Buying', '5 Apps That Run My Life', 'Room Essentials Under 5K', '10 Tips for Moving Out'],
  },
  comedy: {
    skit:      ['Types of People at a Wedding', 'If Streamers Worked Normal Jobs', 'Every Group Chat Has These People', 'Things Every Nigerian Parent Says', 'Worst Job Interview Ever', 'When the Teacher Leaves the Class'],
    prank:     ['Pranking My Roommate for a Week', 'I Let My Subscribers Control My Day', 'Fake Phone Call Prank', 'Swapping My Friend\'s Food', 'Speaking Only in Movie Quotes for a Day'],
    reaction:  ['Reacting to My Old Videos', 'Rating Viral Videos With My Friends', 'Reading Your Worst Comments Out Loud', 'Reacting to Cringe Ads', 'Try Not to Laugh Challenge'],
    storytime: ['The Most Awkward Moment of My Life', 'My Worst Date Ever', 'Storytime: I Got Lost Abroad', 'The Day I Got Kicked Out of Class', 'How I Embarrassed Myself at Church'],
    ranking:   ['Ranking Every School Lunch', 'Ranking My Friends\' Worst Habits', 'Top 10 Funniest Moments on My Channel', 'Ranking Nigerian Snacks', 'Ranking Every Meme This Year'],
  },
  football: {
    skills:        ['Learn This Skill in 5 Minutes', 'How to Curl the Ball Like a Pro', 'Finishing Drills You Can Do Alone', 'How to Take the Perfect Penalty', 'First Touch Tutorial'],
    challenge:     ['Crossbar Challenge With My Friends', 'Can I Score From the Halfway Line?', '1v1 Against a Former Pro', 'Juggling Challenge: Can I Beat My Record?', 'Sunday League vs Academy Players'],
    matchreaction: ['Watching the Derby Live Reaction', 'Reacting to the Worst Referee Decisions', 'Live Reaction: Last Minute Winner', 'Reacting to the Final', 'My Team Lost Again (Reaction)'],
    transfernews:  ['Transfer Window Winners and Losers', 'Huge Signing Just Confirmed', 'Every Rumour This Week', 'Deadline Day Round-Up', 'Who Is Leaving This Summer?'],
    top10:         ['Top 10 Goals of the Season', 'Every Penalty Taker Ranked', 'Top 10 Most Underrated Players', '10 Best Free Kicks Ever', 'Rating Every Kit This Season'],
    hottake:       ['This Team Will Not Win the League', 'The Most Overrated Player Right Now', 'Why This Manager Must Go', 'Unpopular Opinion: VAR Is Fine', 'The Ballon d\'Or Was Wrong'],
  },
  cooking: {
    recipe:     ['Making Jollof for the First Time', 'Perfect Fried Rice Every Time', 'Easy Meals for Students', 'The Ultimate Pepper Soup', 'Making Suya at Home', 'One Pot Meals for Lazy Days'],
    tastetest:  ['Cheap vs Expensive Burger', 'Rating Instant Noodles', 'Street Food Taste Test', 'Trying Every Flavour of Chin Chin', 'Blind Taste Test With My Friends'],
    challenge:  ['Cooking With Only 3 Ingredients', 'The Spiciest Thing I\'ve Ever Cooked', 'Cooking a Meal for 1,000 Naira', 'Chef vs Home Cook', 'Baking Without an Oven'],
    streetfood: ['Street Food in Lagos', 'Eating Only Street Food for a Day', 'Best Suya Spot in Town?', 'Night Market Food Tour', 'Trying Food From Every Stall'],
    reaction:   ['Reacting to Viral Recipes', 'Chef Reacts to Your Worst Jollof', 'I Tried a Viral Recipe', 'Reacting to Food Hacks', 'Rating Your Cooking Videos'],
    haul:       ['Market Haul for the Week', 'What I Buy at the Market', 'Grocery Haul on a Budget', 'Kitchen Gadget Haul', 'Monthly Food Shopping Haul'],
  },
};

/* Comments per archetype, by tone. makeComment() mixes these in. */
const TYPE_COMMENTS = {
  casual:     { pos: ['These are my favourite type of your videos.', 'Just vibes, love it.', 'I watch these every time you post.'], neu: ['Where was this filmed?', 'How often do you post these?'], neg: ['Bit boring this time.', 'Nothing really happened.'] },
  challenge:  { pos: ['The commitment!', "I can't believe you actually did it.", 'Do an even harder one next!'], neu: ['How many tries did that take?', 'Was this staged?'], neg: ['Felt a bit fake.', 'Easy challenge honestly.'] },
  guide:      { pos: ['I followed this and it worked!', 'Clearest explanation on the internet.', 'Saved this for later.'], neu: ['Can you do a part 2 for beginners?', 'I got stuck on the third step, help?'], neg: ['Went too fast for me.', 'Skipped an important step.'] },
  review:     { pos: ['Honest review, thank you.', 'Exactly what I needed before buying.'], neu: ['How long have you had it?', 'Would you buy it again?'], neg: ['You missed the biggest flaw.', 'Feels sponsored.'] },
  unboxing:   { pos: ['That unboxing was so satisfying.', 'The packaging is beautiful.'], neu: ['How much was it?', 'Where did you order from?'], neg: ['All unboxing, no review.', 'Just open the box already.'] },
  comparison: { pos: ['This settled a debate with my friend.', 'Super useful side by side.'], neu: ['Which one would you pick?', 'Do a price-for-value version.'], neg: ["That wasn't a fair comparison.", 'You clearly prefer one already.'] },
  reaction:   { pos: ['Your reactions are the best part.', 'React to more of these!'], neu: ['Link the original?', 'Pause and talk more!'], neg: ['You barely reacted.', "Just watching someone else's video.", 'Lazy content ngl.'] },
  news:       { pos: ['Fastest update on this, thanks.', 'Glad I heard it here first.'], neu: ['Source?', 'Any update on this?'], neg: ['Old news already.', 'You got a detail wrong.'] },
  list:       { pos: ['Great list!', 'Number 1 was the right pick.'], neu: ['What would number 11 be?', 'Part 2?'], neg: ['Your list is wrong.', 'Where is my favourite?'] },
  opinion:    { pos: ['Finally someone said it.', 'Agree 100%.', 'Needed to hear this.'], neu: ['Interesting take.', 'I half agree.'], neg: ['Terrible take.', "You're completely wrong about this.", "Unsubscribed. Just kidding. But you're wrong."] },
};

/* ---------------- helpers ---------------- */
function typesFor(topic){ return TOPIC_TYPES[topic] || TOPIC_TYPES.gaming; }
function findType(topic, id){ const list = typesFor(topic); return list.find(t => t.id === id) || list[0]; }
function archOf(v){ return v && v.ctArch ? ARCHETYPES[v.ctArch] : null; }

/* One archetype is in fashion each in-game day (like topics). Seeded by day so it's stable. */
function trendingArch(){
  const day = Math.floor(state.totalTicks / DAY_TICKS);
  const keys = ['challenge', 'reaction', 'review', 'guide', 'news', 'list', 'opinion', 'casual', 'comparison', 'unboxing'];
  let h = (day + 7) * 2654435761 >>> 0;
  return keys[h % keys.length];
}
function uploadsLast24h(){ return (state.uploadLog || []).filter(t => state.totalTicks - t < 1440).length; }
/* How many of your last 5 uploads share this archetype. */
function recentSameArch(arch){
  return (state.videos || []).filter(v => !v.isVod).slice(-5).filter(v => v.ctArch === arch).length;
}

/* Applied in createVideo before satisfaction is derived. */
function applyContentTypePre(v, typeId){
  const T = findType(v.topic, typeId);
  const A = ARCHETYPES[T.arch];
  v.ctype = T.id; v.ctName = T.name; v.ctArch = T.arch;
  const repeats = recentSameArch(T.arch);                         // before this one is pushed
  const trending = trendingArch() === T.arch;
  let algo = A.algo - Math.max(0, repeats - 1) * 4 + (trending ? 5 : 0);
  // Upload saturation: more than 4 uploads in 24 game-hours and your own videos start competing
  // with each other; subscribers also stop opening every notification.
  const today = uploadsLast24h();
  algo -= Math.max(0, today - 3) * 4;
  v.notifyShare = 1 / (1 + Math.max(0, today - 2) * 0.5);
  // your audience's attention is finite: flood the feed and each video gets a smaller slice of it
  if (Number.isFinite(v.authorityCap)) v.authorityCap *= 0.3 + 0.7 * v.notifyShare;
  if (v.effort === 'quick') algo -= 5;               // rushed edits show, beyond the base quality hit
  algo += cadenceAlgoBonus();                        // the algorithm knows your rhythm (upload plan streak)
  if (Number.isFinite(v.authorityCap)) v.authorityCap *= cadenceReachMult();
  v.notifyShare = (v.notifyShare || 1) * cadenceReachMult();
  if (A.needsEffort && v.effort === 'quick') algo -= 4;
  if (A.trendy){
    const mood = (ensureAudienceMood().moods[v.topic] || 0);
    algo += mood >= 10 ? 4 : mood < 0 ? -4 : 0;                   // news lives or dies by the topic's mood
  }
  const oldScore = v.algorithmScore;
  v.algorithmScore = clamp(v.algorithmScore + algo, 0, 100);
  rescaleCapForScore(v, oldScore);
  v.ctr = clamp(v.ctr + A.ctr + (trending ? 2 : 0), 1, 97);
  if (v.ab){ v.ab.ctrA = clamp(v.ab.ctrA + A.ctr, 1, 97); v.ab.ctrB = clamp(v.ab.ctrB + A.ctr, 1, 97); }
  v.retention = clamp(v.retention + A.ret + (v.format === 'shorts' ? A.shortsRet : 0), 5, 98);
  v.ctTrending = trending; v.ctRepeats = repeats;
  if (Number.isFinite(v.authorityCap)) v.authorityCap *= A.capMult;   // search-driven types keep finding viewers past the usual ceiling
}
/* Applied after deriveVideoFlavor (which sets satisfaction/educational from retention). */
function applyContentTypePost(v){
  const A = archOf(v);
  if (!A) return;
  let sat = A.sat;
  if (A.needsEffort && v.effort === 'quick') sat -= 8;
  v.satisfaction = clamp(v.satisfaction + sat, 5, 99);
  v.educational = clamp((v.educational || 30) + A.edu, 5, 100);
  v.watchTimeSec = calcWatchTimeSec(v);
  v.comments = generateComments(v);                               // now they can reference the type
}
/* Applied inside decideOutcome, once the base outcome numbers exist. */
function applyContentTypeOutcome(v, rates){
  const A = archOf(v);
  if (!A) return rates;
  let spike = A.spike;
  if (A.trendy){
    const mood = (ensureAudienceMood().moods[v.topic] || 0);
    spike *= mood >= 10 ? 1.2 : mood < 0 ? 0.7 : 1;
  }
  rates.baseRate *= spike;
  rates.floorFrac *= A.tail;
  rates.decayFactor += A.decay;
  rates.pulseChance *= A.pulse;          // guides get rediscovered by search; news doesn't come back
  rates.spike = spike;
  return rates;
}
/* Small after-effects: opinion controversies and reaction backlash. */
function contentTypeAftermath(v){
  const A = archOf(v);
  if (!A || offlineFastForward) return;
  if (A.controversy && Math.random() < A.controversy){
    const bump = Math.round(v.baseRate * rand(8, 16));
    v.views += bump;
    v.commentCount = (v.commentCount || 0) + bump * 0.02;
    state.algoRating = clamp(state.algoRating - 2, 0, 100);
    showToast(ic('chat') + ` "${v.title}" started a heated debate in the comments. More views, but some people are annoyed.`, true);
  }
  if (A.backlash && Math.random() < A.backlash){
    v.satisfaction = clamp(v.satisfaction - 6, 5, 99);
    state.algoRating = clamp(state.algoRating - 2, 0, 100);
    showToast(ic('chat') + ` Some viewers called "${v.title}" lazy. Reactions work best when you add something.`, true);
  }
}

/* ---------------- Studio UI ---------------- */
let studioCtype = {};                                              // remembered choice per topic
function currentCtype(topic){ return findType(topic, studioCtype[topic]).id; }
function renderCtypeChips(){
  const wrap = document.getElementById('ctype-chips');
  const hint = document.getElementById('ctype-hint');
  const topicSel = document.getElementById('topic-select');
  if (!wrap || !topicSel) return;
  const topic = topicSel.value;
  const cur = findType(topic, studioCtype[topic]);
  const trend = trendingArch();
  wrap.innerHTML = typesFor(topic).map(t => `
    <button type="button" class="ctype-chip ${t.id === cur.id ? 'on' : ''}" data-ct="${t.id}">
      ${t.name}${t.arch === trend ? '<i class="ct-hot">Trending</i>' : ''}
    </button>`).join('');
  if (hint){
    const A = ARCHETYPES[cur.arch];
    const reps = recentSameArch(cur.arch);
    const notes = [];
    if (cur.arch === trend) notes.push(`<span class="ct-good">${ARCH_LABEL[cur.arch]} are trending today</span>`);
    if (reps >= 2) notes.push(`<span class="ct-warn">${reps} of your last 5 uploads were ${ARCH_LABEL[cur.arch].toLowerCase()}. Audiences are getting tired of them.</span>`);
    if (A.cost) notes.push(`<span class="ct-warn">Costs $${A.cost} for the product</span>`);
    const today = uploadsLast24h();
    if (today >= 3) notes.push(`<span class="ct-warn">${today} uploads in the last day. Past 3, your videos start competing with each other.</span>`);
    if (A.energy > 0) notes.push(`<span>+${A.energy} energy</span>`);
    if (A.energy < 0) notes.push(`<span class="ct-good">${A.energy} energy</span>`);
    if (typeof identityEffects === 'function'){
      const g = id => (document.getElementById(id) || {}).value;
      const pseudo = { topic, format: g('format-select'), effort: g('effort-select'), ctArch: cur.arch, ctRepeats: reps + 1 };
      identityEffects(pseudo).notes.forEach(n => notes.push(`<span class="${n.good ? 'ct-good' : 'ct-warn'}">${n.text}</span>`));
    }
    hint.innerHTML = `<b>${cur.name}:</b> ${A.pro}, but ${A.con}.${notes.length ? `<div class="ct-notes">${notes.join('')}</div>` : ''}`;
  }
}
function initCtypeUI(){
  const wrap = document.getElementById('ctype-chips');
  if (!wrap) return;
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ct]');
    if (!b) return;
    const topic = document.getElementById('topic-select').value;
    studioCtype[topic] = b.dataset.ct;
    playClickSound();
    renderCtypeChips();
    renderThumbPreview();
    renderStudioEnergy();
  });
  renderCtypeChips();
}

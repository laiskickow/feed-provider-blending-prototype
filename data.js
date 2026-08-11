/* ============================================================
   MOCK DATA — Feed Provider Blending & Integration Platform
   All data is fabricated for prototype/demo purposes only.
   ============================================================ */

const PROVIDERS = [
  { id:'betradar',  name:'BetRadar',   color:'#007AFF', short:'BR' },
  { id:'betgenious',name:'BetGenious', color:'#149900', short:'BG' },
  { id:'inspired',  name:'Inspired',   color:'#CCAA00', short:'IN' },
  { id:'highlight', name:'Highlight',  color:'#CC0E00', short:'HL' },
];

const providerById = id => PROVIDERS.find(p=>p.id===id);

// ---- Sport / Competition hierarchy -----------------------------------
const SPORTS = [
  {
    id:'soccer', name:'Soccer Virtuals', icon:'ball',
    defaultProvider:'inspired',
    competitions:[
      { id:'sv-premier', name:'Virtual Premier League', defaultProvider:null, events:9 },
      { id:'sv-euro',     name:'Virtual Euro Cup',        defaultProvider:'highlight', events:6 },
      { id:'sv-world',    name:'Virtual World Series',    defaultProvider:null, events:4 },
    ]
  },
  {
    id:'basketball', name:'European Basketball', icon:'ball',
    defaultProvider:'betradar',
    competitions:[
      { id:'eb-euroleague', name:'EuroLeague',       defaultProvider:null, events:5 },
      { id:'eb-eurocup',    name:'EuroCup',           defaultProvider:null, events:4 },
      { id:'eb-liga-acb',   name:'Liga ACB (Spain)',  defaultProvider:'betgenious', events:6 },
      { id:'eb-lnb',        name:'LNB Pro A (France)',defaultProvider:null, events:3 },
    ]
  },
  {
    id:'cricket', name:'Cricket', icon:'bat',
    defaultProvider:'betgenious',
    competitions:[
      { id:'cr-ipl',   name:'Indian Premier League', defaultProvider:null, events:8 },
      { id:'cr-bbl',   name:'Big Bash League',        defaultProvider:'betradar', events:5 },
      { id:'cr-cpl',   name:'Caribbean Premier League', defaultProvider:null, events:4 },
      { id:'cr-t20i',  name:'T20 Internationals',     defaultProvider:null, events:7 },
    ]
  },
  {
    id:'f1', name:'F1', icon:'flag',
    defaultProvider:'betradar',
    competitions:[
      { id:'f1-gp',     name:'Grand Prix Season',    defaultProvider:null, events:3 },
      { id:'f1-sprint', name:'Sprint Series',         defaultProvider:null, events:2 },
      { id:'f1-f2',     name:'Formula 2',             defaultProvider:'highlight', events:2 },
    ]
  },
  {
    id:'ebasketball', name:'eBasketball', icon:'controller',
    defaultProvider:'highlight',
    competitions:[
      { id:'eba-nba2k',  name:'NBA 2K League',        defaultProvider:null, events:6 },
      { id:'eba-esbl',   name:'eBasketball Battle',   defaultProvider:null, events:9 },
      { id:'eba-h2h',    name:'H2H GG League',        defaultProvider:'inspired', events:5 },
    ]
  },
];

// Per-competition, per-matchtype override state (Level 1, lowest tier)
// key: `${competitionId}:${matchType}` -> providerId | null(inherit)
const MATCHTYPE_DEFAULTS = {
  'sv-premier:prematch':'betradar',   // intentionally unmapped provider to trigger validation demo
  'eb-euroleague:inplay':'betgenious',
};

// ---- GTH mapping status per (provider, sport/competition) ------------
// Determines whether a provider can legally be chosen as default at a given node.
const UNMAPPED_PROVIDER_HIERARCHY = new Set([
  'betradar:sv-premier',      // BetRadar not mapped for Virtual Premier League
  'betradar:sv-premier:prematch',
  'highlight:eb-lnb',
  'inspired:cr-cpl',
]);

function isMapped(providerId, competitionId, matchType){
  if (!providerId) return true;
  if (UNMAPPED_PROVIDER_HIERARCHY.has(`${providerId}:${competitionId}`)) return false;
  if (matchType && UNMAPPED_PROVIDER_HIERARCHY.has(`${providerId}:${competitionId}:${matchType}`)) return false;
  return true;
}

// ---- Events (Level 2) --------------------------------------------------
// Overrides are independent per match type (Pre-Match / In-Play), per the PRD.
// The "effective" provider for either slot is always computed live from the
// Level-1 hierarchy unless an override exists for that specific slot —
// see effectiveEventProvider() in app.js. Nothing here stores a redundant
// "current provider" that could drift from the hierarchy.
const now = new Date('2026-08-11T14:00:00Z');
function hoursFromNow(h){ return new Date(now.getTime()+h*3600*1000); }

const EVENTS = [
  { id:'EVT-10234', sport:'soccer', competition:'sv-premier', name:'Racing FC vs Union City', start:hoursFromNow(-2), status:'in-play', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-10235', sport:'soccer', competition:'sv-premier', name:'Athletic Bay vs North Rovers', start:hoursFromNow(1), status:'pre-match', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-10240', sport:'soccer', competition:'sv-euro', name:'Iberia SC vs Nordic United', start:hoursFromNow(3), status:'pre-match', overrides:{ prematch:null, inplay:{provider:'betradar', at:'2026-08-10T09:12:00Z', by:'j.alvarez'} } },
  { id:'EVT-20110', sport:'basketball', competition:'eb-euroleague', name:'Real Madrid vs Olympiacos', start:hoursFromNow(-0.5), status:'in-play', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-20111', sport:'basketball', competition:'eb-euroleague', name:'Panathinaikos vs Fenerbahce', start:hoursFromNow(5), status:'pre-match', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-20130', sport:'basketball', competition:'eb-liga-acb', name:'Real Madrid vs Barcelona', start:hoursFromNow(26), status:'pre-match', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-30044', sport:'cricket', competition:'cr-ipl', name:'Mumbai Indians vs Chennai Super Kings', start:hoursFromNow(8), status:'pre-match', overrides:{ prematch:{provider:'betradar', at:'2026-08-09T16:40:00Z', by:'k.nguyen'}, inplay:null } },
  { id:'EVT-30050', sport:'cricket', competition:'cr-bbl', name:'Sydney Sixers vs Perth Scorchers', start:hoursFromNow(-1), status:'in-play', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-30070', sport:'cricket', competition:'cr-cpl', name:'Guyana Warriors vs Trinbago Knights', start:hoursFromNow(30), status:'pre-match', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-40010', sport:'f1', competition:'f1-gp', name:'Belgian Grand Prix — Race', start:hoursFromNow(48), status:'pre-match', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-40011', sport:'f1', competition:'f1-gp', name:'Belgian Grand Prix — Qualifying', start:hoursFromNow(24), status:'pre-match', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-50200', sport:'ebasketball', competition:'eba-esbl', name:'Team Falcon vs Team Vortex', start:hoursFromNow(0.25), status:'in-play', overrides:{ prematch:null, inplay:null } },
  { id:'EVT-50210', sport:'ebasketball', competition:'eba-h2h', name:'ProGamer_X vs NightWolf', start:hoursFromNow(2), status:'pre-match', overrides:{ prematch:null, inplay:null } },
];

// ---- Saved filter presets (Event Overrides) --------------------------
const SAVED_PRESETS = [
  { id:'p1', name:'Live events only', filters:{ sport:'', competition:'', status:'in-play', range:'7', override:'' } },
  { id:'p2', name:'Cricket — next 7d', filters:{ sport:'cricket', competition:'', status:'', range:'7', override:'' } },
  { id:'p3', name:'Overridden events', filters:{ sport:'', competition:'', status:'', range:'30', override:'yes' } },
];

// ---- Provider health / outages (Level 3) --------------------------------
const PROVIDER_HEALTH = {
  betradar:   { status:'operational', uptime30d:99.94 },
  betgenious: { status:'degraded',    uptime30d:98.61 },
  inspired:   { status:'operational', uptime30d:99.88 },
  highlight:  { status:'down',        uptime30d:97.20 },
};

// Per-event automation log — the record of every automated action the
// system has taken (outage fallback, recovery, gap-coverage top-up).
// Replaces the old "Blending Rules" tab, which only showed a static
// snapshot with nothing to search or filter.
const AUTOMATION_LOG = [
  { id:1, ts:'2026-08-11T12:40:00Z', type:'outage',    provider:'highlight',  sport:'ebasketball', competition:'eBasketball Battle', text:'Highlight feed unresponsive for eBasketball Battle — outage declared.' },
  { id:2, ts:'2026-08-11T12:41:00Z', type:'fallback',  provider:'inspired',   sport:'ebasketball', competition:'eBasketball Battle', text:'Fallback activated: Inspired now serving eBasketball Battle in-play pricing.' },
  { id:3, ts:'2026-08-11T09:15:00Z', type:'degraded',  provider:'betgenious', sport:'cricket',     competition:'Indian Premier League', text:'BetGenious latency elevated (avg 640ms) for Indian Premier League.' },
  { id:4, ts:'2026-08-10T22:03:00Z', type:'recovered', provider:'betgenious', sport:'basketball',  competition:'EuroLeague', text:'BetGenious recovered for EuroLeague — traffic reverted to default.' },
  { id:5, ts:'2026-08-10T18:27:00Z', type:'outage',    provider:'betgenious', sport:'basketball',  competition:'EuroLeague', text:'BetGenious outage detected for EuroLeague in-play pricing.' },
  { id:6, ts:'2026-08-09T07:52:00Z', type:'gap-fill',  provider:'betradar',   sport:'soccer',      competition:'Virtual Euro Cup', text:'Gap coverage: BetRadar supplementing 3 markets missing from Inspired on Virtual Euro Cup.' },
  { id:7, ts:'2026-08-08T14:10:00Z', type:'outage',    provider:'highlight',  sport:'f1',          competition:'Formula 2', text:'Highlight outage — Formula 2 pre-match feed down for 11 minutes.' },
  { id:8, ts:'2026-08-08T14:21:00Z', type:'recovered', provider:'highlight',  sport:'f1',          competition:'Formula 2', text:'Highlight recovered — Formula 2 feed restored.' },
];

const BLENDING_RULES = [
  { sport:'ebasketball', competition:'eBasketball Battle', default:'highlight', blend:[{provider:'inspired', reason:'Outage fallback — in-play pricing', scope:'In-Play'}] },
  { sport:'soccer', competition:'Virtual Euro Cup', default:'highlight', blend:[{provider:'betradar', reason:'Gap coverage — markets 4, 5, 6', scope:'Markets'}] },
  { sport:'basketball', competition:'EuroLeague', default:'betradar', blend:[{provider:'betgenious', reason:'Dynamic pricing — in-play only (BetRadar has no in-play feed for this comp)', scope:'In-Play pricing'}] },
  { sport:'cricket', competition:'Big Bash League', default:'betradar', blend:[] },
];

const COVERAGE = [
  { provider:'betradar', pct:74, servedEvents:31, assignedEvents:42 },
  { provider:'betgenious', pct:61, servedEvents:19, assignedEvents:31 },
  { provider:'inspired', pct:88, servedEvents:22, assignedEvents:25 },
  { provider:'highlight', pct:52, servedEvents:11, assignedEvents:21 },
];
const COVERAGE_GAPS = [
  { sport:'Cricket', competition:'Caribbean Premier League', issue:'2 events with no provider offering in-play pricing', severity:'warning' },
  { sport:'eBasketball', competition:'eBasketball Battle', issue:'1 market group (Player Props) uncovered by any mapped provider', severity:'error' },
];

// ---- GTH Provider Mappings — unified model -----------------------------
// One record per (provider, sport/competition[, market type]) pairing.
// status: 'suggested' (AI match pending a decision) | 'active' (confirmed)
//       | 'unmapped' (no suggestion yet) | 'rejected' (explicitly Do Not Map)
// level: 'competition' | 'marketType'
// suggestion / gth reference GTH sport+competition ids (+ marketType label)
// so display names are always looked up live, never duplicated as strings.
let GTH_MAPPINGS = [
  // -- Suggested (AI match pending accept / change / reject) --
  { id:'m1', level:'competition', provider:'betradar', providerSport:'Soccer Virtuals', providerCompetition:'Virtual Premier League', providerMarketType:null,
    suggestion:{ sportId:'soccer', competitionId:'sv-premier', marketType:null, confidence:96 }, status:'suggested' },
  { id:'m2', level:'marketType', provider:'betradar', providerSport:'Soccer Virtuals', providerCompetition:'Virtual Premier League', providerMarketType:'Pre-Match',
    suggestion:{ sportId:'soccer', competitionId:'sv-premier', marketType:'Pre-Match', confidence:91 }, status:'suggested' },
  { id:'m3', level:'competition', provider:'highlight', providerSport:'European Basketball', providerCompetition:'LNB Pro A', providerMarketType:null,
    suggestion:{ sportId:'basketball', competitionId:'eb-lnb', marketType:null, confidence:88 }, status:'suggested' },
  { id:'m4', level:'competition', provider:'inspired', providerSport:'Cricket', providerCompetition:'Caribbean Premier League T20', providerMarketType:null,
    suggestion:{ sportId:'cricket', competitionId:'cr-cpl', marketType:null, confidence:73 }, status:'suggested' },
  { id:'m5', level:'marketType', provider:'betgenious', providerSport:'European Basketball', providerCompetition:'EuroCup', providerMarketType:'In-Play',
    suggestion:{ sportId:'basketball', competitionId:'eb-eurocup', marketType:'In-Play', confidence:82 }, status:'suggested' },

  // -- Active — competitions --
  { id:'m6', level:'competition', provider:'betradar', providerSport:'European Basketball', providerCompetition:'EuroLeague', providerMarketType:null,
    gth:{ sportId:'basketball', competitionId:'eb-euroleague', marketType:null }, status:'active', updated:'2026-07-28', by:'m.tato' },
  { id:'m7', level:'competition', provider:'betradar', providerSport:'Cricket', providerCompetition:'Big Bash League', providerMarketType:null,
    gth:{ sportId:'cricket', competitionId:'cr-bbl', marketType:null }, status:'active', updated:'2026-07-20', by:'m.tato' },
  { id:'m8', level:'competition', provider:'betgenious', providerSport:'European Basketball', providerCompetition:'Liga ACB', providerMarketType:null,
    gth:{ sportId:'basketball', competitionId:'eb-liga-acb', marketType:null }, status:'active', updated:'2026-06-30', by:'j.alvarez' },
  { id:'m9', level:'competition', provider:'betgenious', providerSport:'Cricket', providerCompetition:'Indian T20 League', providerMarketType:null,
    gth:{ sportId:'cricket', competitionId:'cr-ipl', marketType:null }, status:'active', updated:'2026-06-30', by:'j.alvarez' },
  { id:'m10', level:'competition', provider:'inspired', providerSport:'Soccer Virtuals', providerCompetition:'VPL', providerMarketType:null,
    gth:{ sportId:'soccer', competitionId:'sv-premier', marketType:null }, status:'active', updated:'2026-05-14', by:'k.nguyen' },
  { id:'m11', level:'competition', provider:'inspired', providerSport:'eBasketball', providerCompetition:'H2H GG League', providerMarketType:null,
    gth:{ sportId:'ebasketball', competitionId:'eba-h2h', marketType:null }, status:'active', updated:'2026-05-14', by:'k.nguyen' },
  { id:'m12', level:'competition', provider:'highlight', providerSport:'Soccer Virtuals', providerCompetition:'Euro Cup Virtual', providerMarketType:null,
    gth:{ sportId:'soccer', competitionId:'sv-euro', marketType:null }, status:'active', updated:'2026-04-02', by:'m.tato' },
  { id:'m13', level:'competition', provider:'highlight', providerSport:'F1', providerCompetition:'Formula 2', providerMarketType:null,
    gth:{ sportId:'f1', competitionId:'f1-f2', marketType:null }, status:'active', updated:'2026-04-02', by:'m.tato' },

  // -- Active — market types --
  { id:'m14', level:'marketType', provider:'betradar', providerSport:'European Basketball', providerCompetition:'EuroLeague', providerMarketType:'In-Play',
    gth:{ sportId:'basketball', competitionId:'eb-euroleague', marketType:'In-Play' }, status:'active', updated:'2026-07-28', by:'m.tato' },
  { id:'m15', level:'marketType', provider:'highlight', providerSport:'F1', providerCompetition:'Formula 2', providerMarketType:'Pre-Match',
    gth:{ sportId:'f1', competitionId:'f1-f2', marketType:'Pre-Match' }, status:'active', updated:'2026-04-02', by:'m.tato' },

  // -- Unmapped (no AI suggestion) --
  { id:'m16', level:'competition', provider:'betgenious', providerSport:'eBasketball', providerCompetition:'2K25 Global League', providerMarketType:null,
    status:'unmapped' },
  { id:'m17', level:'marketType', provider:'inspired', providerSport:'Cricket', providerCompetition:'T20 Internationals', providerMarketType:'In-Play',
    status:'unmapped' },

  // -- Rejected (Do Not Map) --
  { id:'m18', level:'competition', provider:'betgenious', providerSport:'Soccer Virtuals', providerCompetition:'Legacy 5-a-side', providerMarketType:null,
    status:'rejected', rejectReason:'Deprecated', by:'m.tato', updated:'2026-03-11' },
  { id:'m19', level:'competition', provider:'inspired', providerSport:'F1', providerCompetition:'F1 Esports Series', providerMarketType:null,
    status:'rejected', rejectReason:'Out of Scope', by:'k.nguyen', updated:'2026-02-27' },
];

// Clears the corresponding isMapped() gate when a mapping is confirmed/accepted.
function markMapped(provider, competitionId, marketType){
  if (!competitionId) return;
  UNMAPPED_PROVIDER_HIERARCHY.delete(`${provider}:${competitionId}`);
  if (marketType) UNMAPPED_PROVIDER_HIERARCHY.delete(`${provider}:${competitionId}:${marketType==='Pre-Match'?'prematch':'inplay'}`);
}

// ---- Analytics ------------------------------------------------------------
const ANALYTICS_SUMMARY = {
  betradar:   { revenue:1284500, bets:184320, coveragePct:74, uptimePct:99.94, latencyMs:112, marginPct:6.8 },
  betgenious: { revenue:842100,  bets:121870, coveragePct:61, uptimePct:98.61, latencyMs:187, marginPct:5.9 },
  inspired:   { revenue:1509800, bets:266410, coveragePct:88, uptimePct:99.88, latencyMs:96,  marginPct:7.4 },
  highlight:  { revenue:601200,  bets:98230,  coveragePct:52, uptimePct:97.20, latencyMs:214, marginPct:5.1 },
};

const REVENUE_TIMESERIES = { // last 14 days, per provider (index 0 = 14 days ago)
  betradar:   [78,82,80,91,88,95,101,97,104,110,99,108,115,112],
  betgenious: [61,58,63,55,60,57,52,59,63,58,61,64,60,58],
  inspired:   [95,101,99,108,112,118,121,119,126,131,128,134,138,141],
  highlight:  [48,45,50,44,41,38,43,40,37,35,39,33,30,32],
};

// ---- Audit log -------------------------------------------------------------
const AUDIT_LOG = [
  { ts:'2026-08-11T09:12:00Z', user:'m.tato', area:'Level 1 — Blending Config', action:'Set default provider', detail:'Cricket → Big Bash League: (unset) → BetRadar' },
  { ts:'2026-08-10T09:12:00Z', user:'j.alvarez', area:'Level 2 — Event Overrides', action:'Override applied', detail:'EVT-10240: In-Play Highlight → BetRadar' },
  { ts:'2026-08-09T16:40:00Z', user:'k.nguyen', area:'Level 2 — Event Overrides', action:'Override applied', detail:'EVT-30044: Pre-Match BetGenious → BetRadar' },
  { ts:'2026-08-08T11:05:00Z', user:'m.tato', area:'Provider Mappings', action:'Mapping confirmed', detail:'Highlight → F1 → Formula 2 mapped to F1 → Formula 2 (AI suggested, accepted)' },
  { ts:'2026-08-07T15:44:00Z', user:'k.nguyen', area:'Provider Mappings', action:'Mapping rejected', detail:'Inspired → F1 Esports Series marked Do Not Map (Out of Scope)' },
  { ts:'2026-08-06T13:02:00Z', user:'m.tato', area:'Level 1 — Blending Config', action:'Default provider changed', detail:'eBasketball (Sport level): Inspired → Highlight' },
  { ts:'2026-08-05T10:18:00Z', user:'j.alvarez', area:'Level 2 — Event Overrides', action:'Override removed', detail:'EVT-20095 override cleared, reverted to inherited default' },
];

const AI_SUGGESTIONS = [
  'Set BetRadar as default for Tennis',
  'Show unmapped items for BetGenious',
  'What’s the uptime % for Inspired last month?',
  'Override EVT-30070 to use BetRadar for in-play',
];

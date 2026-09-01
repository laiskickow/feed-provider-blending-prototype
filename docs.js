/* ============================================================
   DOCUMENTATION PANEL CONTENT
   Shown in-page (no navigation) via the header "Documentation" button.
   Single source of truth the panel renders from — update DOC_SECTIONS
   whenever features change.
   ============================================================ */

const DOC_LAST_UPDATED = '1 Sep 2026';

const DOC_SECTIONS = [
  {
    title: 'What this is',
    body: [
      'A mocked, click-through UI for the Fit Provider Platform — one place to manage provider mappings, blending configuration and temporary overrides, replacing the separate BMT tool. Used to validate structure and logic with users before any backend is built.',
      'All data on screen is fabricated. Nothing here is connected to a real feed provider, GTH, or bet stream.',
      'Built to the Ivory Design System (Flutter GST) — dense, trader-oriented, speed over whitespace; light + dark.',
    ]
  },
  {
    title: 'Blending Configuration',
    screen: 'Blending',
    body: [
      'Provider cascade: <b>Global → Sport → Group → Competition</b>, with per-market overrides at the most granular level. The most specific level that has a value set wins; unconfigured levels inherit upward (shown as “↑ provider”).',
      'Every level sets a <b>Primary</b> provider independently for <b>Pre-Match</b> and <b>In-Play</b> (a Secondary provider gap-fills markets the Primary doesn’t cover).',
      'Group / tier templates (per sport) cascade defaults across many competitions; a competition can still override its group. Create/edit groups from the “New group” CTA (top of each sport) and the group side-drawer.',
      'Rows are read-only by default; the edit (pencil) action in the Actions column reveals the provider selects for that node. The Config column shows whether each value is a Default or an Override.',
      '“Add override”: an action-column icon on any Sport/Group/Competition opens a side drawer to multi-select market types for that layer and set their Pre-Match / In-Play providers in one go.',
      'Changes are staged and applied via the Review & Save bar. Saving is gated on GTH mapping — an unmapped provider is flagged with a link into Provider Mappings.',
    ]
  },
  {
    title: 'Overrides',
    screen: 'Overrides',
    body: [
      'Temporary provider overrides for edge cases; they take priority over Blending defaults until removed or expired.',
      'Provider status: a compact switch per provider for quick suspend / resume (with live health badges — Operational / Degraded / Down).',
      'Create Override: choose a Sport, then all target options appear at once — pick any Competitions, Events, and/or Market types, set Pre-Match / In-Play providers, an optional expiry and a note. Scope is inferred from what you select (market types → market, else events → event, else competitions → competition). No separate scope step.',
      'Overrides list supports search + filters, edit and remove, and shows scope, phase, provider, expiry and who created it.',
    ]
  },
  {
    title: 'Provider Mappings (GTH)',
    screen: 'Mappings',
    body: [
      'Maps each provider’s own hierarchy (sport / competition / market type) to the internal GTH hierarchy. An item cannot be used as a default or in blending until mapped.',
      'Suggestions panel (top): items with an AI-suggested GTH match — Accept, Change (manual search), or Reject with a reason.',
      'One merged <b>Mappings</b> table: a button group filters <b>All</b> vs <b>Unmapped</b>; Competition vs Market Type is the filterable <b>Type</b> column. Structured, sortable, filterable, exportable feed→GTH columns with an Active / Unmapped / Rejected status.',
      '<b>Coverage Gaps</b> is its own tab — the full, dated list of gaps (missing in-play pricing, uncovered market groups, stale odds, etc.), also surfaced in the header bell count.',
      '<b>Market Type ≠ Match Type.</b> Match Type (Pre-Match / In-Play) is the timing dimension in Blending. Market Type is the bet type — e.g. “Match Odds”, “Race Winner” — and is sport-specific; a provider’s own name maps once per sport to GTH’s canonical name.',
    ]
  },
  {
    title: 'Analytics',
    screen: 'Analytics',
    body: [
      'Per-provider gross revenue, bet volume, market coverage %, uptime %, latency and margin impact, with revenue-trend and volume charts.',
      'Sport / brand / date-range filters, provider filter chips, comparison mode and CSV export.',
      'Read-only. In the wider platform plan this is a Phase-2 surface (it needs bet-stream data tagged with the active provider); kept live here for review.',
    ]
  },
  {
    title: 'Audit Log',
    screen: 'Audit Log',
    body: [
      'Every configuration change across the platform — user, timestamp and detail — filterable by area and user, exportable.',
      'Also carries the Automation Log: the history of system-driven actions (outage fallback, provider recovery, gap coverage).',
    ]
  },
  {
    title: 'AI Assistant',
    screen: 'available on every screen (bottom-right)',
    body: [
      'Natural-language configuration and queries; confirms the exact change before applying, and links back to the relevant screen.',
      'A scripted demo (pattern-matched phrasing), not a real LLM integration — it validates the interaction flow only.',
    ]
  },
  {
    title: 'Phase 2 — not built yet',
    body: [
      'Provider Analytics as an official product surface (needs provider-tagged bet-stream data and a fair-comparison method for asymmetric active time).',
      'Settlement controls (block/freeze settlement per provider / event / globally) and settlement conflict detection.',
    ]
  },
  {
    title: 'Change log',
    body: [
      '1 Sep 2026 (latest) — Removed the inline coverage-gap warning rows from the merged Mappings table (gaps now live only in the Coverage Gaps tab). Renamed Blending’s “Add market override” to “Add override”. Create Override dropped the Scope step — after picking a sport, all target options (competitions, events, market types) appear and scope is inferred. Documentation refreshed to match.',
      'Aug 2026 — Rebuilt to the Fit Provider Platform cascade (Global → Sport → Group → Competition → Market) with Primary/Secondary blending and independent Pre-Match/In-Play at every level; added group/tier templates. Overrides redesigned (provider-status switches, batch Create Override, cards). Mappings merged Active + Unmapped into one table with an All/Unmapped filter and a Type column; Coverage Gaps became its own tab. Monitoring split — provider status moved to Overrides, coverage gaps to Mappings, and the view is now Analytics-only; the Automation Log moved under Audit Log. New GTThub header + 5-tab shell (Blending · Overrides · Mappings · Analytics · Audit Log).',
      'Jul–Aug 2026 (earlier) — Initial mocked prototype covering the original PRD areas (Sport→Competition→Phase defaults, per-event overrides, provider mappings, analytics, audit trail).',
    ]
  },
];

function renderDocsPanel(){
  const el = document.getElementById('docs-body');
  if (!el) return;
  el.innerHTML = `<div class="muted" style="font-size:11px;margin-bottom:12px;">Last updated ${DOC_LAST_UPDATED}</div>` +
    DOC_SECTIONS.map(s => `
      <div style="margin-bottom:18px;">
        <h4 style="font-size:13px;margin-bottom:4px;">${s.title}${s.screen?` <span class="muted" style="font-weight:400;font-size:11px;">— ${s.screen}</span>`:''}</h4>
        <ul style="margin:0;padding-left:18px;">
          ${s.body.map(b=>`<li style="font-size:12px;line-height:1.5;margin-bottom:4px;">${b}</li>`).join('')}
        </ul>
      </div>
    `).join('');
}

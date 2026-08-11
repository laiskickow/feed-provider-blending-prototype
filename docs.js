/* ============================================================
   DOCUMENTATION PANEL CONTENT
   Shown in-page (no navigation) via the header "Documentation" button.
   Mirrors the PRD section-by-section, plus what this prototype adds
   beyond it. Update DOC_SECTIONS whenever requirements/features change —
   this is the single source of truth the panel renders from.
   ============================================================ */

const DOC_LAST_UPDATED = '11 Aug 2026';

const DOC_SECTIONS = [
  {
    title: 'What this is',
    body: [
      'A mocked, click-through UI for the Feed Provider Blending & Integration Platform PRD — used to validate structure and logic with users before any backend is built.',
      'All data on screen is fabricated. Nothing here is connected to a real feed provider, GTH, or bet stream.',
      'Built to the Ivory Design System (Flutter GST) — dense, trader-oriented, speed over whitespace.',
    ]
  },
  {
    title: 'Level 1 — Default Provider Configuration',
    screen: 'Blending Configuration',
    body: [
      'Configure a default provider at Sport → Competition → Pre-Match/In-Play. The lowest configured level wins; unconfigured levels inherit upward.',
      'New events under a configured node auto-assign to that provider (simulated).',
      'Blocking validation: saving is refused if the chosen provider isn’t fully GTH-mapped for that node, with a direct link into Provider Mappings to resolve it.',
    ]
  },
  {
    title: 'Level 2 — Per-Event Provider Overrides',
    screen: 'Event Overrides',
    body: [
      'Search/filter Pre-Match and In-Play events by sport, competition, status, time range and override state.',
      'Override Pre-Match and In-Play independently per event; overrides persist across status transitions until cleared.',
      'A provider not mapped to a competition can still be applied as an override, but is flagged as a conflict rather than blocked outright — a deliberate difference from Level 1’s hard block, since overrides are a fast, per-event escape hatch.',
    ]
  },
  {
    title: 'Level 3 — Automated Actions (read-only)',
    screen: 'Automated Actions',
    body: [
      'System-driven behaviour, not user-configurable here: outage fallback, gap coverage, and dynamic pricing blending.',
      'Automation Log: a searchable/filterable history of every automated action taken, per event/competition (outage triggered, fallback activated, recovered, gap coverage added).',
      'Provider Health: live status (Operational/Degraded/Down) and 30-day uptime per provider.',
      'Coverage Dashboard: % of assigned content actually being served per provider, plus known coverage gaps.',
    ]
  },
  {
    title: 'Provider Mappings (GTH)',
    screen: 'Provider Mappings',
    body: [
      'Maps each provider’s own hierarchy (sport/competition/market type) to the internal GTH hierarchy. A provider item cannot be used as a default or in blending until mapped.',
      '"Suggested Maps" — items never mapped, each with an AI-suggested GTH match (competitions and market types together). Accept, change (manual search), or reject with a reason.',
      '"Active Mappings" — confirmed mappings, split into Competitions and Market Types sub-tabs; editable, with history and delete.',
      '"Unmapped" — everything still needing a decision with no usable suggestion, plus previously-rejected items (both can be manually mapped from here).',
      'All mapping tables use structured, sortable, filterable, exportable columns (Provider / Provider Sport / Provider Competition[/ Market Type] / GTH Sport / GTH Competition[/ Market Type]) rather than a single concatenated path string.',
    ]
  },
  {
    title: 'Provider Analytics',
    screen: 'Provider Analytics',
    body: [
      'Gross revenue, bet volume, market coverage %, uptime %, latency, and margin impact, per provider.',
      'Date range presets + custom range, provider filter chips, comparison mode (side-by-side per provider instead of aggregated), CSV export.',
    ]
  },
  {
    title: 'AI Assistant',
    screen: 'available on every screen (bottom-right)',
    body: [
      'Natural-language configuration and queries. Confirms the exact change before applying anything, and links back to the relevant screen afterwards.',
      'This is a scripted demo (pattern-matched phrasing), not a real LLM integration — it exists to validate the interaction flow described in PRD Journey 6.',
    ]
  },
  {
    title: 'Non-functional',
    body: [
      'Audit trail: every configuration change is logged (user, timestamp, before/after) — see the Audit Log screen.',
      'Accessibility / responsiveness / scale targets from the PRD are aspirational for this mock; not something a static prototype can demonstrate.',
    ]
  },
  {
    title: 'Added beyond the PRD',
    body: [
      'This Documentation panel — the PRD didn’t specify how requirements would be communicated to reviewers in-product.',
      'Audit Log screen — the PRD requires an audit trail but never specified a screen for viewing it.',
      'Bulk override (Event Overrides) — apply a provider change to many selected events at once.',
      'Saved filter presets (Event Overrides) — save/re-apply a filter combination.',
      'Context-aware header search — searches the hierarchy tree on Blending Configuration, events by ID/name on Event Overrides.',
      'CSV export on Blending Configuration, Provider Mappings, Analytics and the Audit Log.',
    ]
  },
  {
    title: 'Change log',
    body: [
      '11 Aug 2026 — Documentation panel added. Header search made context-aware. Blending Configuration: added Collapse all + CSV export, moved provider selects next to the sport/competition name, added level icons for tree legibility. Event Overrides: fixed saved presets, added override row highlighting, replaced the override drawer with inline editable cells (drawer kept only for bulk override). Automation & Blending renamed to "Automated Actions"; "Blending Rules" tab replaced by a searchable/filterable Automation Log; duplicate alert list removed from Provider Health. Provider Mappings restructured: renamed tabs (Unmapped → Suggested Maps, Rejected → Unmapped), added Competitions/Market Types sub-tabs to Active Mappings and the new Unmapped tab, replaced bulky cards with dense sortable/filterable/exportable tables with structured columns.',
      '11 Aug 2026 (earlier) — Initial mocked prototype covering all 6 PRD areas.',
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

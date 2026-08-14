/* ============================================================
   APP — Feed Provider Blending & Integration Platform (prototype)
   Vanilla JS, no build step. All writes are in-memory only.
   ============================================================ */

// ic(name, size) — renders a sprite symbol with Ivory stroke scale.
// size must be 12|16|20|24 (maps to .ic-N class with correct stroke-width).
function ic(name, size, extra=''){
  return `<svg class="ic ic-${size}${extra?' '+extra:''}" aria-hidden="true"><use href="#ic-${name}"/></svg>`;
}

// Shorthand aliases kept for readability at call sites
const ICONS = {
  chevron:        ()=> ic('chevron-right', 12, 'chev'),
  check:          ()=> ic('check', 16),
  x:              ()=> ic('x', 16),
  edit:           ()=> ic('square-pen', 16),
  trash:          ()=> ic('trash-2', 16),
  history:        ()=> ic('history', 16),
  alert:          ()=> ic('triangle-alert', 16),
  search:         ()=> ic('search', 16),
  arrowRight:     ()=> ic('arrow-right', 16),
  sportIcon:      ()=> ic('layout-grid', 16, 'style="color:var(--fg-muted)"'),
  competitionIcon:()=> ic('history', 16, 'style="color:var(--fg-muted)"'),
};

function relTime(iso){
  const d = new Date(iso); const diffMs = now - d; const abs = Math.abs(diffMs);
  const mins = Math.round(abs/60000), hrs = Math.round(abs/3600000), days = Math.round(abs/86400000);
  let s;
  if (mins < 60) s = `${mins}m`; else if (hrs < 24) s = `${hrs}h`; else s = `${days}d`;
  return diffMs >= 0 ? `${s} ago` : `in ${s}`;
}
function fmtDate(d){ return new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }
function fmtMoney(n){ return '£' + n.toLocaleString('en-GB',{maximumFractionDigits:0}); }
function fmtNum(n){ return n.toLocaleString('en-GB'); }
function sportName(id){ return SPORTS.find(s=>s.id===id)?.name || id; }
function competitionName(id){ return SPORTS.flatMap(s=>s.competitions).find(c=>c.id===id)?.name || id; }
function sportByCompetitionId(compId){ return SPORTS.find(s=>s.competitions.some(c=>c.id===compId)); }
function providerChip(id, opts={}){
  if (!id) return `<span class="provider-chip inherited">Not set</span>`;
  const p = providerById(id); if(!p) return '';
  const cls = opts.override ? 'provider-chip override' : (opts.inherited ? 'provider-chip inherited' : 'provider-chip');
  return `<span class="${cls}"><span class="swatch" style="background:${p.color}"></span>${p.name}${opts.suffix?` · ${opts.suffix}`:''}</span>`;
}
// Ivory badge for a provider's identity — colour swatch + name.
function providerBadge(id){
  const p = providerById(id); if(!p) return '';
  return `<span class="badge badge-provider"><span class="swatch" style="background:${p.color}"></span>${p.name}</span>`;
}
function statusBadge(status){
  return status === 'in-play'
    ? `<span class="badge badge-inplay">In-Play</span>`
    : `<span class="badge badge-preplay">Pre-Match</span>`;
}
function healthBadge(status){
  const map = { operational:['badge-green','Operational'], degraded:['badge-yellow','Degraded'], down:['badge-red','Down'] };
  const [cls,label] = map[status];
  return `<span class="badge ${cls}"><span class="dot"></span>${label}</span>`;
}
function toast(kind, title, body, ms=4200){
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `<div style="flex:1;"><strong>${title}</strong><p>${body||''}</p></div><span class="toast-close">${ICONS.x()}</span>`;
  el.querySelector('.toast-close').onclick = () => el.remove();
  stack.appendChild(el);
  setTimeout(()=>el.remove(), ms);
}
function openOverlay(id){ document.getElementById(id).classList.add('open'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>closeOverlay(el.dataset.close));
document.addEventListener('click', e=>{
  const dc = e.target.closest('[data-close]');
  if (dc) closeOverlay(dc.dataset.close);
});
document.querySelectorAll('.overlay').forEach(ov=>ov.addEventListener('click', e=>{ if(!e.target.closest('.modal')) closeOverlay(ov.id); }));
function openDrawer(id){ document.getElementById(id).classList.add('open'); }
function closeDrawer(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close-drawer]').forEach(el=>el.onclick=()=>closeDrawer(el.dataset.closeDrawer));

function logAudit(area, action, detail){
  AUDIT_LOG.unshift({ ts:new Date().toISOString(), user:'m.tato', area, action, detail });
  if (document.getElementById('view-audit-log').classList.contains('active')) renderAuditLog();
}

// Generic client-side CSV download — no backend, works straight from the browser.
function downloadCSV(filename, headers, rows){
  const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map(r=>r.map(esc).join(','))].join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Builds "Sport → Competition → Market Type" style breadcrumbs, skipping
// whichever segments don't apply (e.g. market-type mappings have no
// competition since that mapping is sport-wide, not per-competition).
function providerPathLabel(rec){
  return [rec.providerSport, rec.providerCompetition, rec.providerMarketType].filter(Boolean).join(' → ');
}
function gthPathLabel(g){
  if (!g) return '—';
  return [sportName(g.sportId), g.competitionId ? competitionName(g.competitionId) : null, g.marketType].filter(Boolean).join(' → ');
}

/* ============================================================
   SHARED: "not mapped to GTH" warning — rich tooltip + fix-it link
   ============================================================ */
function mapWarningHtml(providerId, sportId, competitionId, matchType){
  const provider = providerById(providerId);
  const providerLabel = provider ? provider.name : 'This provider';
  const compName = competitionId ? competitionName(competitionId) : null;
  const mtLabel = matchType ? (matchType === 'prematch' ? 'Pre-Match' : 'In-Play') : null;
  const scopeLabel = [compName, mtLabel].filter(Boolean).join(' — ') || sportName(sportId);
  const mtArg = matchType ? `'${matchType}'` : 'null';
  const compArg = competitionId ? `'${competitionId}'` : 'null';
  return `<span class="map-warning">
    ${ic('triangle-alert', 16, 'map-warning__icon')}
    <div class="map-tooltip">
      <strong>Not mapped to GTH</strong>
      <p>${providerLabel} isn't mapped to <b>${scopeLabel}</b> in the internal hierarchy — it can't be used here until that's resolved.</p>
      <a onclick="event.stopPropagation(); goToMappingFor('${providerId}','${sportId}',${compArg},${mtArg})">Fix this mapping →</a>
    </div>
  </span>`;
}
// Jumps to Provider Mappings, lands on the right tab/sub-tab, and filters
// straight to the record that explains (and fixes) a given warning.
// Match Type (Pre-Match/In-Play) gaps are resolved via the Competition-level
// mapping — Market Type (bet-type) mappings are a separate, sport-wide
// concern and don't affect this gate — so this always routes to the
// competition record regardless of which match type triggered the warning.
function goToMappingFor(providerId, sportId, competitionId, matchType){
  const rec = GTH_MAPPINGS.find(m=> m.provider === providerId && m.status === 'suggested' && m.level === 'competition' && m.suggestion.competitionId === competitionId);
  goToView('mappings');
  if (rec){
    const state = getTableState('suggested');
    state.text = competitionId ? competitionName(competitionId) : sportName(sportId);
    state.provider = providerId;
    document.getElementById('sugg-search').value = state.text;
    document.getElementById('sugg-provider').value = providerId;
    renderSuggestedTab();
    document.getElementById('mappings-suggestions').scrollIntoView({behavior:'smooth', block:'nearest'});
  } else {
    document.querySelector('#view-mappings .tab[data-tab="unmapped"]').click();
    setMappingLevel('unmapped','competition');
    const state = getTableState('unmapped-competitions');
    state.colFilters = state.colFilters || {};
    state.colFilters.providerSport = sportName(sportId);
    state.colFilters.providerCompetition = competitionId ? competitionName(competitionId) : '';
    renderUnmappedCompTab();
  }
}

/* ============================================================
   NAV / VIEW SWITCHING + CONTEXT-AWARE HEADER SEARCH
   ============================================================ */
const VIEW_LABELS = {
  'blending-config':'Blending Configuration', 'event-overrides':'Event Overrides',
  'mappings':'Provider Mappings', 'monitoring':'Monitoring', 'audit-log':'Audit Log'
};
let currentView = 'blending-config';
let bcSearchQuery = '';
let eoSearchQuery = '';
function goToView(view){
  if (!VIEW_LABELS[view]) return;
  currentView = view;
  document.querySelectorAll('.ivory-tab[data-view]').forEach(t=>{
    const on = t.dataset.view === view;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll('.main > .view').forEach(v=>{
    v.classList.remove('active'); v.setAttribute('aria-hidden', 'true');
  });
  const panel = document.getElementById('view-'+view);
  panel.classList.add('active'); panel.removeAttribute('aria-hidden');
  document.getElementById('ai-context').textContent = 'Context: ' + VIEW_LABELS[view];
  if (view === 'audit-log') renderAuditLog();
  document.querySelector('.main').scrollTop = 0;
}
// In-content search — each view owns a [data-search] input in its toolbar.
// Delegated from .main so it survives every re-render and needs no per-view wiring.
document.querySelector('.main').addEventListener('input', e=>{
  const box = e.target.closest('[data-search]');
  if (!box) return;
  if (box.dataset.search === 'blending'){ bcSearchQuery = box.value; bcSuppressAutoExpand = false; renderHierarchyTree(); }
  else if (box.dataset.search === 'overrides'){ eoSearchQuery = box.value; renderOverridesList(); }
});
// WAI-ARIA tablist: click + roving Arrow/Home/End keyboard (auto-activating pattern)
(function(){
  const tablist = document.querySelector('[role="tablist"].ivory-tabs');
  if (!tablist) return;
  tablist.addEventListener('click', e=>{
    const tab = e.target.closest('.ivory-tab[data-view]');
    if (tab) goToView(tab.dataset.view);
  });
  tablist.addEventListener('keydown', e=>{
    const tabs = [...tablist.querySelectorAll('.ivory-tab[data-view]')];
    const idx = tabs.findIndex(t=>t===document.activeElement);
    if (idx < 0) return;
    let next = idx;
    if      (e.key==='ArrowRight') next = (idx+1) % tabs.length;
    else if (e.key==='ArrowLeft')  next = (idx-1+tabs.length) % tabs.length;
    else if (e.key==='Home')       next = 0;
    else if (e.key==='End')        next = tabs.length-1;
    else return;
    e.preventDefault(); tabs[next].focus(); goToView(tabs[next].dataset.view);
  });
})();
// Sub-tabs inside content panels — delegated from .main so they never interfere with the nav tablist
document.querySelector('.main').addEventListener('click', e=>{
  const tab = e.target.closest('.tabs .tab');
  if (!tab) return;
  e.stopPropagation();
  const tabbar = tab.closest('.tabs');
  tabbar.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  tab.classList.add('active');
  const panelWrap = tabbar.parentElement;
  panelWrap.querySelectorAll(':scope > .tab-panel').forEach(p=>p.classList.remove('active'));
  panelWrap.querySelector('#tab-'+tab.dataset.tab).classList.add('active');
});

/* Theme toggle */
document.getElementById('theme-toggle').addEventListener('click', ()=>{
  const html = document.documentElement;
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  renderRevenueChart(); renderBetsChart(); // re-render svg charts w/ theme-aware colors
});

document.getElementById('notif-btn').addEventListener('click', ()=> goToView('mappings'));

/* Documentation panel */
document.getElementById('docs-btn').addEventListener('click', ()=>{ renderDocsPanel(); document.getElementById('docs-panel').classList.add('open'); });
document.getElementById('docs-close').addEventListener('click', ()=> document.getElementById('docs-panel').classList.remove('open'));

/* ============================================================
   LEVEL 1 — BLENDING CONFIGURATION (hierarchy tree)
   Full cascade: Global → Sport → Group → Competition → Market Type
   Phase (prematch/inplay) resolved independently at every level.
   Secondary (gap-fill) provider at every level.
   ============================================================ */
const pendingHierarchy = {};
const openTreeNodes = new Set();
let bcProviderFilter = '';
let bcSuppressAutoExpand = false;

function sourceLabel(src){
  if (src==='own') return 'Explicit';
  if (src==='global') return '↑ Global';
  if (src==='sport') return '↑ Sport';
  if (src==='group') return '↑ Group';
  if (src==='competition') return '↑ Comp';
  return '';
}

// --- Cascade resolver ---------------------------------------------------
// Walks: Competition → Group → Sport → Global for a given phase.
// pendingHierarchy keys: `global:${phase}`, `sport:${sportId}:${phase}`,
//   `group:${groupId}:${phase}`, `comp:${compId}:${phase}`, `secondary:${level}:${id}`
// Returns { value, source }

function pendingOr(key, committed){ return (key in pendingHierarchy) ? pendingHierarchy[key] : committed; }

function resolveProvider(sportId, compId, phase){
  const comp = SPORTS.flatMap(s=>s.competitions).find(c=>c.id===compId);
  const sport = SPORTS.find(s=>s.id===sportId);
  const group = groupForCompetition(compId);
  const compVal = pendingOr(`comp:${compId}:${phase}`, comp[phase]);
  if (compVal) return { value:compVal, source:'own' };
  if (group){
    const grpVal = pendingOr(`group:${group.id}:${phase}`, group[phase]);
    if (grpVal) return { value:grpVal, source:'group' };
  }
  const sportVal = pendingOr(`sport:${sportId}:${phase}`, sport[phase]);
  if (sportVal) return { value:sportVal, source:'sport' };
  const globalVal = pendingOr(`global:${phase}`, GLOBAL_DEFAULT[phase]);
  return { value:globalVal, source:'global' };
}

function resolveSecondary(sportId, compId){
  const comp = SPORTS.flatMap(s=>s.competitions).find(c=>c.id===compId);
  const sport = SPORTS.find(s=>s.id===sportId);
  const group = groupForCompetition(compId);
  const compVal = pendingOr(`secondary:comp:${compId}`, comp.secondary);
  if (compVal) return { value:compVal, source:'own' };
  if (group){
    const grpVal = pendingOr(`secondary:group:${group.id}`, group.secondary);
    if (grpVal) return { value:grpVal, source:'group' };
  }
  const sportVal = pendingOr(`secondary:sport:${sportId}`, sport.secondary);
  if (sportVal) return { value:sportVal, source:'sport' };
  const globalVal = pendingOr(`secondary:global`, GLOBAL_DEFAULT.secondary);
  return { value:globalVal, source:'global' };
}

function resolveMarketType(sportId, compId, marketType, phase){
  const key = `${compId}:${marketType}`;
  const mtKey = `mt:${key}:${phase}`;
  const mtVal = pendingOr(mtKey, MARKET_TYPE_DEFAULTS[key]?.[phase] ?? null);
  if (mtVal) return { value:mtVal, source:'own' };
  return resolveProvider(sportId, compId, phase);
}

// Backward-compat wrappers used by effectiveEventProvider and other tabs
function effectiveMatchTypeProvider(sport, comp, matchType){
  return resolveProvider(sport.id, comp.id, matchType);
}
function effectiveCompProvider(sport, comp){
  return resolveProvider(sport.id, comp.id, 'prematch');
}
function compEffectiveProviders(sport, comp){
  return [
    resolveProvider(sport.id, comp.id, 'prematch').value,
    resolveProvider(sport.id, comp.id, 'inplay').value,
    resolveSecondary(sport.id, comp.id).value
  ].filter(Boolean);
}

function providerOptions(selectedId, includeInherit, inheritLabel){
  let html = includeInherit ? `<option value="">${inheritLabel||'Inherit'}</option>` : '';
  PROVIDERS.forEach(p=>{ html += `<option value="${p.id}" ${p.id===selectedId?'selected':''}>${p.name}</option>`; });
  return html;
}
function providerOptionsNullable(selectedId, inheritLabel){
  let html = `<option value="">${inheritLabel||'None (inherit)'}</option>`;
  PROVIDERS.forEach(p=>{ html += `<option value="${p.id}" ${p.id===selectedId?'selected':''}>${p.name}</option>`; });
  return html;
}

function populateProviderFilter(){
  const sel = document.getElementById('bc-provider-filter');
  PROVIDERS.forEach(p=> sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
  sel.addEventListener('change', function(){
    bcProviderFilter = this.value;
    bcSuppressAutoExpand = false;
    document.getElementById('bc-provider-filter-hint').textContent = bcProviderFilter
      ? 'Showing only nodes where this provider is the effective provider, expanded.' : '';
    renderHierarchyTree();
  });
}

// --- Visible tree model (filtered) --------------------------------------
function visibleTreeModel(){
  const q = bcSearchQuery.trim().toLowerCase();
  const pf = bcProviderFilter;
  return SPORTS.flatMap(sport=>{
    const sportTextMatches = !q || sport.name.toLowerCase().includes(q);
    const groups = groupsForSport(sport.id);
    let visibleComps = sport.competitions.filter(c=> sportTextMatches || c.name.toLowerCase().includes(q));
    if (pf) visibleComps = visibleComps.filter(comp=> compEffectiveProviders(sport, comp).includes(pf));
    if ((q || pf) && visibleComps.length===0) return [];
    const visibleGroups = groups.map(g=>({
      group: g,
      comps: visibleComps.filter(c=> g.competitions.includes(c.id))
    })).filter(vg=>vg.comps.length>0);
    const ungrouped = visibleComps.filter(c=> !groups.some(g=>g.competitions.includes(c.id)));
    return [{ sport, visibleGroups, ungrouped }];
  });
}

// --- Helpers for inherit labels ------------------------------------------
function inheritLabel(parentVal, prefix){
  return `Inherit · ${providerById(parentVal)?.name || 'none'}`;
}
function parentProviderForGroup(sport, phase){
  const sportVal = pendingOr(`sport:${sport.id}:${phase}`, sport[phase]);
  if (sportVal) return sportVal;
  return pendingOr(`global:${phase}`, GLOBAL_DEFAULT[phase]);
}
function parentProviderForComp(sport, group, phase){
  if (group){
    const grpVal = pendingOr(`group:${group.id}:${phase}`, group[phase]);
    if (grpVal) return grpVal;
  }
  return parentProviderForGroup(sport, phase);
}
function parentSecondaryForGroup(sport){
  const sportVal = pendingOr(`secondary:sport:${sport.id}`, sport.secondary);
  if (sportVal) return sportVal;
  return pendingOr(`secondary:global`, GLOBAL_DEFAULT.secondary);
}
function parentSecondaryForComp(sport, group){
  if (group){
    const grpVal = pendingOr(`secondary:group:${group.id}`, group.secondary);
    if (grpVal) return grpVal;
  }
  return parentSecondaryForGroup(sport);
}

// --- Render helpers for a single row's 3 provider selects ----------------
function treeRowSelects(keys, values, inheritLabels, isPendingArr){
  return ['prematch','inplay'].map((phase,i)=>`
    <select class="select input-sm" style="width:100%" data-key="${keys[phase]}">
      ${providerOptions(values[phase], !!inheritLabels, inheritLabels?.[phase])}
    </select>`).join('') + `
    <select class="select input-sm" style="width:100%" data-key="${keys.secondary}">
      ${providerOptionsNullable(values.secondary, inheritLabels ? `None · ${providerById(inheritLabels.secondary)?.name||'none'}` : 'None')}
    </select>`;
}

// --- Render the full hierarchy tree --------------------------------------
function renderHierarchyTree(){
  const root = document.getElementById('hierarchy-tree');
  const q = bcSearchQuery.trim().toLowerCase();
  const pf = bcProviderFilter;
  const model = visibleTreeModel();
  const autoExpand = (!!q || !!pf) && !bcSuppressAutoExpand;

  // Global default row
  const globalPre = pendingOr('global:prematch', GLOBAL_DEFAULT.prematch);
  const globalInp = pendingOr('global:inplay', GLOBAL_DEFAULT.inplay);
  const globalSec = pendingOr('secondary:global', GLOBAL_DEFAULT.secondary);
  const globalPending = ['global:prematch','global:inplay','secondary:global'].some(k=>k in pendingHierarchy);
  const globalHtml = `
    <div class="tree-row tree-row--global ${globalPending?'tree-row--pending':''}" style="--depth:1" role="row">
      <div class="tree-row__lead">
        ${ic('globe', 16, 'style="color:var(--fg-muted)"')}
        <span class="name">Global Default</span>
      </div>
      <select class="select input-sm" style="width:100%" data-key="global:prematch">
        ${providerOptions(globalPre, false, '')}
      </select>
      <select class="select input-sm" style="width:100%" data-key="global:inplay">
        ${providerOptions(globalInp, false, '')}
      </select>
      <select class="select input-sm" style="width:100%" data-key="secondary:global">
        ${providerOptionsNullable(globalSec, 'None')}
      </select>
      <div class="tree-cell--source"></div>
      <div class="tree-cell--contains">${SPORTS.length} sport${SPORTS.length===1?'':'s'}</div>
      <div class="tree-cell--gth"></div>
      <div class="tree-cell--state">${globalPending?'<span class="badge badge-yellow">unsaved</span>':''}</div>
    </div>`;

  const sportsHtml = model.map(({sport, visibleGroups, ungrouped})=>{
    const sportPre = pendingOr(`sport:${sport.id}:prematch`, sport.prematch);
    const sportInp = pendingOr(`sport:${sport.id}:inplay`, sport.inplay);
    const sportSec = pendingOr(`secondary:sport:${sport.id}`, sport.secondary);
    const sportPending = [`sport:${sport.id}:prematch`,`sport:${sport.id}:inplay`,`secondary:sport:${sport.id}`].some(k=>k in pendingHierarchy);
    const sportOpen = openTreeNodes.has('sport-'+sport.id) || autoExpand;
    const totalComps = visibleGroups.reduce((n,vg)=>n+vg.comps.length, 0) + ungrouped.length;

    const renderComp = (comp, group, depth) => {
      const effPre = resolveProvider(sport.id, comp.id, 'prematch');
      const effInp = resolveProvider(sport.id, comp.id, 'inplay');
      const compPre = pendingOr(`comp:${comp.id}:prematch`, comp.prematch);
      const compInp = pendingOr(`comp:${comp.id}:inplay`, comp.inplay);
      const compSec = pendingOr(`secondary:comp:${comp.id}`, comp.secondary);
      const compPending = [`comp:${comp.id}:prematch`,`comp:${comp.id}:inplay`,`secondary:comp:${comp.id}`].some(k=>k in pendingHierarchy);
      const preMapped = isMapped(effPre.value, comp.id, 'prematch');
      const inpMapped = isMapped(effInp.value, comp.id, 'inplay');
      const parentPre = parentProviderForComp(sport, group, 'prematch');
      const parentInp = parentProviderForComp(sport, group, 'inplay');
      const parentSec = parentSecondaryForComp(sport, group);
      const bestSource = [effPre.source, effInp.source].includes('own') ? 'Explicit'
        : [effPre.source, effInp.source].includes('group') ? '↑ Group'
        : [effPre.source, effInp.source].includes('sport') ? '↑ Sport' : '↑ Global';

      return `
      <div class="tree-node">
        <div class="tree-row ${compPending?'tree-row--pending':''}"
             style="--depth:${depth}"
             role="row" aria-level="${depth}">
          <div class="tree-row__lead">
            <span class="ic ic-16" style="width:12px"></span>${ICONS.competitionIcon()}
            <span class="name" title="${comp.name}">${comp.name}</span>
          </div>
          <select class="select input-sm" style="width:100%" data-key="comp:${comp.id}:prematch">
            ${providerOptions(compPre, true, inheritLabel(parentPre))}
          </select>
          <select class="select input-sm" style="width:100%" data-key="comp:${comp.id}:inplay">
            ${providerOptions(compInp, true, inheritLabel(parentInp))}
          </select>
          <select class="select input-sm" style="width:100%" data-key="secondary:comp:${comp.id}">
            ${providerOptionsNullable(compSec, `Inherit · ${providerById(parentSec)?.name||'none'}`)}
          </select>
          <div class="tree-cell--source">${bestSource}</div>
          <div class="tree-cell--contains">${comp.events} event${comp.events===1?'':'s'}</div>
          <div class="tree-cell--gth">${!preMapped?mapWarningHtml(effPre.value, sport.id, comp.id, 'prematch'):(!inpMapped?mapWarningHtml(effInp.value, sport.id, comp.id, 'inplay'):'')}</div>
          <div class="tree-cell--state">${compPending?'<span class="badge badge-yellow">unsaved</span>':''}</div>
        </div>
      </div>`;
    };

    const groupsHtml = visibleGroups.map(({group, comps})=>{
      const grpPre = pendingOr(`group:${group.id}:prematch`, group.prematch);
      const grpInp = pendingOr(`group:${group.id}:inplay`, group.inplay);
      const grpSec = pendingOr(`secondary:group:${group.id}`, group.secondary);
      const grpPending = [`group:${group.id}:prematch`,`group:${group.id}:inplay`,`secondary:group:${group.id}`].some(k=>k in pendingHierarchy);
      const grpOpen = openTreeNodes.has('group-'+group.id) || autoExpand;
      const parentPre = parentProviderForGroup(sport, 'prematch');
      const parentInp = parentProviderForGroup(sport, 'inplay');
      const parentSec = parentSecondaryForGroup(sport);
      const effSrc = [grpPre?'own':null, grpInp?'own':null].some(Boolean) ? 'Explicit' : '↑ Sport';

      return `
      <div class="tree-node">
        <div class="tree-row tree-row--group ${grpOpen?'open':''} ${grpPending?'tree-row--pending':''}"
             data-toggle="group-${group.id}" style="--depth:2"
             role="row" aria-level="2" aria-expanded="${grpOpen}">
          <div class="tree-row__lead">
            ${ICONS.chevron()}${ic('layers', 16, 'style="color:var(--fg-muted)"')}
            <span class="name" title="${group.name}">${group.name}</span>
            <span class="icon-btn" style="width:20px;height:20px;margin-left:2px;" onclick="event.stopPropagation();openGroupDrawer('${group.id}')" title="Edit group">${ICONS.edit()}</span>
          </div>
          <select class="select input-sm" style="width:100%" data-key="group:${group.id}:prematch">
            ${providerOptions(grpPre, true, inheritLabel(parentPre))}
          </select>
          <select class="select input-sm" style="width:100%" data-key="group:${group.id}:inplay">
            ${providerOptions(grpInp, true, inheritLabel(parentInp))}
          </select>
          <select class="select input-sm" style="width:100%" data-key="secondary:group:${group.id}">
            ${providerOptionsNullable(grpSec, `Inherit · ${providerById(parentSec)?.name||'none'}`)}
          </select>
          <div class="tree-cell--source">${effSrc}</div>
          <div class="tree-cell--contains">${comps.length} comp${comps.length===1?'':'s'}</div>
          <div class="tree-cell--gth"></div>
          <div class="tree-cell--state">${grpPending?'<span class="badge badge-yellow">unsaved</span>':''}</div>
        </div>
        <div class="tree-children ${grpOpen?'open':''}" id="group-${group.id}">
          ${comps.map(c=>renderComp(c, group, 3)).join('')}
        </div>
      </div>`;
    }).join('');

    const ungroupedHtml = ungrouped.map(c=>renderComp(c, null, 2)).join('');

    return `
    <div class="tree-node">
      <div class="tree-row ${sportOpen?'open':''} ${sportPending?'tree-row--pending':''}"
           data-toggle="sport-${sport.id}" style="--depth:1"
           role="row" aria-level="1" aria-expanded="${sportOpen}">
        <div class="tree-row__lead">
          ${ICONS.chevron()}${ICONS.sportIcon()}
          <span class="name" title="${sport.name}">${sport.name}</span>
        </div>
        <select class="select input-sm" style="width:100%" data-key="sport:${sport.id}:prematch">
          ${providerOptions(sportPre, true, inheritLabel(pendingOr('global:prematch', GLOBAL_DEFAULT.prematch)))}
        </select>
        <select class="select input-sm" style="width:100%" data-key="sport:${sport.id}:inplay">
          ${providerOptions(sportInp, true, inheritLabel(pendingOr('global:inplay', GLOBAL_DEFAULT.inplay)))}
        </select>
        <select class="select input-sm" style="width:100%" data-key="secondary:sport:${sport.id}">
          ${providerOptionsNullable(sportSec, `Inherit · ${providerById(pendingOr('secondary:global', GLOBAL_DEFAULT.secondary))?.name||'none'}`)}
        </select>
        <div class="tree-cell--source"></div>
        <div class="tree-cell--contains">${totalComps} comp${totalComps===1?'':'s'}</div>
        <div class="tree-cell--gth"></div>
        <div class="tree-cell--state">${sportPending?'<span class="badge badge-yellow">unsaved</span>':''}</div>
      </div>
      <div class="tree-children ${sportOpen?'open':''}" id="sport-${sport.id}">
        ${groupsHtml}${ungroupedHtml}
        <div class="tree-row" style="--depth:2;cursor:pointer;color:var(--fg-muted);" onclick="createNewGroup('${sport.id}')">
          <div class="tree-row__lead">
            <span class="ic ic-16" style="width:12px"></span>
            ${ic('plus', 16, 'style="color:var(--fg-muted)"')}
            <span style="font-size:var(--fs-xs);">New group</span>
          </div>
          <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
        </div>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state" style="padding:var(--sp-4)">No sports or competitions match the current filters.</div>`;

  root.innerHTML = globalHtml + sportsHtml;
  updatePendingBar();
}

// Delegated listeners — bound once, survive every re-render
(function(){
  const root = document.getElementById('hierarchy-tree');
  root.addEventListener('click', e=>{
    if (e.target.closest('select, .map-warning, a')) return;
    const row = e.target.closest('[data-toggle]');
    if (!row) return;
    const id = row.dataset.toggle;
    if (openTreeNodes.has(id)) openTreeNodes.delete(id); else openTreeNodes.add(id);
    row.classList.toggle('open');
    document.getElementById(id).classList.toggle('open');
    row.setAttribute('aria-expanded', openTreeNodes.has(id));
  });
  root.addEventListener('change', e=>{
    const sel = e.target.closest('select[data-key]');
    if (sel) onHierarchyChange(sel.dataset.key, sel.value);
  });
})();

function onHierarchyChange(key, value){
  pendingHierarchy[key] = value || null;
  renderHierarchyTree();
}
function updatePendingBar(){
  const n = Object.keys(pendingHierarchy).length;
  document.getElementById('bc-review').disabled = n===0;
  document.getElementById('bc-action-bar').classList.toggle('open', n>0);
  document.getElementById('bc-pending-count').textContent = n;
}
document.getElementById('bc-discard').addEventListener('click', ()=>{
  for (const k in pendingHierarchy) delete pendingHierarchy[k];
  renderHierarchyTree();
});
document.getElementById('bc-expand-all').addEventListener('click', ()=>{
  bcSuppressAutoExpand = false;
  SPORTS.forEach(s=>{
    openTreeNodes.add('sport-'+s.id);
    groupsForSport(s.id).forEach(g=>openTreeNodes.add('group-'+g.id));
  });
  renderHierarchyTree();
});
document.getElementById('bc-collapse-all').addEventListener('click', ()=>{
  openTreeNodes.clear();
  bcSuppressAutoExpand = true;
  renderHierarchyTree();
});
document.getElementById('bc-export').addEventListener('click', ()=>{
  const headers = ['Sport','Group','Competition','Phase','Primary Provider','Source','Secondary','GTH Mapped'];
  const rows = [];
  visibleTreeModel().forEach(({sport, visibleGroups, ungrouped})=>{
    const addComp = (comp, groupName)=>{
      ['prematch','inplay'].forEach(phase=>{
        const eff = resolveProvider(sport.id, comp.id, phase);
        const sec = resolveSecondary(sport.id, comp.id);
        rows.push([sport.name, groupName, comp.name, phase==='prematch'?'Pre-Match':'In-Play',
          providerById(eff.value)?.name||'(none)', eff.source,
          providerById(sec.value)?.name||'(none)',
          isMapped(eff.value, comp.id, phase)?'Yes':'No']);
      });
    };
    visibleGroups.forEach(({group, comps})=> comps.forEach(c=>addComp(c, group.name)));
    ungrouped.forEach(c=>addComp(c, '(ungrouped)'));
  });
  const totalRows = SPORTS.reduce((n,s)=> n + s.competitions.length * 2, 0);
  const filtered = rows.length < totalRows;
  const filename = filtered ? 'blending_configuration_filtered.csv' : 'blending_configuration.csv';
  downloadCSV(filename, headers, rows);
  toast('success','Export ready', filtered
    ? `${filename} — ${rows.length} of ${totalRows} rows (current filters applied).`
    : `${filename} — ${rows.length} rows.`);
});

function blendingUnmappedCheck(){
  const unmapped = [];
  Object.entries(pendingHierarchy).forEach(([key, providerId])=>{
    if (!providerId) return;
    if (key.startsWith('global:') || key.startsWith('secondary:')) return;
    if (key.startsWith('sport:')){
      const parts = key.split(':');
      const sportId = parts[1];
      const sport = SPORTS.find(s=>s.id===sportId);
      sport.competitions.forEach(c=>{ if(!isMapped(providerId, c.id)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${sport.name} → ${c.name}`}); });
    } else if (key.startsWith('group:')){
      const parts = key.split(':');
      const groupId = parts[1];
      const group = GROUPS.find(g=>g.id===groupId);
      if (group) group.competitions.forEach(compId=>{
        if(!isMapped(providerId, compId)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${group.name} → ${competitionName(compId)}`});
      });
    } else if (key.startsWith('comp:')){
      const parts = key.split(':');
      const compId = parts[1];
      if (!isMapped(providerId, compId)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${competitionName(compId)}`});
    } else if (key.startsWith('mt:')){
      const parts = key.split(':');
      const compId = parts[1];
      if (!isMapped(providerId, compId)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${competitionName(compId)} → ${parts[2]}`});
    }
  });
  return unmapped;
}

function blendingPendingSummary(){
  return Object.entries(pendingHierarchy).map(([key, val])=>{
    let level = '', desc = '';
    const provName = val ? providerById(val)?.name : '(inherit)';
    if (key.startsWith('global:')){ level = 'Global'; desc = `${key.split(':')[1]==='prematch'?'Pre-Match':'In-Play'} → ${provName}`; }
    else if (key.startsWith('sport:')){ const parts = key.split(':'); level = 'Sport'; desc = `${sportName(parts[1])} ${parts[2]==='prematch'?'Pre-Match':parts[2]==='inplay'?'In-Play':'Secondary'} → ${provName}`; }
    else if (key.startsWith('group:')){ const parts = key.split(':'); const g = GROUPS.find(g=>g.id===parts[1]); level = 'Group'; desc = `${g?.name||parts[1]} ${parts[2]==='prematch'?'Pre-Match':parts[2]==='inplay'?'In-Play':'Secondary'} → ${provName}`; }
    else if (key.startsWith('comp:')){ const parts = key.split(':'); level = 'Competition'; desc = `${competitionName(parts[1])} ${parts[2]==='prematch'?'Pre-Match':parts[2]==='inplay'?'In-Play':'Secondary'} → ${provName}`; }
    else if (key.startsWith('secondary:')){ level = 'Secondary'; desc = `${key.replace('secondary:','')} → ${provName}`; }
    else if (key.startsWith('mt:')){ level = 'Market Type'; desc = `${key.slice(3)} → ${provName}`; }
    return { key, level, desc, val };
  });
}

function commitBlendingChanges(){
  const count = Object.keys(pendingHierarchy).length;
  Object.entries(pendingHierarchy).forEach(([key,val])=>{
    logAudit('Level 1 — Blending Config', 'Provider changed', `${key} → ${val?providerById(val).name:'(inherit)'}`);
    if (key.startsWith('global:')){
      const phase = key.split(':')[1];
      GLOBAL_DEFAULT[phase] = val;
    } else if (key.startsWith('sport:')){
      const parts = key.split(':');
      const sport = SPORTS.find(s=>s.id===parts[1]);
      sport[parts[2]] = val;
    } else if (key.startsWith('group:')){
      const parts = key.split(':');
      const group = GROUPS.find(g=>g.id===parts[1]);
      if (group) group[parts[2]] = val;
    } else if (key.startsWith('comp:')){
      const parts = key.split(':');
      const comp = SPORTS.flatMap(s=>s.competitions).find(c=>c.id===parts[1]);
      comp[parts[2]] = val;
    } else if (key.startsWith('secondary:')){
      const rest = key.replace('secondary:','');
      if (rest === 'global') GLOBAL_DEFAULT.secondary = val;
      else if (rest.startsWith('sport:')) SPORTS.find(s=>s.id===rest.split(':')[1]).secondary = val;
      else if (rest.startsWith('group:')){ const g=GROUPS.find(g=>g.id===rest.split(':')[1]); if(g) g.secondary=val; }
      else if (rest.startsWith('comp:')) SPORTS.flatMap(s=>s.competitions).find(c=>c.id===rest.split(':')[1]).secondary = val;
    } else if (key.startsWith('mt:')){
      const parts = key.slice(3).split(':');
      const compId = parts[0];
      const marketType = parts.slice(1, -1).join(':');
      const phase = parts[parts.length-1];
      const mtKey = `${compId}:${marketType}`;
      if (!MARKET_TYPE_DEFAULTS[mtKey]) MARKET_TYPE_DEFAULTS[mtKey] = { prematch:null, inplay:null };
      MARKET_TYPE_DEFAULTS[mtKey][phase] = val;
    }
  });
  Object.keys(pendingHierarchy).forEach(k=>delete pendingHierarchy[k]);
  renderHierarchyTree();
  toast('success', 'Configuration saved', `${count} level(s) updated.`);
}

document.getElementById('bc-review').addEventListener('click', ()=>{
  const unmapped = blendingUnmappedCheck();
  if (unmapped.length){
    document.getElementById('validation-unmapped-items').innerHTML = unmapped.map(u=>`
      <div class="alert alert-warning" style="margin-bottom:8px;">
        ${ICONS.alert()} <div><strong>${u.path}</strong>No confirmed mapping to internal GTH hierarchy.</div>
      </div>`).join('');
    openOverlay('overlay-validation');
    return;
  }
  const entries = blendingPendingSummary();
  document.getElementById('bc-review-subtitle').textContent = `${entries.length} pending change${entries.length!==1?'s':''}`;
  document.getElementById('bc-review-body').innerHTML = entries.map(e=>`
    <div class="card card-pad" style="margin-bottom:8px;">
      <span class="badge badge-blue" style="margin-bottom:4px;">${e.level}</span>
      <div style="font-weight:var(--fw-semibold);color:var(--fg-title);">${e.desc}</div>
    </div>`).join('') || '<div class="empty-state">No pending changes.</div>';
  openDrawer('drawer-blending-review');
});
document.getElementById('bc-confirm-save').addEventListener('click', ()=>{
  closeDrawer('drawer-blending-review');
  commitBlendingChanges();
});
document.getElementById('validation-goto-mappings').addEventListener('click', ()=>{
  closeOverlay('overlay-validation');
  goToView('mappings');
});

/* ============================================================
   GROUP MANAGEMENT — drawer for create / edit / delete groups
   ============================================================ */
let editingGroupId = null;
let editingGroupDraft = null; // { name, sportId, competitions:[] }

function createNewGroup(sportId){
  const sport = SPORTS.find(s=>s.id===sportId);
  const existing = groupsForSport(sportId);
  const letter = String.fromCharCode(65 + existing.length); // A, B, C...
  const newId = `grp-${sportId}-${Date.now()}`;
  const newGroup = {
    id: newId, sportId, name:`Group ${letter} — New`,
    prematch:null, inplay:null, secondary:null, competitions:[]
  };
  GROUPS.push(newGroup);
  openTreeNodes.add('sport-'+sportId);
  renderHierarchyTree();
  openGroupDrawer(newId);
  logAudit('Level 1 — Blending Config', 'Group created', `${sport.name} → ${newGroup.name}`);
}

function openGroupDrawer(groupId){
  const group = GROUPS.find(g=>g.id===groupId);
  if (!group) return;
  editingGroupId = groupId;
  editingGroupDraft = { name:group.name, sportId:group.sportId, competitions:[...group.competitions] };
  const sport = SPORTS.find(s=>s.id===group.sportId);
  document.getElementById('group-drawer-title').textContent = 'Edit Group';
  document.getElementById('group-drawer-subtitle').textContent = sport.name;
  renderGroupDrawerBody();
  openDrawer('drawer-group');
}

function renderGroupDrawerBody(){
  const g = editingGroupDraft;
  const sport = SPORTS.find(s=>s.id===g.sportId);
  const assignedComps = g.competitions.map(cid=> sport.competitions.find(c=>c.id===cid)).filter(Boolean);
  const allSportComps = sport.competitions;
  const unassigned = allSportComps.filter(c=>
    !g.competitions.includes(c.id) &&
    !GROUPS.some(og=> og.id !== editingGroupId && og.competitions.includes(c.id))
  );

  document.getElementById('group-drawer-body').innerHTML = `
    <label class="group-section-label">Group name</label>
    <input class="input group-name-input" id="group-name-field" value="${g.name}" placeholder="Group name">

    <label class="group-section-label">Competitions (${assignedComps.length})</label>
    ${assignedComps.length ? assignedComps.map(c=>`
      <div class="group-member">
        <span class="group-member__name">${c.name}</span>
        <span class="group-member__events">${c.events} events</span>
        <span class="group-member__remove" onclick="removeCompFromGroup('${c.id}')" title="Remove from group">${ICONS.x()}</span>
      </div>`).join('') : '<div class="group-empty">No competitions assigned yet.</div>'}

    ${unassigned.length ? `
      <div class="group-add-row">
        <select class="select input-sm" id="group-add-comp">
          <option value="">Add a competition…</option>
          ${unassigned.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-tertiary" onclick="addCompToGroup()">Add</button>
      </div>` : '<div class="group-empty" style="margin-top:var(--sp-2)">All competitions in this sport are assigned to groups.</div>'}

    <div class="alert alert-info" style="margin-top:var(--sp-4)">
      ${ic('circle-alert', 16)} <div>Groups cascade provider defaults to their competitions. Competitions can still override at their own level. <strong>Q2 open:</strong> seedable from existing groupings — built as new for now.</div>
    </div>
  `;
}

function removeCompFromGroup(compId){
  editingGroupDraft.competitions = editingGroupDraft.competitions.filter(id=>id!==compId);
  renderGroupDrawerBody();
}
function addCompToGroup(){
  const sel = document.getElementById('group-add-comp');
  if (!sel.value) return;
  editingGroupDraft.competitions.push(sel.value);
  renderGroupDrawerBody();
}

document.getElementById('group-save').addEventListener('click', ()=>{
  const group = GROUPS.find(g=>g.id===editingGroupId);
  if (!group) return;
  const nameField = document.getElementById('group-name-field');
  const oldName = group.name;
  group.name = nameField.value.trim() || oldName;
  group.competitions = [...editingGroupDraft.competitions];
  closeDrawer('drawer-group');
  renderHierarchyTree();
  logAudit('Level 1 — Blending Config', 'Group updated', `${group.name}: ${group.competitions.length} competition(s)`);
  toast('success', 'Group saved', `${group.name} updated.`);
});

document.getElementById('group-delete').addEventListener('click', ()=>{
  const group = GROUPS.find(g=>g.id===editingGroupId);
  if (!group) return;
  const idx = GROUPS.indexOf(group);
  if (idx >= 0) GROUPS.splice(idx, 1);
  closeDrawer('drawer-group');
  renderHierarchyTree();
  logAudit('Level 1 — Blending Config', 'Group deleted', `${group.name} removed — competitions now inherit from sport`);
  toast('success', 'Group deleted', `${group.name} removed. Its competitions now inherit directly from ${sportName(group.sportId)}.`);
});

/* ============================================================
   LEVEL 2 — EVENT OVERRIDES (redesigned)
   Central EVENT_OVERRIDES collection with scope-based creation.
   ============================================================ */
function computeAffectedEvents(config){
  return EVENTS.filter(evt=>{
    if (config.scope === 'event') return evt.id === config.eventId;
    if (config.scope === 'competition') return evt.competition === config.competitionId;
    if (config.scope === 'market'){
      if (config.sportId && evt.sport !== config.sportId) return false;
      if (config.competitionId && evt.competition !== config.competitionId) return false;
      return true;
    }
    return false;
  });
}

function effectiveEventProvider(evt, matchType){
  const sport = sportByCompetitionId(evt.competition);
  const comp = sport.competitions.find(c=>c.id===evt.competition);
  const dflt = effectiveMatchTypeProvider(sport, comp, matchType).value;
  const evtOv = EVENT_OVERRIDES.find(o=> o.scope==='event' && o.eventId===evt.id && o.matchType===matchType);
  if (evtOv) return { value:evtOv.provider, overridden:true, override:evtOv };
  const compOv = EVENT_OVERRIDES.find(o=> o.scope==='competition' && o.competitionId===evt.competition && o.matchType===matchType);
  if (compOv) return { value:compOv.provider, overridden:true, override:compOv };
  const mktCompOv = EVENT_OVERRIDES.find(o=> o.scope==='market' && o.competitionId===evt.competition && o.matchType===matchType);
  if (mktCompOv) return { value:mktCompOv.provider, overridden:true, override:mktCompOv };
  const mktGlobalOv = EVENT_OVERRIDES.find(o=> o.scope==='market' && !o.competitionId && o.sportId===evt.sport && o.matchType===matchType);
  if (mktGlobalOv) return { value:mktGlobalOv.provider, overridden:true, override:mktGlobalOv };
  return { value:dflt, overridden:false };
}

function overrideTargetLabel(ov){
  if (ov.scope === 'event'){
    const evt = EVENTS.find(e=>e.id===ov.eventId);
    return evt ? evt.name : ov.eventId;
  }
  if (ov.scope === 'competition') return competitionName(ov.competitionId);
  if (ov.scope === 'market'){
    const base = ov.marketType || 'All markets';
    return ov.competitionId ? `${base} — ${competitionName(ov.competitionId)}` : `${base} — all ${sportName(ov.sportId)}`;
  }
  return '—';
}

function expiryBadge(ov){
  if (!ov.expiresAt) return '';
  const exp = new Date(ov.expiresAt);
  const diffH = (exp - now)/3600000;
  if (diffH < 0) return '<span class="badge-expiry badge-expiry--expired">Expired</span>';
  if (diffH < 24) return `<span class="badge-expiry badge-expiry--soon">Expires in ${Math.round(diffH)}h</span>`;
  return `<span class="badge-expiry">Expires ${fmtDate(ov.expiresAt)}</span>`;
}

function populateOverrideFilters(){
  const sportSel = document.getElementById('eo-filter-sport');
  sportSel.innerHTML = '<option value="">All sports</option>';
  SPORTS.forEach(s=> sportSel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
  sportSel.addEventListener('change', renderOverridesList);
  document.getElementById('eo-filter-scope').addEventListener('change', renderOverridesList);
}

function filteredOverrides(){
  const scope = document.getElementById('eo-filter-scope').value;
  const sport = document.getElementById('eo-filter-sport').value;
  const q = eoSearchQuery.trim().toLowerCase();
  return EVENT_OVERRIDES.filter(ov=>{
    if (scope && ov.scope !== scope) return false;
    if (sport && ov.sportId !== sport) return false;
    if (q){
      const label = overrideTargetLabel(ov).toLowerCase();
      const prov = (providerById(ov.provider)?.name||'').toLowerCase();
      if (!label.includes(q) && !prov.includes(q) && !(ov.note||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function renderOverridesList(){
  const overrides = filteredOverrides();
  const toolbar = document.getElementById('eo-toolbar');
  const empty = document.getElementById('eo-empty-state');
  const list = document.getElementById('eo-overrides-list');

  if (EVENT_OVERRIDES.length === 0){
    toolbar.style.display = 'none';
    list.innerHTML = '';
    empty.style.display = '';
    return;
  }
  toolbar.style.display = '';
  empty.style.display = 'none';

  list.innerHTML = overrides.map(ov=>{
    const affected = computeAffectedEvents(ov).length;
    const mtLabel = ov.matchType === 'prematch' ? 'Pre-Match' : 'In-Play';
    return `
    <div class="override-card override-card--${ov.scope}">
      <div class="override-card__body">
        <div class="override-card__head">
          <span class="badge-scope badge-scope--${ov.scope}">${ov.scope}</span>
          ${ov.matchType === 'prematch' ? '<span class="badge badge-preplay">Pre-Match</span>' : '<span class="badge badge-inplay">In-Play</span>'}
          ${expiryBadge(ov)}
        </div>
        <div class="override-card__title">${overrideTargetLabel(ov)}</div>
        <div class="override-card__meta">
          Provider: ${providerChip(ov.provider)} · by ${ov.createdBy} · ${relTime(ov.createdAt)}
          ${ov.note ? `<br><span style="color:var(--fg-subtle);">${ov.note}</span>` : ''}
        </div>
        <div class="override-card__impact">Affects <strong>${affected}</strong> event${affected!==1?'s':''}</div>
      </div>
      <div class="override-card__actions">
        <button class="icon-btn" onclick="editOverride('${ov.id}')" aria-label="Edit">${ic('square-pen',16)}</button>
        <button class="icon-btn" onclick="removeOverride('${ov.id}')" aria-label="Remove">${ic('trash-2',16)}</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state" style="padding:var(--sp-8);">No overrides match these filters.</div>';
}

function removeOverride(id){
  const ov = EVENT_OVERRIDES.find(o=>o.id===id); if(!ov) return;
  const label = overrideTargetLabel(ov);
  document.getElementById('confirm-title').textContent = 'Remove override';
  document.getElementById('confirm-subtitle').textContent = `This will revert to the Blending default.`;
  document.getElementById('confirm-body').innerHTML = `
    <div class="card card-pad">
      <div class="flex-gap-2" style="margin-bottom:var(--sp-2);">
        <span class="badge-scope badge-scope--${ov.scope}">${ov.scope}</span>
        ${ov.matchType==='prematch'?'<span class="badge badge-preplay">Pre-Match</span>':'<span class="badge badge-inplay">In-Play</span>'}
      </div>
      <strong>${label}</strong><br>
      <span class="muted">Provider: ${providerById(ov.provider)?.name||ov.provider}</span>
    </div>`;
  const okBtn = document.getElementById('confirm-ok');
  okBtn.textContent = 'Remove';
  okBtn.className = 'btn btn-destructive';
  okBtn.onclick = ()=>{
    const i = EVENT_OVERRIDES.findIndex(o=>o.id===id);
    if (i>=0) EVENT_OVERRIDES.splice(i,1);
    logAudit('Level 2 — Event Overrides','Override removed',`${ov.scope}: ${label} — ${providerById(ov.provider)?.name}`);
    closeOverlay('overlay-confirm');
    renderOverridesList();
    toast('success','Override removed', label);
    okBtn.className = 'btn btn-primary';
  };
  openOverlay('overlay-confirm');
}

function editOverride(id){
  const ov = EVENT_OVERRIDES.find(o=>o.id===id); if(!ov) return;
  coEditingId = id;
  coDraft = { ...ov };
  coStep = 2;
  renderCreateStep2(ov.scope);
  openOverlay('overlay-create-override');
}

/* ---- Create Override modal — 3-step journey ---- */
let coStep = 1;
let coDraft = {};
let coEditingId = null;

function openCreateOverrideModal(){
  coStep = 1;
  coDraft = {};
  coEditingId = null;
  renderCreateStep1();
  openOverlay('overlay-create-override');
}

function stepIndicator(active){
  const labels = ['Scope','Configure','Confirm'];
  return `<div class="step-indicator">${labels.map((l,i)=>{
    const n = i+1;
    const cls = n===active ? 'step-indicator__dot--active' : (n<active ? 'step-indicator__dot--done' : '');
    return (i>0?'<span class="step-indicator__line"></span>':'') +
      `<span class="step-indicator__dot ${cls}">${n}</span><span>${l}</span>`;
  }).join('')}</div>`;
}

function renderCreateStep1(){
  const title = document.getElementById('co-title');
  const sub = document.getElementById('co-subtitle');
  title.textContent = 'Create Override';
  sub.textContent = 'Step 1 of 3 — Choose scope';
  document.getElementById('co-body').innerHTML = `
    ${stepIndicator(1)}
    <div class="scope-cards">
      <div class="scope-card" onclick="event.stopPropagation(); coDraft={scope:'event'}; renderCreateStep2('event')">
        <div class="scope-card__icon">${ic('calendar',24)}</div>
        <div class="scope-card__title">Event</div>
        <div class="scope-card__desc">Override the provider for a single event</div>
      </div>
      <div class="scope-card" onclick="event.stopPropagation(); coDraft={scope:'competition'}; renderCreateStep2('competition')">
        <div class="scope-card__icon">${ic('layers',24)}</div>
        <div class="scope-card__title">Competition</div>
        <div class="scope-card__desc">Override all events in a competition (temporary)</div>
      </div>
      <div class="scope-card" onclick="event.stopPropagation(); coDraft={scope:'market'}; renderCreateStep2('market')">
        <div class="scope-card__icon">${ic('layout-grid',24)}</div>
        <div class="scope-card__title">Market</div>
        <div class="scope-card__desc">Override a market type — across all events or scoped to a competition</div>
      </div>
    </div>`;
  document.getElementById('co-footer').innerHTML = `
    <button class="btn btn-tertiary" data-close="overlay-create-override">Cancel</button>`;
}

function renderCreateStep2(scope){
  coStep = 2;
  coDraft.scope = scope;
  const isEdit = !!coEditingId;
  document.getElementById('co-title').textContent = isEdit ? 'Edit Override' : 'Create Override';
  document.getElementById('co-subtitle').textContent = `Step 2 of 3 — Configure ${scope} override`;

  let fields = '';
  if (scope === 'event'){
    const eventOpts = EVENTS.map(e=>`<option value="${e.id}" ${coDraft.eventId===e.id?'selected':''}>${e.name} (${e.id})</option>`).join('');
    fields = `
      <div class="field"><label>Event</label><select class="select" id="co-event"><option value="">Select an event…</option>${eventOpts}</select></div>
      <div class="field"><label>Match Type</label>
        <div class="seg" style="display:inline-flex;">
          <button class="seg__btn ${coDraft.matchType==='prematch'||!coDraft.matchType?'active':''}" onclick="coDraft.matchType='prematch';this.parentElement.querySelectorAll('.seg__btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">Pre-Match</button>
          <button class="seg__btn ${coDraft.matchType==='inplay'?'active':''}" onclick="coDraft.matchType='inplay';this.parentElement.querySelectorAll('.seg__btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">In-Play</button>
        </div>
      </div>
      <div class="field"><label>Provider</label><select class="select" id="co-provider"><option value="">Select a provider…</option>${PROVIDERS.map(p=>`<option value="${p.id}" ${coDraft.provider===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
      <div class="field"><label>Note (optional)</label><input class="input" id="co-note" placeholder="Reason for override…" value="${coDraft.note||''}"></div>`;
  } else if (scope === 'competition'){
    const sportOpts = SPORTS.map(s=>`<option value="${s.id}" ${coDraft.sportId===s.id?'selected':''}>${s.name}</option>`).join('');
    fields = `
      <div class="field"><label>Sport</label><select class="select" id="co-sport" onchange="coUpdateCompetitions()"><option value="">Select a sport…</option>${sportOpts}</select></div>
      <div class="field"><label>Competition</label><select class="select" id="co-competition"><option value="">Select a competition…</option></select></div>
      <div class="field"><label>Match Type</label>
        <div class="seg" style="display:inline-flex;">
          <button class="seg__btn ${coDraft.matchType==='prematch'||!coDraft.matchType?'active':''}" onclick="coDraft.matchType='prematch';this.parentElement.querySelectorAll('.seg__btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">Pre-Match</button>
          <button class="seg__btn ${coDraft.matchType==='inplay'?'active':''}" onclick="coDraft.matchType='inplay';this.parentElement.querySelectorAll('.seg__btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">In-Play</button>
        </div>
      </div>
      <div class="field"><label>Provider</label><select class="select" id="co-provider"><option value="">Select a provider…</option>${PROVIDERS.map(p=>`<option value="${p.id}" ${coDraft.provider===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
      <div class="field"><label>Expires (optional)</label><input class="input" type="datetime-local" id="co-expires" value="${coDraft.expiresAt?toLocalInput(new Date(coDraft.expiresAt)):''}"></div>
      <div class="field"><label>Note (optional)</label><input class="input" id="co-note" placeholder="Reason for override…" value="${coDraft.note||''}"></div>`;
  } else {
    const sportOpts = SPORTS.map(s=>`<option value="${s.id}" ${coDraft.sportId===s.id?'selected':''}>${s.name}</option>`).join('');
    fields = `
      <div class="field"><label>Sport</label><select class="select" id="co-sport" onchange="coUpdateMarketTypes(); coUpdateCompetitions()"><option value="">Select a sport…</option>${sportOpts}</select></div>
      <div class="field"><label>Market Type</label><select class="select" id="co-market-type"><option value="">Select a market type…</option></select></div>
      <div class="field"><label><input type="checkbox" id="co-scope-comp" ${coDraft.competitionId?'checked':''}  onchange="document.getElementById('co-competition-wrap').style.display=this.checked?'':'none'"> Scope to a specific competition</label></div>
      <div class="field" id="co-competition-wrap" style="display:${coDraft.competitionId?'':'none'};"><label>Competition</label><select class="select" id="co-competition"><option value="">All competitions in sport</option></select></div>
      <div class="field"><label>Match Type</label>
        <div class="seg" style="display:inline-flex;">
          <button class="seg__btn ${coDraft.matchType==='prematch'||!coDraft.matchType?'active':''}" onclick="coDraft.matchType='prematch';this.parentElement.querySelectorAll('.seg__btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">Pre-Match</button>
          <button class="seg__btn ${coDraft.matchType==='inplay'?'active':''}" onclick="coDraft.matchType='inplay';this.parentElement.querySelectorAll('.seg__btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">In-Play</button>
        </div>
      </div>
      <div class="field"><label>Provider</label><select class="select" id="co-provider"><option value="">Select a provider…</option>${PROVIDERS.map(p=>`<option value="${p.id}" ${coDraft.provider===p.id?'selected':''}>${p.name}</option>`).join('')}</select></div>
      <div class="field"><label>Expires (optional)</label><input class="input" type="datetime-local" id="co-expires" value="${coDraft.expiresAt?toLocalInput(new Date(coDraft.expiresAt)):''}"></div>
      <div class="field"><label>Note (optional)</label><input class="input" id="co-note" placeholder="Reason for override…" value="${coDraft.note||''}"></div>`;
  }

  document.getElementById('co-body').innerHTML = `${stepIndicator(2)}${fields}`;
  document.getElementById('co-footer').innerHTML = `
    ${isEdit?'':'<button class="btn btn-tertiary" onclick="event.stopPropagation(); renderCreateStep1()">Back</button>'}
    <button class="btn btn-tertiary" data-close="overlay-create-override">Cancel</button>
    <button class="btn btn-primary" onclick="event.stopPropagation(); validateAndShowStep3()">Next: Review</button>`;

  if (scope === 'competition' || scope === 'market'){
    if (coDraft.sportId) coUpdateCompetitions();
    if (scope === 'market' && coDraft.sportId) coUpdateMarketTypes();
  }
}

function coUpdateCompetitions(){
  const sportId = document.getElementById('co-sport')?.value;
  const compSel = document.getElementById('co-competition');
  if (!compSel) return;
  const sport = SPORTS.find(s=>s.id===sportId);
  compSel.innerHTML = '<option value="">'+( coDraft.scope==='market' ? 'All competitions in sport' : 'Select a competition…')+'</option>';
  if (sport) sport.competitions.forEach(c=> compSel.innerHTML += `<option value="${c.id}" ${coDraft.competitionId===c.id?'selected':''}>${c.name}</option>`);
}
function coUpdateMarketTypes(){
  const sportId = document.getElementById('co-sport')?.value;
  const mtSel = document.getElementById('co-market-type');
  if (!mtSel) return;
  const types = SPORT_MARKET_TYPES[sportId] || [];
  mtSel.innerHTML = '<option value="">Select a market type…</option>' +
    types.map(t=>`<option value="${t}" ${coDraft.marketType===t?'selected':''}>${t}</option>`).join('');
}

function toLocalInput(d){
  const p = n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function validateAndShowStep3(){
  const scope = coDraft.scope;
  coDraft.matchType = coDraft.matchType || 'prematch';
  coDraft.provider = document.getElementById('co-provider')?.value;
  coDraft.note = document.getElementById('co-note')?.value || '';
  const expiresEl = document.getElementById('co-expires');
  coDraft.expiresAt = expiresEl?.value ? new Date(expiresEl.value).toISOString() : null;

  if (scope === 'event'){
    coDraft.eventId = document.getElementById('co-event')?.value;
    if (!coDraft.eventId){ toast('warning','Missing field','Select an event.'); return; }
    const evt = EVENTS.find(e=>e.id===coDraft.eventId);
    coDraft.sportId = evt.sport;
    coDraft.competitionId = evt.competition;
  } else if (scope === 'competition'){
    coDraft.sportId = document.getElementById('co-sport')?.value;
    coDraft.competitionId = document.getElementById('co-competition')?.value;
    if (!coDraft.sportId || !coDraft.competitionId){ toast('warning','Missing field','Select a sport and competition.'); return; }
  } else {
    coDraft.sportId = document.getElementById('co-sport')?.value;
    coDraft.marketType = document.getElementById('co-market-type')?.value;
    const scopeComp = document.getElementById('co-scope-comp')?.checked;
    coDraft.competitionId = scopeComp ? (document.getElementById('co-competition')?.value || null) : null;
    if (!coDraft.sportId || !coDraft.marketType){ toast('warning','Missing field','Select a sport and market type.'); return; }
  }
  if (!coDraft.provider){ toast('warning','Missing field','Select a provider.'); return; }

  renderCreateStep3();
}

function renderCreateStep3(){
  coStep = 3;
  const isEdit = !!coEditingId;
  document.getElementById('co-title').textContent = isEdit ? 'Edit Override' : 'Create Override';
  document.getElementById('co-subtitle').textContent = 'Step 3 of 3 — Confirm impact';

  const affected = computeAffectedEvents(coDraft);
  const mtLabel = coDraft.matchType === 'prematch' ? 'Pre-Match' : 'In-Play';
  const provName = providerById(coDraft.provider)?.name || coDraft.provider;

  const summaryHtml = `
    <div class="card card-pad" style="margin-bottom:var(--sp-3);">
      <div class="flex-gap-2" style="margin-bottom:var(--sp-2);">
        <span class="badge-scope badge-scope--${coDraft.scope}">${coDraft.scope}</span>
        ${coDraft.matchType==='prematch'?'<span class="badge badge-preplay">Pre-Match</span>':'<span class="badge badge-inplay">In-Play</span>'}
      </div>
      <div style="font-weight:var(--fw-semibold);color:var(--fg-title);margin-bottom:4px;">${overrideTargetLabel(coDraft)}</div>
      <div>Provider: ${providerChip(coDraft.provider)}</div>
      ${coDraft.expiresAt ? `<div style="margin-top:4px;">${expiryBadge(coDraft)}</div>` : ''}
      ${coDraft.note ? `<div class="muted" style="font-size:11px;margin-top:4px;">${coDraft.note}</div>` : ''}
    </div>`;

  const eventsHtml = affected.length ? `
    <div class="affected-list">${affected.map(evt=>{
      const sport = sportByCompetitionId(evt.competition);
      const comp = sport.competitions.find(c=>c.id===evt.competition);
      const current = effectiveMatchTypeProvider(sport, comp, coDraft.matchType).value;
      const currentName = providerById(current)?.name || 'none';
      return `<div class="affected-row">
        <div class="affected-row__name">
          <strong>${evt.name}</strong><br>
          <span class="muted" style="font-size:11px;">${competitionName(evt.competition)} · ${evt.id}</span>
        </div>
        <span class="muted">${currentName}</span>
        <span class="affected-row__arrow">→</span>
        <strong>${provName}</strong>
      </div>`;
    }).join('')}</div>` : '<div class="muted" style="padding:var(--sp-4);">No matching events found in the current schedule.</div>';

  document.getElementById('co-body').innerHTML = `
    ${stepIndicator(3)}
    <div style="font-size:var(--fs-sm);font-weight:var(--fw-semibold);margin-bottom:var(--sp-2);">
      This override will affect <strong>${affected.length}</strong> event${affected.length!==1?'s':''}
    </div>
    ${summaryHtml}
    ${eventsHtml}`;

  document.getElementById('co-footer').innerHTML = `
    <button class="btn btn-tertiary" onclick="event.stopPropagation(); renderCreateStep2('${coDraft.scope}')">Back</button>
    <button class="btn btn-tertiary" data-close="overlay-create-override">Cancel</button>
    <button class="btn btn-primary" onclick="event.stopPropagation(); saveOverride()">Confirm &amp; Save</button>`;
}

function saveOverride(){
  if (coEditingId){
    const i = EVENT_OVERRIDES.findIndex(o=>o.id===coEditingId);
    if (i>=0){
      EVENT_OVERRIDES[i] = { ...coDraft, id:coEditingId, createdAt:EVENT_OVERRIDES[i].createdAt, createdBy:EVENT_OVERRIDES[i].createdBy };
      logAudit('Level 2 — Event Overrides','Override updated',`${coDraft.scope}: ${overrideTargetLabel(coDraft)} → ${providerById(coDraft.provider)?.name}`);
    }
  } else {
    const newOv = {
      id: genOverrideId(), scope:coDraft.scope,
      eventId: coDraft.eventId||null, sportId:coDraft.sportId,
      competitionId: coDraft.competitionId||null, marketType:coDraft.marketType||null,
      matchType: coDraft.matchType, provider:coDraft.provider,
      expiresAt: coDraft.expiresAt||null,
      createdAt: new Date().toISOString(), createdBy:'m.tato',
      note: coDraft.note||''
    };
    EVENT_OVERRIDES.push(newOv);
    logAudit('Level 2 — Event Overrides','Override created',`${coDraft.scope}: ${overrideTargetLabel(coDraft)} → ${providerById(coDraft.provider)?.name}`);
  }
  closeOverlay('overlay-create-override');
  renderOverridesList();
  toast('success', coEditingId ? 'Override updated' : 'Override created', overrideTargetLabel(coDraft));
  coEditingId = null;
  coDraft = {};
}

document.getElementById('eo-create-btn').addEventListener('click', openCreateOverrideModal);
document.getElementById('eo-create-btn-empty').addEventListener('click', openCreateOverrideModal);

/* ============================================================
   LEVEL 3 — AUTOMATED ACTIONS
   ============================================================ */
function populateLogFilterProvider(){
  const sel = document.getElementById('log-filter-provider');
  PROVIDERS.forEach(p=> sel.innerHTML += `<option value="${p.id}">${p.name}</option>`);
}
function renderAutomationLog(){
  const provider = document.getElementById('log-filter-provider').value;
  const type = document.getElementById('log-filter-type').value;
  const text = document.getElementById('log-filter-text').value.toLowerCase();
  const typeMap = { outage:['badge-red','Outage triggered'], fallback:['badge-blue','Fallback activated'], recovered:['badge-green','Provider recovered'], degraded:['badge-yellow','Degraded'], 'gap-fill':['badge-blue','Gap coverage'] };
  const rows = AUTOMATION_LOG.filter(a=>
    (!provider || a.provider===provider) &&
    (!type || a.type===type) &&
    (!text || a.text.toLowerCase().includes(text) || a.competition.toLowerCase().includes(text) || sportName(a.sport).toLowerCase().includes(text))
  ).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  document.getElementById('automation-log-list').innerHTML = rows.map(a=>{
    const [cls,label] = typeMap[a.type];
    return `<div class="flex-gap-3" style="padding:10px 14px;border-bottom:1px solid var(--border-muted);align-items:flex-start;">
      <span class="badge ${cls}" style="flex:none;margin-top:2px;">${label}</span>
      <div style="flex:1;">
        <div class="flex-gap-2" style="margin-bottom:3px;">${providerBadge(a.provider)}<span style="font-size:12px;">${a.text}</span></div>
        <div class="muted" style="font-size:11px;">${sportName(a.sport)} — ${a.competition} · ${fmtDate(a.ts)} · ${relTime(a.ts)}</div>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state">No automation events match these filters.</div>`;
}
document.getElementById('log-filter-provider').addEventListener('change', renderAutomationLog);
document.getElementById('log-filter-type').addEventListener('change', renderAutomationLog);
document.getElementById('log-filter-text').addEventListener('input', renderAutomationLog);
document.getElementById('log-export').addEventListener('click', ()=>{
  downloadCSV('automation_log.csv', ['Timestamp','Type','Provider','Sport','Competition','Description'],
    AUTOMATION_LOG.map(a=>[a.ts, a.type, providerById(a.provider).name, sportName(a.sport), a.competition, a.text]));
});

function gaugeSvg(pct, color){
  const r=26, c=2*Math.PI*r, off = c*(1-pct/100);
  return `<svg width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--bg-muted)" stroke-width="6"/>
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
  </svg>`;
}
function renderProviderDashboard(){
  document.getElementById('provider-dashboard-cards').innerHTML = PROVIDERS.map(p=>{
    const h = PROVIDER_HEALTH[p.id];
    const cov = COVERAGE.find(c=>c.provider===p.id);
    const isSuspended = h.status === 'suspended';
    const backupProv = h.backup?.provider ? providerById(h.backup.provider) : null;
    return `<div class="provider-dash card card-pad">
      <div class="flex-between" style="margin-bottom:var(--sp-2);">
        ${providerBadge(p.id)}
        <div class="flex-gap-1">
          ${isSuspended ? '<span class="badge-suspended">Suspended</span>' : healthBadge(h.status)}
          ${backupProv ? `<span class="badge-backup">Backup: ${backupProv.name}</span>` : ''}
        </div>
      </div>
      <div class="provider-dash__metrics">
        <div>
          <div class="kpi__value" style="font-size:20px;">${h.uptime30d}%</div>
          <div class="kpi__sub">uptime 30d</div>
        </div>
        ${cov ? `<div style="text-align:center;">
          <div class="gauge">${gaugeSvg(cov.pct, p.color)}<div class="gauge__label">${cov.pct}%</div></div>
          <div class="muted" style="font-size:11px;margin-top:2px;">${cov.servedEvents}/${cov.assignedEvents} events</div>
        </div>` : ''}
      </div>
      ${h.suspendReason ? `<div class="muted" style="font-size:11px;margin-top:var(--sp-1);">Reason: ${h.suspendReason}</div>` : ''}
      <div class="provider-dash__actions">
        ${isSuspended
          ? `<button class="btn btn-sm btn-primary" onclick="resumeProvider('${p.id}')">Resume</button>`
          : `<button class="btn btn-sm btn-tertiary" onclick="openSuspendModal('${p.id}')">Suspend</button>`}
        <button class="btn btn-sm btn-tertiary" onclick="openBackupModal('${p.id}')">Set Backup</button>
      </div>
    </div>`;
  }).join('') + (COVERAGE_GAPS.length ? `<div style="grid-column:1/-1;margin-top:var(--sp-2);">
    <h4 style="font-weight:var(--fw-semibold);margin-bottom:var(--sp-2);color:var(--fg-title);">Coverage Gaps</h4>
    ${COVERAGE_GAPS.map(g=>`<div class="alert alert-${g.severity==='error'?'error':'warning'}" style="margin-bottom:4px;">
      ${ICONS.alert()}<div><strong>${g.sport} — ${g.competition}</strong> ${g.issue}</div>
    </div>`).join('')}</div>` : '');
}

function openSuspendModal(providerId){
  const p = providerById(providerId);
  document.getElementById('suspend-subtitle').textContent = p.name;
  document.getElementById('suspend-body').innerHTML = `
    <div class="field"><label>Reason</label>
      <select class="select" id="suspend-reason">
        <option value="Outage">Outage</option>
        <option value="Data Quality">Data Quality</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div class="field"><label>Note (optional)</label><input class="input" id="suspend-note" placeholder="Additional details…"></div>
    <div class="alert alert-warning">${ICONS.alert()}<div>Suspending this provider will affect all events currently using it.</div></div>`;
  document.getElementById('suspend-confirm').onclick = ()=>{
    const reason = document.getElementById('suspend-reason').value || 'Manual suspension';
    PROVIDER_HEALTH[providerId].status = 'suspended';
    PROVIDER_HEALTH[providerId].suspendReason = reason;
    logAudit('Monitoring','Provider suspended',`${p.name}: ${reason}`);
    closeOverlay('overlay-suspend');
    renderProviderDashboard();
    toast('warning','Provider suspended', p.name);
  };
  openOverlay('overlay-suspend');
}
function resumeProvider(providerId){
  const p = providerById(providerId);
  PROVIDER_HEALTH[providerId].status = 'operational';
  PROVIDER_HEALTH[providerId].suspendReason = null;
  logAudit('Monitoring','Provider resumed', p.name);
  renderProviderDashboard();
  toast('success','Provider resumed', p.name);
}
function openBackupModal(providerId){
  const p = providerById(providerId);
  document.getElementById('backup-subtitle').textContent = `If ${p.name} goes down, fall back to:`;
  document.getElementById('backup-body').innerHTML = `
    <div class="field"><label>Backup Provider</label>
      <select class="select" id="backup-provider-select">
        <option value="">None</option>
        ${PROVIDERS.filter(x=>x.id!==providerId).map(x=>`<option value="${x.id}" ${PROVIDER_HEALTH[providerId].backup?.provider===x.id?'selected':''}>${x.name}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label><input type="checkbox" id="backup-auto-resume" ${PROVIDER_HEALTH[providerId].backup?.autoResume?'checked':''}> Auto-resume original when it recovers</label></div>`;
  document.getElementById('backup-save').onclick = ()=>{
    const backupId = document.getElementById('backup-provider-select').value;
    PROVIDER_HEALTH[providerId].backup = backupId ? { provider:backupId, autoResume:document.getElementById('backup-auto-resume').checked } : null;
    logAudit('Monitoring','Backup set',`${p.name} → ${backupId ? providerById(backupId).name : 'none'}`);
    closeOverlay('overlay-backup');
    renderProviderDashboard();
    toast('success','Backup updated', p.name);
  };
  openOverlay('overlay-backup');
}

/* ============================================================
   PROVIDER MAPPINGS (GTH) — unified model
   ============================================================ */
function mappingDisplayRow(rec){
  const g = rec.status === 'suggested' ? rec.suggestion : rec.gth;
  return {
    id: rec.id, level: rec.level, provider: rec.provider, providerName: providerById(rec.provider).name,
    providerSport: rec.providerSport || '', providerCompetition: rec.providerCompetition || '', providerMarketType: rec.providerMarketType || '',
    gthSport: g && g.sportId ? sportName(g.sportId) : '',
    gthCompetition: g && g.competitionId ? competitionName(g.competitionId) : '',
    gthMarketType: g && g.marketType ? g.marketType : '',
    confidence: rec.status==='suggested' ? rec.suggestion.confidence : null,
    status: rec.status, rejectReason: rec.rejectReason || '', updated: rec.updated || '', by: rec.by || '',
  };
}

const tableState = {};
function getTableState(key){ return tableState[key] || (tableState[key] = { sortCol:null, sortDir:'asc', provider:'', text:'', colFilters:{} }); }

// Simple provider+free-text filter, used by the Suggested Maps cards.
function applyFilterSort(rows, state, textFields){
  let out = rows;
  if (state.provider) out = out.filter(r=>r.provider===state.provider);
  if (state.text){ const q=state.text.toLowerCase(); out = out.filter(r=> textFields.some(f=>String(r[f]||'').toLowerCase().includes(q))); }
  if (state.sortCol){
    out = out.slice().sort((a,b)=>{
      const av=a[state.sortCol]??'', bv=b[state.sortCol]??'';
      if (av<bv) return state.sortDir==='asc'?-1:1;
      if (av>bv) return state.sortDir==='asc'?1:-1;
      return 0;
    });
  }
  return out;
}
// Per-column filter, used by the Active Mappings / Unmapped tables — every
// column gets its own filter (exact match for selects, substring for text).
function applyColumnFilterSort(rows, state, columns){
  let out = rows;
  const filters = state.colFilters || {};
  columns.forEach(c=>{
    if (c.key.startsWith('__')) return;
    const val = filters[c.key];
    if (!val) return;
    if (c.filter === 'select'){
      const field = c.rawKey || c.key;
      out = out.filter(r=> String(r[field]) === String(val));
    } else {
      out = out.filter(r=> String(r[c.key]||'').toLowerCase().includes(String(val).toLowerCase()));
    }
  });
  if (state.sortCol){
    out = out.slice().sort((a,b)=>{
      const av=a[state.sortCol]??'', bv=b[state.sortCol]??'';
      if (av<bv) return state.sortDir==='asc'?-1:1;
      if (av>bv) return state.sortDir==='asc'?1:-1;
      return 0;
    });
  }
  return out;
}
function renderFilterBar(containerId, stateKey, onchange, csvFn){
  const state = getTableState(stateKey);
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <select class="select input-sm" style="width:160px;">
      <option value="">All providers</option>
      ${PROVIDERS.map(p=>`<option value="${p.id}" ${state.provider===p.id?'selected':''}>${p.name}</option>`).join('')}
    </select>
    <input class="input input-sm" style="width:260px;" placeholder="Search sport, competition, market type…" value="${(state.text||'').replace(/"/g,'&quot;')}">
    <button class="btn btn-sm btn-tertiary" style="margin-left:auto;">Export CSV</button>
  `;
  const [sel, inp, btn] = el.children;
  sel.onchange = () => { state.provider = sel.value; onchange(); };
  inp.oninput = () => { state.text = inp.value; onchange(); };
  btn.onclick = csvFn;
}

// Groups consecutive columns sharing the same .group into a spanning header
// cell, so "PROVIDER (FEED)" vs "GTH (INTERNAL)" reads as one visual band.
function renderGroupHeaderRow(columns){
  const spans = [];
  columns.forEach(c=>{
    const g = c.group || null;
    if (spans.length && spans[spans.length-1].group === g) spans[spans.length-1].count++;
    else spans.push({group:g, count:1});
  });
  return '<tr class="group-header-row">' + spans.map(s=>{
    const label = s.group === 'feed' ? 'PROVIDER (FEED)' : s.group === 'gth' ? 'GTH (INTERNAL)' : '';
    const cls = s.group === 'gth' ? 'group-header-cell col-gth' : 'group-header-cell';
    return `<th colspan="${s.count}" class="${cls}">${label}</th>`;
  }).join('') + '</tr>';
}
function renderLabelRow(columns, state){
  return '<tr class="label-row">' + columns.map(c=>{
    if (c.key.startsWith('__')) return '<th></th>';
    const arrow = state.sortCol===c.key ? (state.sortDir==='asc'?' ▲':' ▼') : '';
    const cls = c.group==='gth' ? 'col-gth sortable' : 'sortable';
    return `<th data-col="${c.key}" class="${cls}">${c.label}${arrow}</th>`;
  }).join('') + '</tr>';
}
function renderColumnFilterRow(columns, state){
  const filters = state.colFilters || (state.colFilters = {});
  return '<tr class="filter-row">' + columns.map(c=>{
    if (c.key.startsWith('__')) return '<th></th>';
    const val = filters[c.key] || '';
    const cls = c.group==='gth' ? 'col-gth' : '';
    if (c.filter === 'select'){
      const opts = typeof c.options === 'function' ? c.options() : c.options;
      return `<th class="${cls}"><select class="select input-sm col-filter" data-col="${c.key}"><option value="">All</option>${opts.map(o=>`<option value="${o.value}" ${val===o.value?'selected':''}>${o.label}</option>`).join('')}</select></th>`;
    }
    return `<th class="${cls}"><input class="input input-sm col-filter" data-col="${c.key}" placeholder="Filter…" value="${String(val).replace(/"/g,'&quot;')}"></th>`;
  }).join('') + '</tr>';
}
// Renders a full mapping table: group header + sortable labels + per-column
// filter row + body. Preserves focus/cursor across re-renders so typing in
// a filter input doesn't get interrupted by the table rebuilding itself.
function renderMappingTable(tableId, columns, rawRows, stateKey, rerender, actionsRenderer){
  const state = getTableState(stateKey);
  const rows = applyColumnFilterSort(rawRows, state, columns);
  const table = document.getElementById(tableId);
  const thead = table.querySelector('thead'), tbody = table.querySelector('tbody');

  const active = document.activeElement;
  const wasInTable = active && table.contains(active);
  const activeCol = wasInTable ? active.dataset.col : null;
  const selStart = wasInTable && active.tagName==='INPUT' ? active.selectionStart : null;

  thead.innerHTML = renderGroupHeaderRow(columns) + renderLabelRow(columns, state) + renderColumnFilterRow(columns, state);
  thead.querySelector('.label-row').onclick = (e) => {
    const th = e.target.closest('[data-col]'); if(!th) return;
    const col = th.dataset.col;
    if (state.sortCol===col) state.sortDir = state.sortDir==='asc'?'desc':'asc'; else { state.sortCol=col; state.sortDir='asc'; }
    rerender();
  };
  const filterRow = thead.querySelector('.filter-row');
  filterRow.addEventListener('input', e=>{
    const el = e.target.closest('[data-col]'); if(!el) return;
    state.colFilters[el.dataset.col] = el.value;
    rerender();
  });
  filterRow.addEventListener('change', e=>{
    const el = e.target.closest('select[data-col]'); if(!el) return;
    state.colFilters[el.dataset.col] = el.value;
    rerender();
  });

  tbody.innerHTML = rows.map(r=>'<tr>' + columns.map(c=>{
    const gthAttr = c.group==='gth' ? ' class="col-gth"' : '';
    if (c.key==='__connector') return `<td style="text-align:center;width:32px;color:var(--fg-muted);">${ICONS.arrowRight()}</td>`;
    if (c.key==='__actions') return `<td>${actionsRenderer(r)}</td>`;
    if (c.key==='providerName') return `<td${gthAttr}><span class="badge badge-gray">${r.providerName}</span></td>`;
    if (c.key==='confidence') return r.confidence==null ? `<td${gthAttr}>—</td>` : `<td${gthAttr}><div class="flex-gap-2"><div class="confidence-bar" style="width:60px;"><div class="confidence-bar__fill" style="width:${r.confidence}%;background:${r.confidence>=85?'var(--green-solid)':'var(--yellow-solid)'};"></div></div><span style="font-size:11px;font-weight:600;">${r.confidence}%</span></div></td>`;
    if (c.key==='status') return `<td${gthAttr}>${r.status==='rejected'?`<span class="badge badge-yellow">Rejected — ${r.rejectReason}</span>`:'<span class="badge badge-red">Unmapped</span>'}</td>`;
    return `<td${gthAttr}>${r[c.key] || '—'}</td>`;
  }).join('') + '</tr>').join('') || `<tr><td colspan="${columns.length}"><div class="empty-state">Nothing matches these filters.</div></td></tr>`;

  if (activeCol){
    const el = thead.querySelector(`.filter-row [data-col="${activeCol}"]`);
    if (el){ el.focus(); if (selStart!=null && el.setSelectionRange){ try{ el.setSelectionRange(selStart, selStart); }catch(e){} } }
  }
}
function exportMappingCSV(rows, filename){
  downloadCSV(filename,
    ['Provider','Level','Provider Sport','Provider Competition','Provider Market Type','GTH Sport','GTH Competition','GTH Market Type','Confidence','Status','Reject Reason','Updated','By'],
    rows.map(r=>[r.providerName, r.level, r.providerSport, r.providerCompetition, r.providerMarketType, r.gthSport, r.gthCompetition, r.gthMarketType, r.confidence??'', r.status, r.rejectReason, r.updated, r.by]));
}

const providerSelectOptions = () => PROVIDERS.map(p=>({value:p.id, label:p.name}));
// GTH market type names are a fixed, known catalog (see SPORT_MARKET_TYPES)
// so a select makes sense there; a provider's own naming is free-form
// ("1X2", "Moneyline", "Spread"...) so that column stays a text filter.
const gthMarketTypeSelectOptions = () => {
  const all = new Set();
  Object.values(SPORT_MARKET_TYPES).forEach(list => list.forEach(mt => all.add(mt)));
  return [...all].sort().map(v => ({value:v, label:v}));
};

// Note: Market Type mappings have no competition columns — a provider's own
// name for a bet type (e.g. "1X2") is mapped once per sport to GTH's
// canonical name (e.g. "Match Odds"), not re-mapped per competition (see
// SPORT_MARKET_TYPES / GTH_MAPPINGS comments in data.js).
const COLS_ACTIVE_COMP = [
  {key:'providerName', rawKey:'provider', label:'Provider', group:'feed', filter:'select', options:providerSelectOptions},
  {key:'providerSport', label:'Provider Sport', group:'feed', filter:'text'},
  {key:'providerCompetition', label:'Provider Competition', group:'feed', filter:'text'},
  {key:'__connector', label:''},
  {key:'gthSport', label:'GTH Sport', group:'gth', filter:'text'},
  {key:'gthCompetition', label:'GTH Competition', group:'gth', filter:'text'},
  {key:'updated', label:'Last Updated', filter:'text'}, {key:'__actions', label:''},
];
const COLS_ACTIVE_MT = [
  {key:'providerName', rawKey:'provider', label:'Provider', group:'feed', filter:'select', options:providerSelectOptions},
  {key:'providerSport', label:'Provider Sport', group:'feed', filter:'text'},
  {key:'providerMarketType', label:'Provider Market Type', group:'feed', filter:'text'},
  {key:'__connector', label:''},
  {key:'gthSport', label:'GTH Sport', group:'gth', filter:'text'},
  {key:'gthMarketType', label:'GTH Market Type', group:'gth', filter:'select', options:gthMarketTypeSelectOptions},
  {key:'updated', label:'Last Updated', filter:'text'}, {key:'__actions', label:''},
];
const COLS_UNMAPPED_COMP = [
  {key:'providerName', rawKey:'provider', label:'Provider', group:'feed', filter:'select', options:providerSelectOptions},
  {key:'providerSport', label:'Provider Sport', group:'feed', filter:'text'},
  {key:'providerCompetition', label:'Provider Competition', group:'feed', filter:'text'},
  {key:'status', label:'Status', filter:'select', options:[{value:'unmapped',label:'Unmapped'},{value:'rejected',label:'Rejected'}]},
  {key:'__actions', label:''},
];
const COLS_UNMAPPED_MT = [
  {key:'providerName', rawKey:'provider', label:'Provider', group:'feed', filter:'select', options:providerSelectOptions},
  {key:'providerSport', label:'Provider Sport', group:'feed', filter:'text'},
  {key:'providerMarketType', label:'Provider Market Type', group:'feed', filter:'text'},
  {key:'status', label:'Status', filter:'select', options:[{value:'unmapped',label:'Unmapped'},{value:'rejected',label:'Rejected'}]},
  {key:'__actions', label:''},
];

function renderSuggestedTab(){
  const display = GTH_MAPPINGS.filter(m=>m.status==='suggested').map(mappingDisplayRow);
  const panel = document.getElementById('mappings-suggestions');
  if (panel) panel.style.display = display.length ? '' : 'none';
  const title = document.getElementById('suggestions-title');
  if (title) title.textContent = `${display.length} suggestion${display.length===1?'':'s'} to review`;
  const state = getTableState('suggested');
  const rows = applyFilterSort(display, state, ['providerSport','providerCompetition','providerMarketType','gthSport','gthCompetition','gthMarketType']);
  document.getElementById('suggested-cards').innerHTML = rows.map(r=>`
    <div class="suggestion-card">
      <div class="suggestion-card__feed">
        <div class="flex-gap-1" style="margin-bottom:4px;">
          <span class="badge badge-gray">${r.providerName}</span>
          <span class="badge badge-gray">${r.level==='marketType'?'Market Type':'Competition'}</span>
        </div>
        <div class="suggestion-card__path">${providerPathLabel(r)}</div>
      </div>
      <div class="suggestion-card__arrow">${ICONS.arrowRight()}</div>
      <div class="suggestion-card__gth">
        <div class="suggestion-card__label">AI SUGGESTION</div>
        <div class="suggestion-card__path">${[r.gthSport, r.gthCompetition, r.gthMarketType].filter(Boolean).join(' → ')}</div>
        <div class="flex-gap-2" style="margin-top:6px;">
          <div class="confidence-bar" style="width:70px;"><div class="confidence-bar__fill" style="width:${r.confidence}%;background:${r.confidence>=85?'var(--green-solid)':'var(--yellow-solid)'};"></div></div>
          <span style="font-size:11px;font-weight:600;">${r.confidence}%</span>
        </div>
      </div>
      <div class="suggestion-card__actions">
        <button class="btn btn-sm btn-primary" onclick="acceptSuggestion('${r.id}')">Accept</button>
        <button class="btn btn-sm btn-secondary" onclick="openGthSearch('${r.id}')">Change</button>
        <button class="btn btn-sm btn-tertiary" onclick="openReject('${r.id}')">Reject</button>
      </div>
    </div>
  `).join('') || `<div class="empty-state">Nothing to review — all caught up.</div>`;
}
function renderActiveCompTab(){
  const rows = GTH_MAPPINGS.filter(m=>m.status==='active' && m.level==='competition').map(mappingDisplayRow);
  renderMappingTable('table-active-competitions', COLS_ACTIVE_COMP, rows, 'active-competitions', renderActiveCompTab, (r)=>`
    <div class="flex-gap-1">
      <span class="icon-btn" style="width:24px;height:24px;" title="Edit" onclick="openGthSearch('${r.id}')">${ICONS.edit()}</span>
      <span class="icon-btn" style="width:24px;height:24px;" title="History" onclick="showHistory('${r.id}')">${ICONS.history()}</span>
      <span class="icon-btn" style="width:24px;height:24px;" title="Delete" onclick="deleteMapping('${r.id}')">${ICONS.trash()}</span>
    </div>`);
}
function renderActiveMtTab(){
  const rows = GTH_MAPPINGS.filter(m=>m.status==='active' && m.level==='marketType').map(mappingDisplayRow);
  renderMappingTable('table-active-markettypes', COLS_ACTIVE_MT, rows, 'active-markettypes', renderActiveMtTab, (r)=>`
    <div class="flex-gap-1">
      <span class="icon-btn" style="width:24px;height:24px;" title="Edit" onclick="openGthSearch('${r.id}')">${ICONS.edit()}</span>
      <span class="icon-btn" style="width:24px;height:24px;" title="History" onclick="showHistory('${r.id}')">${ICONS.history()}</span>
      <span class="icon-btn" style="width:24px;height:24px;" title="Delete" onclick="deleteMapping('${r.id}')">${ICONS.trash()}</span>
    </div>`);
}
function renderUnmappedCompTab(){
  const rows = GTH_MAPPINGS.filter(m=>(m.status==='unmapped'||m.status==='rejected') && m.level==='competition').map(mappingDisplayRow);
  renderMappingTable('table-unmapped-competitions', COLS_UNMAPPED_COMP, rows, 'unmapped-competitions', renderUnmappedCompTab, (r)=>`
    <div class="flex-gap-1">
      <button class="btn btn-sm btn-secondary" onclick="openGthSearch('${r.id}')">Map</button>
      ${r.status==='unmapped' ? `<button class="btn btn-sm btn-tertiary" onclick="openReject('${r.id}')">Reject</button>` : ''}
    </div>`);
}
function renderUnmappedMtTab(){
  const rows = GTH_MAPPINGS.filter(m=>(m.status==='unmapped'||m.status==='rejected') && m.level==='marketType').map(mappingDisplayRow);
  renderMappingTable('table-unmapped-markettypes', COLS_UNMAPPED_MT, rows, 'unmapped-markettypes', renderUnmappedMtTab, (r)=>`
    <div class="flex-gap-1">
      <button class="btn btn-sm btn-secondary" onclick="openGthSearch('${r.id}')">Map</button>
      ${r.status==='unmapped' ? `<button class="btn btn-sm btn-tertiary" onclick="openReject('${r.id}')">Reject</button>` : ''}
    </div>`);
}
function refreshMappingCounts(){
  const suggestedCount = GTH_MAPPINGS.filter(m=>m.status==='suggested').length;
  const unmappedTabCount = GTH_MAPPINGS.filter(m=>m.status==='unmapped'||m.status==='rejected').length;
  const needsAttention = GTH_MAPPINGS.filter(m=>m.status==='suggested'||m.status==='unmapped').length;
  const unmappedEl = document.getElementById('unmapped-count');
  if (unmappedEl) unmappedEl.textContent = needsAttention;
  const navBadge = document.getElementById('mapping-nav-badge');
  if (navBadge){
    navBadge.textContent = needsAttention;
    navBadge.style.display = needsAttention === 0 ? 'none' : '';
    navBadge.setAttribute('aria-label', `${needsAttention} mapping${needsAttention===1?'':'s'} need attention`);
  }
  const suggBadge = document.getElementById('suggested-tab-badge');
  if (suggBadge){ suggBadge.textContent = suggestedCount; suggBadge.style.display = suggestedCount===0?'none':''; }
  const unmBadge = document.getElementById('unmapped-tab-badge');
  if (unmBadge){ unmBadge.textContent = unmappedTabCount; unmBadge.style.display = unmappedTabCount===0?'none':''; }
  const notif = document.getElementById('notif-btn');
  if (notif){ const bc = notif.querySelector('.badge-count'); if(bc) bc.style.display = needsAttention===0 ? 'none' : 'flex'; }
}
function refreshAllMappingTabs(){
  renderSuggestedTab(); renderActiveCompTab(); renderActiveMtTab(); renderUnmappedCompTab(); renderUnmappedMtTab();
  refreshMappingCounts();
}

// Level segmented toggle (Competitions | Market Types) — replaces nested tabs
function setMappingLevel(scope, level){
  document.querySelectorAll(`#seg-${scope} .seg__btn`).forEach(b=> b.classList.toggle('active', b.dataset.level===level));
  document.getElementById(`${scope}-comp-wrap`).style.display = level==='competition' ? '' : 'none';
  document.getElementById(`${scope}-mt-wrap`).style.display = level==='marketType' ? '' : 'none';
}
document.querySelector('.main').addEventListener('click', e=>{
  const b = e.target.closest('.seg__btn'); if(!b) return;
  setMappingLevel(b.closest('.seg').id.replace('seg-',''), b.dataset.level);
});
function currentLevel(scope){ return document.querySelector(`#seg-${scope} .seg__btn.active`).dataset.level; }
document.getElementById('active-export').addEventListener('click', ()=>{
  const lvl = currentLevel('active');
  const rows = GTH_MAPPINGS.filter(m=>m.status==='active' && m.level===lvl).map(mappingDisplayRow);
  exportMappingCSV(rows, lvl==='competition' ? 'active_mappings_competitions.csv' : 'active_mappings_market_types.csv');
});
document.getElementById('unmapped-export').addEventListener('click', ()=>{
  const lvl = currentLevel('unmapped');
  const rows = GTH_MAPPINGS.filter(m=>(m.status==='unmapped'||m.status==='rejected') && m.level===lvl).map(mappingDisplayRow);
  exportMappingCSV(rows, lvl==='competition' ? 'unmapped_competitions.csv' : 'unmapped_market_types.csv');
});
// Suggestions panel filters (provider + free text)
(function(){
  const prov = document.getElementById('sugg-provider');
  PROVIDERS.forEach(p=> prov.innerHTML += `<option value="${p.id}">${p.name}</option>`);
  prov.addEventListener('change', function(){ getTableState('suggested').provider = this.value; renderSuggestedTab(); });
  document.getElementById('sugg-search').addEventListener('input', function(){ getTableState('suggested').text = this.value; renderSuggestedTab(); });
})();

function acceptSuggestion(id){
  const rec = GTH_MAPPINGS.find(m=>m.id===id); if(!rec) return;
  rec.gth = { ...rec.suggestion };
  rec.status = 'active'; rec.updated = new Date().toISOString().slice(0,10); rec.by = 'm.tato';
  markMapped(rec.provider, rec.gth.competitionId);
  logAudit('Provider Mappings','Mapping confirmed',`${providerPathLabel(rec)} (${providerById(rec.provider).name}) mapped to ${gthPathLabel(rec.gth)} (AI suggested, accepted)`);
  refreshAllMappingTabs(); renderHierarchyTree(); renderOverridesList();
  toast('success','Mapping confirmed', `${providerPathLabel(rec)} → ${gthPathLabel(rec.gth)}`);
}
let rejectTargetId = null;
function openReject(id){ rejectTargetId = id; document.getElementById('reject-other-field').style.display='none'; document.getElementById('reject-reason').value='Deprecated'; document.getElementById('reject-other-text').value=''; openOverlay('overlay-reject'); }
document.getElementById('reject-reason').addEventListener('change', function(){ document.getElementById('reject-other-field').style.display = this.value==='Other'?'block':'none'; });
document.getElementById('reject-confirm').addEventListener('click', ()=>{
  const rec = GTH_MAPPINGS.find(m=>m.id===rejectTargetId);
  if (!rec) return closeOverlay('overlay-reject');
  const selected = document.getElementById('reject-reason').value;
  const otherText = document.getElementById('reject-other-text').value.trim();
  const reason = selected === 'Other' && otherText ? otherText : selected;
  rec.status = 'rejected'; rec.rejectReason = reason; rec.by = 'm.tato'; rec.updated = new Date().toISOString().slice(0,10);
  logAudit('Provider Mappings','Mapping rejected',`${providerPathLabel(rec)} (${providerById(rec.provider).name}) marked Do Not Map (${reason})`);
  closeOverlay('overlay-reject');
  refreshAllMappingTabs();
  toast('default','Marked as Do Not Map', providerPathLabel(rec));
});
let gthSearchTargetId = null;
let gthSearchResultsCache = [];
// Market Type options are sport-wide (the 5 canonical bet types per sport
// from SPORT_MARKET_TYPES, no competition); Competition options are the
// usual sport→competition list.
function gthOptionsList(level){
  const list = [];
  if (level === 'marketType'){
    SPORTS.forEach(s=>{
      (SPORT_MARKET_TYPES[s.id] || []).forEach(mt=>{
        list.push({ sportId:s.id, competitionId:null, marketType:mt, label:`${s.name} → ${mt}` });
      });
    });
    return list;
  }
  SPORTS.forEach(s=> s.competitions.forEach(c=> list.push({ sportId:s.id, competitionId:c.id, marketType:null, label:`${s.name} → ${c.name}` })));
  return list;
}
function openGthSearch(id){
  gthSearchTargetId = id;
  const rec = GTH_MAPPINGS.find(m=>m.id===id);
  document.getElementById('search-gth-subtitle').textContent = `Mapping: ${providerPathLabel(rec)} (${providerById(rec.provider).name})`;
  document.getElementById('gth-search-input').value='';
  renderGthResults('', rec.level);
  openOverlay('overlay-search-gth');
}
function renderGthResults(query, level){
  gthSearchResultsCache = gthOptionsList(level).filter(g=>g.label.toLowerCase().includes(query.toLowerCase())).slice(0,8);
  document.getElementById('gth-search-results').innerHTML = gthSearchResultsCache.map((r,i)=>`
    <div class="flex-between" style="padding:8px 4px;border-bottom:1px solid var(--border-muted);font-size:13px;">
      <span>${r.label}</span>
      <button class="btn btn-sm btn-secondary" onclick="confirmGthMatch(${i})">Select</button>
    </div>`).join('') || `<div class="muted" style="font-size:12px;padding:8px 4px;">No matches.</div>`;
}
document.getElementById('gth-search-input').addEventListener('input', function(){
  const rec = GTH_MAPPINGS.find(m=>m.id===gthSearchTargetId);
  renderGthResults(this.value, rec ? rec.level : 'competition');
});
function confirmGthMatch(idx){
  const choice = gthSearchResultsCache[idx];
  const rec = GTH_MAPPINGS.find(m=>m.id===gthSearchTargetId);
  if (!rec) return closeOverlay('overlay-search-gth');
  rec.gth = { sportId:choice.sportId, competitionId:choice.competitionId, marketType:choice.marketType };
  rec.status = 'active'; rec.updated = new Date().toISOString().slice(0,10); rec.by = 'm.tato';
  markMapped(rec.provider, rec.gth.competitionId);
  logAudit('Provider Mappings','Mapping confirmed',`${providerPathLabel(rec)} (${providerById(rec.provider).name}) manually mapped to ${choice.label}`);
  refreshAllMappingTabs(); renderHierarchyTree(); renderOverridesList();
  closeOverlay('overlay-search-gth');
  toast('success','Mapping confirmed', `${providerPathLabel(rec)} → ${choice.label}`);
}
document.getElementById('gth-create-new').addEventListener('click', ()=>{
  closeOverlay('overlay-search-gth');
  toast('default','Opening GTH', 'Would open the GTH hierarchy editor in a new tab (mocked) so you can create the missing entry, then return here to map it.');
});
function showHistory(id){
  const rec = GTH_MAPPINGS.find(m=>m.id===id);
  toast('default','Mapping history', `${providerPathLabel(rec)} — 1 change on record. Full audit trail lives in the Audit Log screen.`);
}
function deleteMapping(id){
  const rec = GTH_MAPPINGS.find(m=>m.id===id); if(!rec) return;
  document.getElementById('confirm-title').textContent = 'Unmap this item?';
  document.getElementById('confirm-subtitle').textContent = 'It will move to Unmapped and can no longer be used in defaults or blending until re-mapped.';
  document.getElementById('confirm-body').innerHTML = `<div class="alert alert-error">${ICONS.alert()}<div><strong>${providerPathLabel(rec)}</strong> (${providerById(rec.provider).name}) currently mapped to ${gthPathLabel(rec.gth)}</div></div>`;
  document.getElementById('confirm-ok').onclick = () => {
    rec.status = 'unmapped'; delete rec.gth;
    logAudit('Provider Mappings','Mapping deleted',`${providerPathLabel(rec)} (${providerById(rec.provider).name}) unmapped`);
    refreshAllMappingTabs();
    closeOverlay('overlay-confirm');
    toast('danger','Mapping removed', providerPathLabel(rec));
  };
  openOverlay('overlay-confirm');
}

/* ============================================================
   PROVIDER ANALYTICS
   ============================================================ */
let activeProviderFilter = new Set(PROVIDERS.map(p=>p.id));
let compareMode = false;
function renderProviderFilterChips(){
  document.getElementById('an-provider-filter').innerHTML = PROVIDERS.map(p=>`
    <span class="ai-suggestion-chip" style="border-color:${activeProviderFilter.has(p.id)?p.color:'var(--border)'};${activeProviderFilter.has(p.id)?`background:${p.color}22;`:''}" onclick="toggleProviderFilter('${p.id}')">
      <span class="swatch" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};margin-right:5px;"></span>${p.name}
    </span>`).join('');
}
function toggleProviderFilter(id){
  if (activeProviderFilter.has(id)) activeProviderFilter.delete(id); else activeProviderFilter.add(id);
  if (activeProviderFilter.size===0) activeProviderFilter.add(id);
  renderProviderFilterChips(); renderAnalytics();
}
function renderKpiRow(){
  const ids = Array.from(activeProviderFilter);
  const sum = f => ids.reduce((a,id)=>a+ANALYTICS_SUMMARY[id][f],0);
  const avg = f => sum(f)/ids.length;
  const kpis = [
    {label:'Gross revenue', value: fmtMoney(sum('revenue')), sub:`across ${ids.length} provider(s)`},
    {label:'Bets placed', value: fmtNum(sum('bets')), sub:'volume, selected period'},
    {label:'Market coverage', value: avg('coveragePct').toFixed(1)+'%', sub:'avg. of selected'},
    {label:'Provider uptime', value: avg('uptimePct').toFixed(2)+'%', sub:'avg. of selected'},
    {label:'Avg. latency', value: Math.round(avg('latencyMs'))+' ms', sub:'price update → bet placed'},
    {label:'Margin impact', value: avg('marginPct').toFixed(1)+'%', sub:'avg. margin on priced bets'},
  ];
  document.getElementById('an-kpi-row').innerHTML = kpis.map(k=>`
    <div class="kpi"><div class="kpi__label">${k.label}</div><div class="kpi__value">${k.value}</div><div class="kpi__sub">${k.sub}</div></div>`).join('');
}
function renderAnTable(){
  document.getElementById('an-table-tbody').innerHTML = Array.from(activeProviderFilter).map(id=>{
    const a = ANALYTICS_SUMMARY[id];
    return `<tr>
      <td>${providerBadge(id)}</td>
      <td class="num">${fmtMoney(a.revenue)}</td>
      <td class="num">${fmtNum(a.bets)}</td>
      <td class="num">${a.coveragePct}%</td>
      <td class="num">${a.uptimePct}%</td>
      <td class="num">${a.latencyMs} ms</td>
      <td class="num">${a.marginPct}%</td>
    </tr>`;
  }).join('');
}
function svgLineChart(el, series){
  const w=560,h=180,pad=8;
  const allVals = Object.values(series).flat();
  const max = Math.max(...allVals)*1.1, min=0;
  const n = Object.values(series)[0]?.length || 14;
  const x = i => pad + i*((w-2*pad)/(n-1));
  const y = v => h-pad - ((v-min)/(max-min))*(h-2*pad);
  let svg = '';
  Object.entries(series).forEach(([id, vals])=>{
    const p = providerById(id);
    const pts = vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${p.color}" stroke-width="2"/>`;
    vals.forEach((v,i)=>{ if(i===vals.length-1) svg += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${p.color}"/>`; });
  });
  el.innerHTML = svg;
}
function renderRevenueChart(){
  const series = {}; activeProviderFilter.forEach(id=> series[id]=REVENUE_TIMESERIES[id]);
  svgLineChart(document.getElementById('an-revenue-chart'), series);
  document.getElementById('an-revenue-legend').innerHTML = Array.from(activeProviderFilter).map(id=>{
    const p = providerById(id);
    return `<span class="flex-gap-1" style="font-size:11px;"><span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block;"></span>${p.name}</span>`;
  }).join('');
}
function renderBetsChart(){
  const el = document.getElementById('an-bets-chart');
  const ids = Array.from(activeProviderFilter);
  const max = Math.max(...ids.map(id=>ANALYTICS_SUMMARY[id].bets))*1.15;
  const w=560,h=180, bw = (w/ids.length)*0.5, gap=(w/ids.length);
  let svg='';
  ids.forEach((id,i)=>{
    const p = providerById(id), val = ANALYTICS_SUMMARY[id].bets;
    const barH = (val/max)*(h-30);
    const x = gap*i + (gap-bw)/2;
    svg += `<rect x="${x}" y="${h-20-barH}" width="${bw}" height="${barH}" fill="${p.color}" rx="3"/>`;
    svg += `<text x="${x+bw/2}" y="${h-6}" text-anchor="middle" font-size="10" fill="var(--fg-muted)">${p.short}</text>`;
    svg += `<text x="${x+bw/2}" y="${h-24-barH}" text-anchor="middle" font-size="10" fill="var(--fg-title)" font-weight="600">${fmtNum(val)}</text>`;
  });
  el.innerHTML = svg;
}
function renderAnalytics(){ renderKpiRow(); renderAnTable(); renderRevenueChart(); renderBetsChart(); }
document.getElementById('an-compare').addEventListener('click', function(){
  compareMode = !compareMode;
  this.classList.toggle('btn-secondary', compareMode);
  toast('default', compareMode?'Comparison mode on':'Comparison mode off', compareMode?'KPI cards below now represent each selected provider independently rather than an aggregate.':'');
  if (compareMode){
    document.getElementById('an-kpi-row').innerHTML = Array.from(activeProviderFilter).map(id=>{
      const p = providerById(id), a = ANALYTICS_SUMMARY[id];
      return `<div class="kpi" style="border-top:2px solid ${p.color};">
        <div class="kpi__label">${p.name}</div>
        <div class="kpi__value" style="font-size:18px;">${fmtMoney(a.revenue)}</div>
        <div class="kpi__sub">${fmtNum(a.bets)} bets · ${a.coveragePct}% coverage · ${a.uptimePct}% uptime</div>
      </div>`;
    }).join('');
  } else renderKpiRow();
});
document.getElementById('an-export').addEventListener('click', ()=>{
  downloadCSV('provider_analytics.csv', ['Provider','Revenue','Bets','Coverage %','Uptime %','Latency (ms)','Margin %'],
    Array.from(activeProviderFilter).map(id=>{ const p=providerById(id), a=ANALYTICS_SUMMARY[id]; return [p.name,a.revenue,a.bets,a.coveragePct,a.uptimePct,a.latencyMs,a.marginPct]; }));
});

/* ============================================================
   AUDIT LOG
   ============================================================ */
function renderAuditLog(){
  const areaF = document.getElementById('al-filter-area').value;
  const userF = document.getElementById('al-filter-user').value.toLowerCase();
  const rows = AUDIT_LOG.filter(a=> (!areaF || a.area===areaF) && (!userF || a.user.toLowerCase().includes(userF)) );
  document.getElementById('al-count').textContent = rows.length;
  document.getElementById('audit-tbody').innerHTML = rows.map(a=>`
    <tr>
      <td>${fmtDate(a.ts)}</td>
      <td>${a.user}</td>
      <td><span class="badge badge-gray">${a.area}</span></td>
      <td>${a.action}</td>
      <td class="muted">${a.detail}</td>
    </tr>`).join('') || `<tr><td colspan="5"><div class="empty-state">No matching audit entries.</div></td></tr>`;
}
document.getElementById('al-filter-area').addEventListener('change', renderAuditLog);
document.getElementById('al-filter-user').addEventListener('input', renderAuditLog);
document.getElementById('al-export').addEventListener('click', ()=>{
  downloadCSV('audit_log.csv', ['Timestamp','User','Area','Action','Detail'], AUDIT_LOG.map(a=>[a.ts,a.user,a.area,a.action,a.detail]));
});

/* ============================================================
   AI ASSISTANT (rule-based demo NLU)
   ============================================================ */
const aiMessages = document.getElementById('ai-messages');
function aiSay(text, from='agent'){
  const div = document.createElement('div');
  div.className = `ai-msg ${from}`;
  div.innerHTML = `${text}<span class="ts">${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>`;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return div;
}
function aiConfirmCard(title, lines, onYes){
  const div = document.createElement('div');
  div.className = 'ai-msg agent';
  div.innerHTML = `<div class="ai-confirm-card">
      <div class="ai-confirm-card__title">${title}</div>
      <ul>${lines.map(l=>`<li>${l}</li>`).join('')}</ul>
      <div class="actions">
        <button class="btn btn-primary btn-sm" data-yes>Yes, confirm</button>
        <button class="btn btn-tertiary btn-sm" data-no>Cancel</button>
      </div>
    </div><span class="ts">${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>`;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  div.querySelector('[data-yes]').onclick = () => { div.querySelector('.actions').innerHTML = '<span class="muted" style="font-size:11px;">Confirmed</span>'; onYes(); };
  div.querySelector('[data-no]').onclick = () => { div.querySelector('.actions').innerHTML = '<span class="muted" style="font-size:11px;">Cancelled</span>'; aiSay('No problem — cancelled, nothing changed.'); };
}
function findSportByName(name){
  name = name.toLowerCase();
  return SPORTS.find(s=> s.name.toLowerCase().includes(name) || name.includes(s.name.toLowerCase().split(' ')[0]));
}
function findProviderByName(name){
  name = name.toLowerCase();
  return PROVIDERS.find(p=> p.name.toLowerCase()===name || p.short.toLowerCase()===name || name.includes(p.name.toLowerCase()));
}
function handleAiInput(raw){
  const text = raw.trim(); if(!text) return;
  aiSay(text, 'user');
  const lower = text.toLowerCase();

  // "set X as default for Y"
  let m = lower.match(/set (.+?) as default for (.+?)(\.|$)/);
  if (m){
    const provider = findProviderByName(m[1].trim());
    const sport = findSportByName(m[2].trim());
    if (!provider){ aiSay(`I don't recognise a provider called "${m[1].trim()}". Try BetRadar, BetGenious, Inspired or Highlight.`); return; }
    if (!sport){ aiSay(`I couldn't find a sport matching "${m[2].trim()}" in scope for this demo (Soccer Virtuals, European Basketball, Cricket, F1, eBasketball).`); return; }
    setTimeout(()=> aiSay(`Should I apply this to both Pre-Match and In-Play for ${sport.name}? (Yes / No)`), 300);
    const yesHandler = () => {
      setTimeout(()=> aiConfirmCard(`Confirm: set ${provider.name} as default for ${sport.name}`, [
        `Sport: ${sport.name}`, `Match types: Pre-Match and In-Play`, `Provider: ${provider.name}`,
        isMapped(provider.id, sport.competitions[0].id) ? 'GTH mapping: OK' : '⚠ Some competitions under this sport are not yet mapped — save will be blocked until resolved.'
      ], ()=>{
        pendingHierarchy[`sport:${sport.id}`] = provider.id;
        renderHierarchyTree();
        aiSay(`Done — queued as a pending change on the Blending Configuration screen. <a onclick="goToView('blending-config'); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Open Blending Configuration</a> to review and save.`);
      }), 300);
    };
    pendingAiYes = yesHandler;
    return;
  }

  // simple yes/no continuation
  if (/^(yes|yeah|yep|confirm)\.?$/.test(lower) && pendingAiYes){ const h = pendingAiYes; pendingAiYes=null; h(); return; }
  if (/^(no|cancel)\.?$/.test(lower) && pendingAiYes){ pendingAiYes=null; aiSay('Cancelled — nothing changed.'); return; }

  // "map A's B to our B"
  if (/^map /.test(lower)){
    aiSay(`I found 1 close match in Provider Mappings for that description. <a onclick="goToView('mappings'); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Review it in Provider Mappings</a> — I'll act on it there so you can double-check the AI suggestion before confirming.`);
    return;
  }

  // "override event X to use Y for in-play/pre-match"
  m = lower.match(/override (?:event )?([a-z0-9-]+) to use (.+?) for (in-play|pre-match|prematch|inplay)/);
  if (m){
    const evt = EVENTS.find(e=>e.id.toLowerCase()===m[1].toLowerCase());
    const provider = findProviderByName(m[2].trim());
    const mt = m[3].includes('pre') ? 'prematch' : 'inplay';
    const mtLabel = mt==='prematch' ? 'Pre-Match' : 'In-Play';
    if (!evt){ aiSay(`I can't find event "${m[1]}". Double-check the event ID (e.g. EVT-30070).`); return; }
    if (!provider){ aiSay(`I don't recognise that provider.`); return; }
    aiConfirmCard(`Confirm: override ${evt.id} — ${mtLabel} → ${provider.name}`, [
      evt.name, `${mtLabel} provider → ${provider.name}`,
      isMapped(provider.id, evt.competition, mt) ? 'GTH mapping: OK' : '⚠ Not mapped for this competition — will be flagged as a conflict but still applied.'
    ], ()=>{
      EVENT_OVERRIDES.push({
        id: genOverrideId(), scope:'event', eventId:evt.id, sportId:evt.sport,
        competitionId:evt.competition, marketType:null, matchType:mt, provider:provider.id,
        expiresAt:null, createdAt:new Date().toISOString(), createdBy:'m.tato', note:'Created via AI Assistant'
      });
      logAudit('Level 2 — Event Overrides','Override applied (via AI Assistant)',`${evt.id}: ${mtLabel} → ${provider.name}`);
      renderOverridesList();
      aiSay(`Applied. <a onclick="goToView('event-overrides'); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Open Event Overrides</a> to see it.`);
    });
    return;
  }

  // Queries
  m = lower.match(/which provider is default for (.+?)(\s+pre-match|\s+in-play)?\??$/);
  if (m){
    const sport = findSportByName(m[1].trim());
    if (!sport){ aiSay(`I couldn't match that to an in-scope sport.`); return; }
    aiSay(`<strong>${sport.name}</strong> default: Pre-Match ${providerById(sport.prematch)?.name || 'not set'}, In-Play ${providerById(sport.inplay)?.name || 'not set'} (Sport level). Groups and competitions may override — check the tree in Blending Configuration.`);
    return;
  }
  if (lower.includes('unmapped') && lower.includes('for')){
    m = lower.match(/for (.+?)\??$/);
    const provider = m ? findProviderByName(m[1].trim()) : null;
    const items = GTH_MAPPINGS.filter(x=> (x.status==='suggested'||x.status==='unmapped') && (!provider || x.provider===provider.id));
    aiSay(items.length
      ? `${items.length} unmapped item(s)${provider?` for ${provider.name}`:''}:<ul>${items.map(i=>`<li>${providerPathLabel(i)}</li>`).join('')}</ul>`
      : `No unmapped items${provider?` for ${provider.name}`:''} 🎉`);
    return;
  }
  m = lower.match(/uptime.*for (.+?)( last month)?\??$/);
  if (m){
    const provider = findProviderByName(m[1].trim());
    if (!provider){ aiSay(`I don't recognise that provider.`); return; }
    aiSay(`${provider.name} uptime, last 30 days: <strong>${PROVIDER_HEALTH[provider.id].uptime30d}%</strong> (currently ${PROVIDER_HEALTH[provider.id].status}).`);
    return;
  }

  aiSay(`I didn't quite catch that. Try one of the suggestions below, or phrase it like "Set BetRadar as default for Cricket" or "What's the uptime % for Inspired last month?"`);
}
let pendingAiYes = null;
document.getElementById('ai-send').addEventListener('click', ()=>{
  const input = document.getElementById('ai-input');
  if (input.value.trim()) handleAiInput(input.value);
  input.value='';
});
document.getElementById('ai-input').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('ai-send').click(); });
// '/' focuses the active view's in-content search box, if it has one
document.addEventListener('keydown', e=>{
  if (e.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){
    const box = document.querySelector('.view.active [data-search]');
    if (box){ e.preventDefault(); box.focus(); }
  }
});
function openAiPanel(){ document.getElementById('ai-panel').classList.add('open'); document.documentElement.style.setProperty('--panel-offset','360px'); }
function closeAiPanel(){ document.getElementById('ai-panel').classList.remove('open'); document.documentElement.style.setProperty('--panel-offset','0px'); }
document.getElementById('ai-fab').addEventListener('click', openAiPanel);
document.getElementById('ai-close').addEventListener('click', closeAiPanel);
document.getElementById('ai-suggestions').innerHTML = AI_SUGGESTIONS.map(s=>`<span class="ai-suggestion-chip" onclick="document.getElementById('ai-input').value='${s.replace(/'/g,"\\'")}'; document.getElementById('ai-send').click();">${s}</span>`).join('');

/* ============================================================
   INIT
   ============================================================ */
function init(){
  aiSay(`Hi — I can configure providers or answer questions in plain language. Try: "Set BetRadar as default for Tennis" (Journey 6 from the PRD) or one of the suggestions below.`);
  populateProviderFilter();
  populateOverrideFilters();
  renderHierarchyTree();
  renderOverridesList();
  populateLogFilterProvider();
  renderAutomationLog();
  renderProviderDashboard();
  refreshAllMappingTabs();
  renderProviderFilterChips();
  renderAnalytics();
  renderAuditLog();
  goToView('blending-config');
}
init();

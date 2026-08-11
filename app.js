/* ============================================================
   APP — Feed Provider Blending & Integration Platform (prototype)
   Vanilla JS, no build step. All writes are in-memory only.
   ============================================================ */

const ICONS = {
  chevron:  `<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>`,
  check:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>`,
  x:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  edit:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  trash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6h12z"/></svg>`,
  history:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4L10 14M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>`,
  alert:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  info:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
  more:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>`,
  search:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,
  sportIcon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--fg-muted);flex:none;"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  competitionIcon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--fg-muted);flex:none;"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`,
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
function statusBadge(status){
  return status === 'in-play'
    ? `<span class="badge badge-red"><span class="dot"></span>In-Play</span>`
    : `<span class="badge badge-blue"><span class="dot"></span>Pre-Match</span>`;
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
  el.innerHTML = `<div style="flex:1;"><strong>${title}</strong><p>${body||''}</p></div><span class="toast-close">${ICONS.x}</span>`;
  el.querySelector('.toast-close').onclick = () => el.remove();
  stack.appendChild(el);
  setTimeout(()=>el.remove(), ms);
}
function openOverlay(id){ document.getElementById(id).classList.add('open'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(el=>el.onclick=()=>closeOverlay(el.dataset.close));
document.querySelectorAll('.overlay').forEach(ov=>ov.addEventListener('click', e=>{ if(e.target===ov) closeOverlay(ov.id); }));
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

/* ============================================================
   NAV / VIEW SWITCHING + CONTEXT-AWARE HEADER SEARCH
   ============================================================ */
const VIEW_LABELS = {
  'blending-config':'Blending Configuration', 'event-overrides':'Event Overrides',
  'automation':'Automated Actions', 'analytics':'Provider Analytics',
  'mappings':'Provider Mappings', 'audit-log':'Audit Log'
};
let bcSearchQuery = '';
let eoSearchQuery = '';
function updateHeaderSearchForView(view){
  const input = document.getElementById('global-search');
  if (view === 'blending-config'){ input.disabled=false; input.placeholder='Search sports or competitions…'; input.value=bcSearchQuery; }
  else if (view === 'event-overrides'){ input.disabled=false; input.placeholder='Search by event ID or name…'; input.value=eoSearchQuery; }
  else { input.disabled=true; input.placeholder='Search available on Blending Configuration & Event Overrides'; input.value=''; }
}
document.getElementById('global-search').addEventListener('input', function(){
  const view = document.querySelector('.nav-item.active')?.dataset.view;
  if (view === 'blending-config'){ bcSearchQuery = this.value; renderHierarchyTree(); }
  else if (view === 'event-overrides'){ eoSearchQuery = this.value; renderEventsTable(); }
});

document.querySelectorAll('.nav-item[data-view]').forEach(item=>{
  item.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    item.classList.add('active');
    const view = item.dataset.view;
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+view).classList.add('active');
    document.getElementById('ai-context').textContent = 'Context: ' + VIEW_LABELS[view];
    updateHeaderSearchForView(view);
    if (view === 'audit-log') renderAuditLog();
  });
});
// Tabs (also handles nested sub-tabs, e.g. Active Mappings > Competitions/Market Types) —
// scoped to direct-child tab-panels so an outer tab switch never disturbs a nested one.
document.querySelectorAll('.tabs').forEach(tabbar=>{
  tabbar.querySelectorAll('.tab').forEach(tab=>{
    tab.addEventListener('click', (e)=>{
      e.stopPropagation();
      tabbar.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const panelWrap = tabbar.parentElement;
      panelWrap.querySelectorAll(':scope > .tab-panel').forEach(p=>p.classList.remove('active'));
      panelWrap.querySelector('#tab-'+tab.dataset.tab).classList.add('active');
    });
  });
});

/* Theme toggle */
document.getElementById('theme-toggle').addEventListener('click', ()=>{
  const html = document.documentElement;
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  renderRevenueChart(); renderBetsChart(); // re-render svg charts w/ theme-aware colors
});

document.getElementById('notif-btn').addEventListener('click', ()=> document.querySelector('.nav-item[data-view="mappings"]').click());

/* Documentation panel */
document.getElementById('docs-btn').addEventListener('click', ()=>{ renderDocsPanel(); document.getElementById('docs-panel').classList.add('open'); });
document.getElementById('docs-close').addEventListener('click', ()=> document.getElementById('docs-panel').classList.remove('open'));

/* ============================================================
   LEVEL 1 — BLENDING CONFIGURATION (hierarchy tree)
   ============================================================ */
const pendingHierarchy = {}; // key -> providerId|null
const openTreeNodes = new Set(); // persists expand/collapse state across re-renders

function effectiveMatchTypeProvider(sport, comp, matchType){
  const key = `${comp.id}:${matchType}`;
  if (key in pendingHierarchy) return { value:pendingHierarchy[key], source:'pending' };
  if (MATCHTYPE_DEFAULTS[key]) return { value:MATCHTYPE_DEFAULTS[key], source:'own' };
  const compKey = `comp:${comp.id}`;
  const compProvider = (compKey in pendingHierarchy) ? pendingHierarchy[compKey] : comp.defaultProvider;
  if (compProvider) return { value:compProvider, source:'competition' };
  const sportKey = `sport:${sport.id}`;
  const sportProvider = (sportKey in pendingHierarchy) ? pendingHierarchy[sportKey] : sport.defaultProvider;
  return { value:sportProvider, source:'sport' };
}
function effectiveCompProvider(sport, comp){
  const compKey = `comp:${comp.id}`;
  if (compKey in pendingHierarchy) return { value:pendingHierarchy[compKey], source:'pending' };
  if (comp.defaultProvider) return { value:comp.defaultProvider, source:'own' };
  const sportKey = `sport:${sport.id}`;
  const sportProvider = (sportKey in pendingHierarchy) ? pendingHierarchy[sportKey] : sport.defaultProvider;
  return { value:sportProvider, source:'sport' };
}

function providerOptions(selectedId, includeInherit, inheritLabel){
  let html = includeInherit ? `<option value="">${inheritLabel}</option>` : '';
  PROVIDERS.forEach(p=>{ html += `<option value="${p.id}" ${p.id===selectedId?'selected':''}>${p.name}</option>`; });
  return html;
}

function renderHierarchyTree(){
  const root = document.getElementById('hierarchy-tree');
  const q = bcSearchQuery.trim().toLowerCase();
  root.innerHTML = SPORTS.map(sport=>{
    const compMatches = sport.competitions.filter(c=>c.name.toLowerCase().includes(q));
    const sportMatches = sport.name.toLowerCase().includes(q);
    if (q && !sportMatches && compMatches.length===0) return '';
    const visibleComps = (q && !sportMatches) ? compMatches : sport.competitions;
    if (q) openTreeNodes.add('sport-'+sport.id);

    const sportKey = `sport:${sport.id}`;
    const sportVal = (sportKey in pendingHierarchy) ? pendingHierarchy[sportKey] : sport.defaultProvider;
    const isPending = sportKey in pendingHierarchy;
    const sportOpen = openTreeNodes.has('sport-'+sport.id);
    return `
    <div class="tree-node" data-sport="${sport.id}">
      <div class="tree-row ${sportOpen?'open':''}" data-toggle="sport-${sport.id}" style="${isPending?'background:var(--bg-warning);':''}">
        ${ICONS.chevron}
        ${ICONS.sportIcon}
        <span class="name">${sport.name}</span>
        <select class="select input-sm" style="width:150px;margin-left:8px;" onclick="event.stopPropagation()" onchange="onHierarchyChange('${sportKey}', this.value)">
          ${providerOptions(sportVal, false, '')}
        </select>
        <div class="tree-row__meta">
          <span class="count">${visibleComps.length} competitions</span>
          ${isPending?'<span class="badge badge-yellow">unsaved</span>':''}
        </div>
      </div>
      <div class="tree-children tree-lvl2 ${sportOpen?'open':''}" id="sport-${sport.id}">
        ${visibleComps.map(comp=>{
          const compKey = `comp:${comp.id}`;
          const eff = effectiveCompProvider(sport, comp);
          const isPendingComp = compKey in pendingHierarchy;
          const mapped = isMapped(eff.value, comp.id);
          const compOpen = openTreeNodes.has('comp-'+comp.id) || !!q;
          return `
          <div class="tree-node" data-comp="${comp.id}">
            <div class="tree-row ${compOpen?'open':''}" data-toggle="comp-${comp.id}" style="${isPendingComp?'background:var(--bg-warning);':''}">
              ${ICONS.chevron}
              ${ICONS.competitionIcon}
              <span class="name">${comp.name}</span>
              <select class="select input-sm" style="width:170px;margin-left:8px;" onclick="event.stopPropagation()" onchange="onHierarchyChange('${compKey}', this.value)">
                ${providerOptions(compKey in pendingHierarchy ? pendingHierarchy[compKey] : comp.defaultProvider, true, `Inherit from ${sport.name} (${providerById(sportVal)?.name||'none'})`)}
              </select>
              <div class="tree-row__meta">
                ${!mapped?`<span title="Provider not mapped to GTH for this competition">${ICONS.alert.replace('<svg ', '<svg style="width:14px;height:14px;color:var(--fg-error)" ')}</span>`:''}
                <span class="count">${comp.events} events</span>
                ${isPendingComp?'<span class="badge badge-yellow">unsaved</span>':''}
              </div>
            </div>
            <div class="tree-children tree-lvl3 ${compOpen?'open':''}" id="comp-${comp.id}">
              ${['prematch','inplay'].map(mt=>{
                const key = `${comp.id}:${mt}`;
                const label = mt==='prematch' ? 'Pre-Match' : 'In-Play';
                const eff2 = effectiveMatchTypeProvider(sport, comp, mt);
                const isPendingMt = key in pendingHierarchy;
                const mtMapped = isMapped(eff2.value, comp.id, mt);
                return `
                <div class="tree-row" style="${isPendingMt?'background:var(--bg-warning);':''}">
                  <span style="width:12px;"></span>
                  <span class="matchtype-dot ${mt}"></span>
                  <span class="name" style="font-weight:500;">${label}</span>
                  <select class="select input-sm" style="width:190px;margin-left:8px;" onchange="onHierarchyChange('${key}', this.value)">
                    ${providerOptions(key in pendingHierarchy ? pendingHierarchy[key] : (MATCHTYPE_DEFAULTS[key]||''), true, `Inherit (${providerById(eff2.value)?.name || 'none'})`)}
                  </select>
                  <div class="tree-row__meta">
                    ${!mtMapped?`<span title="Provider not mapped to GTH">${ICONS.alert.replace('<svg ', '<svg style="width:13px;height:13px;color:var(--fg-error)" ')}</span>`:''}
                    ${isPendingMt?'<span class="badge badge-yellow">unsaved</span>':''}
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('') || `<div class="empty-state">No sports or competitions match “${bcSearchQuery}”.</div>`;

  root.querySelectorAll('[data-toggle]').forEach(row=>{
    row.addEventListener('click', ()=>{
      const id = row.dataset.toggle;
      if (openTreeNodes.has(id)) openTreeNodes.delete(id); else openTreeNodes.add(id);
      row.classList.toggle('open');
      document.getElementById(id).classList.toggle('open');
    });
  });
  updatePendingBar();
}

function onHierarchyChange(key, value){
  pendingHierarchy[key] = value || null;
  renderHierarchyTree();
}
function updatePendingBar(){
  const n = Object.keys(pendingHierarchy).length;
  document.getElementById('bc-save').disabled = n===0;
  document.getElementById('bc-pending-alert').style.display = n>0 ? 'block' : 'none';
  document.getElementById('bc-pending-count').textContent = ` ${n}`;
}
document.getElementById('bc-expand-all').addEventListener('click', ()=>{
  SPORTS.forEach(s=>{ openTreeNodes.add('sport-'+s.id); s.competitions.forEach(c=>openTreeNodes.add('comp-'+c.id)); });
  renderHierarchyTree();
});
document.getElementById('bc-collapse-all').addEventListener('click', ()=>{
  openTreeNodes.clear();
  renderHierarchyTree();
});
document.getElementById('bc-export').addEventListener('click', ()=>{
  const headers = ['Sport','Competition','Match Type','Effective Provider','Source','GTH Mapped'];
  const rows = [];
  SPORTS.forEach(sport=> sport.competitions.forEach(comp=>{
    ['prematch','inplay'].forEach(mt=>{
      const eff = effectiveMatchTypeProvider(sport, comp, mt);
      rows.push([sport.name, comp.name, mt==='prematch'?'Pre-Match':'In-Play', providerById(eff.value)?.name || '(none)', eff.source, isMapped(eff.value, comp.id, mt)?'Yes':'No']);
    });
  }));
  downloadCSV('blending_configuration.csv', headers, rows);
  toast('success','Export ready', 'blending_configuration.csv downloaded.');
});

document.getElementById('bc-save').addEventListener('click', ()=>{
  // validate every pending change against GTH mapping
  const unmapped = [];
  Object.entries(pendingHierarchy).forEach(([key, providerId])=>{
    if (!providerId) return;
    if (key.startsWith('sport:')){
      const sportId = key.split(':')[1];
      const sport = SPORTS.find(s=>s.id===sportId);
      sport.competitions.forEach(c=>{ if(!isMapped(providerId, c.id)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${sport.name} → ${c.name}`}); });
    } else if (key.startsWith('comp:')){
      const compId = key.split(':')[1];
      const comp = SPORTS.flatMap(s=>s.competitions).find(c=>c.id===compId);
      if (!isMapped(providerId, compId)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${comp.name}`});
    } else {
      const [compId, mt] = key.split(':');
      const comp = SPORTS.flatMap(s=>s.competitions).find(c=>c.id===compId);
      if (!isMapped(providerId, compId, mt)) unmapped.push({providerId, path:`${providerById(providerId).name} → ${comp.name} → ${mt==='prematch'?'Pre-Match':'In-Play'}`});
    }
  });
  if (unmapped.length){
    document.getElementById('validation-unmapped-items').innerHTML = unmapped.map(u=>`
      <div class="alert alert-warning" style="margin-bottom:8px;">
        ${ICONS.alert} <div><strong>${u.path}</strong>No confirmed mapping to internal GTH hierarchy.</div>
      </div>`).join('');
    openOverlay('overlay-validation');
    return;
  }
  const count = Object.keys(pendingHierarchy).length;
  Object.entries(pendingHierarchy).forEach(([key,val])=>{
    logAudit('Level 1 — Blending Config', 'Default provider changed', `${key} → ${val?providerById(val).name:'(inherit)'}`);
    if (key.startsWith('sport:')){
      SPORTS.find(s=>s.id===key.split(':')[1]).defaultProvider = val;
    } else if (key.startsWith('comp:')){
      SPORTS.flatMap(s=>s.competitions).find(c=>c.id===key.split(':')[1]).defaultProvider = val;
    } else if (val){
      MATCHTYPE_DEFAULTS[key] = val;
    } else {
      delete MATCHTYPE_DEFAULTS[key];
    }
  });
  Object.keys(pendingHierarchy).forEach(k=>delete pendingHierarchy[k]);
  renderHierarchyTree();
  renderEventsTable();
  toast('success', 'Configuration saved', `${count} level(s) updated. New events under these nodes will auto-assign to the selected provider.`);
});
document.getElementById('validation-goto-mappings').addEventListener('click', ()=>{
  closeOverlay('overlay-validation');
  document.querySelector('.nav-item[data-view="mappings"]').click();
});

/* ============================================================
   LEVEL 2 — EVENT OVERRIDES
   ============================================================ */
let selectedEvents = new Set();

function populateEventFilters(){
  const sportSel = document.getElementById('eo-filter-sport');
  SPORTS.forEach(s=> sportSel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
  sportSel.addEventListener('change', ()=>{
    const compSel = document.getElementById('eo-filter-competition');
    compSel.innerHTML = '<option value="">All competitions</option>';
    const sport = SPORTS.find(s=>s.id===sportSel.value);
    if (sport) sport.competitions.forEach(c=> compSel.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    renderEventsTable();
  });
  ['eo-filter-competition','eo-filter-status','eo-filter-range','eo-filter-override'].forEach(id=>{
    document.getElementById(id).addEventListener('change', renderEventsTable);
  });
}

function filteredEvents(){
  const sport = document.getElementById('eo-filter-sport').value;
  const comp = document.getElementById('eo-filter-competition').value;
  const status = document.getElementById('eo-filter-status').value;
  const range = document.getElementById('eo-filter-range').value;
  const hasOverride = document.getElementById('eo-filter-override').value;
  const q = eoSearchQuery.trim().toLowerCase();
  return EVENTS.filter(e=>{
    if (sport && e.sport !== sport) return false;
    if (comp && e.competition !== comp) return false;
    if (status && e.status !== status) return false;
    if (range !== 'custom'){
      const maxH = parseInt(range,10)*24;
      const diffH = (e.start - now)/3600000;
      if (diffH > maxH || diffH < -6) return false;
    }
    const overridden = !!(e.overrides.prematch || e.overrides.inplay);
    if (hasOverride === 'yes' && !overridden) return false;
    if (hasOverride === 'no' && overridden) return false;
    if (q && !(e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q))) return false;
    return true;
  }).sort((a,b)=>a.start-b.start);
}

// The effective provider for a slot is always computed live from the Level-1
// hierarchy, unless this event has an override for that specific slot.
function effectiveEventProvider(evt, matchType){
  const ov = evt.overrides[matchType];
  if (ov) return { value: ov.provider, overridden:true, meta:ov };
  const sport = sportByCompetitionId(evt.competition);
  const comp = sport.competitions.find(c=>c.id===evt.competition);
  const eff = effectiveMatchTypeProvider(sport, comp, matchType);
  return { value: eff.value, overridden:false };
}

function inlineProviderSelect(evt, matchType){
  const eff = effectiveEventProvider(evt, matchType);
  const mapped = isMapped(eff.value, evt.competition, matchType);
  const sport = sportByCompetitionId(evt.competition);
  const comp = sport.competitions.find(c=>c.id===evt.competition);
  const defaultProv = effectiveMatchTypeProvider(sport, comp, matchType).value;
  const options = `<option value="">Use default (${providerById(defaultProv)?.name || 'none'})</option>` +
    PROVIDERS.map(p=>`<option value="${p.id}" ${eff.overridden && eff.value===p.id ? 'selected' : ''}>${p.name}</option>`).join('');
  const cls = eff.overridden ? 'override-select override-select--active' : 'override-select';
  const errStyle = !mapped ? 'border-color:var(--border-error);' : '';
  return `<select class="select input-sm ${cls}" style="width:180px;${errStyle}" onchange="onInlineOverrideChange('${evt.id}','${matchType}', this.value)">${options}</select>`;
}

function renderEventsTable(){
  const rows = filteredEvents();
  document.getElementById('eo-result-count').textContent = `${rows.length} event${rows.length!==1?'s':''}`;
  document.getElementById('events-tbody').innerHTML = rows.map(e=>{
    const overridden = !!(e.overrides.prematch || e.overrides.inplay);
    return `
    <tr data-evt="${e.id}" class="${selectedEvents.has(e.id)?'selected':''} ${overridden?'row-override':''}">
      <td><div class="checkbox ${selectedEvents.has(e.id)?'checked':''}" onclick="toggleEventSelect('${e.id}')">${selectedEvents.has(e.id)?ICONS.check:''}</div></td>
      <td><strong>${e.name}</strong><br><span class="mono">${e.id}</span></td>
      <td>${competitionName(e.competition)}</td>
      <td>${fmtDate(e.start)}<br><span class="muted" style="font-size:11px;">${relTime(e.start)}</span></td>
      <td>${statusBadge(e.status)}</td>
      <td>${inlineProviderSelect(e,'prematch')}</td>
      <td>${inlineProviderSelect(e,'inplay')}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="7"><div class="empty-state">No events match these filters.</div></td></tr>`;
}
function toggleEventSelect(id){
  if (selectedEvents.has(id)) selectedEvents.delete(id); else selectedEvents.add(id);
  renderEventsTable();
  const bar = document.getElementById('eo-bulk-bar');
  bar.style.display = selectedEvents.size>0 ? 'flex' : 'none';
  document.getElementById('eo-selected-count').textContent = `${selectedEvents.size} selected`;
}
document.getElementById('eo-bulk-clear').addEventListener('click', ()=>{ selectedEvents.clear(); renderEventsTable(); document.getElementById('eo-bulk-bar').style.display='none'; });

function onInlineOverrideChange(eventId, matchType, value){
  const evt = EVENTS.find(e=>e.id===eventId);
  const label = matchType==='prematch' ? 'Pre-Match' : 'In-Play';
  if (!value){
    evt.overrides[matchType] = null;
    logAudit('Level 2 — Event Overrides','Override cleared',`${evt.id}: ${label} reverted to default`);
    toast('default','Reverted to default', `${evt.name} — ${label}`);
  } else {
    evt.overrides[matchType] = { provider:value, at:new Date().toISOString(), by:'m.tato' };
    const mapped = isMapped(value, evt.competition, matchType);
    logAudit('Level 2 — Event Overrides','Override applied',`${evt.id}: ${label} → ${providerById(value).name}`);
    if (!mapped) toast('warning','Override applied — mapping conflict', `${providerById(value).name} isn't mapped to this competition yet.`);
    else toast('success','Override applied', `${evt.name} — ${label} → ${providerById(value).name}`);
  }
  renderEventsTable();
}

// Bulk override (multi-select) still uses a drawer — the one case a single
// inline cell can't cover.
function openBulkOverrideDrawer(bulkIds){
  document.getElementById('override-drawer-title').textContent = `Bulk override — ${bulkIds.length} events`;
  document.getElementById('override-drawer-subtitle').textContent = 'Applies the selected provider(s) to every selected event. Leave a field blank to not touch that slot.';
  document.getElementById('override-drawer-body').innerHTML = `
    <div class="field">
      <label>Pre-Match provider</label>
      <select class="select" id="ov-prematch">
        <option value="">Don't change</option>
        ${PROVIDERS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label>In-Play provider</label>
      <select class="select" id="ov-inplay">
        <option value="">Don't change</option>
        ${PROVIDERS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    </div>
  `;
  document.getElementById('override-apply').onclick = () => {
    const pre = document.getElementById('ov-prematch').value;
    const inp = document.getElementById('ov-inplay').value;
    bulkIds.map(id=>EVENTS.find(ev=>ev.id===id)).forEach(ev=>{
      if (pre){ ev.overrides.prematch = {provider:pre, at:new Date().toISOString(), by:'m.tato'}; logAudit('Level 2 — Event Overrides','Override applied (bulk)',`${ev.id}: Pre-Match → ${providerById(pre).name}`); }
      if (inp){ ev.overrides.inplay = {provider:inp, at:new Date().toISOString(), by:'m.tato'}; logAudit('Level 2 — Event Overrides','Override applied (bulk)',`${ev.id}: In-Play → ${providerById(inp).name}`); }
    });
    closeDrawer('drawer-override');
    renderEventsTable();
    toast('success', 'Bulk override applied', `${bulkIds.length} events updated.`);
    selectedEvents.clear();
    document.getElementById('eo-bulk-bar').style.display = 'none';
  };
  openDrawer('drawer-override');
}
document.getElementById('eo-bulk-override').addEventListener('click', ()=> openBulkOverrideDrawer(Array.from(selectedEvents)));

// Saved filter presets
function renderPresets(){
  document.getElementById('eo-presets-list').innerHTML = SAVED_PRESETS.map(p=>`
    <span class="ai-suggestion-chip" onclick="applyPreset('${p.id}')">${p.name}</span>
  `).join('') || '<span class="muted" style="font-size:12px;">No saved presets yet.</span>';
}
function applyPreset(id){
  const p = SAVED_PRESETS.find(x=>x.id===id); if(!p) return;
  document.getElementById('eo-filter-sport').value = p.filters.sport;
  document.getElementById('eo-filter-sport').dispatchEvent(new Event('change'));
  setTimeout(()=>{
    document.getElementById('eo-filter-competition').value = p.filters.competition || '';
    document.getElementById('eo-filter-status').value = p.filters.status;
    document.getElementById('eo-filter-range').value = p.filters.range;
    document.getElementById('eo-filter-override').value = p.filters.override;
    renderEventsTable();
  }, 0);
  toast('default','Preset applied', p.name);
}
document.getElementById('eo-save-preset').addEventListener('click', ()=>{
  const name = prompt('Name this filter preset:');
  if (!name) return;
  const filters = {
    sport: document.getElementById('eo-filter-sport').value,
    competition: document.getElementById('eo-filter-competition').value,
    status: document.getElementById('eo-filter-status').value,
    range: document.getElementById('eo-filter-range').value,
    override: document.getElementById('eo-filter-override').value,
  };
  SAVED_PRESETS.push({ id:'p'+Date.now(), name, filters });
  renderPresets();
  toast('success','Preset saved', name);
});

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
    return `<div class="flex-gap-3" style="padding:10px 14px;border-bottom:1px solid var(--border-subtle);align-items:flex-start;">
      <span class="badge ${cls}" style="flex:none;margin-top:2px;">${label}</span>
      <div style="flex:1;">
        <div style="font-size:12px;">${a.text}</div>
        <div class="muted" style="font-size:11px;margin-top:2px;">${providerById(a.provider).name} · ${sportName(a.sport)} — ${a.competition} · ${fmtDate(a.ts)} · ${relTime(a.ts)}</div>
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

function renderProviderHealth(){
  document.getElementById('provider-health-cards').innerHTML = PROVIDERS.map(p=>{
    const h = PROVIDER_HEALTH[p.id];
    return `<div class="card card-pad">
      <div class="flex-between"><strong style="font-size:13px;">${p.name}</strong>${healthBadge(h.status)}</div>
      <div class="kpi__value" style="font-size:20px;margin-top:10px;">${h.uptime30d}%</div>
      <div class="kpi__sub">uptime, last 30 days</div>
    </div>`;
  }).join('');
}
function gaugeSvg(pct, color){
  const r=26, c=2*Math.PI*r, off = c*(1-pct/100);
  return `<svg width="64" height="64" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--bg-muted)" stroke-width="6"/>
    <circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
  </svg>`;
}
function renderCoverage(){
  document.getElementById('coverage-gauges').innerHTML = COVERAGE.map(c=>{
    const p = providerById(c.provider);
    return `<div style="text-align:center;">
      <div class="gauge">${gaugeSvg(c.pct, p.color)}<div class="gauge__label">${c.pct}%</div></div>
      <div style="font-size:12px;font-weight:600;margin-top:6px;">${p.name}</div>
      <div class="muted" style="font-size:11px;">${c.servedEvents}/${c.assignedEvents} events</div>
    </div>`;
  }).join('');
  document.getElementById('coverage-gaps-list').innerHTML = COVERAGE_GAPS.map(g=>`
    <div class="alert alert-${g.severity==='error'?'error':'warning'}" style="margin-bottom:8px;">
      ${ICONS.alert}<div><strong>${g.sport} — ${g.competition}</strong>${g.issue}</div>
    </div>`).join('') || `<div class="empty-state">No coverage gaps detected.</div>`;
}

/* ============================================================
   PROVIDER MAPPINGS (GTH) — unified model
   ============================================================ */
function mappingDisplayRow(rec){
  const g = rec.status === 'suggested' ? rec.suggestion : rec.gth;
  return {
    id: rec.id, level: rec.level, provider: rec.provider, providerName: providerById(rec.provider).name,
    providerSport: rec.providerSport, providerCompetition: rec.providerCompetition, providerMarketType: rec.providerMarketType || '—',
    gthSport: g && g.sportId ? sportName(g.sportId) : '—',
    gthCompetition: g && g.competitionId ? competitionName(g.competitionId) : '—',
    gthMarketType: g && g.marketType ? g.marketType : (rec.level==='marketType' ? '—' : ''),
    confidence: rec.status==='suggested' ? rec.suggestion.confidence : null,
    status: rec.status, rejectReason: rec.rejectReason || '', updated: rec.updated || '', by: rec.by || '',
  };
}

const tableState = {};
function getTableState(key){ return tableState[key] || (tableState[key] = { sortCol:null, sortDir:'asc', provider:'', text:'' }); }
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
function renderMappingTable(tableId, columns, rawRows, stateKey, rerender, actionsRenderer){
  const state = getTableState(stateKey);
  const textFields = columns.filter(c=>!c.key.startsWith('__')).map(c=>c.key);
  const rows = applyFilterSort(rawRows, state, textFields);
  const table = document.getElementById(tableId);
  const thead = table.querySelector('thead'), tbody = table.querySelector('tbody');
  thead.innerHTML = '<tr>' + columns.map(c=>{
    if (c.key.startsWith('__')) return '<th></th>';
    const arrow = state.sortCol===c.key ? (state.sortDir==='asc'?' ▲':' ▼') : '';
    return `<th class="sortable" data-col="${c.key}">${c.label}${arrow}</th>`;
  }).join('') + '</tr>';
  thead.onclick = (e) => {
    const th = e.target.closest('[data-col]'); if(!th) return;
    const col = th.dataset.col;
    if (state.sortCol===col) state.sortDir = state.sortDir==='asc'?'desc':'asc'; else { state.sortCol=col; state.sortDir='asc'; }
    rerender();
  };
  tbody.innerHTML = rows.map(r=>'<tr>' + columns.map(c=>{
    if (c.key==='__connector') return `<td style="text-align:center;width:32px;color:var(--fg-muted);">${ICONS.arrowRight}</td>`;
    if (c.key==='__actions') return `<td>${actionsRenderer(r)}</td>`;
    if (c.key==='providerName') return `<td><span class="badge badge-gray">${r.providerName}</span></td>`;
    if (c.key==='level') return `<td><span class="badge badge-gray">${r.level==='marketType'?'Market Type':'Competition'}</span></td>`;
    if (c.key==='confidence') return r.confidence==null ? '<td>—</td>' : `<td><div class="flex-gap-2"><div class="confidence-bar" style="width:60px;"><div class="confidence-bar__fill" style="width:${r.confidence}%;background:${r.confidence>=85?'var(--green-solid)':'var(--yellow-solid)'};"></div></div><span style="font-size:11px;font-weight:600;">${r.confidence}%</span></div></td>`;
    if (c.key==='status') return `<td>${r.status==='rejected'?`<span class="badge badge-yellow">Rejected — ${r.rejectReason}</span>`:'<span class="badge badge-red">Unmapped</span>'}</td>`;
    return `<td>${r[c.key] || '—'}</td>`;
  }).join('') + '</tr>').join('') || `<tr><td colspan="${columns.length}"><div class="empty-state">Nothing here.</div></td></tr>`;
}
function exportMappingCSV(rows, filename){
  downloadCSV(filename,
    ['Provider','Level','Provider Sport','Provider Competition','Provider Market Type','GTH Sport','GTH Competition','GTH Market Type','Confidence','Status','Reject Reason','Updated','By'],
    rows.map(r=>[r.providerName, r.level, r.providerSport, r.providerCompetition, r.providerMarketType, r.gthSport, r.gthCompetition, r.gthMarketType, r.confidence??'', r.status, r.rejectReason, r.updated, r.by]));
}

const COLS_SUGGESTED = [
  {key:'providerName', label:'Provider'}, {key:'level', label:'Level'},
  {key:'providerSport', label:'Provider Sport'}, {key:'providerCompetition', label:'Provider Competition'}, {key:'providerMarketType', label:'Provider Market Type'},
  {key:'__connector', label:''},
  {key:'gthSport', label:'Suggested GTH Sport'}, {key:'gthCompetition', label:'Suggested GTH Competition'}, {key:'gthMarketType', label:'Suggested Market Type'},
  {key:'confidence', label:'Confidence'}, {key:'__actions', label:''},
];
const COLS_ACTIVE_COMP = [
  {key:'providerName', label:'Provider'}, {key:'providerSport', label:'Provider Sport'}, {key:'providerCompetition', label:'Provider Competition'},
  {key:'__connector', label:''},
  {key:'gthSport', label:'GTH Sport'}, {key:'gthCompetition', label:'GTH Competition'},
  {key:'updated', label:'Last Updated'}, {key:'__actions', label:''},
];
const COLS_ACTIVE_MT = [
  {key:'providerName', label:'Provider'}, {key:'providerSport', label:'Provider Sport'}, {key:'providerCompetition', label:'Provider Competition'}, {key:'providerMarketType', label:'Provider Market Type'},
  {key:'__connector', label:''},
  {key:'gthSport', label:'GTH Sport'}, {key:'gthCompetition', label:'GTH Competition'}, {key:'gthMarketType', label:'GTH Market Type'},
  {key:'updated', label:'Last Updated'}, {key:'__actions', label:''},
];
const COLS_UNMAPPED_COMP = [
  {key:'providerName', label:'Provider'}, {key:'providerSport', label:'Provider Sport'}, {key:'providerCompetition', label:'Provider Competition'},
  {key:'status', label:'Status'}, {key:'__actions', label:''},
];
const COLS_UNMAPPED_MT = [
  {key:'providerName', label:'Provider'}, {key:'providerSport', label:'Provider Sport'}, {key:'providerCompetition', label:'Provider Competition'}, {key:'providerMarketType', label:'Provider Market Type'},
  {key:'status', label:'Status'}, {key:'__actions', label:''},
];

function renderSuggestedTab(){
  const rows = GTH_MAPPINGS.filter(m=>m.status==='suggested').map(mappingDisplayRow);
  renderFilterBar('filterbar-suggested', 'suggested', renderSuggestedTab, ()=>exportMappingCSV(rows,'suggested_maps.csv'));
  renderMappingTable('table-suggested', COLS_SUGGESTED, rows, 'suggested', renderSuggestedTab, (r)=>`
    <div class="flex-gap-1">
      <button class="btn btn-sm btn-primary" onclick="acceptSuggestion('${r.id}')">Accept</button>
      <button class="btn btn-sm btn-secondary" onclick="openGthSearch('${r.id}')">Change</button>
      <button class="btn btn-sm btn-tertiary" onclick="openReject('${r.id}')">Reject</button>
    </div>`);
}
function renderActiveCompTab(){
  const rows = GTH_MAPPINGS.filter(m=>m.status==='active' && m.level==='competition').map(mappingDisplayRow);
  renderFilterBar('filterbar-active-competitions', 'active-competitions', renderActiveCompTab, ()=>exportMappingCSV(rows,'active_mappings_competitions.csv'));
  renderMappingTable('table-active-competitions', COLS_ACTIVE_COMP, rows, 'active-competitions', renderActiveCompTab, (r)=>`
    <div class="flex-gap-1">
      <span class="icon-btn" style="width:24px;height:24px;" title="Edit" onclick="openGthSearch('${r.id}')">${ICONS.edit}</span>
      <span class="icon-btn" style="width:24px;height:24px;" title="History" onclick="showHistory('${r.id}')">${ICONS.history}</span>
      <span class="icon-btn" style="width:24px;height:24px;" title="Delete" onclick="deleteMapping('${r.id}')">${ICONS.trash}</span>
    </div>`);
}
function renderActiveMtTab(){
  const rows = GTH_MAPPINGS.filter(m=>m.status==='active' && m.level==='marketType').map(mappingDisplayRow);
  renderFilterBar('filterbar-active-markettypes', 'active-markettypes', renderActiveMtTab, ()=>exportMappingCSV(rows,'active_mappings_market_types.csv'));
  renderMappingTable('table-active-markettypes', COLS_ACTIVE_MT, rows, 'active-markettypes', renderActiveMtTab, (r)=>`
    <div class="flex-gap-1">
      <span class="icon-btn" style="width:24px;height:24px;" title="Edit" onclick="openGthSearch('${r.id}')">${ICONS.edit}</span>
      <span class="icon-btn" style="width:24px;height:24px;" title="History" onclick="showHistory('${r.id}')">${ICONS.history}</span>
      <span class="icon-btn" style="width:24px;height:24px;" title="Delete" onclick="deleteMapping('${r.id}')">${ICONS.trash}</span>
    </div>`);
}
function renderUnmappedCompTab(){
  const rows = GTH_MAPPINGS.filter(m=>(m.status==='unmapped'||m.status==='rejected') && m.level==='competition').map(mappingDisplayRow);
  renderFilterBar('filterbar-unmapped-competitions', 'unmapped-competitions', renderUnmappedCompTab, ()=>exportMappingCSV(rows,'unmapped_competitions.csv'));
  renderMappingTable('table-unmapped-competitions', COLS_UNMAPPED_COMP, rows, 'unmapped-competitions', renderUnmappedCompTab, (r)=>`
    <div class="flex-gap-1">
      <button class="btn btn-sm btn-secondary" onclick="openGthSearch('${r.id}')">Map</button>
      ${r.status==='unmapped' ? `<button class="btn btn-sm btn-tertiary" onclick="openReject('${r.id}')">Reject</button>` : ''}
    </div>`);
}
function renderUnmappedMtTab(){
  const rows = GTH_MAPPINGS.filter(m=>(m.status==='unmapped'||m.status==='rejected') && m.level==='marketType').map(mappingDisplayRow);
  renderFilterBar('filterbar-unmapped-markettypes', 'unmapped-markettypes', renderUnmappedMtTab, ()=>exportMappingCSV(rows,'unmapped_market_types.csv'));
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
  document.getElementById('unmapped-count').textContent = needsAttention;
  document.getElementById('mapping-nav-badge').textContent = needsAttention;
  document.getElementById('suggested-tab-badge').textContent = suggestedCount;
  document.getElementById('unmapped-tab-badge').textContent = unmappedTabCount;
  document.getElementById('notif-btn').querySelector('.badge-count').style.display = needsAttention===0 ? 'none' : 'flex';
}
function refreshAllMappingTabs(){
  renderSuggestedTab(); renderActiveCompTab(); renderActiveMtTab(); renderUnmappedCompTab(); renderUnmappedMtTab();
  refreshMappingCounts();
}

function acceptSuggestion(id){
  const rec = GTH_MAPPINGS.find(m=>m.id===id); if(!rec) return;
  rec.gth = { ...rec.suggestion };
  rec.status = 'active'; rec.updated = new Date().toISOString().slice(0,10); rec.by = 'm.tato';
  markMapped(rec.provider, rec.gth.competitionId, rec.gth.marketType);
  logAudit('Provider Mappings','Mapping confirmed',`${rec.providerSport} → ${rec.providerCompetition}${rec.providerMarketType?' → '+rec.providerMarketType:''} (${providerById(rec.provider).name}) mapped to GTH (AI suggested, accepted)`);
  refreshAllMappingTabs(); renderHierarchyTree(); renderEventsTable();
  toast('success','Mapping confirmed', `${rec.providerCompetition} → ${sportName(rec.gth.sportId)} / ${competitionName(rec.gth.competitionId)}`);
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
  logAudit('Provider Mappings','Mapping rejected',`${rec.providerCompetition} (${providerById(rec.provider).name}) marked Do Not Map (${reason})`);
  closeOverlay('overlay-reject');
  refreshAllMappingTabs();
  toast('default','Marked as Do Not Map', rec.providerCompetition);
});
let gthSearchTargetId = null;
let gthSearchResultsCache = [];
function gthOptionsList(level){
  const list = [];
  SPORTS.forEach(s=> s.competitions.forEach(c=>{
    if (level==='competition') list.push({ sportId:s.id, competitionId:c.id, marketType:null, label:`${s.name} → ${c.name}` });
    else {
      list.push({ sportId:s.id, competitionId:c.id, marketType:'Pre-Match', label:`${s.name} → ${c.name} → Pre-Match` });
      list.push({ sportId:s.id, competitionId:c.id, marketType:'In-Play', label:`${s.name} → ${c.name} → In-Play` });
    }
  }));
  return list;
}
function openGthSearch(id){
  gthSearchTargetId = id;
  const rec = GTH_MAPPINGS.find(m=>m.id===id);
  document.getElementById('search-gth-subtitle').textContent = `Mapping: ${rec.providerSport} → ${rec.providerCompetition}${rec.providerMarketType?' → '+rec.providerMarketType:''} (${providerById(rec.provider).name})`;
  document.getElementById('gth-search-input').value='';
  renderGthResults('', rec.level);
  openOverlay('overlay-search-gth');
}
function renderGthResults(query, level){
  gthSearchResultsCache = gthOptionsList(level).filter(g=>g.label.toLowerCase().includes(query.toLowerCase())).slice(0,8);
  document.getElementById('gth-search-results').innerHTML = gthSearchResultsCache.map((r,i)=>`
    <div class="flex-between" style="padding:8px 4px;border-bottom:1px solid var(--border-subtle);font-size:13px;">
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
  markMapped(rec.provider, rec.gth.competitionId, rec.gth.marketType);
  logAudit('Provider Mappings','Mapping confirmed',`${rec.providerCompetition} (${providerById(rec.provider).name}) manually mapped to ${choice.label}`);
  refreshAllMappingTabs(); renderHierarchyTree(); renderEventsTable();
  closeOverlay('overlay-search-gth');
  toast('success','Mapping confirmed', `${rec.providerCompetition} → ${choice.label}`);
}
document.getElementById('gth-create-new').addEventListener('click', ()=>{
  closeOverlay('overlay-search-gth');
  toast('default','Opening GTH', 'Would open the GTH hierarchy editor in a new tab (mocked) so you can create the missing entry, then return here to map it.');
});
function showHistory(id){
  const rec = GTH_MAPPINGS.find(m=>m.id===id);
  toast('default','Mapping history', `${rec.providerCompetition} — 1 change on record. Full audit trail lives in the Audit Log screen.`);
}
function deleteMapping(id){
  const rec = GTH_MAPPINGS.find(m=>m.id===id); if(!rec) return;
  document.getElementById('confirm-title').textContent = 'Unmap this item?';
  document.getElementById('confirm-subtitle').textContent = 'It will move to Unmapped and can no longer be used in defaults or blending until re-mapped.';
  document.getElementById('confirm-body').innerHTML = `<div class="alert alert-error">${ICONS.alert}<div><strong>${rec.providerCompetition}</strong> (${providerById(rec.provider).name}) currently mapped to ${sportName(rec.gth.sportId)} / ${competitionName(rec.gth.competitionId)}${rec.gth.marketType?' / '+rec.gth.marketType:''}</div></div>`;
  document.getElementById('confirm-ok').onclick = () => {
    rec.status = 'unmapped'; delete rec.gth;
    logAudit('Provider Mappings','Mapping deleted',`${rec.providerCompetition} (${providerById(rec.provider).name}) unmapped`);
    refreshAllMappingTabs();
    closeOverlay('overlay-confirm');
    toast('danger','Mapping removed', rec.providerCompetition);
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
    const p = providerById(id), a = ANALYTICS_SUMMARY[id];
    return `<tr>
      <td><span class="provider-chip"><span class="swatch" style="background:${p.color}"></span>${p.name}</span></td>
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
        aiSay(`Done — queued as a pending change on the Blending Configuration screen. <a onclick="document.querySelector('.nav-item[data-view=blending-config]').click(); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Open Blending Configuration</a> to review and save.`);
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
    aiSay(`I found 1 close match in Provider Mappings for that description. <a onclick="document.querySelector('.nav-item[data-view=mappings]').click(); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Review it in Provider Mappings</a> — I'll act on it there so you can double-check the AI suggestion before confirming.`);
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
      evt.overrides[mt] = { provider: provider.id, at:new Date().toISOString(), by:'m.tato' };
      logAudit('Level 2 — Event Overrides','Override applied (via AI Assistant)',`${evt.id}: ${mtLabel} → ${provider.name}`);
      renderEventsTable();
      aiSay(`Applied. <a onclick="document.querySelector('.nav-item[data-view=event-overrides]').click(); document.getElementById('ai-panel').classList.remove('open');" style="color:var(--blue-fg);cursor:pointer;text-decoration:underline;">Open Event Overrides</a> to see it.`);
    });
    return;
  }

  // Queries
  m = lower.match(/which provider is default for (.+?)(\s+pre-match|\s+in-play)?\??$/);
  if (m){
    const sport = findSportByName(m[1].trim());
    if (!sport){ aiSay(`I couldn't match that to an in-scope sport.`); return; }
    aiSay(`<strong>${sport.name}</strong> default provider: ${providerById(sport.defaultProvider)?.name || 'not set'} (Sport level). Competitions may override this — check the tree in Blending Configuration for specifics.`);
    return;
  }
  if (lower.includes('unmapped') && lower.includes('for')){
    m = lower.match(/for (.+?)\??$/);
    const provider = m ? findProviderByName(m[1].trim()) : null;
    const items = GTH_MAPPINGS.filter(x=> (x.status==='suggested'||x.status==='unmapped') && (!provider || x.provider===provider.id));
    aiSay(items.length
      ? `${items.length} unmapped item(s)${provider?` for ${provider.name}`:''}:<ul>${items.map(i=>`<li>${i.providerSport} → ${i.providerCompetition}${i.providerMarketType?' → '+i.providerMarketType:''}</li>`).join('')}</ul>`
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
document.getElementById('ai-fab').addEventListener('click', ()=> document.getElementById('ai-panel').classList.add('open'));
document.getElementById('ai-close').addEventListener('click', ()=> document.getElementById('ai-panel').classList.remove('open'));
document.getElementById('ai-suggestions').innerHTML = AI_SUGGESTIONS.map(s=>`<span class="ai-suggestion-chip" onclick="document.getElementById('ai-input').value='${s.replace(/'/g,"\\'")}'; document.getElementById('ai-send').click();">${s}</span>`).join('');

/* ============================================================
   INIT
   ============================================================ */
function init(){
  aiSay(`Hi — I can configure providers or answer questions in plain language. Try: "Set BetRadar as default for Tennis" (Journey 6 from the PRD) or one of the suggestions below.`);
  updateHeaderSearchForView('blending-config');
  populateEventFilters();
  renderPresets();
  renderHierarchyTree();
  renderEventsTable();
  populateLogFilterProvider();
  renderAutomationLog();
  renderProviderHealth();
  renderCoverage();
  refreshAllMappingTabs();
  renderProviderFilterChips();
  renderAnalytics();
  renderAuditLog();
}
init();

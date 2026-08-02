// TEMPLATES — one function per card/component type. Each takes real data and
// returns an HTML string. This is the 'what does the card look like' layer,
// separate from the data itself and separate from the page-level logic in app.js.

// Shared lookup tables used across templates, panels, and the main app.
const EFFORT_LABEL={1:"Easy",2:"Easy–Med",3:"Medium",4:"Med–Hard",5:"Hard"};
const ROAD_LABEL={"gap":"Not on roadmap","not-on-roadmap":"Not on roadmap","on-hold":"On hold","on-roadmap":"On roadmap","in-delivery":"In delivery"};
const ROAD_COLOR={"gap":"var(--gap)","not-on-roadmap":"var(--gap)","on-hold":"var(--hold)","on-roadmap":"var(--road)","in-delivery":"var(--delivery)"};
const ROAD_BG={"gap":"var(--gap-bg)","not-on-roadmap":"var(--gap-bg)","on-hold":"var(--hold-bg)","on-roadmap":"var(--road-bg)","in-delivery":"var(--delivery-bg)"};
const PROD_COLOR={"Wanderly":"var(--accent)"};
const PROD_BG={"Wanderly":"var(--accent-soft)"};
// TYPE_ICON, VERDICT_LABEL, VERDICT_CLASS already exist in app.js — not duplicated here.

function allSubMetrics(){ return SUBMETRICS; }

function subMetricById(id){ return SUBMETRICS.find(sm=>sm.id===id); }

function renderSeriesRow(series){
  const h = series.history;
  const single = h.length===1;
  let svg;
  if(single){
    svg = `<svg viewBox="0 0 160 44" style="width:100%;height:38px">
      <line x1="10" y1="30" x2="150" y2="30" stroke="#EEEDE9" stroke-width="1"/>
      <circle cx="80" cy="30" r="5" fill="#7B61FF"/>
      <text x="80" y="18" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${esc(String(h[0].num))}%</text>
    </svg>`;
  } else {
    const nums = h.map(p=>p.num);
    const min = Math.min(...nums), max = Math.max(...nums);
    const range = (max-min) || 1;
    const padY = 14, plotH = 38-padY;
    const stepX = 130/(h.length-1);
    const pts = h.map((p,idx)=>({x:10+idx*stepX, y: 4+(1-(p.num-min)/range)*plotH}));
    const pathD = pts.map((p,i)=>(i===0?'M':'L')+p.x+','+p.y).join(' ');
    svg = `<svg viewBox="0 0 160 44" style="width:100%;height:38px">
      <path d="${pathD}" fill="none" stroke="#7B61FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#7B61FF"/><text x="${p.x}" y="${p.y-8}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink)">${esc(String(h[i].num))}%</text>`).join('')}
    </svg>`;
  }
  return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0">
    <div style="width:100px;flex-shrink:0;font-size:11.5px;font-weight:700;color:var(--ink-soft);white-space:nowrap">${esc(series.label)}</div>
    <div style="flex:1">${svg}</div>
  </div>`;
}

function renderMetricGroups(groups){
  return groups.map(g=>`<div style="border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:12px;background:#fff">
    ${g.title?`<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-faint);margin-bottom:2px">${esc(g.title)}</div>`:''}
    ${g.series.map(renderSeriesRow).join('<div style="border-top:1px solid var(--line)"></div>')}
  </div>`).join('');
}

function journeySearchHint(s){
  const oppIds=s.opps||[];
  if(oppIds.length){
    const o=oppById[oppIds[0]];
    if(o && o.text && !o.text.startsWith('No standalone HMW')){
      return `<div class="search-hint-row"><span class="sh-label">Search the journey map for</span><span class="sh-term">"${esc(o.text)}"</span></div>`;
    }
  }
  return `<div class="search-hint-row"><span class="sh-label">No verbatim map quote linked yet</span><span class="sh-term">search the map manually using this item's summary above</span></div>`;
}

function researchSearchHint(s){
  if(!s.research) return '';
  const oppIds=s.opps||[];
  const o = oppIds.length ? oppById[oppIds[0]] : null;
  const firstInsight = o && o.insights && o.insights.length ? insightById[o.insights[0]] : null;
  if(firstInsight){
    return `<div class="search-hint-row"><span class="sh-label">Search the research document for</span><span class="sh-term">"${esc(firstInsight.text)}"</span></div>`;
  }
  return `<div class="search-hint-row"><span class="sh-label">No specific quote linked</span><span class="sh-term">search the document manually using this item's summary above</span></div>`;
}

function esc(s){return (s||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

function insightMini(i){
  const vis = insightVisible(i);
  return `<div class="mini-card is-${i.type}${!vis?' hidden':''}" data-key="insight-${i.id}" draggable="true" ondragstart="handleDragStart(event,'insight','${i.id}')" onclick="openPanel('insight','${i.id}')">
    <div class="mini-card-top">
      <span class="card-icon ${i.type}">${TYPE_ICON[i.type]}</span>
      <div style="flex:1;min-width:0">
        <div class="mini-card-badges">
          <span class="tiny-pill" style="background:#fff;border:1px solid ${i.type==='pain'?'var(--pain)':i.type==='delight'?'var(--delight)':'var(--obs)'};color:${i.type==='pain'?'var(--pain)':i.type==='delight'?'var(--delight)':'var(--obs)'}">${i.type}</span>
          <span class="tiny-pill" style="background:${PROD_BG[i.product]};color:${PROD_COLOR[i.product]}">${i.product}</span>
          ${i.analytics?'<span class="tiny-pill pill-secondary" style="background:var(--bg);color:var(--ink-soft);border:1px solid var(--line)">Analytics</span>':''}
        </div>
        <div class="mini-card-text">${esc(i.text)}</div>
      </div>
    </div>
  </div>`;
}

function gapMini(g){
  const vis=gapVisible(g);
  const vc={"genuine":"gap","partial":"on-hold","well":"in-delivery"}[g.verdict];
  return `<div class="mini-card${!vis?' hidden':''}" data-key="gap-${g.id}" draggable="true" ondragstart="handleDragStart(event,'gap','${g.id}')" onclick="openPanel('gap','${g.id}')">
    <div class="mini-card-top">
      <span class="card-icon ${VERDICT_CLASS[g.verdict]}">◆</span>
      <div style="flex:1;min-width:0">
        <div class="mini-card-badges">
          <span class="tiny-pill" style="background:${ROAD_BG[vc]};color:${ROAD_COLOR[vc]}">${VERDICT_LABEL[g.verdict]}</span>
          <span class="tiny-pill" style="background:${PROD_BG[g.product]};color:${PROD_COLOR[g.product]}">${g.product}</span>
        </div>
        <div class="mini-card-text">${esc(g.gapTitle)}</div>
        <div style="font-size:11px;color:var(--ink-faint);margin-top:3px">${esc(g.figure)}</div>
      </div>
    </div>
  </div>`;
}

function solutionMini(s){
  const vis = solutionVisible(s);
  const avg = ((s.mv+s.bv)/2).toFixed(1);
  const pr = computePriority(s);
  return `<div class="mini-card is-solution${!vis?' hidden':''}${s.isIdea?' is-idea':''}" data-key="sol-${s.ref}" draggable="true" ondragstart="handleDragStart(event,'solution','${s.ref}')" onclick="openPanel('solution','${s.ref}')" style="position:relative">
    <div class="mini-card-top">
      <span class="card-icon solution">◉</span>
      <div style="flex:1;min-width:0">
        <div class="mini-card-badges">
          <span class="tiny-pill pill-secondary" style="background:var(--ink);color:#fff;font-family:var(--mono)">${s.ref}</span>
          <span class="tiny-pill" style="background:${PROD_BG[s.product]};color:${PROD_COLOR[s.product]}">${s.product}</span>
          <span class="open-pill pill-secondary">${ROAD_LABEL[s.road]}</span>
          ${s.isIdea?'<span class="tiny-pill" style="background:#fff;border:1px solid var(--idea);color:var(--idea)">💡 IDEA — not from research</span>':''}
        </div>
        <div class="mini-card-text">${esc(s.title)}</div>
        <div style="display:flex;gap:4px;margin-top:5px">
          <span class="tiny-pill" style="background:${pr.bg};color:${pr.color};font-weight:800"><span class="pr-label-full">${pr.label}</span><span class="pr-label-short">${avg}</span></span>
          <span class="stat-pill">E: ${EFFORT_LABEL[s.effort]}</span>
          <span class="stat-pill">M:${s.mv}</span>
          <span class="stat-pill">B:${s.bv}</span>
        </div>
      </div>
    </div>
  </div>`;
}

function oppMini(o){
  const sol=o.solution?solutionByRef[o.solution]:null;
  const vis = oppVisible(o);
  return `<div class="mini-card${!vis?' hidden':''}" data-key="opp-${o.id}" draggable="true" ondragstart="handleDragStart(event,'opp','${o.id}')" onclick="openPanel('opp','${o.id}')">
    <div class="mini-card-top">
      <span class="card-icon hmw">⚡</span>
      <div style="flex:1;min-width:0">
        <div class="mini-card-badges">
          ${o.highValue?'<span class="tiny-pill" style="background:var(--hmw-bg);color:var(--hmw)">Big win</span>':''}
          <span class="tiny-pill" style="background:${PROD_BG[o.product]};color:${PROD_COLOR[o.product]}">${o.product}</span>
          ${sol?`<span class="tiny-pill pill-secondary" style="background:var(--ink);color:#fff;font-family:var(--mono)">${sol.ref}</span>`:''}
          <span class="open-pill pill-secondary">Open</span>
        </div>
        <div class="mini-card-text">${esc(o.text)}</div>
      </div>
    </div>
  </div>`;
}

function sentimentColor(v){
  // -2 (red) -> 0 (amber) -> +2 (green)
  if(v>=0){ const t=Math.min(v/2,1); return lerpColor("#B7791F","#1B8464",t); }
  const t=Math.min(-v/2,1); return lerpColor("#B7791F","#C0392B",t);
}

function lerpColor(a,b,t){
  const ah=a.replace('#',''), bh=b.replace('#','');
  const ar=parseInt(ah.slice(0,2),16), ag=parseInt(ah.slice(2,4),16), ab=parseInt(ah.slice(4,6),16);
  const br=parseInt(bh.slice(0,2),16), bg=parseInt(bh.slice(2,4),16), bb=parseInt(bh.slice(4,6),16);
  const r=Math.round(ar+(br-ar)*t), g=Math.round(ag+(bg-ag)*t), bl=Math.round(ab+(bb-ab)*t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`;
}

function computePriority(s){
  const avg=(s.mv+s.bv)/2;
  const score = avg - s.effort;
  if(score>=1.0) return {label:"High", color:"var(--priority-high)", bg:"var(--priority-high-bg)"};
  if(score>=0) return {label:"Moderate", color:"var(--priority-med)", bg:"var(--priority-med-bg)"};
  return {label:"Low", color:"var(--priority-low)", bg:"var(--priority-low-bg)"};
}

function stickyLabel(s){
  const avg = ((s.mv+s.bv)/2).toFixed(1);
  return `${s.ref} — ${s.title} [${avg}] [${EFFORT_LABEL[s.effort]}]`;
}

function chipsForInsight(i){
  const opps=OPPS.filter(o=>o.insights.includes(i.id));
  if(!opps.length) return '<span class="empty-note">Not yet linked to an opportunity.</span>';
  return opps.map(o=>{
    if(o.text.startsWith('No standalone')) return `<div class="empty-note" style="font-style:italic">No standalone HMW for this one — ${esc(o.text.replace(/^No standalone HMW\s*—\s*/,''))}</div>`;
    return `<div class="link-item-row" onclick="openPanelNav('opp','${o.id}')"><span class="card-icon hmw" style="width:18px;height:18px;font-size:10px">⚡</span><span class="link-item-text">${esc(o.text.slice(0,60))}${o.text.length>60?'…':''}</span>${o.highValue?'<span class="link-item-pill" style="background:var(--hmw-bg);color:var(--hmw)">Big win</span>':''}</div>`;
  }).join('');
}

function solutionsForInsight(i){
  const opps=OPPS.filter(o=>o.insights.includes(i.id) && o.solution);
  const refs=[...new Set(opps.map(o=>o.solution))];
  if(!refs.length) return '<span class="empty-note">No solution logged yet for this insight.</span>';
  return refs.map(r=>chipForSolution(r)).join('');
}

function chipsForOppInsights(o){
  if(!o.insights.length) return '<span class="empty-note">No linked insights.</span>';
  return o.insights.map(iid=>{
    const i=insightById[iid]; if(!i) return '';
    const c={pain:['var(--pain-bg)','var(--pain)'],delight:['var(--delight-bg)','var(--delight)'],observation:['var(--obs-bg)','var(--obs)']}[i.type];
    return `<div class="link-item-row" onclick="openPanelNav('insight','${i.id}')"><span class="card-icon ${i.type}" style="width:18px;height:18px;font-size:10px">${TYPE_ICON[i.type]}</span><span class="link-item-text">${esc(i.text.slice(0,60))}${i.text.length>60?'…':''}</span><span class="link-item-pill" style="background:${c[0]};color:${c[1]}">${i.type}</span></div>`;
  }).join('');
}

function chipForSolution(ref){
  if(!ref) return '<span class="empty-note">No item in the effort/value spreadsheet yet.</span>';
  const s=solutionByRef[ref]; if(!s) return '';
  return `<div class="link-item-row" onclick="openPanelNav('solution','${ref}')"><span class="card-icon solution" style="width:18px;height:18px;font-size:10px">◉</span><span class="link-item-text"><span style="font-family:var(--mono);font-weight:700;color:var(--ink-faint);margin-right:6px">${s.ref}</span>${esc(s.title.slice(0,54))}${s.title.length>54?'…':''}</span><span class="link-item-pill" style="background:${ROAD_BG[s.road]};color:${ROAD_COLOR[s.road]}">${ROAD_LABEL[s.road]}</span></div>`;
}

function chipsForSolutionOpps(s){
  if(!s.opps.length) return '<span class="empty-note">No linked opportunity recorded.</span>';
  return s.opps.map(oid=>{
    const o=oppById[oid];
    if(o.text.startsWith('No standalone')) return `<div class="empty-note" style="font-style:italic">No standalone HMW for this one — ${esc(o.text.replace(/^No standalone HMW\s*—\s*/,''))}</div>`;
    return `<div class="link-item-row" onclick="openPanelNav('opp','${o.id}')"><span class="card-icon hmw" style="width:18px;height:18px;font-size:10px">⚡</span><span class="link-item-text">${esc(o.text.slice(0,60))}${o.text.length>60?'…':''}</span>${o.highValue?'<span class="link-item-pill" style="background:var(--hmw-bg);color:var(--hmw)">Big win</span>':''}</div>`;
  }).join('');
}

function insightsForSolution(s){
  const oppIds=s.opps||[];
  const ids=new Set();
  oppIds.forEach(oid=>{ const o=oppById[oid]; if(o) o.insights.forEach(iid=>ids.add(iid)); });
  if(!ids.size) return '<span class="empty-note">No linked insights recorded.</span>';
  return [...ids].map(iid=>{
    const i=insightById[iid]; if(!i) return '';
    const c={pain:['var(--pain-bg)','var(--pain)'],delight:['var(--delight-bg)','var(--delight)'],observation:['var(--obs-bg)','var(--obs)']}[i.type];
    return `<div class="link-item-row" onclick="openPanelNav('insight','${i.id}')"><span class="card-icon ${i.type}" style="width:18px;height:18px;font-size:10px">${TYPE_ICON[i.type]}</span><span class="link-item-text">${esc(i.text.slice(0,60))}${i.text.length>60?'…':''}</span><span class="link-item-pill" style="background:${c[0]};color:${c[1]}">${i.type}</span></div>`;
  }).join('');
}

function insightIdsForSolution(s){
  const oppIds=s.opps||[];
  const ids=new Set();
  oppIds.forEach(oid=>{ const o=oppById[oid]; if(o) o.insights.forEach(iid=>ids.add(iid)); });
  return [...ids];
}

function gapsForInsight(i){
  const opps=OPPS.filter(o=>o.insights.includes(i.id) && o.solution);
  const refs=[...new Set(opps.map(o=>o.solution))];
  return GAPS.filter(g=>refs.includes(g.solution));
}

function gapChipsForInsight(i){
  const gaps=gapsForInsight(i);
  if(!gaps.length) return '<span class="empty-note">Not tied to a research gap yet.</span>';
  return gaps.map(g=>`<div class="link-item-row" onclick="openPanelNav('gap','${g.id}')"><span class="card-icon gap" style="width:18px;height:18px;font-size:10px">◈</span><span class="link-item-text">${esc(g.figure.slice(0,60))}${g.figure.length>60?'…':''}</span><span class="link-item-pill" style="background:${g.verdict==='genuine'?'#FDECEC':'var(--bg)'};color:${g.verdict==='genuine'?'#B23A3A':'var(--ink-soft)'}">${g.verdict==='genuine'?'Genuine gap':g.verdict==='partial'?'Partial gap':'Well explained'}</span></div>`).join('');
}

function siblingInsightIdsFor(i){
  const gaps=gapsForInsight(i);
  const sibIds=new Set();
  gaps.forEach(g=>{ const sol=g.solution?solutionByRef[g.solution]:null; if(sol) insightIdsForSolution(sol).forEach(iid=>{ if(iid!==i.id) sibIds.add(iid); }); });
  return [...sibIds];
}

function siblingInsightsFor(i){
  const sibIds=siblingInsightIdsFor(i);
  if(!sibIds.length) return '';
  return sibIds.map(iid=>{
    const si=insightById[iid]; if(!si) return '';
    const c={pain:['var(--pain-bg)','var(--pain)'],delight:['var(--delight-bg)','var(--delight)'],observation:['var(--obs-bg)','var(--obs)']}[si.type];
    return `<div class="link-item-row" onclick="openPanelNav('insight','${si.id}')"><span class="card-icon ${si.type}" style="width:18px;height:18px;font-size:10px">${TYPE_ICON[si.type]}</span><span class="link-item-text">${esc(si.text.slice(0,60))}${si.text.length>60?'…':''}</span><span class="link-item-pill" style="background:${c[0]};color:${c[1]}">${si.type}</span></div>`;
  }).join('');
}

function quoteCountForSolution(s){ return insightIdsForSolution(s).length; }

function quotesForSolution(s){
  const ids = insightIdsForSolution(s);
  if(!ids.length) return '<p class="empty-note">No verbatim quotes linked to this item — this one rests on the pattern/figure alone, not a direct member quote.</p>';
  const typeLabel={pain:'Pain point',delight:'Delight',observation:'Observation'};
  const typeColor={pain:['var(--pain-bg)','var(--pain)'],delight:['var(--delight-bg)','var(--delight)'],observation:['var(--obs-bg)','var(--obs)']};
  return ids.map(iid=>{
    const i=insightById[iid]; if(!i) return '';
    const c=typeColor[i.type];
    return `<div class="quote-block" style="border-left-color:${c[1]}">
      <p>"${esc(i.text)}"</p>
      <span><span class="tiny-pill" style="background:${c[0]};color:${c[1]};margin-right:6px">${typeLabel[i.type]}</span>${i.product}${i.analytics?' · Analytics supported':''}</span>
    </div>`;
  }).join('');
}
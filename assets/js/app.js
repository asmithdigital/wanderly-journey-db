// APP — page state, the main render loop for each view (journey map, opportunities
// matrix, personas), filters, search, and the startup sequence that loads
// data/journey-data.json before the first render.


const MOTOR_JM="https://miro.com/app/board/uXjVIGTotKE=/?share_link_id=802945778903";
const HOME_JM="https://miro.com/app/board/uXjVIGT2YJE=/?share_link_id=709014241659";
// Data lives in data/journey-data.json for now — a temporary stand-in for the
// database that comes in the next stage of this project. Loaded once, at startup,
// below. Swapping this for a real database later just means changing loadJourneyData()
// to fetch from an API instead of a JSON file — nothing else in this file needs to change.
let STAGES, STAGE_GROUPS, THEMES, SUBMETRICS, PERSONAS, SOLUTIONS, INSIGHTS, OPPS, GAPS;
const ONBOARD_REFS = new Set([]);
// onBoard/opps/solutionByRef/insightById/oppById are all derived once the data loads — see loadJourneyData() below
let state={product:new Set(),road:new Set(),effort:new Set(),priority:new Set(),view:"journey",showIdeas:false};
let selectedKey=null;




function prodMatch(itemProduct){
  if(state.product.size===0) return true;
  if(state.product.has("Home") || state.product.has("Motor") || state.product.has("Both")){
    let match=false;
    if(state.product.has("Home") && (itemProduct==="Home" || itemProduct==="Both")) match=true;
    if(state.product.has("Motor") && (itemProduct==="Motor" || itemProduct==="Both")) match=true;
    if(state.product.has("Both") && itemProduct==="Both") match=true;
    return match;
  }
  return state.product.has(itemProduct);
}
function roadMatch(road){ return state.road.size===0 || state.road.has(road); }
function effortMatch(effort){ return state.effort.size===0 || state.effort.has(String(effort)); }
function priorityMatch(s){ return state.priority.size===0 || state.priority.has(computePriority(s).label); }
function insightVisible(i){ return prodMatch(i.product); }
function oppVisible(o){
  if(!prodMatch(o.product)) return false;
  if(state.road.size>0){
    if(!o.solution) return false;
    const s=solutionByRef[o.solution];
    if(!s || !roadMatch(s.road)) return false;
  }
  return true;
}

const TYPE_ICON={pain:"!",delight:"♥",observation:"i"};

function solutionVisible(s){ return prodMatch(s.product) && roadMatch(s.road) && effortMatch(s.effort) && priorityMatch(s) && (state.showIdeas || !s.isIdea); }

function gapVisible(g){ return prodMatch(g.product); }
const VERDICT_LABEL={"genuine":"Genuine gap","partial":"Partially explained","well":"Well explained"};
const VERDICT_CLASS={"genuine":"gap-genuine","partial":"gap-partial","well":"gap-well"};






function isMobile(){ return window.matchMedia('(max-width: 640px)').matches; }
function toggleMobileFilters(){
  document.getElementById('filterRowWrap').classList.toggle('open');
  document.getElementById('mobileFilterOverlay').classList.toggle('open');
}
function applyLaneLabelState(){
  const expanded = document.body.classList.contains('lanes-expanded');
  const grid = document.getElementById('journeyGrid');
  if(grid){
    grid.style.gridTemplateColumns = isMobile() ? (expanded ? '120px repeat(9,200px)' : '38px repeat(9,200px)') : '';
  }
  document.querySelectorAll('.lane-label-inner, .persona-chip-name').forEach(el=>{ el.style.display = expanded ? '' : (isMobile()?'none':''); });
  document.querySelectorAll('.lane-icon').forEach(el=>{ el.style.display = isMobile() ? ((!expanded) ? 'inline-block' : 'none') : ''; });
}
function toggleLaneLabels(){
  document.body.classList.toggle('lanes-expanded');
  const expanded = document.body.classList.contains('lanes-expanded');
  const icon = document.getElementById('laneToggleIcon');
  if(icon) icon.textContent = expanded ? '‹' : '›';
  applyLaneLabelState();
}
function renderEmotionLine(){
  const n=STAGES.length;
  const colW=isMobile()?200:340, W=colW*n, H=150;
  const pad=32;
  const plotH=H-pad*2;
  function xAt(i){ return (i+0.5)*colW; }
  function yAt(v){ return pad + (1-(v+2)/4)*plotH; } // v in [-2,2]
  let path=`M ${xAt(0)} ${yAt(STAGES[0].sentiment)}`;
  for(let i=1;i<n;i++){
    const x0=xAt(i-1), y0=yAt(STAGES[i-1].sentiment);
    const x1=xAt(i), y1=yAt(STAGES[i].sentiment);
    const dx=(x1-x0)/2;
    path+=` C ${x0+dx} ${y0}, ${x1-dx} ${y1}, ${x1} ${y1}`;
  }
  let gradStops='';
  STAGES.forEach((st,i)=>{ gradStops+=`<stop offset="${(i/(n-1)*100).toFixed(1)}%" stop-color="${sentimentColor(st.sentiment)}"/>`; });
  let dots='', words='';
  STAGES.forEach((st,i)=>{
    const cx=xAt(i), cy=yAt(st.sentiment), c=sentimentColor(st.sentiment);
    dots+=`<circle cx="${cx}" cy="${cy}" r="6" fill="${c}"/><circle cx="${cx}" cy="${cy}" r="12" fill="${c}" opacity="0.15"/>`;
  });
  const svg=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block">
    <defs><linearGradient id="sentGrad" x1="0" y1="0" x2="1" y2="0">${gradStops}</linearGradient></defs>
    <line x1="0" y1="${yAt(0)}" x2="${W}" y2="${yAt(0)}" stroke="#E4E3E0" stroke-width="1" stroke-dasharray="3,3"/>
    <path d="${path}" fill="none" stroke="url(#sentGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
  const wordsRow = STAGES.map(st=>`<div style="width:${colW}px;flex-shrink:0"><div class="emo-word" style="color:${sentimentColor(st.sentiment)}">${st.emo}</div></div>`).join('');
  return `<div class="emotion-row" style="grid-column:span ${STAGES.length}">
    ${svg}
    <div style="display:flex">${wordsRow}</div>
    <div class="emotion-caption">Illustrative direction from the qualitative pain/delight balance at each stage — not a measured score</div>
  </div>`;
}
function renderGlobalMetrics(){
  const bar=document.getElementById('globalMetricsBar');
  const subs=allSubMetrics().filter(sm=>!sm.stageId);
  bar.innerHTML=subs.map(sm=>{
    const theme=THEMES[sm.theme];
    const arrow=sm.trend==='up'?'▲':sm.trend==='down'?'▼':'—';
    const arrowColor=sm.trend==='flat'?'var(--ink-faint)':(sm.trendGood?'#1B9E6B':'#C0392B');
    const y1=sm.trend==='down'?10:sm.trend==='up'?32:20, y2=sm.trend==='down'?32:sm.trend==='up'?10:22;
    const midY = sm.trend==='flat' ? (y1+y2)/2 - 2 : (y1+y2)/2;
    return `<div class="metric-card" data-key="submetric-${sm.id}" onclick="openPanel('submetric','${sm.id}')">
      <span class="theme-lozenge" style="background:${theme.bg};color:${theme.color}">${theme.label}</span>
      <div class="metric-label">${esc(sm.label)}</div>
      <div class="metric-body">
        <div>
          <div class="metric-value">${esc(sm.value)}</div>
          <div class="metric-trend" style="color:${arrowColor}">${arrow} ${esc(sm.changeLabel)}</div>
        </div>
        <svg class="metric-spark" viewBox="0 0 80 40">
          <path d="M20,${y1} Q40,${midY} 60,${y2}" fill="none" stroke="#7B61FF" stroke-width="2" stroke-linecap="round"/>
          <circle cx="20" cy="${y1}" r="2.5" fill="#7B61FF"/>
          <circle cx="60" cy="${y2}" r="2.5" fill="#7B61FF"/>
        </svg>
      </div>
    </div>`;
  }).join('');
}
function renderJourney(){
  const grid=document.getElementById('journeyGrid');
  let html="";
  html+=`<div class="lane-label" style="border-bottom:2px solid var(--ink)"><span class="lane-icon">▭</span><span class="lane-label-inner">Phases</span></div>`;
  STAGE_GROUPS.forEach(g=>{html+=`<div class="stage-group-hd" style="grid-column:span ${g.count}">${g.label}</div>`;});
  html+=`<div class="lane-label"><span class="lane-icon">▤</span><span class="lane-label-inner">Steps</span></div>`;
  STAGES.forEach(st=>{html+=`<div class="stage-hd"><div class="stage-name">${st.name}</div><div class="stage-sub">${st.sub}</div></div>`;});
  html+=`<div class="lane-label"><span class="lane-icon">◫</span><span class="lane-label-inner">Metrics</span></div>`;
  STAGES.forEach(st=>{
    const subs = allSubMetrics().filter(sm=>sm.stageId===st.id);
    html+=`<div class="lane-cell" style="flex-direction:row;flex-wrap:wrap;gap:4px;align-items:flex-start">${subs.map(sm=>{
      const theme=THEMES[sm.theme];
      return `<div class="stage-metric-chip" style="width:calc(50% - 2px)" data-key="submetric-${sm.id}" onclick="openPanel('submetric','${sm.id}')">
        <span class="theme-lozenge" style="background:${theme.bg};color:${theme.color};font-size:8px;padding:1px 6px;margin-bottom:3px">${theme.label}</span>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:4px">
          <div><span class="stage-metric-label">${esc(sm.label)}</span><span class="stage-metric-value">${esc(sm.value)}</span></div>
          <svg viewBox="0 0 24 16" style="width:22px;height:14px;flex-shrink:0"><path d="M2,4 Q10,8 16,12" fill="none" stroke="#B7A6FF" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
      </div>`;
    }).join('')}</div>`;
  });
  const visiblePersonas = PERSONAS.filter(p=>prodMatch(p.product));
  const personaChips = visiblePersonas.map(p=>`<span onclick="openPanel('persona','${p.id}')" style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:10.5px;font-weight:600;color:${p.color};margin-top:8px"><span style="width:16px;height:16px;border-radius:50%;overflow:hidden;flex-shrink:0;border:1px solid ${p.color}"><img src="${p.img}" style="width:100%;height:100%;object-fit:cover"/></span><span class="persona-chip-name">${esc(p.name)}</span></span>`).join('');
  html+=`<div class="lane-label" style="align-items:stretch"><div style="display:flex;flex-direction:column;height:100%;width:100%"><span class="lane-icon">∿</span><span class="lane-label-inner">Emotion</span><div style="margin-top:auto">${personaChips}</div></div></div>`;
  html+=renderEmotionLine();
  html+=`<div class="lane-label"><span class="lane-icon">◉</span><span class="lane-label-inner">Solutions</span></div>`;
  STAGES.forEach(st=>{
    const items=SOLUTIONS.filter(s=>s.stage===st.id);
    html+=`<div class="lane-cell" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event,'${st.id}')">${items.map(solutionMini).join('')}</div>`;
  });
  html+=`<div class="lane-label"><span class="lane-icon">⚡</span><span class="lane-label-inner">Opportunities</span></div>`;
  STAGES.forEach(st=>{
    const items=OPPS.filter(o=>o.stage===st.id);
    html+=`<div class="lane-cell" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event,'${st.id}')">${items.map(oppMini).join('')}</div>`;
  });
  html+=`<div class="lane-label"><span class="lane-icon">◐</span><span class="lane-label-inner">Insights</span></div>`;
  STAGES.forEach(st=>{
    const items=INSIGHTS.filter(i=>i.stage===st.id);
    html+=`<div class="lane-cell" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event,'${st.id}')">${items.map(insightMini).join('')}</div>`;
  });
  html+=`<div class="lane-label"><span class="lane-icon">◈</span><span class="lane-label-inner">Analytics gaps</span></div>`;
  STAGES.forEach(st=>{
    const items=GAPS.filter(g=>g.stage===st.id);
    html+=`<div class="lane-cell" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event,'${st.id}')">${items.map(gapMini).join('')}</div>`;
  });
  grid.innerHTML=html;
  const stageless=GAPS.filter(g=>!g.stage);
  document.getElementById('gapStrip').innerHTML = stageless.length
    ? `<div class="gap-strip-label">Not stage-specific — whole-product commercial trend, no research anywhere explains it</div>${stageless.map(gapMini).join('')}`
    : '';
  updateCount();
}

const AXIS_LABEL={avg:"Value (member + business avg)",mv:"Member value",bv:"Business value",effort:"Effort"};
function axisValue(it, axis){
  if(axis==='avg') return (it.mv+it.bv)/2;
  if(axis==='mv') return it.mv;
  if(axis==='bv') return it.bv;
  if(axis==='effort') return it.effort;
  return 0;
}
let matrixSubView='matrix';
function setMatrixSubView(v){
  matrixSubView=v;
  document.getElementById('matrixSubBtn').classList.toggle('on', v==='matrix');
  document.getElementById('listSubBtn').classList.toggle('on', v==='list');
  document.getElementById('matrixSvg').style.display = v==='matrix' ? 'block' : 'none';
  document.getElementById('matrixListView').style.display = v==='list' ? 'block' : 'none';
  if(v==='list') renderMatrixList();
}
function renderMatrixList(){
  const wrap = document.getElementById('matrixListView');
  const opps = OPPS.filter(oppVisible);
  wrap.innerHTML = `<table class="matrix-list-table">
    <thead><tr><th></th><th>Ref</th><th>Product</th><th>Opportunity</th><th>Big win</th><th>Status</th></tr></thead>
    <tbody>${opps.map(o=>{
      const sol = o.solution ? solutionByRef[o.solution] : null;
      return `<tr onclick="openPanel('opp','${o.id}')">
        <td><span class="card-icon hmw" style="width:20px;height:20px;font-size:11px">⚡</span></td>
        <td style="font-family:var(--mono);font-weight:700;color:var(--ink-faint)">${sol?esc(sol.ref):'—'}</td>
        <td><span class="tiny-pill" style="background:${PROD_BG[o.product]};color:${PROD_COLOR[o.product]}">${o.product}</span></td>
        <td>${esc(o.text.slice(0,90))}${o.text.length>90?'…':''}</td>
        <td>${o.highValue?'<span class="tiny-pill" style="background:var(--hmw-bg);color:var(--hmw)">Big win</span>':'—'}</td>
        <td>${sol?`<span class="tiny-pill" style="background:${ROAD_BG[sol.road]};color:${ROAD_COLOR[sol.road]}">${ROAD_LABEL[sol.road]}</span>`:'<span style="color:var(--ink-faint)">Open</span>'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}
function renderMatrix(){
  const svg=document.getElementById('matrixSvg');
  const xAxis = document.getElementById('xAxisSelect')?.value || 'effort';
  const yAxis = document.getElementById('yAxisSelect')?.value || 'avg';
  const sizeAxis = document.getElementById('sizeAxisSelect')?.value || 'avg';
  const rect = svg.getBoundingClientRect();
  const W = Math.max(rect.width, 800);
  const H = Math.max(rect.height, 500);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const pad=70;
  const plotW=W-pad-50, plotH=H-pad-90;
  const SCALE_MAX=6; // headroom above the real 0-5 data range so top bubbles aren't clipped
  function px(v){return pad + (v/SCALE_MAX)*plotW;}
  function py(v){return (H-pad-30) - (v/SCALE_MAX)*plotH;}
  let s=`<line x1="${pad}" y1="${H-pad-30}" x2="${W-30}" y2="${H-pad-30}" stroke="#D2D1CC" stroke-width="1.5"/>`;
  s+=`<line x1="${pad}" y1="${H-pad-30}" x2="${pad}" y2="60" stroke="#D2D1CC" stroke-width="1.5"/>`;
  for(let v=0;v<=5;v++){
    s+=`<text x="${pad-14}" y="${py(v)+4}" text-anchor="end" font-size="12" fill="#9494A0" font-family="-apple-system,'Segoe UI',Arial,sans-serif">${v}</text>`;
    s+=`<line x1="${pad}" y1="${py(v)}" x2="${W-30}" y2="${py(v)}" stroke="#EEEDE9" stroke-width="1"/>`;
  }
  for(let e=0;e<=5;e++){ s+=`<text x="${px(e)}" y="${H-pad+2}" text-anchor="middle" font-size="12" fill="#9494A0" font-family="-apple-system,'Segoe UI',Arial,sans-serif">${e}</text>`; }
  s+=`<text x="22" y="${H/2}" text-anchor="middle" font-size="13" font-weight="700" fill="#5B5B60" font-family="-apple-system,'Segoe UI',Arial,sans-serif" transform="rotate(-90 22 ${H/2})">${AXIS_LABEL[yAxis]} →</text>`;
  s+=`<text x="${W/2}" y="${H-14}" text-anchor="middle" font-size="13" font-weight="700" fill="#5B5B60" font-family="-apple-system,'Segoe UI',Arial,sans-serif">${AXIS_LABEL[xAxis]} →</text>`;

  const shown = SOLUTIONS.filter(it=> prodMatch(it.product) && roadMatch(it.road) && effortMatch(it.effort) && priorityMatch(it) && (state.showIdeas || !it.isIdea));
  const withPos = shown.map(it=>({it, xv:axisValue(it,xAxis), yv:axisValue(it,yAxis), sv: sizeAxis==='none'?2.5:axisValue(it,sizeAxis)}));
  withPos.sort((a,b)=>b.sv-a.sv); // biggest drawn first, smaller ones drawn after so they sit on top when nested inside a bigger circle

  // Group items sharing the exact same coordinate — with only ~9 possible values per axis (1-5 in 0.5 steps),
  // dozens of the 44 items land on identical pixels. Fan those out in a small ring around the true point
  // so every one of them stays visible and independently hoverable, rather than only the last-drawn surviving.
  const groups = {};
  withPos.forEach(item=>{
    const key = item.xv+'|'+item.yv;
    (groups[key] = groups[key]||[]).push(item);
  });
  Object.values(groups).forEach(group=>{
    const n = group.length;
    if(n===1){ group[0].fanAngle=0; group[0].fanRadius=0; return; }
    group.forEach((item,i)=>{
      item.fanAngle = (2*Math.PI*i)/n;
      item.fanRadius = 15 + n*3; // wider fan for bigger clusters so items don't touch
    });
  });

  withPos.forEach(({it,xv,yv,sv,fanAngle,fanRadius})=>{
    const baseX=px(xv), baseY=py(yv);
    const cx = baseX + Math.cos(fanAngle)*fanRadius;
    const cy = baseY + Math.sin(fanAngle)*fanRadius;
    const r = 8 + Math.pow(Math.max(sv,0)/5, 2.5) * 30; // steeper curve — makes 3 vs 3.5 vs 4 vs 5 clearly distinct, bigger max for easier clicking
    const color = it.product==="Motor"?"#2563A8":it.product==="Home"?"#2F7A52":"#6E4FA0";
    const isSel = selectedKey==='solution-'+it.ref;
    s+=`<g class="bubble${isSel?' selected':''}" data-key="sol-${it.ref}" onclick="openPanel('solution','${it.ref}')" onmouseenter="showMatrixHover(event,'${it.ref}')" onmouseleave="hideMatrixHover()">
      ${fanRadius>0?`<line x1="${baseX}" y1="${baseY}" x2="${cx}" y2="${cy}" stroke="#E4E3E0" stroke-width="1"/>`:''}
      <circle class="bubble-ring" cx="${cx}" cy="${cy}" r="${r+4}"/>
      <circle class="bubble-main" cx="${cx}" cy="${cy}" r="${r}" fill="${isSel?color+'55':color+'33'}" stroke="${color}" stroke-width="${isSel?3:1.5}"/>
      <foreignObject x="${cx-42}" y="${cy+r+2}" width="84" height="28"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:9px;color:#5B5B60;line-height:1.2;text-align:center;overflow:hidden">${esc(it.title.slice(0,28))}${it.title.length>28?'…':''}</div></foreignObject>
    </g>`;
  });
  svg.innerHTML=s;
  updateCount();
  if(matrixSubView==='list') renderMatrixList();
}







function render(){ if(state.view==='journey') renderJourney(); else if(state.view==='matrix') renderMatrix(); else renderPersonaView(); applyLaneLabelState(); renderGlobalMetrics(); document.getElementById('globalMetricsBar').style.display = state.view==='journey' ? 'flex' : 'none'; }
function renderPersonaView(){
  const grid=document.getElementById('personaGrid');
  const visible = PERSONAS.filter(p=>prodMatch(p.product));
  if(!visible.length){ grid.innerHTML='<p style="color:var(--ink-faint);padding:20px">No persona matches the current product filter.</p>'; return; }
  grid.innerHTML = visible.map(p=>{
    const initials=(p.name||'').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    return `
    <div data-key="persona-${p.id}" onclick="openPanel('persona','${p.id}')" style="width:220px;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.04);cursor:pointer">
      <div style="background:${p.bg};height:90px;position:relative">
        <div style="width:76px;height:76px;border-radius:50%;background:#fff;border:3px solid ${p.color};position:absolute;left:50%;bottom:-38px;transform:translateX(-50%);overflow:hidden;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff">
          ${p.img ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover" alt="${esc(p.name)}"/>` : `<div style="width:100%;height:100%;background:${p.color};display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff">${esc(initials)}</div>`}
        </div>
      </div>
      <div style="padding:46px 16px 16px;text-align:center">
        <div style="font-weight:800;font-size:15px;color:var(--ink)">${esc(p.name)}</div>
        <p style="font-style:italic;font-size:12px;color:var(--ink-soft);margin-top:6px;line-height:1.4">"${esc(p.quote.slice(0,60))}${p.quote.length>60?'…':''}"</p>
        <p style="font-size:11px;color:var(--ink-faint);margin-top:10px">1 journey</p>
      </div>
    </div>`;
  }).join('');
}

function updateCount(){
  if(state.view==='journey'){
    const iCount=INSIGHTS.filter(insightVisible).length;
    const oCount=OPPS.filter(oppVisible).length;
    const sCount=SOLUTIONS.filter(solutionVisible).length;
    const gCount=GAPS.filter(gapVisible).length;
    document.getElementById('countLabel').textContent=`${iCount} insights · ${oCount} opportunities · ${sCount} solutions · ${gCount} analytics gaps shown`;
  } else {
    const sCount=SOLUTIONS.filter(solutionVisible).length;
    document.getElementById('countLabel').textContent=`${sCount} of ${SOLUTIONS.length} solutions plotted`;
  }
}

const FILTER_DEFS={
  product:{allLabel:"All products", options:[{v:"Wanderly",l:"Wanderly"}]},
  effort:{allLabel:"All effort", options:[{v:"1",l:"Easy"},{v:"2",l:"Easy-Med"},{v:"3",l:"Medium"},{v:"4",l:"Med-Hard"},{v:"5",l:"Hard"}]},
  road:{allLabel:"All statuses", options:[{v:"gap",l:"Not on roadmap"},{v:"on-hold",l:"On hold"},{v:"on-roadmap",l:"On roadmap"},{v:"in-delivery",l:"In delivery"}]},
  priority:{allLabel:"All priorities", options:[{v:"High",l:"High"},{v:"Moderate",l:"Moderate"},{v:"Low",l:"Low"}]},
};
function renderFilterDropdown(key){
  const def=FILTER_DEFS[key];
  const set=state[key];
  const el=document.getElementById('fd-'+(key==='road'?'road':key));
  const labelText = set.size===0 ? def.allLabel : def.options.filter(o=>set.has(o.v)).map(o=>o.l).join(', ');
  let html = `<button class="fdropdown-trigger${set.size>0?' changed':''}" onclick="toggleFilterDropdown('${key}')">${esc(labelText)}<span class="chev"></span></button>`;
  html += `<div class="fdropdown-panel" id="fdp-${key}">`;
  html += `<div class="fdropdown-option divider${set.size===0?' checked':''}" onclick="event.stopPropagation(); selectFilterAll('${key}')"><input type="checkbox" ${set.size===0?'checked':''} readonly><span>${esc(def.allLabel)}</span></div>`;
  def.options.forEach(o=>{
    html += `<div class="fdropdown-option${set.has(o.v)?' checked':''}" onclick="event.stopPropagation(); toggleFilterOption('${key}','${o.v}')"><input type="checkbox" ${set.has(o.v)?'checked':''} readonly><span>${esc(o.l)}</span></div>`;
  });
  html += `</div>`;
  el.innerHTML = html;
}
function toggleFilterDropdown(key){
  document.querySelectorAll('.fdropdown-panel').forEach(p=>{ if(p.id!=='fdp-'+key) p.classList.remove('open'); });
  document.getElementById('fdp-'+key).classList.toggle('open');
}
function updateClearFiltersVisibility(){
  const anyActive = ['product','effort','road','priority'].some(k=>state[k].size>0);
  document.getElementById('clearFiltersBtn').style.display = anyActive ? 'inline' : 'none';
}
function clearAllDropdownFilters(){
  ['product','effort','road','priority'].forEach(k=>{ state[k]=new Set(); renderFilterDropdown(k); });
  updateClearFiltersVisibility();
  render();
}
function selectFilterAll(key){
  state[key] = new Set();
  renderFilterDropdown(key);
  document.getElementById('fdp-'+key).classList.add('open');
  updateClearFiltersVisibility();
  render();
}
function toggleFilterOption(key, value){
  const set = state[key];
  if(set.has(value)) set.delete(value); else set.add(value);
  renderFilterDropdown(key);
  document.getElementById('fdp-'+key).classList.add('open');
  updateClearFiltersVisibility();
  render();
}
document.addEventListener('click', e=>{
  if(!e.target.closest('.fdropdown')) document.querySelectorAll('.fdropdown-panel').forEach(p=>p.classList.remove('open'));
});
['product','effort','road','priority'].forEach(renderFilterDropdown);
document.getElementById('ideaCheckbox').addEventListener('change', e=>{
  state.showIdeas = e.target.checked; render();
});
['xAxisSelect','yAxisSelect','sizeAxisSelect'].forEach(id=>{
  document.getElementById(id).addEventListener('change', ()=>{ if(state.view==='matrix') renderMatrix(); });
});
document.getElementById('viewToggle').addEventListener('click', e=>{
  const b=e.target.closest('.filter-btn'); if(!b) return;
  document.querySelectorAll('#viewToggle .filter-btn').forEach(x=>x.classList.remove('on')); b.classList.add('on');
  state.view=b.dataset.view;
  document.getElementById('journeyView').style.display = state.view==='journey' ? 'block':'none';
  document.getElementById('matrixView').style.display = state.view==='matrix' ? 'block':'none';
  document.getElementById('personaView').style.display = state.view==='persona' ? 'block':'none';
  render();
});


document.getElementById('searchInput').addEventListener('input', e=>{
  const q=e.target.value.trim();
  const box=document.getElementById('searchResults');
  if(!q){box.classList.remove('open');box.innerHTML='';return;}
  const qn=norm(q), ql=q.toLowerCase();
  let results=[];
  SOLUTIONS.forEach(s=>{ if(norm(s.ref).includes(qn)||s.title.toLowerCase().includes(ql)) results.push({kind:'Solution',key:'solution',id:s.ref,label:s.ref,title:s.title,color:'var(--accent)',bg:'var(--accent-soft)'}); });
  OPPS.forEach(o=>{ if(o.text.toLowerCase().includes(ql)) results.push({kind:'HMW',key:'opp',id:o.id,label:(o.solution||o.id),title:o.text,color:'var(--hmw)',bg:'var(--hmw-bg)'}); });
  INSIGHTS.forEach(i=>{ if(i.text.toLowerCase().includes(ql)) results.push({kind:i.type,key:'insight',id:i.id,label:i.id,title:i.text,color:i.type==='pain'?'var(--pain)':i.type==='delight'?'var(--delight)':'var(--obs)',bg:i.type==='pain'?'var(--pain-bg)':i.type==='delight'?'var(--delight-bg)':'var(--obs-bg)'}); });
  GAPS.forEach(g=>{ if(g.figure.toLowerCase().includes(ql)||(g.docSearch||'').toLowerCase().includes(ql)) results.push({kind:'Gap',key:'gap',id:g.id,label:VERDICT_LABEL[g.verdict],title:g.figure,color:g.verdict==='genuine'?'var(--gap)':g.verdict==='partial'?'var(--hold)':'var(--delivery)',bg:g.verdict==='genuine'?'var(--gap-bg)':g.verdict==='partial'?'var(--hold-bg)':'var(--delivery-bg)'}); });
  results=results.slice(0,12);
  if(results.length===0){box.innerHTML='<div class="search-result-item" style="color:var(--ink-faint)">No matches</div>';box.classList.add('open');return;}
  box.innerHTML=results.map(r=>`<div class="search-result-item" onclick="jumpTo('${r.key}','${r.id}')">
    <span class="sr-kind" style="background:${r.bg};color:${r.color}">${r.kind}</span>
    <span class="sr-ref">${esc(r.label)}</span><span class="sr-title">${esc(r.title)}</span></div>`).join('');
  box.classList.add('open');
});
document.addEventListener('click', e=>{ if(!e.target.closest('.search-wrap')) document.getElementById('searchResults').classList.remove('open'); });




















let panelHistory=[]; let currentPanelKind=null, currentPanelId=null;








document.addEventListener('keydown', e=>{
  if(e.key==='Escape') closePanel();
  if(e.key==='/' && document.activeElement.id!=='searchInput'){ e.preventDefault(); document.getElementById('searchInput').focus(); }
});

// Load the temporary JSON data file, then build the derived lookup tables that
// depend on it, and only then do the first real render.
async function loadJourneyData(){
  const res = await fetch('data/journey-data.json');
  if(!res.ok){ document.getElementById('journeyGrid').innerHTML = '<div style="padding:40px;color:#C0392B">Could not load data/journey-data.json — check the file exists and, if you opened this file directly rather than through a real web server, that\'s the likely cause: browsers block local file fetches for security. Push this to GitHub Pages (or run a local server) to see it working.</div>'; return false; }
  const data = await res.json();
  STAGES = data.STAGES; STAGE_GROUPS = data.STAGE_GROUPS; THEMES = data.THEMES;
  SUBMETRICS = data.SUBMETRICS; PERSONAS = data.PERSONAS; SOLUTIONS = data.SOLUTIONS;
  INSIGHTS = data.INSIGHTS; OPPS = data.OPPS; GAPS = data.GAPS;
  SOLUTIONS.forEach(s=>{ s.onBoard = ONBOARD_REFS.has(s.ref); });
  SOLUTIONS.forEach(s=>{ s.opps = OPPS.filter(o=>o.solution===s.ref).map(o=>o.id); });
  window.solutionByRef = {}; SOLUTIONS.forEach(s=>solutionByRef[s.ref]=s);
  window.insightById = {}; INSIGHTS.forEach(i=>insightById[i.id]=i);
  window.oppById = {}; OPPS.forEach(o=>oppById[o.id]=o);
  return true;
}
(async function init(){
  const ok = await loadJourneyData();
  if(ok) render();
})();
window.addEventListener('load', ()=>{ if(STAGES) render(); });
let resizeTimer=null;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{ render(); }, 150);
});
document.addEventListener('mouseover', e=>{
  const clickable = e.target.closest('.mini-card,.link-item-row,.bubble,.fdropdown-trigger,.fdropdown-option,.filter-btn,button,[onclick]');
  if(clickable){
    clickable.style.setProperty('cursor','pointer','important');
    clickable.querySelectorAll('*').forEach(el=>el.style.setProperty('cursor','pointer','important'));
  }
});

// ---- ADD NEW ITEM ----
// Creates a brand new Insight, Opportunity, or Solution from scratch, entirely in memory.
// Nothing here is saved anywhere permanent yet — refreshing the page removes anything
// added here, same as every other edit at this stage.
function nextId(prefix, arr, idField){
  let max = 0;
  arr.forEach(item=>{
    const raw = item[idField];
    const num = parseInt(String(raw).replace(prefix, ''));
    if(!isNaN(num) && num > max) max = num;
  });
  return prefix + (max + 1);
}
function openAddModal(){
  document.getElementById('addModalOverlay').classList.add('open');
  document.getElementById('addModal').classList.add('open');
  renderAddForm('insight');
}
function closeAddModal(){
  document.getElementById('addModalOverlay').classList.remove('open');
  document.getElementById('addModal').classList.remove('open');
}
function stageOptionsHtml(selected){
  return STAGES.map(st=>`<option value="${st.id}" ${st.id===selected?'selected':''}>${esc(st.name)}</option>`).join('');
}
function renderAddForm(type){
  const body = document.getElementById('addModalBody');
  const typeSelectHtml = `<div class="add-field"><label>What are you adding?</label>
    <select id="addTypeSelect" onchange="renderAddForm(this.value)">
      <option value="insight" ${type==='insight'?'selected':''}>An insight (pain point / delight)</option>
      <option value="opportunity" ${type==='opportunity'?'selected':''}>An opportunity (How Might We)</option>
      <option value="solution" ${type==='solution'?'selected':''}>A solution</option>
      <option value="metric" ${type==='metric'?'selected':''}>A metric</option>
    </select></div>`;

  const commonBottomHtml = `<div class="add-field"><label>Your name</label><input type="text" id="addCreatedBy" placeholder="e.g. Andrew Smith"></div>`;

  let fieldsHtml = '';
  if(type==='insight'){
    fieldsHtml = `
      <div class="add-field"><label>What did someone say or notice?</label><textarea id="addInsightText" rows="2" placeholder="e.g. I couldn't tell if the price included fees"></textarea></div>
      <div class="add-field"><label>Type</label><select id="addInsightType"><option value="pain">Pain point</option><option value="delight">Delight</option><option value="observation">Observation</option></select></div>
      <div class="add-field"><label>Which stage?</label><select id="addInsightStage">${stageOptionsHtml()}</select></div>
      <div class="add-field"><label>Link (optional)</label><input type="text" id="addInsightLink" placeholder="https://..."></div>`;
  } else if(type==='opportunity'){
    const insightOptions = INSIGHTS.map(i=>`<label><input type="checkbox" value="${i.id}"> ${esc(i.text.slice(0,70))}${i.text.length>70?'…':''}</label>`).join('');
    fieldsHtml = `
      <div class="add-field"><label>How Might We...?</label><textarea id="addOppText" rows="2" placeholder="e.g. HMW make the price shown always match what's charged?"></textarea></div>
      <div class="add-field"><label>Which stage?</label><select id="addOppStage">${stageOptionsHtml()}</select></div>
      <div class="add-field"><label>Related insights</label><div class="add-checklist" id="addOppInsights">${insightOptions || '<span class="empty-note">No insights exist yet to link.</span>'}</div></div>`;
  } else if(type==='solution'){
    fieldsHtml = `
      <div class="add-field"><label>Title</label><input type="text" id="addSolTitle" placeholder="e.g. Show fees inline with the price"></div>
      <div class="add-field"><label>Summary</label><textarea id="addSolSummary" rows="2" placeholder="What would this actually do?"></textarea></div>
      <div class="add-field"><label>Which stage?</label><select id="addSolStage">${stageOptionsHtml()}</select></div>
      <div class="add-field"><label>Effort</label><select id="addSolEffort">${[1,2,3,4,5].map(n=>`<option value="${n}">${EFFORT_LABEL[n]}</option>`).join('')}</select></div>
      <div class="add-field"><label>Member value</label><select id="addSolMv">${[1,2,3,4,5].map(n=>`<option value="${n}">${n}/5</option>`).join('')}</select></div>
      <div class="add-field"><label>Business value</label><select id="addSolBv">${[1,2,3,4,5].map(n=>`<option value="${n}">${n}/5</option>`).join('')}</select></div>
      <div class="add-field"><label>Status</label><select id="addSolRoad"><option value="not-on-roadmap">Not on roadmap</option><option value="on-roadmap">On roadmap</option><option value="on-hold">On hold</option><option value="in-delivery">In delivery</option></select></div>`;
  } else if(type==='metric'){
    fieldsHtml = `
      <div class="add-field"><label>Metric name</label><input type="text" id="addMetricLabel" placeholder="e.g. Checkout abandonment rate"></div>
      <div class="add-field"><label>Value</label><input type="text" id="addMetricValue" placeholder="e.g. 12%"></div>
      <div class="add-field"><label>Is this global, or specific to one stage?</label>
        <select id="addMetricScope" onchange="document.getElementById('addMetricStageWrap').style.display=this.value==='stage'?'block':'none'">
          <option value="global">Global (applies across the whole journey)</option>
          <option value="stage">Specific to one stage</option>
        </select>
      </div>
      <div class="add-field" id="addMetricStageWrap" style="display:none"><label>Which stage?</label><select id="addMetricStage">${stageOptionsHtml()}</select></div>
      <div class="add-field"><label>Source</label><input type="text" id="addMetricSource" placeholder="e.g. Support ticket tagging, Jun 2026"></div>`;
  }

  body.innerHTML = typeSelectHtml + fieldsHtml + commonBottomHtml + `<button class="add-modal-save" onclick="saveNewItem('${type}')">Add ${type}</button>`;
}
function saveNewItem(type){
  const createdBy = document.getElementById('addCreatedBy').value || 'Unknown';
  const createdDate = new Date().toISOString().slice(0,10);

  if(type==='insight'){
    const text = document.getElementById('addInsightText').value.trim();
    if(!text){ alert('Please enter the pain point or delight text.'); return; }
    const newItem = {
      id: nextId('IN', INSIGHTS, 'id'),
      stage: document.getElementById('addInsightStage').value,
      product: 'Wanderly', type: document.getElementById('addInsightType').value,
      text, analytics: false, link: document.getElementById('addInsightLink').value || '#', createdBy, createdDate
    };
    INSIGHTS.push(newItem);
  } else if(type==='metric'){
    const label = document.getElementById('addMetricLabel').value.trim();
    if(!label){ alert('Please enter a metric name.'); return; }
    const scope = document.getElementById('addMetricScope').value;
    const newItem = {
      id: nextId('SM', SUBMETRICS, 'id'),
      label, value: document.getElementById('addMetricValue').value.trim(),
      theme: 'satisfaction', stageId: scope==='stage' ? document.getElementById('addMetricStage').value : null,
      trend: 'flat', trendGood: false, changeLabel: document.getElementById('addMetricSource').value.trim() || 'Newly added',
      description: '', relatedGap: null, history: [{date: createdDate, num: parseFloat(document.getElementById('addMetricValue').value) || 0}],
      uploads: [{date: createdDate, source: document.getElementById('addMetricSource').value.trim() || 'Manually added', uploadedBy: createdBy}],
      createdBy, createdDate
    };
    SUBMETRICS.push(newItem);
  } else if(type==='opportunity'){
    const text = document.getElementById('addOppText').value.trim();
    if(!text){ alert('Please enter the How Might We text.'); return; }
    const checked = [...document.querySelectorAll('#addOppInsights input:checked')].map(el=>el.value);
    const newItem = {
      id: nextId('H', OPPS, 'id'),
      stage: document.getElementById('addOppStage').value,
      product: 'Wanderly', highValue: false, text, insights: checked, solution: null,
      createdBy, createdDate
    };
    OPPS.push(newItem);
  } else if(type==='solution'){
    const title = document.getElementById('addSolTitle').value.trim();
    if(!title){ alert('Please enter a title.'); return; }
    const newItem = {
      ref: nextId('W', SOLUTIONS, 'ref'),
      stage: document.getElementById('addSolStage').value,
      product: 'Wanderly',
      effort: parseInt(document.getElementById('addSolEffort').value),
      mv: parseInt(document.getElementById('addSolMv').value),
      bv: parseInt(document.getElementById('addSolBv').value),
      road: document.getElementById('addSolRoad').value,
      isIdea: true, title, summary: document.getElementById('addSolSummary').value.trim(),
      ratingWhy: '', flags: [], research: null, opps: [], onBoard: false,
      createdBy, createdDate
    };
    SOLUTIONS.push(newItem);
    solutionByRef[newItem.ref] = newItem;
  }
  closeAddModal();
  render();
}

// ---- DRAG AND DROP BETWEEN STAGES ----
// Uses a plain variable rather than the browser's DataTransfer API, since that API
// behaves inconsistently across browsers for this kind of same-page drag — a simple
// shared variable is more reliable here.
let dragData = null;
function handleDragStart(event, kind, id){
  dragData = { kind, id };
  event.dataTransfer.effectAllowed = 'move';
}
function handleDragOver(event){
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}
function handleDragLeave(event){
  event.currentTarget.classList.remove('drag-over');
}
function handleDrop(event, newStageId){
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  if(!dragData) return;
  const { kind, id } = dragData;
  let item = null;
  if(kind==='insight') item = insightById[id];
  else if(kind==='opp') item = oppById[id];
  else if(kind==='solution') item = solutionByRef[id];
  else if(kind==='gap') item = GAPS.find(g=>g.id===id);
  if(!item) return;
  item.stage = newStageId;
  dragData = null;
  render();
}

// ---- POINTER-BASED DRAG AND DROP ----
// Rebuilt using plain mouse events instead of the browser's native HTML5 drag-and-drop,
// which turned out not to work reliably. This version tracks the mouse directly, so it
// isn't dependent on any particular browser's drag implementation.
let justDragged = false;
let dragState = null;
function startCardDrag(event, kind, id){
  if(event.button !== 0) return; // left click only
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  dragState = {
    kind, id, card,
    startX: event.clientX, startY: event.clientY,
    offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
    ghost: null, moved: false
  };
  document.addEventListener('mousemove', onCardDragMove);
  document.addEventListener('mouseup', onCardDragEnd);
}
function onCardDragMove(event){
  if(!dragState) return;
  const dx = event.clientX - dragState.startX, dy = event.clientY - dragState.startY;
  if(!dragState.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return; // small movements are just clicks, not drags
  if(!dragState.moved){
    dragState.moved = true;
    justDragged = true;
    const rect = dragState.card.getBoundingClientRect();
    const ghost = dragState.card.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.width = rect.width + 'px';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.85';
    ghost.style.zIndex = '9999';
    ghost.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)';
    ghost.style.transform = 'rotate(-1deg)';
    document.body.appendChild(ghost);
    dragState.ghost = ghost;
    dragState.card.style.opacity = '0.3';
    document.querySelectorAll('.lane-cell').forEach(c=>{ if(c.getAttribute('ondrop')) c.classList.add('drag-target-available'); });
  }
  dragState.ghost.style.left = (event.clientX - dragState.offsetX) + 'px';
  dragState.ghost.style.top = (event.clientY - dragState.offsetY) + 'px';
  document.querySelectorAll('.lane-cell.drag-over').forEach(c=>c.classList.remove('drag-over'));
  const under = document.elementFromPoint(event.clientX, event.clientY);
  const cell = under ? under.closest('.lane-cell') : null;
  if(cell && cell.getAttribute('ondrop')) cell.classList.add('drag-over');
}
function onCardDragEnd(event){
  document.removeEventListener('mousemove', onCardDragMove);
  document.removeEventListener('mouseup', onCardDragEnd);
  if(!dragState) return;
  const wasMoved = dragState.moved;
  if(dragState.ghost) dragState.ghost.remove();
  dragState.card.style.opacity = '';
  document.querySelectorAll('.lane-cell.drag-over, .lane-cell.drag-target-available').forEach(c=>c.classList.remove('drag-over','drag-target-available'));

  if(wasMoved){
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const cell = under ? under.closest('.lane-cell') : null;
    const dropAttr = cell ? cell.getAttribute('ondrop') : null;
    const match = dropAttr ? dropAttr.match(/handleDrop\(event,'([^']+)'\)/) : null;
    if(match){
      const newStageId = match[1];
      let item = null;
      if(dragState.kind==='insight') item = insightById[dragState.id];
      else if(dragState.kind==='opp') item = oppById[dragState.id];
      else if(dragState.kind==='solution') item = solutionByRef[dragState.id];
      else if(dragState.kind==='gap') item = GAPS.find(g=>g.id===dragState.id);
      if(item){ item.stage = newStageId; render(); }
    }
  }
  dragState = null;
  setTimeout(()=>{ justDragged = false; }, 50); // give the click handler a moment to see this was a drag, not a click
}

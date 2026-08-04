// PANEL — the side panel that slides in from the right when you click a card,
// including its tabs, its back/forward history, and the search jump-to behaviour.

function openPanel(kind,id,isNavCall){
  if(!isNavCall){ panelHistory=[]; }
  currentPanelKind=kind; currentPanelId=id;
  updateBackButton();
  markSelected(kind,id);
  const allTabs=document.querySelectorAll('.ptab');
  document.getElementById('panelThumb').style.display='none';
  document.getElementById('panelHead').style.paddingRight='';
  resetTabs(allTabs);
  if(kind==='submetric'){
    const sm=subMetricById(id); if(!sm) return;
    const theme = THEMES[sm.theme];
    const gap = sm.relatedGap ? GAPS.find(x=>x.id===sm.relatedGap) : null;
    const siblings = SUBMETRICS.filter(x=>x.theme===sm.theme && x.id!==sm.id);
    const siblingGaps = siblings.map(sib=>sib.relatedGap?GAPS.find(g=>g.id===sib.relatedGap):null).filter(g=>g && (!gap || g.id!==gap.id));
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:${theme.bg};color:${theme.color};font-weight:700">${theme.label}</span>`;
    document.getElementById('panelTitle').textContent = sm.label;
    document.getElementById('panelSub').textContent = '';
    document.getElementById('panelScores').innerHTML='';
    allTabs[2].textContent=`Insights (${(gap?1:0)+siblingGaps.length})`; allTabs[2].style.display='inline';
    allTabs[5].textContent=`Metrics (${siblings.length})`;
    allTabs[6].textContent=`Uploads (${sm.uploads.length})`; allTabs[6].style.display='inline';
    const h=sm.history;
    const single = h.length===1;
    let graphSvg;
    if(sm.groups){
      graphSvg = renderMetricGroups(sm.groups);
    } else if(single){
      graphSvg = `<svg viewBox="0 0 300 100" style="width:100%;height:100px">
        <defs><filter id="glow-${sm.id}" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter></defs>
        <line x1="20" y1="50" x2="280" y2="50" stroke="#EEEDE9" stroke-width="1"/>
        <circle cx="150" cy="50" r="7" fill="#7B61FF" opacity="0.35" filter="url(#glow-${sm.id})"/>
        <circle cx="150" cy="50" r="5" fill="#7B61FF"/>
        <text x="150" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${esc(String(h[0].num))}%</text>
      </svg>
      <div style="text-align:center;font-size:10.5px;color:var(--ink-faint);margin-top:2px">${esc(h[0].date)}</div>`;
    } else {
      const nums = h.map(p=>p.num);
      const min = Math.min(...nums), max = Math.max(...nums);
      const range = (max-min) || 1;
      const padY = 25, plotH = 100-padY*2;
      const stepX = 260/(h.length-1);
      const pts = h.map((p,idx)=>({x:20+idx*stepX, y: padY + (1-(p.num-min)/range)*plotH}));
      const pathD = pts.map((p,i)=>(i===0?'M':'L')+p.x+','+p.y).join(' ');
      graphSvg = `<svg viewBox="0 0 300 100" style="width:100%;height:100px">
        <line x1="20" y1="${100-padY}" x2="280" y2="${100-padY}" stroke="#EEEDE9" stroke-width="1"/>
        <path d="${pathD}" fill="none" stroke="#7B61FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${pts.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#7B61FF"/><text x="${p.x}" y="${p.y-12}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${esc(String(h[i].num))}%</text>`).join('')}
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--ink-faint);padding:0 15px;margin-top:2px">${h.map(p=>`<span>${esc(p.date)}</span>`).join('')}</div>`;
    }
    document.getElementById('tab-overview').innerHTML=`
      <p class="plabel">Trend over time</p>
      ${sm.groups?graphSvg:`<div style="background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 18px 12px">${graphSvg}</div>`}
      <p class="plabel" style="margin-top:16px">What this is</p>
      <p class="pbody-text" style="color:var(--ink-soft);font-style:italic">${esc(theme.explainer)}</p>
      <p class="pbody-text" style="margin-top:8px">${esc(sm.description)}</p>`;
    allTabs[5].style.display='inline';
    document.getElementById('tab-metrics').innerHTML=`
      ${siblings.length?siblings.map(sib=>`<div class="link-item-row" onclick="openPanelNav('submetric','${sib.id}')"><span class="link-item-text">${esc(sib.label)}</span><span class="link-item-pill" style="background:var(--bg);color:var(--ink-soft)">${esc(sib.value)}</span></div>`).join(''):'<span class="empty-note">No other metrics under this theme yet.</span>'}`;
    document.getElementById('tab-insights').innerHTML=`
      <p class="plabel">Research gap for this metric</p>
      ${gap?`<div class="link-item-row" onclick="openPanelNav('gap','${gap.id}')"><span class="card-icon gap" style="width:18px;height:18px;font-size:10px">◈</span><span class="link-item-text">${esc(gap.figure.slice(0,70))}${gap.figure.length>70?'…':''}</span><span class="link-item-pill" style="background:${gap.verdict==='genuine'?'#FDECEC':'var(--bg)'};color:${gap.verdict==='genuine'?'#B23A3A':'var(--ink-soft)'}">${gap.verdict==='genuine'?'Genuine gap':gap.verdict==='partial'?'Partial gap':'Well explained'}</span></div>`:`<span class="empty-note">No research gap catalogued for this specific metric.</span>`}
      ${siblingGaps.length?`<p class="plabel" style="margin-top:16px">Other related research gaps</p><p style="font-size:11px;color:var(--ink-faint);margin-bottom:8px">From other metrics under the same theme — not specifically about this one.</p>${siblingGaps.map(sg=>`<div class="link-item-row" onclick="openPanelNav('gap','${sg.id}')"><span class="card-icon gap" style="width:18px;height:18px;font-size:10px">◈</span><span class="link-item-text">${esc(sg.figure.slice(0,70))}${sg.figure.length>70?'…':''}</span><span class="link-item-pill" style="background:${sg.verdict==='genuine'?'#FDECEC':'var(--bg)'};color:${sg.verdict==='genuine'?'#B23A3A':'var(--ink-soft)'}">${sg.verdict==='genuine'?'Genuine gap':sg.verdict==='partial'?'Partial gap':'Well explained'}</span></div>`).join('')}`:''}`;
    document.getElementById('tab-roadmap').innerHTML=`
      <p class="plabel">Upload history</p>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="border-bottom:1px solid var(--line);text-align:left;color:var(--ink-faint);font-size:11px"><th style="padding:6px 4px">Date</th><th style="padding:6px 4px">Source</th><th style="padding:6px 4px">Uploaded by</th></tr></thead>
        <tbody>${sm.uploads.map(u=>`<tr style="border-bottom:1px solid var(--line)"><td style="padding:8px 4px;color:var(--ink)">${esc(u.date)}</td><td style="padding:8px 4px;color:var(--ink-soft)">${esc(u.source)}</td><td style="padding:8px 4px;color:var(--ink-soft)">${esc(u.uploadedBy)}</td></tr>`).join('')}</tbody>
      </table>
      <p style="font-size:11px;color:var(--ink-faint);margin-top:10px">Each new data capture lands here as a new row, rather than overwriting the last one.</p>`;
    switchTab('overview');
    document.getElementById('overlay').classList.add('open');
    document.getElementById('panel').classList.add('open');
    return;
  }
  if(kind==='persona'){
    const p=PERSONAS.find(x=>x.id===id); if(!p) return;
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:${p.bg};color:${p.color}">${p.product} persona</span>`;
    document.getElementById('panelTitle').textContent = p.name;
    document.getElementById('panelSub').textContent = `"${p.quote}"`;
    document.getElementById('panelScores').innerHTML='';
    const thumb=document.getElementById('panelThumb');
    thumb.style.display='block';
    const initials=(p.name||'').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    thumb.innerHTML = p.img
      ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover" alt="${esc(p.name)}"/>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.color};color:#fff;font-weight:800;font-size:28px">${esc(initials)}</div>`;
    document.getElementById('panelHead').style.paddingRight='150px';
    allTabs[6].textContent='Journeys (1)'; allTabs[6].style.display='inline';
    document.getElementById('tab-overview').innerHTML=`
      <div class="prop-list" id="persona-edit-fields">
        <div class="prop-row" id="edit-row-name"><span class="prop-row-label">Name</span><span class="prop-row-val editable-val" onclick="startEditPersonaField('${p.id}','name')">${esc(p.name)} <span class="edit-hint">✎</span></span></div>
        <div class="prop-row" id="edit-row-quote"><span class="prop-row-label">Quote</span><span class="prop-row-val editable-val" onclick="startEditPersonaField('${p.id}','quote')">${esc(p.quote)} <span class="edit-hint">✎</span></span></div>
      </div>
      <p class="plabel" style="display:flex;align-items:center;justify-content:space-between">About me <button class="inline-edit-cancel" style="margin:0" onclick="startEditPersonaList('${p.id}','aboutMe')">Edit</button></p>
      <div id="edit-list-aboutMe"><ul style="margin:0 0 14px 18px;padding:0;font-size:13px;color:var(--ink-soft);line-height:1.6">${p.aboutMe.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Needs <button class="inline-edit-cancel" style="margin:0" onclick="startEditPersonaList('${p.id}','needs')">Edit</button></p>
      <div id="edit-list-needs"><ul style="margin:0 0 14px 18px;padding:0;font-size:13px;color:var(--ink-soft);line-height:1.6">${p.needs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Pain points <button class="inline-edit-cancel" style="margin:0" onclick="startEditPersonaList('${p.id}','painPoints')">Edit</button></p>
      <div id="edit-list-painPoints"><ul style="margin:0 0 14px 18px;padding:0;font-size:13px;color:var(--ink-soft);line-height:1.6">${p.painPoints.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Goals <button class="inline-edit-cancel" style="margin:0" onclick="startEditPersonaList('${p.id}','goals')">Edit</button></p>
      <div id="edit-list-goals"><p class="pbody-text">${p.goals.map(esc).join('; ')}</p></div>
      <p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Scenario <button class="inline-edit-cancel" style="margin:0" onclick="startEditPersonaScenario('${p.id}')">Edit</button></p>
      <div id="edit-scenario"><p class="pbody-text">${esc(p.scenario)}</p></div>`;
    document.getElementById('tab-roadmap').innerHTML=`
      <p class="plabel">Journeys</p>
      <div class="link-item-row" onclick="jumpToPersonaJourney('${p.journeyProduct}')"><span class="card-icon solution" style="width:18px;height:18px;font-size:10px">◉</span><span class="link-item-text">${esc(p.journeyName)}</span><span class="link-item-pill" style="background:${p.bg};color:${p.color}">Open →</span></div>`;
    switchTab('overview');
    document.getElementById('overlay').classList.add('open');
    document.getElementById('panel').classList.add('open');
    return;
  }
  if(kind==='insight'){
    const i=insightById[id]; if(!i) return;
    const typeColor={pain:['var(--pain)','var(--pain-bg)'],delight:['var(--delight)','var(--delight-bg)'],observation:['var(--obs)','var(--obs-bg)']}[i.type];
    const oppCount=OPPS.filter(o=>o.insights.includes(i.id)).length;
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:${typeColor[1]};color:${typeColor[0]}">${i.type}</span><span class="badge" style="background:${PROD_BG[i.product]};color:${PROD_COLOR[i.product]}">${i.product}</span>${i.analytics?'<span class="badge" style="background:var(--pain-bg);color:var(--pain)">Analytics supported</span>':''}`;
    document.getElementById('panelTitle').innerHTML=`<span class="editable-val" id="edit-text-wrap" onclick="startEditInsightText('${i.id}')">${esc(i.text)} <span class="edit-hint">✎</span></span>`;
    document.getElementById('panelSub').textContent = (STAGES.find(s=>s.id===i.stage)||{}).name + ' stage · Insight';
    document.getElementById('panelScores').innerHTML=`<div class="prop-list">
      <div class="prop-row" id="edit-row-type"><span class="prop-row-label">Type</span><span class="prop-row-val editable-val" onclick="startEditInsightType('${i.id}')">${i.type} <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-stage"><span class="prop-row-label">Stage</span><span class="prop-row-val editable-val" onclick="startEditInsightStage('${i.id}')">${esc((STAGES.find(st=>st.id===i.stage)||{}).name||i.stage)} <span class="edit-hint">✎</span></span></div>
      <div class="prop-row"><span class="prop-row-label">Product</span><span class="prop-row-val">${i.product}</span></div>
      <div class="prop-row" id="edit-row-analytics"><span class="prop-row-label">Analytics supported</span><span class="prop-row-val editable-val" onclick="toggleInsightAnalytics('${i.id}')">${i.analytics?'Yes':'No'} <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-link"><span class="prop-row-label">Link</span><span class="prop-row-val editable-val" onclick="startEditInsightLink('${i.id}')">${i.link && i.link!=='#' ? esc(i.link.slice(0,30))+'…' : 'None yet'} <span class="edit-hint">✎</span></span></div>
    </div>`;
    const siblingIds = siblingInsightIdsFor(i);
    const insightGaps = gapsForInsight(i);
    const oppsForSol = OPPS.filter(o=>o.insights.includes(i.id) && o.solution);
    const solRefs = [...new Set(oppsForSol.map(o=>o.solution))];
    const insightGapSols = GAPS.filter(g=>solRefs.includes(g.solution));
    const insightLinkedSubs = allSubMetrics().filter(sm=>insightGapSols.some(g=>g.id===sm.relatedGap));
    allTabs[1].style.display='inline';
    allTabs[2].textContent=`Insights (${insightGaps.length+siblingIds.length})`; allTabs[2].style.display='inline';
    allTabs[3].textContent=`Opportunities (${oppCount})`; allTabs[3].style.display='inline';
    allTabs[4].textContent=`Solutions (${solRefs.length})`; allTabs[4].style.display='inline';
    allTabs[5].textContent=`Metrics (${insightLinkedSubs.length})`; allTabs[5].style.display='inline';
    document.getElementById('tab-overview').innerHTML=`
      <p class="plabel">Source</p>
      <div class="search-hint-row"><span class="sh-label">Search the ${i.product==="Home"?"Home":i.product==="Motor"?"Motor":"Motor / Home"} journey map for</span><span class="sh-term">"${esc(i.text)}"</span></div>
      <div class="link-row"><span class="link-kind jm">Map</span><span class="link-text"><a href="${i.link}" target="_blank" rel="noreferrer">Open the ${i.product==="Home"?"Home":i.product==="Motor"?"Motor":"Motor / Home"} journey map ↗</a></span></div>`;
    document.getElementById('tab-quotes').innerHTML=`<div class="quote-block" style="border-left-color:${typeColor[0]}"><p>"${esc(i.text)}"</p><span>${i.product}${i.analytics?' · Analytics supported':''}</span></div>`;
    const siblings = siblingInsightsFor(i);
    document.getElementById('tab-insights').innerHTML=`
      <p class="plabel">Related research gap</p><div class="connect-section">${gapChipsForInsight(i)}</div>
      ${siblings?`<p class="plabel">Related pain points</p><div class="connect-section">${siblings}</div>`:''}`;
    document.getElementById('tab-metrics').innerHTML=insightLinkedSubs.length?`<div class="connect-section">${insightLinkedSubs.map(sm=>`<div class="link-item-row" onclick="openPanelNav('submetric','${sm.id}')"><span class="link-item-text">${esc(sm.label)}</span><span class="link-item-pill" style="background:var(--bg);color:var(--ink-soft)">${esc(sm.value)}</span></div>`).join('')}</div>`:'<span class="empty-note">Not tied to a metrics card yet.</span>';
    document.getElementById('tab-opps').innerHTML=`<div id="insight-opps-view"><p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Related opportunities (HMWs) <button class="inline-edit-cancel" style="margin:0" onclick="startEditInsightOpps('${i.id}')">Edit</button></p><div class="connect-section">${chipsForInsight(i)}</div></div>`;
    document.getElementById('tab-solutions').innerHTML=`<div class="connect-section">${solutionsForInsight(i)}</div>`;
    switchTab('overview');
  } else if(kind==='opp'){
    const o=oppById[id]; if(!o) return;
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:var(--hmw-bg);color:var(--hmw)">Opportunity</span><span class="badge" style="background:${PROD_BG[o.product]};color:${PROD_COLOR[o.product]}">${o.product}</span>${o.highValue?'<span class="badge" style="background:var(--hmw-bg);color:var(--hmw)">Big win</span>':''}`;
    document.getElementById('panelTitle').innerHTML=`<span class="editable-val" id="edit-text-wrap" onclick="startEditOppText('${o.id}')">${esc(o.text)} <span class="edit-hint">✎</span></span>`;
    document.getElementById('panelSub').textContent = (STAGES.find(s=>s.id===o.stage)||{}).name + ' stage · Opportunity';
    document.getElementById('panelScores').innerHTML=`<div class="prop-list">
      <div class="prop-row"><span class="prop-row-label">Status</span><span class="prop-row-val">Open</span></div>
      <div class="prop-row" id="edit-row-oppstage"><span class="prop-row-label">Stage</span><span class="prop-row-val editable-val" onclick="startEditOppStage('${o.id}')">${esc((STAGES.find(st=>st.id===o.stage)||{}).name||o.stage)} <span class="edit-hint">✎</span></span></div>
      <div class="prop-row"><span class="prop-row-label">Product</span><span class="prop-row-val">${o.product}</span></div>
      <div class="prop-row" id="edit-row-highvalue"><span class="prop-row-label">Big win</span><span class="prop-row-val editable-val" onclick="toggleOppHighValue('${o.id}')">${o.highValue?'Yes':'No'} <span class="edit-hint">✎</span></span></div>
    </div>`;
    allTabs[2].textContent=`Insights (${o.insights.length})`; allTabs[2].style.display='inline';
    allTabs[4].textContent=`Solutions (${o.solution?1:0})`; allTabs[4].style.display='inline';
    document.getElementById('tab-overview').innerHTML=`
      <div class="search-hint-row"><span class="sh-label">Search the ${o.product==="Home"?"Home":o.product==="Motor"?"Motor":"Motor / Home"} journey map for</span><span class="sh-term">"${esc(o.text)}"</span></div>`;
    document.getElementById('tab-insights').innerHTML=`
      <div id="opp-insights-view">
        <p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Related pain points / delights <button class="inline-edit-cancel" style="margin:0" onclick="startEditOppInsights('${o.id}')">Edit</button></p>
        <div class="connect-section">${chipsForOppInsights(o)}</div>
      </div>`;
    document.getElementById('tab-solutions').innerHTML=`<div class="connect-section">${chipForSolution(o.solution)}</div>`;
    switchTab('overview');
  } else if(kind==='solution'){
    const s=solutionByRef[id]; if(!s) return;
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:${PROD_BG[s.product]};color:${PROD_COLOR[s.product]}">${s.product}</span><span class="badge" style="background:${ROAD_BG[s.road]};color:${ROAD_COLOR[s.road]}">${ROAD_LABEL[s.road]}</span>${s.isIdea?'<span class="badge" style="background:var(--idea-bg);color:var(--idea)">💡 Idea — not from research</span>':''}${s.onBoard?'<span class="badge" style="background:var(--delivery-bg);color:var(--delivery)">On Miro board</span>':''}`;
    document.getElementById('panelSub').textContent = (STAGES.find(st=>st.id===s.stage)||{}).name + ' stage · Solution';
    const pr = computePriority(s);
    document.getElementById('panelScores').innerHTML=`<div class="prop-list">
      <div class="prop-row"><span class="prop-row-label">Priority</span><span class="prop-row-val"><span class="tiny-pill" style="background:${pr.bg};color:${pr.color};font-weight:800">${pr.label}</span></span></div>
      <div class="prop-row" id="edit-row-effort"><span class="prop-row-label">Effort</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','effort')">${EFFORT_LABEL[s.effort]} <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-mv"><span class="prop-row-label">Member value</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','mv')">${s.mv}/5 <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-bv"><span class="prop-row-label">Business value</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','bv')">${s.bv}/5 <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-road"><span class="prop-row-label">Status</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','road')">${ROAD_LABEL[s.road]} <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-stage"><span class="prop-row-label">Stage</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','stage')">${esc((STAGES.find(st=>st.id===s.stage)||{}).name||s.stage)} <span class="edit-hint">✎</span></span></div>
    </div>`;
    const insightCount = new Set((s.opps||[]).flatMap(oid=>(oppById[oid]||{insights:[]}).insights).concat(s.relatedInsightIds||[])).size;
    const solGaps = GAPS.filter(g=>g.solution===s.ref);
    const solLinkedSubs = allSubMetrics().filter(sm=>solGaps.some(g=>g.id===sm.relatedGap));
    allTabs[1].textContent=`Quotes (${quoteCountForSolution(s)})`; allTabs[1].style.display='inline';
    allTabs[2].textContent=`Insights (${insightCount})`; allTabs[2].style.display='inline';
    allTabs[3].textContent=`Opportunities (${(s.opps||[]).length})`; allTabs[3].style.display='inline';
    allTabs[5].textContent=`Metrics (${solLinkedSubs.length})`; allTabs[5].style.display='inline';
    allTabs[6].style.display='inline';
    document.getElementById('panelTitle').innerHTML=`<span class="tiny-pill" style="background:var(--ink);color:#fff;font-family:var(--mono);margin-right:10px;vertical-align:middle">${s.ref}</span><span class="editable-val" id="edit-title-wrap" onclick="startEditSolutionText('${s.ref}','title')">${esc(s.title)} <span class="edit-hint">✎</span></span>`;
    document.getElementById('tab-overview').innerHTML=`
      <div class="sticky-label-row"><span class="lbl-text" id="stickyLabel-${s.ref.replace('·','-')}">${esc(stickyLabel(s))}</span><button class="copy-btn" onclick="copyStickyLabel('${s.ref}')">Copy</button></div>
      <p class="plabel">What's happening</p>
      <div id="edit-summary-wrap"><p class="pbody-text" onclick="startEditSolutionText('${s.ref}','summary')" style="cursor:pointer">${esc(s.summary)} <span class="edit-hint">✎</span></p></div>
      ${s.ratingWhy?`<p class="plabel">Why I rated it this way</p><div id="edit-ratingWhy-wrap"><p class="pbody-text" onclick="startEditSolutionText('${s.ref}','ratingWhy')" style="cursor:pointer;color:var(--ink-soft)">${esc(s.ratingWhy)} <span class="edit-hint">✎</span></p></div>`:`<p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Why I rated it this way <button class="inline-edit-cancel" style="margin:0" onclick="startEditSolutionText('${s.ref}','ratingWhy')">Add</button></p><div id="edit-ratingWhy-wrap"></div>`}`;
    document.getElementById('tab-quotes').innerHTML = quotesForSolution(s) + (s.relatedInsightIds||[]).map(function(iid){
      const ins = insightById[iid]; if(!ins) return '';
      return '<div class="quote-block" style="border-left-color:' + (ins.type==='pain'?'var(--pain)':'var(--delight)') + '"><p>"' + esc(ins.text) + '"</p><span>Directly linked insight</span></div>';
    }).join('');
    document.getElementById('tab-insights').innerHTML=`
      <p class="plabel">Journey map</p>
      <div class="link-row"><span class="link-kind jm">Map</span><span class="link-text"><a href="${s.product==='Home'?HOME_JM:MOTOR_JM}" target="_blank" rel="noreferrer">Open the ${s.product} journey map ↗</a></span></div>
      ${journeySearchHint(s)}
      <p class="plabel">Research</p>
      ${s.research?`<div class="link-row"><span class="link-kind res">Research</span><span class="link-text"><a href="${s.research.url}" target="_blank" rel="noreferrer">${esc(s.research.title)}${s.research.date?', '+esc(s.research.date):''} ↗</a></span></div>${researchSearchHint(s)}`:`<div class="link-row"><span class="link-kind res">Research</span><span class="link-text" style="color:var(--ink-faint)">No research document found beyond the journey map itself for this item.</span></div>`}
      <p class="plabel">Related pain points / delights (via the linked opportunity)</p><div class="connect-section">${insightsForSolution(s)}</div>
      <p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Directly linked pain points / delights <button class="inline-edit-cancel" style="margin:0" onclick="startEditSolutionInsights('${s.ref}')">Edit</button></p>
      <div id="sol-insights-picker">${(s.relatedInsightIds||[]).length ? '<div class="connect-section">' + s.relatedInsightIds.map(function(iid){ var ins=insightById[iid]; return ins ? '<div class="link-item-row" onclick="openPanelNav(\'insight\',\''+iid+'\')"><span class="card-icon '+ins.type+'" style="width:18px;height:18px;font-size:10px">'+(ins.type==='pain'?'!':'♥')+'</span><span class="link-item-text">'+esc(ins.text.slice(0,60))+(ins.text.length>60?'…':'')+'</span></div>' : ''; }).join('') + '</div>' : '<span class="empty-note">None linked directly yet, click Edit to add some.</span>'}</div>
      ${s.ideaSource?`<p class="plabel">Where this idea came from</p><div class="flag-box" style="background:var(--idea-bg);border-left-color:var(--idea)"><p style="color:#7A5A0A">💡 ${esc(s.ideaSource)}</p></div>${s.ideaLink?`<div class="link-row"><span class="link-kind res">Source</span><span class="link-text"><a href="${s.ideaLink.url}" target="_blank" rel="noreferrer">${esc(s.ideaLink.title)} ↗</a></span></div>`:''}`:''}
      ${s.assumption?`<p class="plabel">My working assumption — not confirmed by research</p><div class="flag-box" style="background:#FFF9EC;border-left-color:#E0972C"><p style="color:#7A5A12;font-style:italic">${esc(s.assumption)}</p></div>`:''}
      ${s.flags.length?`<p class="plabel">Worth knowing</p>${s.flags.map(f=>`<div class="flag-box"><p>${esc(f)}</p></div>`).join('')}`:''}`;
    document.getElementById('tab-metrics').innerHTML = (solLinkedSubs.length?`<p class="plabel">Linked via analytics gap</p><div class="connect-section">${solLinkedSubs.map(sm=>`<div class="link-item-row" onclick="openPanelNav('submetric','${sm.id}')"><span class="link-item-text">${esc(sm.label)}</span><span class="link-item-pill" style="background:var(--bg);color:var(--ink-soft)">${esc(sm.value)}</span></div>`).join('')}</div>`:'') +
      `<p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Directly linked metrics <button class="inline-edit-cancel" style="margin:0" onclick="startEditSolutionMetrics('${s.ref}')">Edit</button></p>
      <div id="sol-metrics-picker">${(s.relatedMetricIds||[]).length ? '<div class="connect-section">' + s.relatedMetricIds.map(function(mid){ var sm=SUBMETRICS.find(function(x){return x.id===mid;}); return sm ? '<div class="link-item-row" onclick="openPanelNav(\'submetric\',\''+mid+'\')"><span class="link-item-text">'+esc(sm.label)+'</span><span class="link-item-pill" style="background:var(--bg);color:var(--ink-soft)">'+esc(sm.value)+'</span></div>' : ''; }).join('') + '</div>' : '<span class="empty-note">None linked directly yet, click Edit to add some.</span>'}</div>`;
    document.getElementById('tab-opps').innerHTML=`<div id="sol-opps-view"><p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Related opportunity (HMW) <button class="inline-edit-cancel" style="margin:0" onclick="startEditSolutionOpp('${s.ref}')">Edit</button></p><div class="connect-section">${chipsForSolutionOpps(s)}</div></div>`;
    document.getElementById('tab-roadmap').innerHTML=`<div class="status-box" id="roadmap-note-view"><p class="editable-val" onclick="startEditRoadmapNote('${s.ref}')">${esc(s.roadmapNote||'No roadmap note recorded.')} <span class="edit-hint">✎</span></p></div><p style="font-size:11px;color:var(--ink-faint);margin-top:10px">Added to squad Miro board: ${s.onBoard?'Yes':'Not yet'}</p>`;
    switchTab('overview');
  } else if(kind==='gap'){
    const g=GAPS.find(x=>x.id===id); if(!g) return;
    const vBg=g.verdict==='genuine'?'var(--gap-bg)':g.verdict==='partial'?'var(--hold-bg)':'var(--delivery-bg)';
    const vC=g.verdict==='genuine'?'var(--gap)':g.verdict==='partial'?'var(--hold)':'var(--delivery)';
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:${vBg};color:${vC}">${VERDICT_LABEL[g.verdict]}</span><span class="badge" style="background:${PROD_BG[g.product]};color:${PROD_COLOR[g.product]}">${g.product}</span>`;
    document.getElementById('panelTitle').innerHTML=`<span class="editable-val" id="edit-text-wrap" onclick="startEditGapText('${g.id}','gapTitle')">${esc(g.gapTitle)} <span class="edit-hint">✎</span></span>`;
    document.getElementById('panelSub').innerHTML=`<span class="editable-val" id="edit-figure-wrap" onclick="startEditGapText('${g.id}','figure')">${esc(g.figure)} <span class="edit-hint">✎</span></span>`;
    document.getElementById('panelScores').innerHTML=`<div class="prop-list">
      <div class="prop-row" id="edit-row-verdict"><span class="prop-row-label">Verdict</span><span class="prop-row-val editable-val" onclick="startEditGapVerdict('${g.id}')">${VERDICT_LABEL[g.verdict]} <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-gapstage"><span class="prop-row-label">Stage</span><span class="prop-row-val editable-val" onclick="startEditGapStage('${g.id}')">${esc((STAGES.find(st=>st.id===g.stage)||{}).name||g.stage||'None')} <span class="edit-hint">✎</span></span></div>
    </div>`;
    const relatedMetrics = allSubMetrics().filter(sm=>sm.relatedGap===g.id);
    const relatedSol = g.solution ? solutionByRef[g.solution] : null;
    const relatedPainCount = relatedSol ? insightIdsForSolution(relatedSol).length : 0;
    allTabs[2].textContent=`Insights (${relatedPainCount})`; allTabs[2].style.display='inline';
    allTabs[4].textContent=`Solutions (${g.solution?1:0})`; allTabs[4].style.display='inline';
    allTabs[5].textContent=`Metrics (${relatedMetrics.length})`; allTabs[5].style.display='inline';
    document.getElementById('tab-overview').innerHTML=`
      <p class="plabel">What the journey map says at this stage</p><div id="edit-mapSays-wrap"><p class="pbody-text" onclick="startEditGapMapSays('${g.id}')" style="cursor:pointer">${esc(g.mapSays)} <span class="edit-hint">✎</span></p></div>
      ${g.discoveryNote?`<div class="flag-box" style="background:var(--hmw-bg);border-left-color:var(--hmw);margin-top:16px"><p style="color:var(--hmw)">${esc(g.discoveryNote).replace(/^Discovery opportunity:/,'<strong>Discovery opportunity:</strong>')}</p></div>`:''}`;
    document.getElementById('tab-insights').innerHTML=`
      <div class="search-hint-row"><span class="sh-label">Search ${esc(g.docName)} for</span><span class="sh-term">"${esc(g.docSearch)}"</span></div>
      ${g.jmSearch?`<div class="search-hint-row"><span class="sh-label">Search the journey map for</span><span class="sh-term">"${esc(g.jmSearch)}"</span></div>`:''}
      <p class="plabel">Where this figure comes from</p><p class="pbody-text">${esc(g.docName)} — this is not a journey map document; check it directly for the exact figure and context.</p>
      <p class="plabel">Related pain points</p><div class="connect-section">${relatedSol?insightsForSolution(relatedSol):'<span class="empty-note">No linked solution to trace pain points from — this gap rests on the figure alone.</span>'}</div>`;
    document.getElementById('tab-metrics').innerHTML=`<div id="gap-metrics-view"><p class="plabel" style="display:flex;align-items:center;justify-content:space-between">Linked metrics <button class="inline-edit-cancel" style="margin:0" onclick="startEditGapMetrics('${g.id}')">Edit</button></p>
      ${relatedMetrics.length?'<div class="connect-section">'+relatedMetrics.map(sm=>`<div class="link-item-row" onclick="openPanelNav('submetric','${sm.id}')"><span class="link-item-text">${esc(sm.label)}</span><span class="link-item-pill" style="background:var(--bg);color:var(--ink-soft)">${esc(sm.value)}</span></div>`).join('')+'</div>':'<span class="empty-note">Not tied to a metrics card yet, click Edit to link one.</span>'}</div>`;
    document.getElementById('tab-solutions').innerHTML=`<div class="connect-section">${chipForSolution(g.solution)}</div>`;
    switchTab('overview');
  }
  document.getElementById('overlay').classList.add('open');
  document.getElementById('panel').classList.add('open');
}

function renderGapEditMode(g){
  document.getElementById('panelBadges').innerHTML=`<span class="badge">Editing gap</span>`;
  document.getElementById('panelSub').textContent = '';
  document.getElementById('panelTitle').innerHTML = '';
  document.getElementById('panelScores').innerHTML = '';
  document.getElementById('tab-overview').innerHTML = `
    <div class="add-field"><label>Gap title</label><input type="text" id="em-gapTitle" value="${esc(g.gapTitle)}"></div>
    <div class="add-field"><label>The figure</label><input type="text" id="em-figure" value="${esc(g.figure)}"></div>
    <div class="add-field"><label>Which stage?</label><select id="em-stage">${stageOptionsHtml(g.stage)}</select></div>
    <div class="add-field"><label>Verdict</label><select id="em-verdict"><option value="genuine" ${g.verdict==='genuine'?'selected':''}>Genuine gap</option><option value="partial" ${g.verdict==='partial'?'selected':''}>Partially explained</option><option value="well" ${g.verdict==='well'?'selected':''}>Well explained</option></select></div>
    <div class="add-field"><label>What the journey map says at this stage</label><textarea id="em-mapSays" rows="3">${esc(g.mapSays||'')}</textarea></div>
    <div class="add-field"><label>Source document name</label><input type="text" id="em-docName" value="${esc(g.docName||'')}"></div>
    <div class="add-field"><label>Discovery opportunity note (optional)</label><textarea id="em-discoveryNote" rows="2">${esc(g.discoveryNote||'')}</textarea></div>
    <button class="add-modal-save" onclick="saveGapEditMode('${g.id}')">Save all changes</button>`;
}
function saveGapEditMode(id){
  const g = GAPS.find(x=>x.id===id); if(!g) return;
  g.gapTitle = document.getElementById('em-gapTitle').value;
  g.figure = document.getElementById('em-figure').value;
  g.stage = document.getElementById('em-stage').value;
  g.verdict = document.getElementById('em-verdict').value;
  g.mapSays = document.getElementById('em-mapSays').value;
  g.docName = document.getElementById('em-docName').value;
  g.discoveryNote = document.getElementById('em-discoveryNote').value;
  openPanel('gap', id, true);
  render();
}
function startEditGapStage(id){
  const g = GAPS.find(function(x){return x.id===id;}); if(!g) return;
  const row = document.getElementById('edit-row-gapstage');
  const valCell = row.querySelector('.prop-row-val');
  valCell.onclick = null;
  const currentLabel = (STAGES.find(function(st){return st.id===g.stage;})||{}).name || g.stage || 'None';
  const optionsHtml = STAGES.map(function(st){ return '<div class="fdropdown-option'+(st.id===g.stage?' checked':'')+'" onclick="event.stopPropagation(); saveEditGapStage(\''+id+'\',\''+st.id+'\')"><span>'+esc(st.name)+'</span></div>'; }).join('');
  valCell.innerHTML = '<div class="inline-edit-row"><div class="fdropdown" style="flex-shrink:0"><button class="fdropdown-trigger" style="font-size:12.5px;padding:5px 10px" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(\'open\')">'+esc(currentLabel)+' <span class="chev"></span></button><div class="fdropdown-panel open">'+optionsHtml+'</div></div><button class="inline-edit-cancel" onclick="openPanel(\'gap\',\''+id+'\')">Cancel</button></div>';
}
function saveEditGapStage(id, newStage){
  const g = GAPS.find(function(x){return x.id===id;}); if(!g) return;
  g.stage = newStage;
  openPanel('gap', id, true);
  render();
}
function startEditGapMapSays(id){
  const g = GAPS.find(function(x){return x.id===id;}); if(!g) return;
  const wrap = document.getElementById('edit-mapSays-wrap');
  wrap.querySelector('.pbody-text').onclick = null;
  wrap.innerHTML = '<textarea id="editText-mapSays" rows="3" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:13px;box-sizing:border-box;font-family:var(--sans)">'+esc(g.mapSays)+'</textarea><div style="margin-top:6px"><button class="inline-edit-save" onclick="saveEditGapMapSays(\''+id+'\')">Save</button> <button class="inline-edit-cancel" onclick="openPanel(\'gap\',\''+id+'\')">Cancel</button></div>';
}
function saveEditGapMapSays(id){
  const g = GAPS.find(function(x){return x.id===id;}); if(!g) return;
  g.mapSays = document.getElementById('editText-mapSays').value;
  openPanel('gap', id, true);
  render();
}
function startEditGapText(id, field){
  const g = GAPS.find(x=>x.id===id); if(!g) return;
  const wrapId = field==='gapTitle' ? 'edit-text-wrap' : 'edit-figure-wrap';
  const wrap = document.getElementById(wrapId);
  wrap.onclick = null;
  wrap.outerHTML = `<span class="inline-edit-row" id="${wrapId}"><input type="text" id="editText-${field}" value="${esc(g[field])}" style="font-size:${field==='gapTitle'?'15px;font-weight:700':'13px'};padding:4px 8px;border:1px solid var(--line);border-radius:6px;width:260px"><button class="inline-edit-save" onclick="saveEditGapText('${id}','${field}')">Save</button><button class="inline-edit-cancel" onclick="openPanel('gap','${id}')">Cancel</button></span>`;
}
function saveEditGapText(id, field){
  const g = GAPS.find(x=>x.id===id); if(!g) return;
  g[field] = document.getElementById('editText-'+field).value;
  openPanel('gap', id);
  render();
}
function startEditGapVerdict(id){
  const g = GAPS.find(x=>x.id===id); if(!g) return;
  const row = document.getElementById('edit-row-verdict');
  const valCell = row.querySelector('.prop-row-val');
  valCell.onclick = null;
  const options = ['genuine','partial','well'];
  const optionsHtml = options.map(v=>`<div class="fdropdown-option${v===g.verdict?' checked':''}" onclick="event.stopPropagation(); saveEditGapVerdict('${id}','${v}')"><span>${VERDICT_LABEL[v]}</span></div>`).join('');
  valCell.innerHTML = `<div class="inline-edit-row"><div class="fdropdown" style="flex-shrink:0"><button class="fdropdown-trigger" style="font-size:12.5px;padding:5px 10px" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('open')">${VERDICT_LABEL[g.verdict]} <span class="chev"></span></button><div class="fdropdown-panel open">${optionsHtml}</div></div><button class="inline-edit-cancel" onclick="openPanel('gap','${id}')">Cancel</button></div>`;
}
function saveEditGapVerdict(id, newVerdict){
  const g = GAPS.find(x=>x.id===id); if(!g) return;
  g.verdict = newVerdict;
  openPanel('gap', id);
  render();
}
function renderPersonaEditMode(p){
  document.getElementById('panelBadges').innerHTML=`<span class="badge">Editing persona</span>`;
  document.getElementById('panelSub').textContent = '';
  document.getElementById('panelTitle').innerHTML = '';
  document.getElementById('panelScores').innerHTML = '';
  document.getElementById('panelThumb').style.display = 'none';
  document.getElementById('panelHead').style.paddingRight = '';
  document.getElementById('tab-overview').innerHTML = `
    <div class="add-field"><label>Name</label><input type="text" id="em-name" value="${esc(p.name)}"></div>
    <div class="add-field"><label>Quote</label><textarea id="em-quote" rows="2">${esc(p.quote)}</textarea></div>
    <div class="add-field"><label>About me — one per line</label><textarea id="em-aboutMe" rows="3">${p.aboutMe.map(esc).join('\n')}</textarea></div>
    <div class="add-field"><label>Needs — one per line</label><textarea id="em-needs" rows="3">${p.needs.map(esc).join('\n')}</textarea></div>
    <div class="add-field"><label>Pain points — one per line</label><textarea id="em-painPoints" rows="3">${p.painPoints.map(esc).join('\n')}</textarea></div>
    <div class="add-field"><label>Goals — one per line</label><textarea id="em-goals" rows="2">${p.goals.map(esc).join('\n')}</textarea></div>
    <div class="add-field"><label>Scenario</label><textarea id="em-scenario" rows="2">${esc(p.scenario)}</textarea></div>
    <button class="add-modal-save" onclick="savePersonaEditMode('${p.id}')">Save all changes</button>`;
}
function savePersonaEditMode(id){
  const p = PERSONAS.find(x=>x.id===id); if(!p) return;
  p.name = document.getElementById('em-name').value;
  p.quote = document.getElementById('em-quote').value;
  p.aboutMe = document.getElementById('em-aboutMe').value.split('\n').map(s=>s.trim()).filter(Boolean);
  p.needs = document.getElementById('em-needs').value.split('\n').map(s=>s.trim()).filter(Boolean);
  p.painPoints = document.getElementById('em-painPoints').value.split('\n').map(s=>s.trim()).filter(Boolean);
  p.goals = document.getElementById('em-goals').value.split('\n').map(s=>s.trim()).filter(Boolean);
  p.scenario = document.getElementById('em-scenario').value;
  openPanel('persona', id, true);
  render();
}
function startEditPersonaList(id, field){
  const p = PERSONAS.find(x=>x.id===id); if(!p) return;
  const wrap = document.getElementById('edit-list-'+field);
  wrap.innerHTML = `<textarea id="editList-${field}" rows="4" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:13px;box-sizing:border-box;font-family:var(--sans)" placeholder="One per line">${p[field].map(esc).join('\n')}</textarea>
    <div style="margin-top:6px"><button class="inline-edit-save" onclick="saveEditPersonaList('${id}','${field}')">Save</button> <button class="inline-edit-cancel" onclick="openPanel('persona','${id}')">Cancel</button></div>`;
}
function saveEditPersonaList(id, field){
  const p = PERSONAS.find(x=>x.id===id); if(!p) return;
  p[field] = document.getElementById('editList-'+field).value.split('\n').map(s=>s.trim()).filter(Boolean);
  openPanel('persona', id);
  render();
}
function startEditPersonaScenario(id){
  const p = PERSONAS.find(x=>x.id===id); if(!p) return;
  const wrap = document.getElementById('edit-scenario');
  wrap.innerHTML = `<textarea id="editScenario" rows="3" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:13px;box-sizing:border-box;font-family:var(--sans)">${esc(p.scenario)}</textarea>
    <div style="margin-top:6px"><button class="inline-edit-save" onclick="saveEditPersonaScenario('${id}')">Save</button> <button class="inline-edit-cancel" onclick="openPanel('persona','${id}')">Cancel</button></div>`;
}
function saveEditPersonaScenario(id){
  const p = PERSONAS.find(x=>x.id===id); if(!p) return;
  p.scenario = document.getElementById('editScenario').value;
  openPanel('persona', id);
  render();
}
function startEditPersonaField(id, field){
  const p = PERSONAS.find(x=>x.id===id); if(!p) return;
  const row = document.getElementById('edit-row-'+field);
  const valCell = row.querySelector('.prop-row-val');
  const currentVal = p[field] || '';
  valCell.innerHTML = `<div class="inline-edit-row"><input type="text" id="editInput-${field}" class="inline-edit-select" value="${esc(currentVal)}" style="width:200px;flex-shrink:0"><button class="inline-edit-save" onclick="saveEditPersonaField('${id}','${field}')">Save</button><button class="inline-edit-cancel" onclick="openPanel('persona','${id}')">Cancel</button></div>`;
  valCell.onclick = null;
}
function saveEditPersonaField(id, field){
  const p = PERSONAS.find(x=>x.id===id); if(!p) return;
  const input = document.getElementById('editInput-'+field);
  p[field] = input.value;
  // In-memory only, same as solution editing — nothing persists past a refresh yet.
  openPanel('persona', id);
  render();
}
function startEditRoadmapNote(ref){
  const view = document.getElementById('roadmap-note-view');
  const s = solutionByRef[ref];
  view.innerHTML = `<textarea id="editRoadmapNote" rows="3" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:13px;box-sizing:border-box;font-family:var(--sans)">${esc(s.roadmapNote||'')}</textarea><div style="margin-top:8px"><button class="inline-edit-save" onclick="saveRoadmapNote('${ref}')">Save</button> <button class="inline-edit-cancel" onclick="openPanel('solution','${ref}')">Cancel</button></div>`;
}
function saveRoadmapNote(ref){
  const s = solutionByRef[ref]; if(!s) return;
  s.roadmapNote = document.getElementById('editRoadmapNote').value;
  openPanel('solution', ref);
  render();
}
function startEditSolutionOpp(ref){
  const view = document.getElementById('sol-opps-view');
  const currentOpp = OPPS.find(o=>o.solution===ref);
  const options = OPPS.map(o=>`<label><input type="radio" name="solOppRadio" value="${o.id}" ${currentOpp && currentOpp.id===o.id?'checked':''}> ${esc(o.text.slice(0,65))}${o.text.length>65?'…':''}</label>`).join('');
  view.innerHTML = `
    <p class="plabel">Which opportunity does this solution address?</p>
    <div class="add-checklist" id="solOppChecklist" style="max-height:220px">
      <label><input type="radio" name="solOppRadio" value="" ${!currentOpp?'checked':''}> None</label>
      ${options}
    </div>
    <div style="margin-top:10px"><button class="inline-edit-save" onclick="saveSolutionOpp('${ref}')">Save</button> <button class="inline-edit-cancel" onclick="openPanel('solution','${ref}')">Cancel</button></div>`;
}
function saveSolutionOpp(ref){
  const chosen = document.querySelector('#solOppChecklist input:checked').value;
  // Clear any opportunity that previously pointed at this solution, so only one opportunity claims it.
  OPPS.forEach(o=>{ if(o.solution===ref) o.solution=null; });
  if(chosen){ const opp = OPPS.find(o=>o.id===chosen); if(opp) opp.solution = ref; }
  openPanel('solution', ref);
  render();
}
function renderOppEditMode(o){
  document.getElementById('panelBadges').innerHTML=`<span class="badge">Editing opportunity</span>`;
  document.getElementById('panelSub').textContent = '';
  document.getElementById('panelTitle').innerHTML = '';
  document.getElementById('panelScores').innerHTML = '';
  document.getElementById('tab-overview').innerHTML = `
    <div class="add-field"><label>How Might We...?</label><textarea id="em-text" rows="2">${esc(o.text)}</textarea></div>
    <div class="add-field"><label>Which stage?</label><select id="em-stage">${stageOptionsHtml(o.stage)}</select></div>
    <div class="add-field"><label>Product</label><select id="em-product"><option value="Wanderly" ${o.product==='Wanderly'?'selected':''}>Wanderly</option></select></div>
    <div class="add-field"><label><input type="checkbox" id="em-highvalue" ${o.highValue?'checked':''} style="width:auto;margin-right:6px"> Mark as a big win opportunity</label></div>
    <button class="add-modal-save" onclick="saveOppEditMode('${o.id}')">Save all changes</button>
    <p class="edit-note" style="margin-top:14px">Related insights are still edited from the Insights tab above.</p>`;
}
function saveOppEditMode(id){
  const o = oppById[id]; if(!o) return;
  o.text = document.getElementById('em-text').value;
  o.stage = document.getElementById('em-stage').value;
  o.product = document.getElementById('em-product').value;
  o.highValue = document.getElementById('em-highvalue').checked;
  openPanel('opp', id, true);
  render();
}
function toggleOppHighValue(id){
  const o = oppById[id]; if(!o) return;
  o.highValue = !o.highValue;
  openPanel('opp', id, true);
  render();
}
function startEditOppStage(id){
  const o = oppById[id]; if(!o) return;
  const row = document.getElementById('edit-row-oppstage');
  const valCell = row.querySelector('.prop-row-val');
  valCell.onclick = null;
  const currentLabel = (STAGES.find(function(st){return st.id===o.stage;})||{}).name || o.stage;
  const optionsHtml = STAGES.map(function(st){ return '<div class="fdropdown-option'+(st.id===o.stage?' checked':'')+'" onclick="event.stopPropagation(); saveEditOppStage(\''+id+'\',\''+st.id+'\')"><span>'+esc(st.name)+'</span></div>'; }).join('');
  valCell.innerHTML = '<div class="inline-edit-row"><div class="fdropdown" style="flex-shrink:0"><button class="fdropdown-trigger" style="font-size:12.5px;padding:5px 10px" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(\'open\')">'+esc(currentLabel)+' <span class="chev"></span></button><div class="fdropdown-panel open">'+optionsHtml+'</div></div><button class="inline-edit-cancel" onclick="openPanel(\'opp\',\''+id+'\')">Cancel</button></div>';
}
function saveEditOppStage(id, newStage){
  const o = oppById[id]; if(!o) return;
  o.stage = newStage;
  openPanel('opp', id, true);
  render();
}
function startEditOppText(id){
  const o = oppById[id]; if(!o) return;
  const wrap = document.getElementById('edit-text-wrap');
  wrap.onclick = null;
  wrap.outerHTML = `<span class="inline-edit-row" id="edit-text-wrap" style="display:flex;flex-direction:column;align-items:flex-start;gap:6px">
    <textarea id="editText-opptext" rows="2" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:15px;font-weight:700;box-sizing:border-box;font-family:var(--sans)">${esc(o.text)}</textarea>
    <span><button class="inline-edit-save" onclick="saveEditOppText('${id}')">Save</button><button class="inline-edit-cancel" onclick="openPanel('opp','${id}')">Cancel</button></span>
  </span>`;
}
function saveEditOppText(id){
  const o = oppById[id]; if(!o) return;
  o.text = document.getElementById('editText-opptext').value;
  openPanel('opp', id);
  render();
}
function startEditGapMetrics(id){
  const g = GAPS.find(function(x){ return x.id===id; }); if(!g) return;
  const view = document.getElementById('gap-metrics-view');
  const currentMetricIds = SUBMETRICS.filter(function(sm){ return sm.relatedGap===id; }).map(function(sm){ return sm.id; });
  view.innerHTML = '<p class="plabel">Which metrics relate to this gap?</p><div id="gapMetricsAutocomplete"></div><div style="margin-top:10px"><button class="inline-edit-cancel" onclick="openPanel(\'gap\',\''+id+'\')">Done</button></div>';
  renderGenericAutocomplete('gapMetricsAutocomplete', {
    items: SUBMETRICS,
    getId: function(m){ return m.id; },
    getLabel: function(m){ return m.label + ' (' + m.value + ')'; },
    getBadge: function(m){ return {text: (THEMES[m.theme]||{label:m.theme}).label, bg: 'var(--bg)', color: 'var(--ink-soft)'}; },
    selectedIds: currentMetricIds,
    onChange: function(newMetricIds){
      // A metric can only point at one gap at a time in this data shape, so selecting it here
      // sets that metric's relatedGap to this gap, and deselecting clears it.
      SUBMETRICS.forEach(function(sm){
        if(newMetricIds.indexOf(sm.id) !== -1) sm.relatedGap = id;
        else if(sm.relatedGap === id) sm.relatedGap = null;
      });
      render();
    },
    placeholder: 'Search metrics...'
  });
}
function startEditInsightOpps(id){
  const i = insightById[id]; if(!i) return;
  const view = document.getElementById('insight-opps-view');
  const currentOppIds = OPPS.filter(function(o){ return o.insights.includes(id); }).map(function(o){ return o.id; });
  view.innerHTML = '<p class="plabel">Which opportunities relate to this?</p><div id="insightOppsAutocomplete"></div><div style="margin-top:10px"><button class="inline-edit-cancel" onclick="openPanel(\'insight\',\''+id+'\')">Done</button></div>';
  renderGenericAutocomplete('insightOppsAutocomplete', {
    items: OPPS,
    getId: function(o){ return o.id; },
    getLabel: function(o){ return o.text; },
    getBadge: function(){ return {text: 'HMW', bg: 'var(--hmw-bg)', color: 'var(--hmw)'}; },
    selectedIds: currentOppIds,
    onChange: function(newOppIds){
      // Reciprocal edit: this insight's id gets added or removed from each opportunity's own .insights array,
      // rather than storing the relationship twice in two places.
      OPPS.forEach(function(o){
        const shouldHave = newOppIds.indexOf(o.id) !== -1;
        const has = o.insights.indexOf(id) !== -1;
        if(shouldHave && !has) o.insights.push(id);
        if(!shouldHave && has) o.insights.splice(o.insights.indexOf(id), 1);
      });
      render();
    },
    placeholder: 'Search opportunities...'
  });
}
function startEditSolutionMetrics(ref){
  const s = solutionByRef[ref]; if(!s) return;
  const view = document.getElementById('sol-metrics-picker');
  view.innerHTML = '<div id="solMetricsAutocomplete"></div><div style="margin-top:10px"><button class="inline-edit-cancel" onclick="openPanel(\'solution\',\''+ref+'\')">Done</button></div>';
  renderGenericAutocomplete('solMetricsAutocomplete', {
    items: SUBMETRICS,
    getId: function(m){ return m.id; },
    getLabel: function(m){ return m.label + ' (' + m.value + ')'; },
    getBadge: function(m){ return {text: (THEMES[m.theme]||{label:m.theme}).label, bg: 'var(--bg)', color: 'var(--ink-soft)'}; },
    selectedIds: s.relatedMetricIds, onChange: function(newIds){ s.relatedMetricIds = newIds; render(); },
    placeholder: 'Search metrics...'
  });
}
function startEditSolutionInsights(ref){
  const s = solutionByRef[ref]; if(!s) return;
  const view = document.getElementById('sol-insights-picker');
  view.innerHTML = '<div id="solInsightsAutocomplete"></div><div style="margin-top:10px"><button class="inline-edit-cancel" onclick="openPanel(\'solution\',\''+ref+'\')">Done</button></div>';
  renderInsightAutocomplete('solInsightsAutocomplete', s.relatedInsightIds, function(newIds){ s.relatedInsightIds = newIds; render(); });
}
function startEditOppInsights(id){
  const o = oppById[id]; if(!o) return;
  const view = document.getElementById('opp-insights-view');
  view.innerHTML = `
    <p class="plabel">Which insights relate to this opportunity?</p>
    <div id="oppInsightsAutocomplete"></div>
    <div style="margin-top:10px"><button class="inline-edit-cancel" onclick="openPanel('opp','${id}')">Done</button></div>`;
  renderInsightAutocomplete('oppInsightsAutocomplete', o.insights, function(newIds){ o.insights = newIds; render(); });
}
// A small, reusable searchable picker: shows selected items as removable chips, and up to 6
// matching suggestions as soon as the field is focused or typed into, rather than one long
// scrollable list of everything.
// A generic, reusable searchable picker. Works for linking to ANY data array
// (insights, opportunities, solutions, metrics, gaps), not just insights.
// config: { items, getId(item), getLabel(item), getBadge(item) -> {text,bg,color} or null, selectedIds, onChange }
const acRegistry = {};
function renderGenericAutocomplete(containerId, config){
  const container = document.getElementById(containerId);
  acRegistry[containerId] = config;
  function draw(query){
    const q = (query||'').toLowerCase();
    const matches = config.items.filter(function(it){ return config.getLabel(it).toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
    const chips = config.selectedIds.map(function(sid){
      const it = config.items.find(function(x){ return config.getId(x) === sid; }); if(!it) return '';
      const label = config.getLabel(it);
      return '<span class="ac-chip">' + esc(label.slice(0,40)) + (label.length>40?'…':'') + '<span class="ac-chip-x" onclick="event.stopPropagation(); genericAcRemove(\''+containerId+'\',\''+sid+'\')">×</span></span>';
    }).join('');
    const suggestions = matches.map(function(it){
      const id = config.getId(it);
      const already = config.selectedIds.indexOf(id) !== -1;
      const badge = config.getBadge ? config.getBadge(it) : null;
      const badgeHtml = badge ? '<span class="tiny-pill" style="background:' + badge.bg + ';color:' + badge.color + '">' + esc(badge.text) + '</span> ' : '';
      const label = config.getLabel(it);
      return '<div class="ac-suggestion' + (already?' ac-suggestion-selected':'') + '" onmousedown="event.preventDefault(); genericAcToggle(\'' + containerId + '\',\'' + id + '\')">' +
        badgeHtml + esc(label.slice(0,70)) + (label.length>70?'…':'') + (already ? ' <span class="ac-check">✓</span>' : '') +
        '</div>';
    }).join('') || '<div class="ac-suggestion" style="color:var(--ink-faint);font-style:italic">No matches</div>';
    container.innerHTML = '<div class="ac-chips">' + chips + '</div>' +
      '<input type="text" class="ac-input" placeholder="' + esc(config.placeholder||'Search...') + '" oninput="genericAcFilter(\'' + containerId + '\', this.value)" onfocus="genericAcFilter(\'' + containerId + '\', this.value)">' +
      '<div class="ac-suggestions">' + suggestions + '</div>';
  }
  container._acDraw = draw;
  draw('');
}
let acFocusGuard = false;
function genericAcFilter(containerId, query){
  document.getElementById(containerId)._acDraw(query);
  const input = document.getElementById(containerId).querySelector('.ac-input');
  if(input){
    input.value = query;
    if(!acFocusGuard){
      acFocusGuard = true;
      input.focus();
      acFocusGuard = false;
    }
    input.setSelectionRange(query.length, query.length);
  }
}
function genericAcToggle(containerId, id){
  const config = acRegistry[containerId];
  const idx = config.selectedIds.indexOf(id);
  if(idx === -1) config.selectedIds.push(id);
  else config.selectedIds.splice(idx, 1);
  config.onChange(config.selectedIds.slice());
  const inputVal = document.getElementById(containerId).querySelector('.ac-input') ? document.getElementById(containerId).querySelector('.ac-input').value : '';
  document.getElementById(containerId)._acDraw(inputVal);
  const freshInput = document.getElementById(containerId).querySelector('.ac-input');
  if(freshInput){
    freshInput.value = inputVal;
    if(!acFocusGuard){ acFocusGuard = true; freshInput.focus(); acFocusGuard = false; }
  }
}
function genericAcRemove(containerId, id){ genericAcToggle(containerId, id); }

// Convenience wrapper for insights specifically, kept for anything already using it.
function renderInsightAutocomplete(containerId, selectedIds, onChange){
  renderGenericAutocomplete(containerId, {
    items: INSIGHTS,
    getId: function(i){ return i.id; },
    getLabel: function(i){ return i.text; },
    getBadge: function(i){ return {text: i.type, bg: i.type==='pain'?'var(--pain-bg)':i.type==='delight'?'var(--delight-bg)':'var(--obs-bg)', color: i.type==='pain'?'var(--pain)':i.type==='delight'?'var(--delight)':'var(--obs)'}; },
    selectedIds: selectedIds, onChange: onChange, placeholder: 'Search insights...'
  });
}
function renderInsightEditMode(i){
  document.getElementById('panelBadges').innerHTML=`<span class="badge">Editing insight</span>`;
  document.getElementById('panelSub').textContent = '';
  document.getElementById('panelTitle').innerHTML = '';
  document.getElementById('panelScores').innerHTML = '';
  document.getElementById('tab-overview').innerHTML = `
    <div class="add-field"><label>What did someone say or notice?</label><textarea id="em-text" rows="2">${esc(i.text)}</textarea></div>
    <div class="add-field"><label>Type</label><select id="em-type"><option value="pain" ${i.type==='pain'?'selected':''}>Pain point</option><option value="delight" ${i.type==='delight'?'selected':''}>Delight</option><option value="observation" ${i.type==='observation'?'selected':''}>Observation</option></select></div>
    <div class="add-field"><label>Which stage?</label><select id="em-stage">${stageOptionsHtml(i.stage)}</select></div>
    <div class="add-field"><label>Product</label><select id="em-product"><option value="Wanderly" ${i.product==='Wanderly'?'selected':''}>Wanderly</option></select></div>
    <div class="add-field"><label>Link to journey map or research</label><input type="text" id="em-link" value="${esc(i.link||'')}"></div>
    <div class="add-field"><label><input type="checkbox" id="em-analytics" ${i.analytics?'checked':''} style="width:auto;margin-right:6px"> Backed by analytics data, not just this one account</label></div>
    <button class="add-modal-save" onclick="saveInsightEditMode('${i.id}')">Save all changes</button>`;
}
function saveInsightEditMode(id){
  const i = insightById[id]; if(!i) return;
  i.text = document.getElementById('em-text').value;
  i.type = document.getElementById('em-type').value;
  i.stage = document.getElementById('em-stage').value;
  i.product = document.getElementById('em-product').value;
  i.link = document.getElementById('em-link').value;
  i.analytics = document.getElementById('em-analytics').checked;
  openPanel('insight', id, true);
  render();
}
function toggleInsightAnalytics(id){
  const i = insightById[id]; if(!i) return;
  i.analytics = !i.analytics;
  openPanel('insight', id, true);
  render();
}
function startEditInsightStage(id){
  const i = insightById[id]; if(!i) return;
  const row = document.getElementById('edit-row-stage');
  const valCell = row.querySelector('.prop-row-val');
  valCell.onclick = null;
  const currentLabel = (STAGES.find(function(st){return st.id===i.stage;})||{}).name || i.stage;
  const optionsHtml = STAGES.map(function(st){ return '<div class="fdropdown-option'+(st.id===i.stage?' checked':'')+'" onclick="event.stopPropagation(); saveEditInsightStage(\''+id+'\',\''+st.id+'\')"><span>'+esc(st.name)+'</span></div>'; }).join('');
  valCell.innerHTML = '<div class="inline-edit-row"><div class="fdropdown" style="flex-shrink:0"><button class="fdropdown-trigger" style="font-size:12.5px;padding:5px 10px" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle(\'open\')">'+esc(currentLabel)+' <span class="chev"></span></button><div class="fdropdown-panel open">'+optionsHtml+'</div></div><button class="inline-edit-cancel" onclick="openPanel(\'insight\',\''+id+'\')">Cancel</button></div>';
}
function saveEditInsightStage(id, newStage){
  const i = insightById[id]; if(!i) return;
  i.stage = newStage;
  openPanel('insight', id, true);
  render();
}
function startEditInsightText(id){
  const i = insightById[id]; if(!i) return;
  const wrap = document.getElementById('edit-text-wrap');
  wrap.onclick = null;
  wrap.outerHTML = `<span class="inline-edit-row" id="edit-text-wrap" style="display:flex;flex-direction:column;align-items:flex-start;gap:6px">
    <textarea id="editText-text" rows="2" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:15px;font-weight:700;box-sizing:border-box;font-family:var(--sans)">${esc(i.text)}</textarea>
    <span><button class="inline-edit-save" onclick="saveEditInsightText('${id}')">Save</button><button class="inline-edit-cancel" onclick="openPanel('insight','${id}')">Cancel</button></span>
  </span>`;
}
function saveEditInsightText(id){
  const i = insightById[id]; if(!i) return;
  i.text = document.getElementById('editText-text').value;
  openPanel('insight', id);
  render();
}
function startEditInsightLink(id){
  const i = insightById[id]; if(!i) return;
  const row = document.getElementById('edit-row-link');
  const valCell = row.querySelector('.prop-row-val');
  valCell.onclick = null;
  valCell.innerHTML = `<div class="inline-edit-row"><input type="text" id="editInsightLink" value="${esc(i.link==='#'?'':i.link)}" placeholder="https://..." style="width:220px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;font-size:12.5px"><button class="inline-edit-save" onclick="saveInsightLink('${id}')">Save</button><button class="inline-edit-cancel" onclick="openPanel('insight','${id}')">Cancel</button></div>`;
}
function saveInsightLink(id){
  const i = insightById[id]; if(!i) return;
  i.link = document.getElementById('editInsightLink').value || '#';
  openPanel('insight', id);
}
function startEditInsightType(id){
  const i = insightById[id]; if(!i) return;
  const row = document.getElementById('edit-row-type');
  const valCell = row.querySelector('.prop-row-val');
  valCell.onclick = null;
  const options = ['pain','delight','observation'];
  const optionsHtml = options.map(t=>`<div class="fdropdown-option${t===i.type?' checked':''}" onclick="event.stopPropagation(); saveEditInsightType('${id}','${t}')"><span>${t}</span></div>`).join('');
  valCell.innerHTML = `<div class="inline-edit-row"><div class="fdropdown" style="flex-shrink:0"><button class="fdropdown-trigger" style="font-size:12.5px;padding:5px 10px" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('open')">${i.type} <span class="chev"></span></button><div class="fdropdown-panel open">${optionsHtml}</div></div><button class="inline-edit-cancel" onclick="openPanel('insight','${id}')">Cancel</button></div>`;
}
function saveEditInsightType(id, newType){
  const i = insightById[id]; if(!i) return;
  i.type = newType;
  openPanel('insight', id);
  render();
}
function renderSolutionEditMode(s){
  document.getElementById('panelBadges').innerHTML=`<span class="badge">Editing ${s.ref}</span>`;
  document.getElementById('panelSub').textContent = '';
  document.getElementById('panelTitle').innerHTML = '';
  document.getElementById('panelScores').innerHTML = '';
  document.getElementById('tab-overview').innerHTML = `
    <div class="add-field"><label>Title</label><input type="text" id="em-title" value="${esc(s.title)}"></div>
    <div class="add-field"><label>Summary</label><textarea id="em-summary" rows="3">${esc(s.summary)}</textarea></div>
    <div class="add-field"><label>Which stage?</label><select id="em-stage">${stageOptionsHtml(s.stage)}</select></div>
    <div class="add-field"><label>Product</label><select id="em-product"><option value="Wanderly" ${s.product==='Wanderly'?'selected':''}>Wanderly</option></select></div>
    <div style="display:flex;gap:10px">
      <div class="add-field" style="flex:1"><label>Effort</label><select id="em-effort">${[1,2,3,4,5].map(n=>`<option value="${n}" ${s.effort===n?'selected':''}>${EFFORT_LABEL[n]}</option>`).join('')}</select></div>
      <div class="add-field" style="flex:1"><label>Member value</label><select id="em-mv">${[1,2,3,4,5].map(n=>`<option value="${n}" ${s.mv===n?'selected':''}>${n}/5</option>`).join('')}</select></div>
      <div class="add-field" style="flex:1"><label>Business value</label><select id="em-bv">${[1,2,3,4,5].map(n=>`<option value="${n}" ${s.bv===n?'selected':''}>${n}/5</option>`).join('')}</select></div>
    </div>
    <div class="add-field"><label>Status</label><select id="em-road">${['on-roadmap','not-on-roadmap','on-hold','in-delivery'].map(r=>`<option value="${r}" ${s.road===r?'selected':''}>${ROAD_LABEL[r]}</option>`).join('')}</select></div>
    <div class="add-field"><label>Why I rated it this way</label><textarea id="em-ratingWhy" rows="2">${esc(s.ratingWhy||'')}</textarea></div>
    <button class="add-modal-save" onclick="saveSolutionEditMode('${s.ref}')">Save all changes</button>
    <p class="edit-note" style="margin-top:14px">Related insights, opportunities, and metrics are still edited from their own tabs above.</p>`;
}
function saveSolutionEditMode(ref){
  const s = solutionByRef[ref]; if(!s) return;
  s.title = document.getElementById('em-title').value;
  s.summary = document.getElementById('em-summary').value;
  s.stage = document.getElementById('em-stage').value;
  s.product = document.getElementById('em-product').value;
  s.effort = parseInt(document.getElementById('em-effort').value);
  s.mv = parseInt(document.getElementById('em-mv').value);
  s.bv = parseInt(document.getElementById('em-bv').value);
  s.road = document.getElementById('em-road').value;
  s.ratingWhy = document.getElementById('em-ratingWhy').value;
  openPanel('solution', ref, true);
  render();
}
function startEditSolutionText(ref, field){
  const s = solutionByRef[ref]; if(!s) return;
  const wrap = field==='title' ? document.getElementById('edit-title-wrap') : document.getElementById('edit-'+field+'-wrap').querySelector('.pbody-text') || document.getElementById('edit-'+field+'-wrap');
  wrap.onclick = null;
  const currentVal = s[field] || '';
  const isLong = field==='summary' || field==='ratingWhy';
  wrap.outerHTML = `<span class="inline-edit-row" id="edit-${field}-wrap" style="${isLong?'display:flex;flex-direction:column;align-items:flex-start;gap:6px':''}">
    ${isLong
      ? `<textarea id="editText-${field}" rows="3" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:13px;box-sizing:border-box;font-family:var(--sans)">${esc(currentVal)}</textarea>`
      : `<input type="text" id="editText-${field}" value="${esc(currentVal)}" style="font-size:15px;font-weight:700;padding:4px 8px;border:1px solid var(--line);border-radius:6px;width:280px">`}
    <span>
      <button class="inline-edit-save" onclick="saveEditSolutionText('${ref}','${field}')">Save</button>
      <button class="inline-edit-cancel" onclick="openPanel('solution','${ref}')">Cancel</button>
    </span>
  </span>`;
}
function saveEditSolutionText(ref, field){
  const s = solutionByRef[ref]; if(!s) return;
  const input = document.getElementById('editText-'+field);
  s[field] = input.value;
  openPanel('solution', ref);
  render();
}
function startEditSolutionField(ref, field){
  const s = solutionByRef[ref]; if(!s) return;
  const row = document.getElementById('edit-row-'+field);
  const valCell = row.querySelector('.prop-row-val');
  valCell.onclick = null;
  let options, currentVal, currentLabel;
  if(field==='effort'){ currentVal=s.effort; currentLabel=EFFORT_LABEL[currentVal]; options=[1,2,3,4,5].map(n=>({v:n, l:EFFORT_LABEL[n]})); }
  else if(field==='mv' || field==='bv'){ currentVal=s[field]; currentLabel=currentVal+'/5'; options=[1,2,3,4,5].map(n=>({v:n, l:n+'/5'})); }
  else if(field==='road'){ currentVal=s.road; currentLabel=ROAD_LABEL[currentVal]; options=['on-roadmap','not-on-roadmap','on-hold','in-delivery'].map(r=>({v:r, l:ROAD_LABEL[r]})); }
  else if(field==='stage'){ currentVal=s.stage; currentLabel=(STAGES.find(function(st){return st.id===currentVal;})||{}).name||currentVal; options=STAGES.map(function(st){ return {v:st.id, l:st.name}; }); }
  const optionsHtml = options.map(o=>`<div class="fdropdown-option${o.v===currentVal?' checked':''}" onclick="event.stopPropagation(); saveEditSolutionField('${ref}','${field}','${o.v}')"><span>${esc(String(o.l))}</span></div>`).join('');
  valCell.innerHTML = `<div class="inline-edit-row"><div class="fdropdown" style="flex-shrink:0"><button class="fdropdown-trigger" style="font-size:12.5px;padding:5px 10px" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('open')">${esc(String(currentLabel))} <span class="chev"></span></button><div class="fdropdown-panel open">${optionsHtml}</div></div><button class="inline-edit-cancel" onclick="openPanel('solution','${ref}')">Cancel</button></div>`;
}
function saveEditSolutionField(ref, field, rawValue){
  const s = solutionByRef[ref]; if(!s) return;
  if(field==='road' || field==='stage') s[field] = rawValue;
  else s[field] = parseInt(rawValue);
  // Updates the in-memory copy only — nothing is written anywhere permanent yet.
  // This is a live preview of the editing interaction, refreshing the page reloads
  // the original data/journey-data.json and this change disappears.
  openPanel('solution', ref);
  render();
}
function closePanel(){
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('panel').classList.remove('open');
  panelHistory=[]; currentPanelKind=null; currentPanelId=null;
  document.body.classList.remove('has-selection');
  clearSelection(); selectedKey=null;
}

function switchTab(t){
  document.querySelectorAll('.ptab').forEach(b=>b.classList.toggle('on', b.dataset.tab===t));
  document.querySelectorAll('.pcontent').forEach(c=>c.classList.toggle('on', c.id==='tab-'+t));
}

function markSelected(kind,id){
  clearSelection();
  selectedKey=kind+'-'+id;
  document.body.classList.add('has-selection');
  const sel = kind==='solution' ? `[data-key="sol-${id}"]` : `[data-key="${kind}-${id}"]`;
  const container = state.view==='matrix' ? document.getElementById('matrixSvg') : document.getElementById('journeyGrid');
  const el = (container && container.querySelector(sel)) || document.querySelector(sel);
  if(el) el.classList.add('selected');
}

function clearSelection(){
  document.querySelectorAll('.mini-card.selected').forEach(e=>e.classList.remove('selected'));
  document.querySelectorAll('.bubble.selected').forEach(e=>e.classList.remove('selected'));
  document.querySelectorAll('.metric-card.selected').forEach(e=>e.classList.remove('selected'));
  document.querySelectorAll('.stage-metric-chip.selected').forEach(e=>e.classList.remove('selected'));
}

function openPanelNav(kind,id){
  if(currentPanelKind && currentPanelId){ panelHistory.push({kind:currentPanelKind,id:currentPanelId}); }
  openPanel(kind,id,true);
  setTimeout(()=>scrollCardIntoView(kind,id),60);
}

function goBackPanel(){
  const prev=panelHistory.pop();
  if(!prev) return;
  openPanel(prev.kind,prev.id,true);
  setTimeout(()=>scrollCardIntoView(prev.kind,prev.id),60);
}

function resetTabs(allTabs,labels){
  const defaults=['Overview','Quotes','Insights','Opportunities','Solutions','Metrics','Roadmap'];
  allTabs.forEach((t,i)=>{ t.textContent = (labels&&labels[i])||defaults[i]; t.style.display='none'; });
  allTabs[0].style.display='inline';
}

function updateBackButton(){
  const btn=document.getElementById('panelBack');
  if(btn) btn.style.display = panelHistory.length>0 ? 'flex' : 'none';
}

function scrollCardIntoView(kind,id){
  const keyPrefix = kind==='solution' ? 'sol' : kind;
  const sel = `[data-key="${keyPrefix}-${id}"]`;
  const container = state.view==='matrix' ? document.getElementById('matrixSvg') : document.getElementById('journeyGrid');
  const el = (container && container.querySelector(sel)) || document.querySelector(sel);
  if(el) el.scrollIntoView({behavior:'smooth', inline:'center', block:'center'});
}

function showMatrixHover(evt, ref){
  const s = solutionByRef[ref]; if(!s) return;
  const card = document.getElementById('matrixHoverCard');
  const container = document.getElementById('matrixSvg').closest('.matrix-svg-container');
  const containerRect = container.getBoundingClientRect();
  const avg = ((s.mv+s.bv)/2).toFixed(1);
  card.innerHTML = `
    <div class="mhc-title">${esc(s.title)}</div>
    <div class="mhc-why"><span>WHY IT MATTERS:</span> ${esc((s.ratingWhy||s.summary||'').slice(0,110))}${(s.ratingWhy||s.summary||'').length>110?'…':''}</div>
    <div class="mhc-stats">
      <div><span class="mhc-stat-label">Member value</span><span class="mhc-stat-val">${s.mv}/5</span></div>
      <div><span class="mhc-stat-label">Business value</span><span class="mhc-stat-val">${s.bv}/5</span></div>
      <div><span class="mhc-stat-label">Effort</span><span class="mhc-stat-val">${EFFORT_LABEL[s.effort]}</span></div>
    </div>`;
  let left = evt.clientX - containerRect.left + 16;
  let top = evt.clientY - containerRect.top + 16;
  card.style.left = left+'px';
  card.style.top = top+'px';
  card.style.display = 'block';
  // keep on-screen: flip if it would overflow the container
  requestAnimationFrame(()=>{
    const cardRect = card.getBoundingClientRect();
    if(cardRect.right > containerRect.right){ card.style.left = (left - cardRect.width - 32) + 'px'; }
    if(cardRect.bottom > containerRect.bottom){ card.style.top = (top - cardRect.height - 32) + 'px'; }
  });
}

function hideMatrixHover(){
  document.getElementById('matrixHoverCard').style.display = 'none';
}

function toggleOnBoard(ref){
  const s=solutionByRef[ref]; if(!s) return;
  s.onBoard = !s.onBoard;
  render();
  if(document.getElementById('panel').classList.contains('open') && selectedKey==='solution-'+ref){
    openPanel('solution', ref);
  }
}

async function copyStickyLabel(ref){
  const s=solutionByRef[ref]; if(!s) return;
  const text = stickyLabel(s);
  const labelEl = document.querySelector(`#stickyLabel-${ref.replace('·','-')}`);
  const btn = labelEl?.nextElementSibling;
  let ok=false;
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      ok=true;
    }
  }catch(e){ ok=false; }
  if(!ok){
    try{
      const ta=document.createElement('textarea');
      ta.value=text; ta.style.position='fixed'; ta.style.left='-9999px';
      document.body.appendChild(ta); ta.focus(); ta.select();
      ok=document.execCommand('copy');
      document.body.removeChild(ta);
    }catch(e){ ok=false; }
  }
  if(!btn) return;
  const orig=btn.textContent;
  if(ok){
    btn.textContent='Copied'; setTimeout(()=>btn.textContent=orig,1200);
  } else {
    // Last resort: select the visible text so the person can Ctrl/Cmd+C manually
    if(labelEl){
      const range=document.createRange(); range.selectNodeContents(labelEl);
      const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    }
    btn.textContent='Select & press ⌘/Ctrl+C'; setTimeout(()=>btn.textContent=orig,2200);
  }
}

function jumpToPersonaJourney(product){
  closePanel();
  state.product = new Set([product]);
  renderFilterDropdown('product');
  state.view='journey';
  document.querySelectorAll('#viewToggle .filter-btn').forEach(x=>x.classList.toggle('on',x.dataset.view==='journey'));
  document.getElementById('journeyView').style.display='block';
  document.getElementById('matrixView').style.display='none';
  document.getElementById('personaView').style.display='none';
  render();
}

function jumpTo(kind,id){
  document.getElementById('searchResults').classList.remove('open');
  document.getElementById('searchInput').value='';
  state.product=new Set(); state.road=new Set();
  renderFilterDropdown('product'); renderFilterDropdown('road');
  document.querySelectorAll('#viewToggle .filter-btn').forEach(x=>x.classList.toggle('on',x.dataset.view==='journey'));
  state.view='journey';
  document.getElementById('journeyView').style.display='block';
  document.getElementById('matrixView').style.display='none';
  document.getElementById('personaView').style.display='none';
  render();
  const keyPrefix = kind==='solution' ? 'sol' : kind;
  setTimeout(()=>{
    openPanel(kind,id);
    const el=document.querySelector(`[data-key="${keyPrefix}-${id}"]`);
    if(el) el.scrollIntoView({behavior:'smooth', inline:'center', block:'center'});
  },60);
}

function norm(s){return s.toLowerCase().replace(/[·.\s]/g,'');}
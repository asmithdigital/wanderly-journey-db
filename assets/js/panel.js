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
      <p class="plabel">About me</p><ul style="margin:0 0 14px 18px;padding:0;font-size:13px;color:var(--ink-soft);line-height:1.6">${p.aboutMe.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <p class="plabel">Needs</p><ul style="margin:0 0 14px 18px;padding:0;font-size:13px;color:var(--ink-soft);line-height:1.6">${p.needs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <p class="plabel">Pain points</p><ul style="margin:0 0 14px 18px;padding:0;font-size:13px;color:var(--ink-soft);line-height:1.6">${p.painPoints.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <p class="plabel">Goals</p><p class="pbody-text">${p.goals.map(esc).join('; ')}</p>
      <p class="plabel">Scenario</p><p class="pbody-text">${esc(p.scenario)}</p>`;
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
    document.getElementById('panelTitle').textContent = i.text;
    document.getElementById('panelSub').textContent = (STAGES.find(s=>s.id===i.stage)||{}).name + ' stage · Insight';
    document.getElementById('panelScores').innerHTML=`<div class="prop-list">
      <div class="prop-row"><span class="prop-row-label">Type</span><span class="prop-row-val">${i.type}</span></div>
      <div class="prop-row"><span class="prop-row-label">Product</span><span class="prop-row-val">${i.product}</span></div>
      <div class="prop-row"><span class="prop-row-label">Analytics supported</span><span class="prop-row-val">${i.analytics?'Yes':'No'}</span></div>
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
    document.getElementById('tab-opps').innerHTML=`<div class="connect-section">${chipsForInsight(i)}</div>`;
    document.getElementById('tab-solutions').innerHTML=`<div class="connect-section">${solutionsForInsight(i)}</div>`;
    switchTab('overview');
  } else if(kind==='opp'){
    const o=oppById[id]; if(!o) return;
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:var(--hmw-bg);color:var(--hmw)">Opportunity</span><span class="badge" style="background:${PROD_BG[o.product]};color:${PROD_COLOR[o.product]}">${o.product}</span>${o.highValue?'<span class="badge" style="background:var(--hmw-bg);color:var(--hmw)">Big win</span>':''}`;
    document.getElementById('panelTitle').textContent = o.text;
    document.getElementById('panelSub').textContent = (STAGES.find(s=>s.id===o.stage)||{}).name + ' stage · Opportunity';
    document.getElementById('panelScores').innerHTML=`<div class="prop-list">
      <div class="prop-row"><span class="prop-row-label">Status</span><span class="prop-row-val">Open</span></div>
      <div class="prop-row"><span class="prop-row-label">Product</span><span class="prop-row-val">${o.product}</span></div>
      <div class="prop-row"><span class="prop-row-label">Big win</span><span class="prop-row-val">${o.highValue?'Yes':'No'}</span></div>
    </div>`;
    allTabs[2].textContent=`Insights (${o.insights.length})`; allTabs[2].style.display='inline';
    allTabs[4].textContent=`Solutions (${o.solution?1:0})`; allTabs[4].style.display='inline';
    document.getElementById('tab-overview').innerHTML=`
      <div class="search-hint-row"><span class="sh-label">Search the ${o.product==="Home"?"Home":o.product==="Motor"?"Motor":"Motor / Home"} journey map for</span><span class="sh-term">"${esc(o.text)}"</span></div>`;
    document.getElementById('tab-insights').innerHTML=`<p class="plabel">Related pain points / delights</p><div class="connect-section">${chipsForOppInsights(o)}</div>`;
    document.getElementById('tab-solutions').innerHTML=`<div class="connect-section">${chipForSolution(o.solution)}</div>`;
    switchTab('overview');
  } else if(kind==='solution'){
    const s=solutionByRef[id]; if(!s) return;
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:${PROD_BG[s.product]};color:${PROD_COLOR[s.product]}">${s.product}</span><span class="badge" style="background:${ROAD_BG[s.road]};color:${ROAD_COLOR[s.road]}">${ROAD_LABEL[s.road]}</span>${s.isIdea?'<span class="badge" style="background:var(--idea-bg);color:var(--idea)">💡 Idea — not from research</span>':''}${s.onBoard?'<span class="badge" style="background:var(--delivery-bg);color:var(--delivery)">On Miro board</span>':''}`;
    document.getElementById('panelTitle').innerHTML=`<span class="tiny-pill" style="background:var(--ink);color:#fff;font-family:var(--mono);margin-right:12px;vertical-align:middle">${s.ref}</span>${esc(s.title)}`;
    document.getElementById('panelSub').textContent = (STAGES.find(st=>st.id===s.stage)||{}).name + ' stage · Solution';
    const pr = computePriority(s);
    document.getElementById('panelScores').innerHTML=`<div class="prop-list">
      <div class="prop-row"><span class="prop-row-label">Priority</span><span class="prop-row-val"><span class="tiny-pill" style="background:${pr.bg};color:${pr.color};font-weight:800">${pr.label}</span></span></div>
      <div class="prop-row" id="edit-row-effort"><span class="prop-row-label">Effort</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','effort')">${EFFORT_LABEL[s.effort]} <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-mv"><span class="prop-row-label">Member value</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','mv')">${s.mv}/5 <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-bv"><span class="prop-row-label">Business value</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','bv')">${s.bv}/5 <span class="edit-hint">✎</span></span></div>
      <div class="prop-row" id="edit-row-road"><span class="prop-row-label">Status</span><span class="prop-row-val editable-val" onclick="startEditSolutionField('${s.ref}','road')">${ROAD_LABEL[s.road]} <span class="edit-hint">✎</span></span></div>
    </div>`;
    const insightCount = new Set((s.opps||[]).flatMap(oid=>(oppById[oid]||{insights:[]}).insights)).size;
    const solGaps = GAPS.filter(g=>g.solution===s.ref);
    const solLinkedSubs = allSubMetrics().filter(sm=>solGaps.some(g=>g.id===sm.relatedGap));
    allTabs[1].textContent=`Quotes (${quoteCountForSolution(s)})`; allTabs[1].style.display='inline';
    allTabs[2].textContent=`Insights (${insightCount})`; allTabs[2].style.display='inline';
    allTabs[3].textContent=`Opportunities (${(s.opps||[]).length})`; allTabs[3].style.display='inline';
    allTabs[5].textContent=`Metrics (${solLinkedSubs.length})`; allTabs[5].style.display='inline';
    allTabs[6].style.display='inline';
    document.getElementById('tab-overview').innerHTML=`
      <div class="sticky-label-row"><span class="lbl-text" id="stickyLabel-${s.ref.replace('·','-')}">${esc(stickyLabel(s))}</span><button class="copy-btn" onclick="copyStickyLabel('${s.ref}')">Copy</button></div>
      <p class="plabel">What's happening</p><p class="pbody-text">${esc(s.summary)}</p>
      ${s.ratingWhy?`<p class="plabel">Why I rated it this way</p><p class="pbody-text" style="color:var(--ink-soft)">${esc(s.ratingWhy)}</p>`:''}`;
    document.getElementById('tab-quotes').innerHTML = quotesForSolution(s);
    document.getElementById('tab-insights').innerHTML=`
      <p class="plabel">Journey map</p>
      <div class="link-row"><span class="link-kind jm">Map</span><span class="link-text"><a href="${s.product==='Home'?HOME_JM:MOTOR_JM}" target="_blank" rel="noreferrer">Open the ${s.product} journey map ↗</a></span></div>
      ${journeySearchHint(s)}
      <p class="plabel">Research</p>
      ${s.research?`<div class="link-row"><span class="link-kind res">Research</span><span class="link-text"><a href="${s.research.url}" target="_blank" rel="noreferrer">${esc(s.research.title)}${s.research.date?', '+esc(s.research.date):''} ↗</a></span></div>${researchSearchHint(s)}`:`<div class="link-row"><span class="link-kind res">Research</span><span class="link-text" style="color:var(--ink-faint)">No research document found beyond the journey map itself for this item.</span></div>`}
      <p class="plabel">Related pain points / delights</p><div class="connect-section">${insightsForSolution(s)}</div>
      ${s.ideaSource?`<p class="plabel">Where this idea came from</p><div class="flag-box" style="background:var(--idea-bg);border-left-color:var(--idea)"><p style="color:#7A5A0A">💡 ${esc(s.ideaSource)}</p></div>${s.ideaLink?`<div class="link-row"><span class="link-kind res">Source</span><span class="link-text"><a href="${s.ideaLink.url}" target="_blank" rel="noreferrer">${esc(s.ideaLink.title)} ↗</a></span></div>`:''}`:''}
      ${s.assumption?`<p class="plabel">My working assumption — not confirmed by research</p><div class="flag-box" style="background:#FFF9EC;border-left-color:#E0972C"><p style="color:#7A5A12;font-style:italic">${esc(s.assumption)}</p></div>`:''}
      ${s.flags.length?`<p class="plabel">Worth knowing</p>${s.flags.map(f=>`<div class="flag-box"><p>${esc(f)}</p></div>`).join('')}`:''}`;
    document.getElementById('tab-metrics').innerHTML=solLinkedSubs.length?`<div class="connect-section">${solLinkedSubs.map(sm=>`<div class="link-item-row" onclick="openPanelNav('submetric','${sm.id}')"><span class="link-item-text">${esc(sm.label)}</span><span class="link-item-pill" style="background:var(--bg);color:var(--ink-soft)">${esc(sm.value)}</span></div>`).join('')}</div>`:'<span class="empty-note">Not tied to a metrics card yet.</span>';
    document.getElementById('tab-opps').innerHTML=`<p class="plabel">Related opportunity (HMW)</p><div class="connect-section">${chipsForSolutionOpps(s)}</div>`;
    document.getElementById('tab-roadmap').innerHTML=`<div class="status-box"><p>${esc(s.roadmapNote||'No roadmap note recorded.')}</p></div><p style="font-size:11px;color:var(--ink-faint);margin-top:10px">Added to squad Miro board: ${s.onBoard?'Yes':'Not yet'}</p>`;
    switchTab('overview');
  } else if(kind==='gap'){
    const g=GAPS.find(x=>x.id===id); if(!g) return;
    const vBg=g.verdict==='genuine'?'var(--gap-bg)':g.verdict==='partial'?'var(--hold-bg)':'var(--delivery-bg)';
    const vC=g.verdict==='genuine'?'var(--gap)':g.verdict==='partial'?'var(--hold)':'var(--delivery)';
    document.getElementById('panelBadges').innerHTML=`<span class="badge" style="background:${vBg};color:${vC}">${VERDICT_LABEL[g.verdict]}</span><span class="badge" style="background:${PROD_BG[g.product]};color:${PROD_COLOR[g.product]}">${g.product}</span>`;
    document.getElementById('panelTitle').textContent = g.gapTitle;
    document.getElementById('panelSub').textContent = g.figure;
    document.getElementById('panelScores').innerHTML='';
    const relatedMetrics = allSubMetrics().filter(sm=>sm.relatedGap===g.id);
    const relatedSol = g.solution ? solutionByRef[g.solution] : null;
    const relatedPainCount = relatedSol ? insightIdsForSolution(relatedSol).length : 0;
    allTabs[2].textContent=`Insights (${relatedPainCount})`; allTabs[2].style.display='inline';
    allTabs[4].textContent=`Solutions (${g.solution?1:0})`; allTabs[4].style.display='inline';
    allTabs[5].textContent=`Metrics (${relatedMetrics.length})`; allTabs[5].style.display='inline';
    document.getElementById('tab-overview').innerHTML=`
      <p class="plabel">What the journey map says at this stage</p><p class="pbody-text">${esc(g.mapSays)}</p>
      ${g.discoveryNote?`<div class="flag-box" style="background:var(--hmw-bg);border-left-color:var(--hmw);margin-top:16px"><p style="color:var(--hmw)">${esc(g.discoveryNote).replace(/^Discovery opportunity:/,'<strong>Discovery opportunity:</strong>')}</p></div>`:''}`;
    document.getElementById('tab-insights').innerHTML=`
      <div class="search-hint-row"><span class="sh-label">Search ${esc(g.docName)} for</span><span class="sh-term">"${esc(g.docSearch)}"</span></div>
      ${g.jmSearch?`<div class="search-hint-row"><span class="sh-label">Search the journey map for</span><span class="sh-term">"${esc(g.jmSearch)}"</span></div>`:''}
      <p class="plabel">Where this figure comes from</p><p class="pbody-text">${esc(g.docName)} — this is not a journey map document; check it directly for the exact figure and context.</p>
      <p class="plabel">Related pain points</p><div class="connect-section">${relatedSol?insightsForSolution(relatedSol):'<span class="empty-note">No linked solution to trace pain points from — this gap rests on the figure alone.</span>'}</div>`;
    document.getElementById('tab-metrics').innerHTML=`
      ${relatedMetrics.length?relatedMetrics.map(sm=>`<div class="link-item-row" onclick="openPanelNav('submetric','${sm.id}')"><span class="link-item-text">${esc(sm.label)}</span><span class="link-item-pill" style="background:var(--bg);color:var(--ink-soft)">${esc(sm.value)}</span></div>`).join(''):'<span class="empty-note">Not tied to a metrics card yet.</span>'}`;
    document.getElementById('tab-solutions').innerHTML=`<div class="connect-section">${chipForSolution(g.solution)}</div>`;
    switchTab('overview');
  }
  document.getElementById('overlay').classList.add('open');
  document.getElementById('panel').classList.add('open');
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
function startEditSolutionField(ref, field){
  const s = solutionByRef[ref]; if(!s) return;
  const row = document.getElementById('edit-row-'+field);
  const valCell = row.querySelector('.prop-row-val');
  valCell.onclick = null;
  let options, currentVal;
  if(field==='effort'){ currentVal=s.effort; options=[1,2,3,4,5].map(n=>({v:n, l:EFFORT_LABEL[n]})); }
  else if(field==='mv' || field==='bv'){ currentVal=s[field]; options=[1,2,3,4,5].map(n=>({v:n, l:n+'/5'})); }
  else if(field==='road'){ currentVal=s.road; options=['on-roadmap','not-on-roadmap','on-hold','in-delivery'].map(r=>({v:r, l:ROAD_LABEL[r]})); }
  const optionsHtml = options.map(o=>`<div class="fdropdown-option${o.v===currentVal?' checked':''}" onclick="event.stopPropagation(); saveEditSolutionField('${ref}','${field}','${o.v}')"><span>${esc(String(o.l))}</span></div>`).join('');
  valCell.innerHTML = `<div class="inline-edit-row"><div class="fdropdown" style="flex-shrink:0"><button class="fdropdown-trigger" style="font-size:12.5px;padding:5px 10px" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('open')">${esc(String(field==='road'?ROAD_LABEL[currentVal]:field==='effort'?EFFORT_LABEL[currentVal]:currentVal+'/5'))} <span class="chev"></span></button><div class="fdropdown-panel open">${optionsHtml}</div></div><button class="inline-edit-cancel" onclick="openPanel('solution','${ref}')">Cancel</button></div>`;
}
function saveEditSolutionField(ref, field, rawValue){
  const s = solutionByRef[ref]; if(!s) return;
  if(field==='road') s.road = rawValue;
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
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const analyze = $("autoRigAnalyze"), apply = $("autoRigApply"), summary = $("autoRigSummary");
  const roleSelect = $("layerRole"), physics = $("physicsEnabled"), createMesh = $("createMesh"), meshDensity = $("meshDensity");
  let suggestions = [];
  const rules = [
    [/\b(left|l)[ _.-]*(eye|iris|pupil)\b|\b(eye|iris|pupil)[ _.-]*(left|l)\b/i,"eye-left"],
    [/\b(right|r)[ _.-]*(eye|iris|pupil)\b|\b(eye|iris|pupil)[ _.-]*(right|r)\b/i,"eye-right"],
    [/\b(left|l)[ _.-]*(brow|eyebrow)\b|\b(brow|eyebrow)[ _.-]*(left|l)\b/i,"brow-left"],
    [/\b(right|r)[ _.-]*(brow|eyebrow)\b|\b(brow|eyebrow)[ _.-]*(right|r)\b/i,"brow-right"],
    [/\b(mouth|lip|teeth|tongue)\b/i,"mouth"],
    [/\b(front)[ _.-]*(hair|bang|fringe)|\b(bang|fringe)\b/i,"hair-front"],
    [/\b(back|rear)[ _.-]*hair\b/i,"hair-back"],
    [/\b(face|head|skin)\b/i,"face"],
    [/\b(body|torso|neck)\b/i,"body"],
    [/\b(dress|apron|skirt|sleeve|shirt|blouse|coat|cloth|clothes|uniform)\b/i,"clothes"],
    [/\b(ribbon|bow|charm|cross|accessory|headress|headdress|plush|strap|bell|earring)\b/i,"accessory"],
    [/\bhair\b/i,"hair-front"]
  ];
  function guess(name){ for(const [re,role] of rules) if(re.test(name)) return role; return "art"; }
  function rows(){ return [...document.querySelectorAll("#layerList .layer-row")]; }
  function rowName(row){ return row.querySelector(".layer-name")?.textContent?.trim() || "Layer"; }
  function scan(){
    suggestions = rows().map(row => ({row,name:rowName(row),role:guess(rowName(row)),hasMesh:/\bmesh\b/i.test(row.textContent||""),hasPhysics:/\bphysics\b/i.test(row.textContent||"")}));
    const matched=suggestions.filter(s=>s.role!=="art");
    const counts={}; for(const s of matched) counts[s.role]=(counts[s.role]||0)+1;
    summary.textContent = suggestions.length ? `${matched.length}/${suggestions.length} layers recognized. ${Object.entries(counts).map(([k,v])=>`${k}: ${v}`).join(" • ") || "No confident matches yet."}` : "Import separated layers first.";
    apply.disabled = matched.length===0;
  }
  function dispatch(el,type="change"){ el.dispatchEvent(new Event(type,{bubbles:true})); }
  async function applySuggestions(){
    if(!suggestions.length) scan();
    let changed=0, meshed=0, physical=0;
    for(const s of suggestions){
      if(s.role==="art") continue;
      s.row.click();
      if(roleSelect && !roleSelect.disabled){ roleSelect.value=s.role; dispatch(roleSelect); changed++; }
      const shouldMesh=["face","eye-left","eye-right","mouth","hair-front","hair-back","clothes"].includes(s.role);
      if(shouldMesh && !s.hasMesh && createMesh && !createMesh.disabled){
        if(meshDensity) meshDensity.value=["eye-left","eye-right","mouth"].includes(s.role)?"3x4":"4x5";
        createMesh.click(); meshed++;
      }
      const shouldPhysics=["hair-front","hair-back","clothes","accessory"].includes(s.role);
      if(shouldPhysics && physics && !physics.disabled && !physics.checked){ physics.checked=true; dispatch(physics); physical++; }
      await new Promise(r=>setTimeout(r,0));
    }
    summary.textContent=`Applied ${changed} role assignment(s), created ${meshed} starter mesh(es), enabled physics on ${physical} layer(s). Review each result before detailed rigging.`;
    scan();
  }
  analyze?.addEventListener("click",scan); apply?.addEventListener("click",applySuggestions);
  window.MeguAutoRig={scan,apply:applySuggestions,guess};
})();
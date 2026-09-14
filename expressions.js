"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const controls = {
    headX: $("headX"), headY: $("headY"), bodyZ: $("bodyZ"),
    eyeOpen: $("eyeOpen"), mouthOpen: $("mouthOpen")
  };
  const builtins = Object.freeze({
    Neutral:   { headX:0, headY:0, bodyZ:0, eyeOpen:100, mouthOpen:0 },
    Smile:     { headX:0, headY:2, bodyZ:0, eyeOpen:82, mouthOpen:18 },
    Happy:     { headX:2, headY:3, bodyZ:2, eyeOpen:68, mouthOpen:42 },
    Laugh:     { headX:0, headY:-3, bodyZ:3, eyeOpen:42, mouthOpen:82 },
    Sad:       { headX:-2, headY:5, bodyZ:-2, eyeOpen:72, mouthOpen:8 },
    Angry:     { headX:4, headY:1, bodyZ:-3, eyeOpen:88, mouthOpen:22 },
    Surprised: { headX:0, headY:-2, bodyZ:0, eyeOpen:100, mouthOpen:70 },
    "Shy / Blush": { headX:-5, headY:5, bodyZ:-4, eyeOpen:62, mouthOpen:12 }
  });
  const custom = new Map();
  const list = $("expressionList"), nameInput = $("expressionName"), saveButton = $("saveExpression"), resetButton = $("resetExpression");

  function clamp(v,min,max){ return Math.max(min,Math.min(max,Number(v)||0)); }
  function snapshot(){ return { headX:+controls.headX.value, headY:+controls.headY.value, bodyZ:+controls.bodyZ.value, eyeOpen:+controls.eyeOpen.value, mouthOpen:+controls.mouthOpen.value }; }
  function apply(preset){
    if(!preset) return;
    const values = {
      headX:clamp(preset.headX,-30,30), headY:clamp(preset.headY,-30,30), bodyZ:clamp(preset.bodyZ,-20,20),
      eyeOpen:clamp(preset.eyeOpen,0,100), mouthOpen:clamp(preset.mouthOpen,0,100)
    };
    for(const [key,value] of Object.entries(values)){
      controls[key].value = value;
      controls[key].dispatchEvent(new Event("input", { bubbles:true }));
    }
    window.dispatchEvent(new CustomEvent("megurig-expression-applied", { detail:{ preset:values } }));
  }
  function render(){
    if(!list) return;
    list.replaceChildren();
    for(const [name,preset] of [...Object.entries(builtins), ...custom.entries()]){
      const button=document.createElement("button"); button.type="button"; button.className="key-chip expression-chip"; button.textContent=name;
      button.addEventListener("click",()=>apply(preset)); list.append(button);
    }
  }
  saveButton?.addEventListener("click",()=>{
    const name=String(nameInput?.value||"").trim().replace(/[<>]/g,"").slice(0,40);
    if(!name) return;
    custom.set(name,snapshot()); nameInput.value=""; render();
  });
  resetButton?.addEventListener("click",()=>apply(builtins.Neutral));
  window.MeguExpressions={ apply, snapshot, list:()=>({ ...builtins, ...Object.fromEntries(custom) }) };
  render();
})();
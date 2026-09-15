"use strict";
(()=>{
 const $=id=>document.getElementById(id),btn=$("exportCubismManifest"),report=$("validationReport");
 if(!btn)return;
 const download=(data,name)=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.rel="noopener";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 btn.addEventListener("click",()=>{
  const project=window.MeguRig?.snapshot?.();
  if(!project){if(report)report.textContent="Load artwork before creating a Cubism handoff manifest.";return}
  const check=window.MeguValidator?.inspect(project);
  if(check&&!check.ok){if(report)report.textContent=`Export blocked: ${check.issues.join(" ")}`;return}
  const manifest={schema:"megurig.cubism-handoff.v1",generatedAt:new Date().toISOString(),notice:"This is an interchange/validation manifest, not a compiled .moc3 file.",canvas:project.scene,layers:project.layers.map(l=>({name:l.name,fileName:l.fileName,role:l.role,z:l.z,visible:l.visible,pivot:l.pivot,mesh:l.mesh?{cols:l.mesh.cols,rows:l.mesh.rows,points:l.mesh.points}:null,keyforms:l.keyforms,physics:l.physics})),parameters:project.parameters,markers:project.markers,validation:check};
  download(manifest,"megurig-cubism-handoff.json");
  if(report)report.textContent=`Cubism handoff manifest exported. Readiness ${check?.score??0}/100. This does not compile .moc3.`;
 });
})();
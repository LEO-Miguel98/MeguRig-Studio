"use strict";
(()=>{
 const KNOWN=new Set(["face","eye-left","eye-right","brow-left","brow-right","mouth","hair-front","hair-back","body","clothes","accessory"]);
 function inspect(project){
  const issues=[],warnings=[],layers=Array.isArray(project?.layers)?project.layers:[];
  if(!layers.length) issues.push("No artwork layers are present.");
  if(layers.length>100) issues.push("Layer count exceeds the supported limit.");
  const roles=new Map();
  for(const l of layers){
   const role=KNOWN.has(l?.role)?l.role:"art"; roles.set(role,(roles.get(role)||0)+1);
   if(!l?.fileName) warnings.push("A layer is missing its artwork filename reference.");
   if(l?.mesh && (!Array.isArray(l.mesh.points)||l.mesh.points.length<4)) issues.push(`${l.name||"Layer"}: invalid mesh.`);
   if(l?.physics?.enabled && !l?.mesh) warnings.push(`${l.name||"Layer"}: physics is enabled without a mesh deformer.`);
  }
  for(const r of ["face","eye-left","eye-right","mouth","body"]) if(!roles.get(r)) warnings.push(`Recommended core role missing: ${r}.`);
  const params=project?.parameters||{};
  for(const p of ["ParamAngleX","ParamAngleY","ParamBodyAngleZ","ParamEyeOpen","ParamMouthOpenY"]) if(!Number.isFinite(Number(params[p]))) warnings.push(`Parameter missing or invalid: ${p}.`);
  const keyed=layers.filter(l=>l?.keyforms&&Object.values(l.keyforms).some(v=>Array.isArray(v)&&v.length>=2)).length;
  if(!keyed) warnings.push("No layer has two or more captured keyforms; deformation preview will be limited.");
  const physics=layers.filter(l=>l?.physics?.enabled).length;
  const meshes=layers.filter(l=>l?.mesh).length;
  const score=Math.max(0,100-issues.length*25-warnings.length*6);
  return{ok:issues.length===0,score,issues,warnings,stats:{layers:layers.length,meshes,keyedLayers:keyed,physicsLayers:physics}};
 }
 window.MeguValidator={inspect};
})();
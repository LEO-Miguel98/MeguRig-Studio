"use strict";
(()=>{
 const KNOWN=new Set(["face","eye-left","eye-right","brow-left","brow-right","mouth","hair-front","hair-back","body","clothes","accessory"]),PARAMS=["ParamAngleX","ParamAngleY","ParamBodyAngleZ","ParamEyeOpen","ParamMouthOpenY"];
 function inspect(project){
  const issues=[],warnings=[],layers=Array.isArray(project?.layers)?project.layers:[];
  if(!layers.length)issues.push("No artwork layers are present.");
  if(layers.length>100)issues.push("Layer count exceeds the supported limit.");
  const roles=new Map(),files=new Map();let meshes=0,physics=0,keyed=0,multiKeyed=0;
  for(const l of layers){
   const label=String(l?.name||l?.fileName||"Layer"),role=KNOWN.has(l?.role)?l.role:"art";roles.set(role,(roles.get(role)||0)+1);
   const fn=String(l?.fileName||"").toLowerCase();if(!fn)warnings.push(`${label}: missing artwork filename reference.`);else files.set(fn,(files.get(fn)||0)+1);
   if(l?.mesh){meshes++;const cols=Number(l.mesh.cols),rows=Number(l.mesh.rows),pts=l.mesh.points;if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<2||rows<2||cols>12||rows>16||!Array.isArray(pts)||pts.length!==cols*rows)issues.push(`${label}: invalid mesh topology.`)}
   if(l?.physics?.enabled){physics++;if(!l?.mesh)warnings.push(`${label}: physics enabled without a mesh deformer.`);const s=Number(l.physics.strength),d=Number(l.physics.damping);if(!Number.isFinite(s)||s<0||s>1||!Number.isFinite(d)||d<=0||d>1)issues.push(`${label}: physics values are outside safe ranges.`)}
   const sets=Object.entries(l?.keyforms||{}).filter(([p,v])=>PARAMS.includes(p)&&Array.isArray(v)&&v.length);if(sets.length)keyed++;if(sets.length>1)multiKeyed++;
   for(const[p,ks]of sets){if(ks.length>32)issues.push(`${label}: ${p} has too many keyforms.`);for(let i=1;i<ks.length;i++)if(Number(ks[i-1]?.value)>=Number(ks[i]?.value))warnings.push(`${label}: ${p} key values are duplicated or unsorted.`);for(const k of ks)if(k?.mesh&&l?.mesh&&(k.mesh.cols!==l.mesh.cols||k.mesh.rows!==l.mesh.rows||k.mesh.points?.length!==l.mesh.points?.length))warnings.push(`${label}: ${p} contains a mesh topology mismatch.`)}
  }
  for(const[fn,count]of files)if(count>1)warnings.push(`Duplicate artwork filename '${fn}' may make project reattachment ambiguous.`);
  for(const r of ["face","eye-left","eye-right","mouth","body"])if(!roles.get(r))warnings.push(`Recommended core role missing: ${r}.`);
  const params=project?.parameters||{};for(const p of PARAMS)if(!Number.isFinite(Number(params[p])))issues.push(`Parameter missing or invalid: ${p}.`);
  if(!keyed)warnings.push("No layer has captured keyforms; deformation preview will be limited.");else if(!multiKeyed)warnings.push("No layer currently blends more than one parameter; advanced head/face motion is not yet demonstrated.");
  const expressions=project?.expressions&&typeof project.expressions==="object"?Object.keys(project.expressions).length:0;if(expressions>32)issues.push("Too many custom expressions.");
  const score=Math.max(0,100-issues.length*22-warnings.length*4),ready=issues.length===0&&layers.length>0;
  return{ok:ready,score,issues,warnings,stats:{layers:layers.length,meshes,keyedLayers:keyed,multiParameterLayers:multiKeyed,physicsLayers:physics,expressions}};
 }
 window.MeguValidator={inspect};
})();
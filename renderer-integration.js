"use strict";
(()=>{
 const PARAMS=Object.freeze({ParamAngleX:["headX",-30,30,1],ParamAngleY:["headY",-30,30,1],ParamBodyAngleZ:["bodyZ",-20,20,1],ParamEyeOpen:["eyeOpen",0,100,.01],ParamMouthOpenY:["mouthOpen",0,100,.01]});
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
 function valuesFromControls(controls){const out={};for(const[param,[id,min,max,scale]]of Object.entries(PARAMS)){const raw=clamp(Number(controls?.[id]?.value),min,max);out[param]=raw*scale}return out}
 function resolve(layer,values){if(window.MeguBlend?.blend)return window.MeguBlend.blend(layer,values||{});return{transform:{x:Number(layer?.x)||0,y:Number(layer?.y)||0,rotation:Number(layer?.rotation)||0,scale:Number(layer?.scale)||1,opacity:Number.isFinite(Number(layer?.opacity))?Number(layer.opacity):1},mesh:layer?.mesh||null}}
 window.MeguRendererIntegration={valuesFromControls,resolve};
})();
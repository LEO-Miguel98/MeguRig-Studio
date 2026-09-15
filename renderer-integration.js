"use strict";
(()=>{
 const PARAMS=Object.freeze({
  ParamAngleX:"headX",ParamAngleY:"headY",ParamBodyAngleZ:"bodyZ",ParamEyeOpen:"eyeOpen",ParamMouthOpenY:"mouthOpen"
 });
 function valuesFromControls(controls){const out={};for(const[param,id]of Object.entries(PARAMS)){const c=controls?.[id];let v=Number(c?.value)||0;if(param==="ParamEyeOpen"||param==="ParamMouthOpenY")v/=100;out[param]=v}return out}
 function resolve(layer,values){if(window.MeguBlend?.blend)return window.MeguBlend.blend(layer,values);return{transform:{x:layer.x,y:layer.y,rotation:layer.rotation,scale:layer.scale,opacity:layer.opacity},mesh:layer.mesh||null}}
 window.MeguRendererIntegration={valuesFromControls,resolve};
})();
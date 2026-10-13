(() => {
  "use strict";
  const listeners=new Set();
  async function list(){ if(!navigator.mediaDevices?.enumerateDevices) return {inputs:[],outputs:[]}; const d=await navigator.mediaDevices.enumerateDevices(); return {inputs:d.filter(x=>x.kind==="audioinput"),outputs:d.filter(x=>x.kind==="audiooutput")}; }
  function subscribe(fn){ if(typeof fn!=="function") return ()=>{}; listeners.add(fn); return ()=>listeners.delete(fn); }
  async function notify(){ const devices=await list().catch(()=>({inputs:[],outputs:[]})); listeners.forEach(fn=>{try{fn(devices)}catch{}}); }
  navigator.mediaDevices?.addEventListener?.("devicechange",notify);
  window.HLVoiceDevices={list,subscribe};
})();

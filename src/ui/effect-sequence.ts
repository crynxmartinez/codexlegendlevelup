export interface EffectStep { index:number; name:string }
/** Keep real resolved source names; the engine supplies the sequence position. */
export function appendEffect(previous:EffectStep[],name:string,index:number):EffectStep[]{
  return [...previous.filter(step=>index>1&&step.index<index),{index,name}];
}
export function sequenceSummary(steps:EffectStep[]):string {
  const current=steps.at(-1);if(!current||current.index<=1)return '';
  const previous=steps.slice(0,-1).slice(-2).map(s=>s.name).join(' → ');
  return `Effect ${current.index}${previous?` · After ${previous}`:''}. Review the full sequence with Last.`;
}

import { expect,it } from 'vitest';
import { PresentationTrace } from './presentation-diagnostics.js';
it('is disabled by default and bounds enabled local traces without exporting arbitrary payloads',()=>{
 const off=new PresentationTrace();off.record('receipt',{revision:1});expect(off.snapshot().rows).toEqual([]);
 const trace=new PresentationTrace(true,2);trace.record('receipt',{revision:1,token:'secret',uid:'hidden',state:{deck:['private']}} as any);
 trace.record('start',{revision:1});trace.record('finish',{revision:1});
 expect(trace.snapshot().rows).toHaveLength(2);expect(trace.dropped).toBe(1);
 expect(JSON.stringify(trace.snapshot())).not.toMatch(/secret|hidden|private|token|deck/);
 expect(trace.snapshot().rows[1]!.t).toBeGreaterThanOrEqual(trace.snapshot().rows[0]!.t);
});

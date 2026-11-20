import {it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
 it('ships a small, non-silent, valid local PCM library with three variations',()=>{
  const files=readdirSync('assets/audio').filter(f=>f.endsWith('.wav'));expect(files).toHaveLength(33);
  let bytes=0;
  for(const file of files){
   const b=readFileSync(`assets/audio/${file}`);bytes+=b.length;
   expect(b.toString('ascii',0,4)).toBe('RIFF');expect(b.toString('ascii',8,12)).toBe('WAVE');
   expect(b.readUInt32LE(24)).toBe(24000);
   let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));
   expect(peak).toBeGreaterThan(1000);expect(peak).toBeLessThan(32767);
  }
  expect(bytes).toBeLessThan(500000);
 });

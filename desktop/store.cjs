const fs=require('node:fs/promises');const path=require('node:path');const crypto=require('node:crypto');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
async function atomic(file,data){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID()+'.tmp';let h;try{h=await fs.open(tmp,'wx');await h.writeFile(data);await h.sync();await h.close();h=null;await fs.rename(tmp,file);}finally{await h?.close();await fs.rm(tmp,{force:true}).catch(()=>{});}}
function validate(snapshot){
 if(!snapshot||snapshot.format!=='codex-desktop-backup-1'||typeof snapshot.rules!=='string'||!snapshot.local||typeof snapshot.local!=='object'||Array.isArray(snapshot.local)||!Array.isArray(snapshot.games)||!Array.isArray(snapshot.videos)||!Array.isArray(snapshot.videoChunks)||snapshot.games.length>10000||snapshot.videoChunks.length>100000)throw new Error('Unsupported or incomplete desktop backup.');
 const allowed=/^(codex-legends\.|codex-menu-preview-v1$|codex\.loading-heritage$)/;
 for(const [key,value]of Object.entries(snapshot.local)){if(!allowed.test(key)||typeof value!=='string'||value.length>16000000)throw new Error('Invalid local save entry.');try{JSON.parse(value);}catch{if(key!=='codex-legends.activeDeck')throw new Error('Unreadable save: '+key);}}
 const ids=new Set();for(const row of snapshot.games){if(typeof row?.summary?.id!=='string'||ids.has(row.summary.id)||row.replay?.header?.formatVersion!==9||!Array.isArray(row.replay.steps)||!Array.isArray(row.replay.choices))throw new Error('Invalid or unsupported saved game.');ids.add(row.summary.id);}
 const videoIds=new Set();for(const v of snapshot.videos){if(typeof v?.id!=='string'||videoIds.has(v.id)||!Number.isSafeInteger(v.chunks)||v.chunks<0||!Number.isSafeInteger(v.bytes)||v.bytes<0)throw new Error('Invalid video metadata.');videoIds.add(v.id);}
 const chunks=new Set();for(const c of snapshot.videoChunks){if(!videoIds.has(c.id)||!Number.isSafeInteger(c.sequence)||c.sequence<0||! /^[a-f0-9]{64}$/.test(c.blob)||!Number.isSafeInteger(c.bytes)||c.bytes<0||typeof c.type!=='string'||chunks.has(c.id+':'+c.sequence))throw new Error('Invalid video chunk.');chunks.add(c.id+':'+c.sequence);}
 for(const v of snapshot.videos.filter(v=>v.state==='ready')){const parts=snapshot.videoChunks.filter(c=>c.id===v.id).sort((a,b)=>a.sequence-b.sequence);if(parts.length!==v.chunks||parts.some((c,i)=>c.sequence!==i)||parts.reduce((n,c)=>n+c.bytes,0)!==v.bytes)throw new Error('Video backup is incomplete.');}
 return snapshot;
}
class SaveStore{
 constructor(root){this.root=root;this.tail=Promise.resolve();}
 serial(work){const p=this.tail.then(work);this.tail=p.catch(()=>{});return p;}
 async putBlob(data){const b=Buffer.from(data);if(b.length>64*1024*1024)throw new Error('A video chunk exceeds 64 MiB.');const hash=digest(b),file=path.join(this.root,'blobs',hash);try{await fs.access(file);}catch{await atomic(file,b);}return hash;}
 async blob(hash){if(!/^[a-f0-9]{64}$/.test(hash))throw new Error('Invalid blob identifier');const b=await fs.readFile(path.join(this.root,'blobs',hash));if(digest(b)!==hash)throw new Error('Backup media failed its checksum');return b;}
 async verify(s){validate(s);for(const c of s.videoChunks){const b=await this.blob(c.blob);if(b.length!==c.bytes)throw new Error('Wrong video chunk size');}return s;}
 save(s){return this.serial(async()=>{await this.verify(s);const file=path.join(this.root,'current.json');let old;try{old=await fs.readFile(file);await this.verify(JSON.parse(old));}catch(e){if(e.code!=='ENOENT'){await fs.copyFile(file,path.join(this.root,'unreadable-'+Date.now()+'.json')).catch(()=>{});}}if(old){try{await this.verify(JSON.parse(old));await atomic(path.join(this.root,'previous.json'),old);}catch{}}await atomic(file,JSON.stringify(s));return {savedAt:new Date().toISOString()};});}
 async read(previous=false){const file=path.join(this.root,previous?'previous.json':'current.json');const raw=await fs.readFile(file,'utf8');if(raw.length>128*1024*1024)throw new Error('Backup manifest too large');return this.verify(JSON.parse(raw));}
 async exportTo(folder){const s=await this.read();for(const c of s.videoChunks)await atomic(path.join(folder,'blobs',c.blob),await this.blob(c.blob));await atomic(path.join(folder,'codex-backup.json'),JSON.stringify(s));return folder;}
 async importFrom(file){const info=await fs.stat(file);if(info.size>128*1024*1024)throw new Error('Backup manifest too large');const s=validate(JSON.parse(await fs.readFile(file,'utf8')));for(const c of s.videoChunks){const b=await fs.readFile(path.join(path.dirname(file),'blobs',c.blob));if(digest(b)!==c.blob||b.length!==c.bytes)throw new Error('Imported media checksum mismatch');await this.putBlob(b);}return s;}
}
module.exports={SaveStore,atomic,validate};

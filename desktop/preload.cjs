const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('codexDesktop',{
 version:1,
 openText:kind=>ipcRenderer.invoke('file:open',kind),
 saveText:(kind,text)=>ipcRenderer.invoke('file:save',kind,text),
 putBlob:bytes=>ipcRenderer.invoke('backup:blob-put',bytes),
 getBlob:hash=>ipcRenderer.invoke('backup:blob-get',hash),
 save:snapshot=>ipcRenderer.invoke('backup:save',snapshot),
 read:previous=>ipcRenderer.invoke('backup:read',previous===true),
 exportBackup:()=>ipcRenderer.invoke('backup:export'),
 importBackup:()=>ipcRenderer.invoke('backup:import'),
 quit:()=>ipcRenderer.invoke('app:quit'),
 ready:()=>ipcRenderer.send('app:ready'),
 closed:ok=>ipcRenderer.send('app:close-ready',ok===true),
 onCommand:callback=>{const handler=(_event,command)=>callback(command);ipcRenderer.on('desktop:command',handler);return()=>ipcRenderer.removeListener('desktop:command',handler);}
});

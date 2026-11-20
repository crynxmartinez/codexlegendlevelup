module.exports={
 appId:'com.codexlegend.desktop',productName:'Codex Legend',electronVersion:'45.3.3',electronDist:require('node:path').join(__dirname,'toolchain/node_modules/electron/dist'),
 directories:{app:'desktop-dist/app',output:'release-desktop',buildResources:'desktop-dist/app/shell'},
 files:['package.json','shell/*.cjs','shell/icon.ico','renderer/**/*','licenses/**/*','!**/node_modules{,/**/*}'],
 asar:true,npmRebuild:false,win:{target:[{target:'nsis',arch:['x64']}],icon:'desktop-dist/app/shell/icon.ico',executableName:'CodexLegend',signAndEditExecutable:true},
 nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,createDesktopShortcut:true,createStartMenuShortcut:true,deleteAppDataOnUninstall:false,runAfterFinish:false,artifactName:'CodexLegend-Setup-${version}-${arch}.${ext}'},
 publish:null
};

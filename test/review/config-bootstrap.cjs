'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../../server');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cyberlab-bootstrap-'));
const partial={RESEARCH_DATABASE_PATH:path.join(dir,'synthetic.sqlite'),RESEARCH_PERSISTENT_VOLUME_CONFIRMED:'true',STUDY_ID:'synthetic',CONSENT_VERSION:'1'};
let first=createApp(partial);console.log('partial setup:',JSON.stringify({enabled:first.config.enabled,storageStatus:first.storageStatus}));
// Server close is triggered after listen so its store-close handler runs.
first.server.listen(0,'127.0.0.1',()=>first.server.close(()=>{
 const next=createApp({...partial,STUDY_INFORMATION:'Newly supplied information'});
 console.log('adding required study field:',JSON.stringify({enabled:next.config.enabled,storageStatus:next.storageStatus,lastProblem:next.config.problems.at(-1)}));
 next.server.listen(0,'127.0.0.1',()=>next.server.close(()=>fs.rmSync(dir,{recursive:true,force:true})));
}));

'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
let count=0;
function walk(dir) {for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','artifacts','.git'].includes(item.name))continue;const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(p.endsWith('.js')){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stderr);process.exitCode=1;}count++;}}}
walk(root);console.log(`Checked syntax of ${count} JavaScript files.`);

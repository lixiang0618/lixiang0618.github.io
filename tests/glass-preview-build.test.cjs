const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {build}=require('../dev/build-vercel');
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'glass-preview-build-'));for(const dir of ['zh','dev','data','Resources','js','node_modules','.git'])fs.mkdirSync(path.join(root,dir));
 for(const name of ['moments.html','zh/moments.html','blog.html'])fs.writeFileSync(path.join(root,name),'<html><head></head><body>Unchanged content</body></html>');
 for(const name of ['glass-model.js','glass-studio.js','glass-studio.css','serve-glass-studio.py'])fs.writeFileSync(path.join(root,'dev',name),'fixture '+name);
 fs.writeFileSync(path.join(root,'data/moments.json'),'[]');fs.writeFileSync(path.join(root,'Resources/photo.jpg'),'photo');fs.writeFileSync(path.join(root,'js/app.js'),'app');fs.writeFileSync(path.join(root,'.env'),'must not deploy');return root;}
test('explicit preview build emits Studio only on the two Moments pages and preserves assets/source',()=>{
 const root=fixture();try{const source=fs.readFileSync(path.join(root,'moments.html'),'utf8');const output=build({root,environment:'preview'});
 for(const name of ['moments.html','zh/moments.html'])assert(fs.readFileSync(path.join(output,name),'utf8').includes('data-glass-studio="vercel-preview"'));
 assert(!fs.readFileSync(path.join(output,'blog.html'),'utf8').includes('glass-studio'));assert.equal(fs.readFileSync(path.join(root,'moments.html'),'utf8'),source);
 assert(fs.existsSync(path.join(output,'dev/glass-studio.js')));assert(!fs.existsSync(path.join(output,'dev/serve-glass-studio.py')));
 for(const name of ['.git','node_modules','.env'])assert(!fs.existsSync(path.join(output,name)));assert.equal(fs.readFileSync(path.join(output,'Resources/photo.jpg'),'utf8'),'photo');
 build({root,environment:'preview'});assert.equal((fs.readFileSync(path.join(output,'moments.html'),'utf8').match(/data-glass-studio=/g)||[]).length,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('production and unspecified builds never contain Studio and remove stale preview output',()=>{
 const root=fixture();try{build({root,environment:'preview'});for(const environment of ['production','development','']){const output=build({root,environment});assert(!fs.existsSync(path.join(output,'dev')));assert(!fs.readFileSync(path.join(output,'moments.html'),'utf8').includes('glass-studio'));assert(fs.existsSync(path.join(output,'js/app.js')));}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('host gate rejects Preview flags on production/custom domains and local flags on remote domains',()=>{
 const {JSDOM}=require('jsdom');for(const [url,flag] of [['https://lxiang.cc/moments.html','vercel-preview'],['https://example.com/moments.html','vercel-preview'],['https://project.vercel.app/moments.html?studio=1','local']]){
 const dom=new JSDOM('<body></body>',{url,runScripts:'outside-only'});const entry=dom.window.document.createElement('script');entry.dataset.glassStudio=flag;Object.defineProperty(dom.window.document,'currentScript',{value:entry});dom.window.eval(fs.readFileSync('dev/glass-studio.js','utf8'));assert(!dom.window.document.querySelector('.glass-studio'));dom.window.close();}
});
test('confirmed desktop is exact and mobile differs from submitted values only by the requested body font size',()=>{
 const M=require('../dev/glass-model'),submitted=M.validate(require('../dev/glass-user-config.json')),confirmed=M.validate(require('../dev/glass-review.json'));
 assert.deepEqual(confirmed.desktop,submitted.desktop);assert.equal(confirmed.mobile.bodySize,17);
 assert.deepEqual({...confirmed.mobile,bodySize:submitted.mobile.bodySize},submitted.mobile);
});
test('preview includes confirmed CSS before render and initializes Studio with the same complete configuration',()=>{
 const root=fixture();try{const confirmed=require('../dev/glass-review.json');fs.writeFileSync(path.join(root,'dev/glass-review.json'),JSON.stringify(confirmed));const output=build({root,environment:'preview'});
 const html=fs.readFileSync(path.join(output,'moments.html'),'utf8');assert(html.includes('/dev/glass-review.css'));assert(html.includes('/dev/glass-review.js'));const css=fs.readFileSync(path.join(output,'dev/glass-review.css'),'utf8');assert(css.includes('--moments-body-size: 17.5px;'));assert(css.includes('--moments-body-size: 17px;'));
 const script=fs.readFileSync(path.join(output,'dev/glass-review.js'),'utf8');assert(script.includes('window.GlassStudioReview='));build({root,environment:'production'});assert(!fs.existsSync(path.join(output,'dev')));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

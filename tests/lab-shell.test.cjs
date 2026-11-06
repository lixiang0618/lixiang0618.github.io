const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),registry=require('../lab/shared/project-registry'),views=require('../lab/shared/lab-render'),{page}=require('../dev/build-lab-pages');
test('registry defines eight stable bilingual destinations, three live, two building projects and three concepts',()=>{
 assert.deepEqual(registry.statuses,['live','building','concept']);assert.equal(registry.projects.length,8);assert.equal(new Set(registry.projects.map(p=>p.id)).size,8);assert.equal(registry.projects.filter(p=>p.status==='building').length,2);assert.equal(registry.projects.filter(p=>p.status==='live').length,3);assert.equal(registry.projects.filter(p=>p.status==='concept').length,3);
 for(const p of registry.projects){assert(p.description.en&&p.description.zh);assert(p.category.en&&p.category.zh);assert.equal(p.route,`/lab/projects/${p.id}/`);if(p.status==='live')assert(['or','cchan','sna'].includes(p.id));if(p.status==='concept')assert.equal(p.experiments.length,0);else assert(p.experiments.length);for(const exp of p.experiments){assert.equal(exp.status,p.status);assert(exp.preview);assert(exp.notes.en.length&&exp.notes.zh.length);assert.equal(exp.pipeline.en.length,exp.pipeline.zh.length);}}
});
test('all 18 checked-in static documents reproduce from the same registry and template',()=>{
 for(const lang of ['en','zh'])for(const project of [null,...registry.projects]){
  const file=project?path.join('.',views.route(project,lang),'index.html'):(lang==='zh'?'zh/lab.html':'lab.html');assert.equal(fs.readFileSync(file,'utf8'),page(lang,project),file);
 }
});
test('discovery cards remain semantic, unlocked links and have eight real destinations',()=>{
 for(const lang of ['en','zh']){const dom=new JSDOM(views.home(registry.projects,lang));const d=dom.window.document;assert.equal(d.querySelectorAll('a.project-card').length,5);assert.equal(d.querySelectorAll('a.concept-card').length,3);assert.equal(d.querySelectorAll('.experiment-lock').length,0);for(const a of d.querySelectorAll('.project-card,.concept-card'))assert(fs.existsSync('.'+a.getAttribute('href')+'index.html'));dom.window.close();}
});
test('every building workspace has both a semantic lock and genuinely disabled controls',()=>{
 for(const p of registry.projects.filter(p=>p.status==='building'))for(const lang of ['en','zh']){
  const dom=new JSDOM(views.projectPage(p,lang)),d=dom.window.document;assert.equal(d.querySelectorAll('[role="tab"]').length,p.experiments.length);assert.equal(d.querySelectorAll('[role="tabpanel"]').length,p.experiments.length);assert.equal(d.querySelectorAll('.experiment-lock').length,p.experiments.length);assert.equal(d.querySelectorAll('.lab-underhood').length,p.experiments.length);
  for(const preview of d.querySelectorAll('.workspace-preview')){assert(preview.disabled);assert(preview.hasAttribute('inert'));assert.equal(preview.getAttribute('aria-hidden'),'true');for(const input of preview.querySelectorAll('input,button,select,textarea'))assert(input.disabled);}
  for(const metric of d.querySelectorAll('.preview-metrics dd'))assert.equal(metric.textContent,'—');for(const link of d.querySelectorAll('[role="tab"]'))assert(d.getElementById(link.getAttribute('aria-controls')));dom.window.close();
 }
});
test('concept pages never fabricate experiments, pipelines or results',()=>{for(const p of registry.projects.filter(p=>p.status==='concept'))for(const lang of ['en','zh']){const dom=new JSDOM(views.projectPage(p,lang));assert.equal(dom.window.document.querySelectorAll('.lab-workspace,.experiment-tabs,.lab-pipeline').length,0);assert(dom.window.document.querySelector('.concept-note'));dom.window.close();}});
test('LearnGo and research-specific previews retain uncertainty and never mark a fake implementation live',()=>{
 const lookup=id=>registry.projects.find(p=>p.id===id);assert.deepEqual(lookup('learngo').experiments.map(x=>x.title),['SuperChat','SuperNote','SuperScan']);assert.equal(lookup('wellife').experiments.length,2);assert.equal(lookup('cchan').experiments.length,1);assert(page('zh',lookup('cchan')).includes('虚构数据教学演示'));
 const warehouse=page('en',lookup('or'));assert(warehouse.includes('confidence interval'));assert(warehouse.includes('Absolute Gap ='));assert(warehouse.includes('b &gt; 2:'));assert(!warehouse.includes('experiment-lock'));
 assert(page('en',lookup('sna')).includes('26 × 26'));assert(!page('en',lookup('sna')).includes('experiment-lock'));assert.throws(()=>views.workspace({...lookup('or').experiments[0],status:'live'},'en'),/implemented, tested/);
});
test('registry strings are escaped in cards, notes, pipeline and workspace labels',()=>{
 const p=structuredClone(registry.projects[0]);p.title='<img src=x onerror=alert(1)>';p.description.en='<script>bad()</script>';p.experiments[0].pipeline.en[0]='<svg onload=bad()>';const dom=new JSDOM(views.home([p],'en')+views.projectPage(p,'en'));assert.equal(dom.window.document.querySelectorAll('script,img').length,0);assert(dom.window.document.body.textContent.includes(p.title));dom.window.close();
});
test('Lab behavior is navigation-only and blur fallback is explicitly implemented',()=>{const js=fs.readFileSync('js/lab.js','utf8');assert(!/\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(js));assert(fs.readFileSync('lab.css','utf8').includes('@supports not ((backdrop-filter:'));assert(!fs.readFileSync('lab.html','utf8').includes('Something is brewing'));});

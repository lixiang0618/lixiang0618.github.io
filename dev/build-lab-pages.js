/* Regenerate only the bilingual Lab shell documents. No dependencies or backend. */
const fs=require('node:fs'),path=require('node:path');
const registry=require('../lab/shared/project-registry');
const views=require('../lab/shared/lab-render');
const warehouse=require('../lab/warehouse/page');
const cchan=require('../lab/cchan/page');
const sna=require('../lab/sna/page');
const wellife=require('../lab/wellife/page');
const root=path.resolve(__dirname,'..');
function page(lang,project){
 const zh=lang==='zh',prefix=zh?'/zh/':'/',home=prefix+'lab.html',url=project?views.route(project,lang):home;
 const opposite=project?views.route(project,zh?'en':'zh'):(zh?'/lab.html':'/zh/lab.html');
 const title=project?.id==='cchan'?`${zh?'欺诈预测 Playground':'Fraud Detection Playground'} · Lab · Xiangology`:project?`${project.detailTitle?views.t(project.detailTitle,lang):project.title} · Lab · Xiangology`:'The Playground · Lab · Xiangology';
 const description=project?.id==='cchan'?(zh?'通过耦合图与成本敏感学习，探索医疗欺诈预测。':'Exploring healthcare fraud detection through coupling graphs and cost-sensitive learning.'):project?views.t(project.description,lang):views.label(lang,'An interactive collection of AI applications, machine learning models, optimization algorithms, and research explorations.','汇集 AI 应用、机器学习模型、优化算法与研究探索的交互实验空间。');
 const nav=[['index',zh?'个人主页':'Profile'],['lab','Lab'],['blog',zh?'博客':'Blog'],['moments',zh?'朋友圈':'Moments'],['about',zh?'关于我':'About']].map(([id,label])=>`      <a href="${prefix+id}.html"${id==='lab'?' aria-current="page"':''}>${label}</a>`).join('\n');
 return `<!doctype html>
<html lang="${zh?'zh-CN':'en'}" class="lab-document">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${views.e(title)}</title>
  <meta name="description" content="${views.e(description)}">
  <link rel="canonical" href="https://lxiang.cc${url}">
  <link rel="alternate" hreflang="en" href="https://lxiang.cc${project?project.route:'/lab.html'}">
  <link rel="alternate" hreflang="zh-CN" href="https://lxiang.cc${project?'/zh'+project.route:'/zh/lab.html'}">
  <link rel="alternate" hreflang="x-default" href="https://lxiang.cc${project?project.route:'/lab.html'}">
  <meta property="og:title" content="${views.e(title)}">
  <meta property="og:description" content="${views.e(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://lxiang.cc${url}">
  <link rel="stylesheet" href="/editorial-curtain.css">
  <script src="/js/editorial-curtain.js"></script>
  <script src="/js/blog-theme.js"></script>
  <link rel="icon" href="/Resources/微信头像.jpg">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/assets/branding/branding.css">
  <link rel="stylesheet" href="/lab.css">${!project?'\n  <link rel="stylesheet" href="/lab/gallery.css"><script defer src="/js/lab-gallery.js"></script>':''}
  <script defer src="/lab/shared/project-registry.js"></script>
  <script defer src="/lab/shared/lab-render.js"></script>
  <script defer src="/js/lab.js"></script>${project?.id==='wellife'?'\n  <link rel="stylesheet" href="/lab/wellife/wellife.css"><script defer src="/lab/wellife/motion.js"></script><script defer src="/lab/wellife/engine.js"></script><script defer src="/lab/wellife/signal-monitor.js"></script><script defer src="/lab/wellife/app.js"></script>':''}${project?.id==='sna'?'\n  <link rel="stylesheet" href="/lab/sna/sna.css"><script defer src="/lab/sna/model.js"></script><script defer src="/lab/sna/network.js"></script><script defer src="/lab/sna/app.js"></script>':''}${project?.id==='cchan'?'\n  <link rel="stylesheet" href="/js/vendor/katex/katex.min.css"><link rel="stylesheet" href="/lab/cchan/cchan.css"><script defer src="/lab/cchan/engine.js"></script><script defer src="/lab/cchan/research.js"></script><script defer src="/lab/cchan/chart.js"></script><script defer src="/lab/cchan/app.js"></script>':''}${project?.id==='or'?'\n  <link rel="stylesheet" href="/lab/warehouse/warehouse.css"><script defer src="/lab/warehouse/core.js"></script><script defer src="/lab/warehouse/visual.js"></script><script defer src="/lab/warehouse/cycle.js"></script><script defer src="/lab/warehouse/cycle-view.js"></script><script defer src="/lab/warehouse/app.js"></script>':''}
</head>
<body class="lab-page${!project?' lab-gallery':''}"${project?` data-project="${project.id}"`:''}>
  <header class="site-header">
    <a class="brand" href="${prefix}index.html" aria-label="Xiangology — ${zh?'首页':'Home'}"><img class="site-brand-logo" src="/assets/branding/xiangology.svg" alt="Xiangology" width="168" height="42"></a>
    <nav class="site-nav" aria-label="${zh?'主要导航':'Primary'}">
${nav}
    </nav>
  </header>
  <div class="lab-options"><a class="lab-language" href="${opposite}" lang="${zh?'en':'zh-CN'}">${zh?'English':'中文'}</a><button type="button" data-lab-theme aria-pressed="false">${zh?'深色模式':'Dark mode'}</button></div>
  <main class="lab-main" id="lab-main">
    ${project?.id==='wellife'?wellife.page(lang):project?.id==='sna'?sna.page(lang):project?.id==='cchan'?cchan.page(lang):project?.id==='or'?warehouse.page(lang):project?views.projectPage(project,lang):views.home(registry.projects,lang)}
    <noscript><p class="lab-phase-note">${project?.id==='wellife'?(zh?'交互需要 JavaScript；公式和方法说明仍可阅读。':'Enable JavaScript for interaction; formulas and methodology remain readable.'):project?.id==='sna'?(zh?'网络交互需要 JavaScript；研究公式、方法说明与归档 JSON 仍可阅读。':'Enable JavaScript for network interaction; formulas, methodology and archived JSON remain available.'):project?.id==='cchan'?(zh?'此教学演示需要 JavaScript 才能操作；研究方法说明仍可阅读。':'Enable JavaScript for this educational interaction; methodology remains readable.'):project?.id==='or'?(zh?'此实验需要 JavaScript 和 Web Worker 才能进行交互与计算；模型说明仍可阅读。':'This experiment requires JavaScript and Web Worker for interaction and computation; model documentation remains readable.'):!project?(zh?'静态插画与项目入口已就绪。':'Static illustrations and project links remain available.'):zh?'当前为静态预览。开启 JavaScript 可切换实验标签和主题；所有交互实验仍未开放。':'This is a static preview. Enable JavaScript to switch experiment tabs and theme; interactive experiments remain unavailable.'}</p></noscript>
  </main>
  <footer class="site-footer"><div class="footer-inner"><span>© <span id="year">2026</span> XIANG LI</span></div></footer>
</body>
</html>
`;
}
function build(){
 const documents=[];
 // Render/validate all pages before touching any checked-in output.
 for(const lang of ['en','zh']){
  documents.push([path.join(root,lang==='zh'?'zh/lab.html':'lab.html'),page(lang)]);
  for(const project of registry.projects)documents.push([path.join(root,views.route(project,lang),'index.html'),page(lang,project)]);
 }
 for(const [file,html] of documents){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);}
 console.log(`Generated ${documents.length} Lab pages from the shared registry and views.`);
}
if(require.main===module)build();
module.exports={build,page};

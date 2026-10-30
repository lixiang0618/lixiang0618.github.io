/* Static build: Studio is emitted only for Vercel Preview, never Production. */
const fs=require('node:fs');
const path=require('node:path');
const EXCLUDE=new Set(['.git','node_modules','dist','dev','tests','docs','.github','.vercel','package.json','package-lock.json','vercel.json']);
function build({root=path.resolve(__dirname,'..'),environment=process.env.VERCEL_ENV}={}){
  const output=path.join(root,'dist');
  fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
  for(const item of fs.readdirSync(root,{withFileTypes:true})){
    if(item.name.startsWith('.')||EXCLUDE.has(item.name))continue;
    fs.cpSync(path.join(root,item.name),path.join(output,item.name),{recursive:true});
  }
  const preview=environment==='preview';
  if(preview){
    fs.mkdirSync(path.join(output,'dev'));
    for(const name of ['glass-model.js','glass-studio.js','glass-studio.css'])fs.copyFileSync(path.join(root,'dev',name),path.join(output,'dev',name));
    const reviewFile=path.join(root,'dev/glass-review.json');
    const review=fs.existsSync(reviewFile)?require('./glass-model').validate(JSON.parse(fs.readFileSync(reviewFile,'utf8'))):null;
    if(review){
      fs.writeFileSync(path.join(output,'dev/glass-review.js'),'window.GlassStudioReview='+JSON.stringify(review)+';');
      fs.writeFileSync(path.join(output,'dev/glass-review.css'),require('./glass-model').css(review));
    }
    for(const name of ['moments.html','zh/moments.html']){
      const file=path.join(output,name);let html=fs.readFileSync(file,'utf8');
      html=html.replace('</head>','<link rel="stylesheet" href="/dev/glass-studio.css">'+(review?'<link rel="stylesheet" href="/dev/glass-review.css">':'')+'\n</head>');
      html=html.replace('</body>','<script src="/dev/glass-model.js"></script>\n'+(review?'<script src="/dev/glass-review.js"></script>':'')+'<script src="/dev/glass-studio.js" data-glass-studio="vercel-preview"></script>\n</body>');
      fs.writeFileSync(file,html);
    }
  }
  console.log('Static build complete:',preview?'Preview with Glass Studio':'Production-safe without Studio');
  return output;
}
if(require.main===module)build();
module.exports={build};

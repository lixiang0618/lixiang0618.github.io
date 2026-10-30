/* Development-only schema and measured baseline ff0ee16. Not loaded by normal pages. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GlassStudioModel=factory();})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  // id, Chinese label, CSS suffix, unit, min, max, step, measured original, suggested.
  const groups=[
    ['卡片材质',[
      ['opacity','卡片背景不透明度','glass-opacity','',0,1,.01,.68,.68],
      ['glassBlur','玻璃背景模糊','glass-blur','px',0,48,1,18,18],
      ['glassSaturation','玻璃饱和度','glass-saturation','',0,2,.01,1.08,1.08],
      ['radius','卡片圆角','card-radius','px',0,40,1,16,16],
      ['shadowAlpha','阴影强度','shadow-alpha','',0,.3,.005,.07,.07],
      ['shadowBlur','阴影模糊范围','shadow-blur','px',0,80,1,28,28],
      ['shadowSpread','阴影扩散','shadow-spread','px',-8,20,1,0,0],
      ['borderAlpha','边框透明度','border-alpha','',0,1,.01,.72,.72],
      ['highlightAlpha','边缘高光','highlight-alpha','',0,1,.01,.88,.88]
    ]],
    ['动态照片背景',[
      ['ambientBlur','照片背景模糊','ambient-blur','px',0,140,1,64,64],
      ['ambientSaturation','背景饱和度','ambient-saturation','',0,2,.01,.62,.62],
      ['ambientBrightness','背景亮度','ambient-brightness','',.5,1.6,.01,1.08,1.08],
      ['overlay','背景蒙层透明度','ambient-overlay','',0,1,.01,.56,.56],
      ['duration','背景过渡时间','ambient-duration','ms',0,2000,50,700,700]
    ]],
    ['布局与阅读尺寸',[
      ['feedMax','中间栏最大宽度','feed-max','px',480,1040,8,600,760],
      ['bodySize','朋友圈正文','body-size','px',14,28,.5,16,18],
      ['nameSize','昵称大小','name-size','px',14,26,.5,16,19],
      ['avatarSize','用户头像','avatar-size','px',32,76,1,44,52],
      ['commentSize','评论正文','comment-size','px',14,24,.5,16,17],
      ['buttonSize','交互按钮点击区域','button-size','px',44,68,1,44,48],
      ['iconSize','交互图标','icon-size','px',18,34,1,22,24],
      ['cardPadding','卡片内部间距','card-padding','px',10,36,1,16,20]
    ]],
    ['细节尺寸与间距',[
      ['feedInset','中间栏左右内边距','feed-inset','px',8,40,1,28,20],
      ['commentAvatar','评论头像','comment-avatar','px',22,48,1,28,32],
      ['commentName','评论昵称','comment-name','px',12,22,.5,14,15],
      ['metaSize','时间与元数据','meta-size','px',10,18,.5,12,13],
      ['commentsInset','评论区左右间距','comments-inset','px',10,36,1,16,20],
      ['mediaSpace','图库下方间距','media-space','px',6,32,1,12,16],
      ['actionSpace','按钮下方间距','action-space','px',6,28,1,12,14],
      ['commentsSpace','评论底部间距','comments-space','px',6,32,1,14,16],
      ['galleryGap','图片网格间距','gallery-gap','px',2,14,1,4,6],
      ['leftSize','时间轴宽度（自定义布局）','side-left','px',112,240,8,220,160],
      ['rightSize','快照栏宽度（自定义布局）','side-right','px',144,256,8,240,192],
      ['columnGap','三栏间距','column-gap','px',12,48,1,36,24],
      ['layoutPadding','页面左右留白','layout-padding','px',0,40,1,24,24],
      ['bodyLeading','正文行距','body-leading','',1.4,2,.05,1.6,1.65],
      ['commentLeading','评论行距','comment-leading','',1.4,2,.05,1.6,1.65],
      ['commentAvatarFont','评论头像字符大小','comment-avatar-font','px',10,22,.5,12,14],
      ['headerGap','头像昵称间距','header-gap','px',8,24,1,12,14],
      ['commentGap','评论头像文字间距','comment-gap','px',6,20,1,10,12],
      ['actionFont','点赞评论数字','action-font','px',14,22,.5,16,17]
    ]]
  ];
  const fields=groups.flatMap(([group,rows])=>rows.map(([id,label,suffix,unit,min,max,step,original,suggested])=>({id,label,css:'--moments-'+suffix,unit,min,max,step,original,suggested,group})));
  const originalMobile={glassBlur:10,glassSaturation:1,ambientBlur:40,ambientSaturation:.58,bodySize:15,cardPadding:14,feedInset:16,galleryGap:3,layoutPadding:0};
  const suggestedMobile={glassBlur:10,glassSaturation:1,ambientBlur:40,ambientSaturation:.58,bodySize:17,nameSize:18,avatarSize:48,commentSize:16.5,iconSize:23,cardPadding:18,feedInset:16,commentAvatar:30,metaSize:12.5,commentsInset:18,mediaSpace:14,commentsSpace:14,galleryGap:4,layoutPadding:0,commentAvatarFont:13,headerGap:12,actionFont:16};
  function preset(name){const kind=name==='original'?'original':'suggested';const desktop=Object.fromEntries(fields.map(f=>[f.id,f[kind]]));return{version:1,legacyLayout:kind==='original',desktop,mobile:{...desktop,...(kind==='original'?originalMobile:suggestedMobile)}};}
  function validate(value){
    if(!value||value.version!==1||typeof value.legacyLayout!=='boolean')throw Error('配置版本或布局标记不正确');
    const result={version:1,legacyLayout:value.legacyLayout};
    for(const scope of ['desktop','mobile']){
      if(!value[scope]||Object.keys(value[scope]).length!==fields.length)throw Error('配置必须包含完整桌面和手机参数');
      result[scope]={};
      for(const f of fields){const n=value[scope][f.id];if(typeof n!=='number'||!Number.isFinite(n)||n<f.min||n>f.max)throw Error(f.label+' 超出允许范围');result[scope][f.id]=n;}
    }
    return result;
  }
  function variables(config,scope){return {...Object.fromEntries(fields.map(f=>[f.css,config[scope][f.id]+f.unit])),'--moments-legacy-layout':config.legacyLayout?'1':'0'};}
  function css(config){validate(config);const block=scope=>Object.entries(variables(config,scope)).map(([k,v])=>'  '+k+': '+v+';').join('\n');return '.moments-glass {\n'+block('desktop')+'\n}\n@media (max-width: 48rem) {\n.moments-glass {\n'+block('mobile')+'\n}\n}\n';}
  return{groups:groups.map(([name])=>name),fields,preset,validate,variables,css};
});

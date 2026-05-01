const nodemon = require('nodemon');
const { exec } = require('child_process');

nodemon({
  script: 'sync-blog.js',
  watch: 'blogs/*.md',
  ext: 'md,json'
});

nodemon.on('start', () => {
  console.log('👀 监视 blogs 文件夹中...');
});

nodemon.on('change', (changedFile) => {
  console.log(`📝 检测到变化: ${changedFile}`);
  exec('node sync-blog.js', (err, stdout, stderr) => {
    if (err) {
      console.error('同步失败:', err);
      return;
    }
    console.log(stdout);
  });
});

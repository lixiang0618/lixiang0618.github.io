const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '_posts');
const BLOG_JSON_FILE = path.join(__dirname, 'data', 'blog.json');
const BLOG_HTML_FILE = path.join(__dirname, 'blog.html');

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, content };

  const yamlStr = match[1];
  const data = {};
  const lines = yamlStr.split('\n');

  let currentKey = null;
  let currentArray = [];

  lines.forEach(line => {
    const keyMatch = line.match(/^(\w+):/);
    if (keyMatch) {
      if (currentKey && currentArray.length > 0) {
        data[currentKey] = currentArray;
      }
      currentKey = keyMatch[1];
      const value = line.match(/:\s*(.*)/)?.[1]?.trim();

      if (value && !value.startsWith('-')) {
        data[currentKey] = value;
        currentKey = null;
      } else {
        currentArray = [];
      }
    } else if (line.trim().startsWith('-') && currentKey) {
      const item = line.replace(/^\s*-\s*/, '').trim();
      if (item) currentArray.push(item);
    }
  });

  if (currentKey && currentArray.length > 0) {
    data[currentKey] = currentArray;
  }

  return {
    data,
    content: content.replace(/^---[\s\S]*?---\n/, '')
  };
}

function generateExcerpt(content, maxLength = 150) {
  const text = content
    .replace(/#+\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function getFirstImage(content) {
  const match = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  return match ? match[2] : null;
}

function syncPosts() {
  require('./sync-blog').syncBlogs();
}

function syncMoments() {
  console.log('\n🔄 同步朋友圈...\n');

  const momentsJsonPath = path.join(__dirname, 'data', 'moments.json');
  const momentsHtmlPath = path.join(__dirname, 'moments.html');

  if (!fs.existsSync(momentsJsonPath)) {
    console.log('⚠️  未找到 data/moments.json');
    return;
  }

  const momentsData = JSON.parse(fs.readFileSync(momentsJsonPath, 'utf8'));
  console.log(`📷 找到 ${momentsData.length} 条朋友圈\n`);

  momentsData.forEach(m => {
    console.log(`📅 ${m.date}: ${m.images.length} 张图片`);
  });

  let momentsHtml = fs.readFileSync(momentsHtmlPath, 'utf8');
  const momentsScript = `const moments = ${JSON.stringify(momentsData, null, 4)};`;

  momentsHtml = momentsHtml.replace(/const moments = \[[\s\S]*?\];/s, momentsScript + '\n    ');
  fs.writeFileSync(momentsHtmlPath, momentsHtml);
  console.log('\n✅ 朋友圈同步完成！');
}

console.log('========================================');
console.log('   PersonalWeb 同步脚本');
console.log('========================================\n');

syncPosts();
syncMoments();

console.log('\n========================================');
console.log('   同步完成！刷新页面即可');
console.log('========================================');
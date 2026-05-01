const fs = require('fs');
const path = require('path');

const blogsDir = './blogs';
const blogJsonPath = './data/blog.json';

function parseFrontMatter(content) {
  const lines = content.split('\n');
  let frontMatter = {};
  let body = content;

  if (lines[0] === '---') {
    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        endIdx = i;
        break;
      }
    }
    if (endIdx > 0) {
      const yamlLines = lines.slice(1, endIdx);
      let currentKey = null;
      let inArray = false;
      let arrayValues = [];

      yamlLines.forEach(line => {
        const trimmed = line.trim();

        if (trimmed === '') return;

        if (trimmed.startsWith('-')) {
          const value = trimmed.replace(/^-\s*/, '').replace(/^["']|["']$/g, '');
          if (value) arrayValues.push(value);
        } else if (trimmed.includes(':')) {
          if (inArray && currentKey) {
            frontMatter[currentKey] = arrayValues;
          }

          const colonIdx = trimmed.indexOf(':');
          currentKey = trimmed.substring(0, colonIdx).trim();
          let value = trimmed.substring(colonIdx + 1).trim();

          if (value === '') {
            inArray = true;
            arrayValues = [];
          } else {
            inArray = false;
            arrayValues = [];
            frontMatter[currentKey] = value.replace(/^["']|["']$/g, '');
          }
        }
      });

      if (inArray && currentKey) {
        frontMatter[currentKey] = arrayValues;
      }

      body = lines.slice(endIdx + 1).join('\n');
    }
  }

  return { frontMatter, body };
}

function extractExcerpt(body, maxLength = 100) {
  const text = body.replace(/[#*`>\-\[\]]/g, '').replace(/\n+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function syncBlogs() {
  console.log('开始同步博客...\n');

  if (!fs.existsSync(blogsDir)) {
    console.error('blogs文件夹不存在!');
    return;
  }

  const files = fs.readdirSync(blogsDir).filter(f => f.endsWith('.md'));
  console.log(`找到 ${files.length} 篇博客\n`);

  const newData = [];

  files.forEach(file => {
    const filePath = path.join(blogsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontMatter, body } = parseFrontMatter(content);

    const fileName = file.replace('.md', '');

    const categories = Array.isArray(frontMatter.categories) ? frontMatter.categories :
                      (frontMatter.categories ? [frontMatter.categories] : ['未分类']);
    const tags = Array.isArray(frontMatter.tags) ? frontMatter.tags :
                (frontMatter.tags ? [frontMatter.tags] : categories);

    const blog = {
      file: fileName,
      title: frontMatter.title || fileName,
      date: frontMatter.date || new Date().toISOString().split('T')[0],
      categories: categories,
      tags: tags,
      excerpt: frontMatter.excerpt || extractExcerpt(body),
      image: frontMatter.image || null,
      pinned: frontMatter.pinned === 'true' || frontMatter.pinned === true || false
    };

    newData.push(blog);
    console.log(`✅ ${fileName} - ${blog.title}`);
    console.log(`   分类: ${categories.join(', ')}, 标签: ${tags.join(', ')}`);
  });

  newData.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  fs.writeFileSync(blogJsonPath, JSON.stringify(newData, null, 2), 'utf-8');
  console.log(`\n完成！已同步 ${newData.length} 篇博客到 blog.json`);
}

syncBlogs();

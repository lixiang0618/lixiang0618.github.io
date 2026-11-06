# Lab shell（Phase 1）

Lab 从 Coming Soon 页面升级为双语研究项目入口。此阶段只提供静态概念说明、实验导航和锁定的界面预览，没有接入模型、上传服务、推理、模拟或后端 API，也没有展示虚构的实验结果。

## 路由与文件

保留现有入口 `/lab.html` 与 `/zh/lab.html`，原导航无需修改。项目使用目录索引：

| 项目 | 英文路径 | 中文路径 |
| --- | --- | --- |
| LearnGo | `/lab/projects/learngo/` | `/zh/lab/projects/learngo/` |
| Wellife | `/lab/projects/wellife/` | `/zh/lab/projects/wellife/` |
| OR Research | `/lab/projects/or/` | `/zh/lab/projects/or/` |
| CCHAN | `/lab/projects/cchan/` | `/zh/lab/projects/cchan/` |
| SNA Research | `/lab/projects/sna/` | `/zh/lab/projects/sna/` |
| GraphRAG | `/lab/projects/graphrag/` | `/zh/lab/projects/graphrag/` |
| Recommender | `/lab/projects/recommender/` | `/zh/lab/projects/recommender/` |
| Agent | `/lab/projects/agent/` | `/zh/lab/projects/agent/` |

- `lab/shared/project-registry.js`：双语项目资料、状态、实验、流程及说明的唯一来源。
- `lab/shared/lab-render.js`：转义文本、静态示意图、项目卡片、实验界面及锁层的共享渲染函数。
- `dev/build-lab-pages.js`：生成两个入口与十六个项目 HTML，统一导航、SEO、语言链接。生成前先验证全部文档，避免失败时写入部分页面。
- `lab.css`：仅 Lab 样式，响应式布局、主题、焦点和降低动态效果适配。
- `js/lab.js`：主题、标签键盘操作、Hash 历史及实验语言链接；没有实验请求或计算。
- `tests/lab-shell.test.cjs`、`tests/lab-shell-browser.cjs`：数据、静态输出和浏览器验证。
- `tests/ui-lab-browser.cjs`：更新原 Coming Soon 断言，其余首页、导航和目录回归保留。

修改注册表或共享视图后执行：

```sh
node dev/build-lab-pages.js
node --test tests/lab-shell.test.cjs
node dev/build-vercel.js
```

生成的十八个 HTML 一并提交。GitHub Pages 使用目录索引；现有 Vercel 静态构建会复制这些文件，不需要改写路由或覆盖 API。生产部署未执行。

## 状态与交互边界

CCHAN 后续已开放明确标注虚构数据的教学版，参见 [cchan-playground.md](cchan-playground.md)。live 表示教学交互可用，不表示真实模型推理。

后续仓储阶段已将 OR 与 warehouse 实验开放为 live；专用实现与最新测试见 [warehouse-playground.md](warehouse-playground.md)。下述五个 building 的描述为原 Phase 1 交付状态，其他项目仍保持预览。

注册表允许 `live`、`building`、`concept`。当前五个主要项目、九个实验均为 `building`；三个 Horizon 项目为 `concept`。首页卡片与项目导航始终可以操作。Concept 页面只有方向说明，没有捏造实验。

每个实验的流程、说明与 Under the Hood 正常阅读。只有 `.workspace-stage` 显示 In Development 锁层。预览控件同时使用 disabled fieldset、显式 disabled 与 inert，并从辅助技术树排除；锁定不依赖视觉模糊。浏览器不支持 backdrop-filter 时使用不透明底色。页面没有运行、上传、模型调用事件。

所有图形都是明确标注的示意布局，图表、营养指标、模型指标及混淆矩阵使用空位或破折号。仓储公式只是通用样本均值，不代表项目的解析公式。论文、数据集与未给出的理论不作推断。

标签支持左右箭头、Home、End，使用 aria-selected 和 roving tabindex；Hash 可直接定位实验，前进后退与切换语言保留对应实验。主题复用现有 `lx_blog_theme`，静态内容在无 JavaScript 时仍可阅读。

## 后续接入真实实验

1. 在 workspace 边界实现真实输入、校验、执行与结果渲染，依据实际服务确定隐私和错误处理。
2. 补充准确的方法、数据来源及对应测试。不要把示意图当作实验输出，也不要添加假运行按钮。
3. 当前 `workspace()` 对 `live` 会直接拒绝生成；必须先实现真实且经过测试的 renderer，再明确调整此保护。只修改状态不能解锁。
4. 验证实际功能后更新实验和项目状态，重新生成 HTML，运行测试和静态构建，再按独立发布流程审核。

本阶段没有为未来服务添加假适配器，也没有修改 Worker、D1、点赞、评论、邮件或首页。

## 验证结果

- Lab 单元测试 8/8，通过注册表、18 份输出一致性、发现链接、锁定控件、概念页、转义及无网络调用检查。
- 在源站和最终静态构建上，Chromium 覆盖 375、430、768、1024、1366、1440px，两种语言和浅深主题；每轮 216 个页面组合全部通过。
- 验证所有实验标签、键盘导航、Hash 深链接及历史、语言切换、锁层边界、禁用状态、横向溢出和无外部实验请求。
- 验证无 JavaScript 静态内容，并强制不透明样式检查无模糊时的锁层可读性；这不是不支持 backdrop-filter 的旧浏览器实机验证。
- 原首页/导航/博客目录浏览器回归通过。全套单元测试 94 项中 91 项通过；3 项原有博客数据基线断言失败（文章数量、置顶顺序、生成元数据），未修改无关内容。
- 已检查移动与桌面截图。真实 Safari、移动硬件及生产托管行为未验证；没有连接真实模型或算法，符合本阶段范围。

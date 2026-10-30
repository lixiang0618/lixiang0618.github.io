# Moments Glass Studio：阶段一交付

本轮是**可调预览**，不是最终视觉定稿。第一轮 `ff0ee16` 已合入 main，因此第二轮从最新 main 建立 `feature/moments-glass-studio`。阶段二必须等待用户提供或确认满意配置；本轮不会把本地调整自动写回源码、合并 main 或部署生产。

## 打开真实页面上的 Studio

在本地检出该分支、工作区干净后，从仓库根目录运行：

```sh
python3 dev/serve-glass-studio.py --port 8092
```

Windows 可使用 `py -3 dev/serve-glass-studio.py --port 8092`。

在本机浏览器输入：

- 英文：`http://127.0.0.1:8092/moments.html`
- 中文：`http://127.0.0.1:8092/zh/moments.html`

点击导航中的「调参」。这不是独立 Demo：服务器直接提供仓库的真实 HTML、Moments 数据、照片、点赞和评论模块，仅在这两个本地 HTML 响应末尾注入开发工具。

服务器只绑定 `127.0.0.1`，没有开放公网绑定选项。普通静态服务器、Vercel Preview 和正式页面都不加载 Studio；`?studio=1` 等 URL 参数不会启用工具。即使误将开发脚本引入非回环域名，脚本也会拒绝启动。工具不是登录或后台管理权限系统，不含服务端凭证。

若 Worker 的 CORS 不允许 localhost，点赞/评论的网络请求可能显示错误；不要为调参修改 Worker/CORS。布局与真实照片背景仍能调节，线上业务可在正常 Preview 验收。自动测试使用 Mock API，没有修改生产评论。

## 原始版与建议版

原始值来自 `ff0ee16` 的 CSS 和 Chromium 1440/1024/390px 实测，不取自提示词示例。以下以当前默认根字号为基准：

| 项目 | 原始桌面 | 建议桌面 | 原始手机 | 建议手机 |
|---|---:|---:|---:|---:|
| 中栏最大宽度（含中栏内边距） | 600px | 760px | 600px | 760px |
| 实际卡片宽度（1440/390px 视口） | 544px | 720px | 358px | 358px |
| 正文 | 16px | 18px | 15px | 17px |
| 昵称 | 16px | 19px | 16px | 18px |
| 用户头像 | 44px | 52px | 44px | 48px |
| 评论正文 | 16px | 17px | 16px | 16.5px |
| 按钮最小高度 | 44px | 48px | 44px | 48px |
| 卡片背景不透明度 | .68 | .68 | .68 | .68 |
| 玻璃模糊 | 18px | 18px | 10px | 10px |
| 环境照片模糊 | 64px | 64px | 40px | 40px |
| 环境蒙层 | .56 | .56 | .56 | .56 |
| 过渡时间 | 700ms | 700ms | 700ms | 700ms |

建议版仅提供更宽、更易读的起点；材质仍沿用实测原值，**没有选定最终透明度/模糊/阴影**。原始版还原旧响应式布局；调节宽度、栏间距等布局字段后转为自定义内容优先布局。

新的方案 A 以中栏为优先：建议桌面侧栏为 10rem / 12rem，间距 1.5rem，整体最大宽度由中栏、侧栏、间距与留白相加得到，不靠单一固定屏宽强行挤三栏。当前基线在可用宽度约 1208px 时三栏、约 992px 时两栏，再小收成单栏。拖动中栏宽度后，这些预算自动重新计算。手机不为保持侧栏而缩小正文。

## 实时调节与对比

工具按「卡片材质」「动态照片背景」「布局与阅读尺寸」「细节尺寸与间距」分组，共 41 个可调参数。每项都有中文标签、滑块、数字输入及当前单位。

- 「恢复原始版本」：恢复实测快照。
- 「建议版本」：恢复本轮预览起点，不是最终定稿。
- 「对比原始版本」：临时查看原始版，保留当前调整；再点「返回当前调整」恢复。对比时禁用滑块，避免误改。
- 参数在下一帧直接写入 body 的现有 CSS 变量，不增加 CSS 规则，不重建朋友圈卡片，不使用 zoom 或整卡缩放。
- 「玻璃背景模糊」只控制卡片后的磨砂；「照片背景模糊」只控制全屏环境图。图库照片与 Lightbox 始终清晰。
- 卡片内部间距会同步评论区左右间距及图库/按钮/评论底部留白；之后可在细节组分别微调。
- 时间轴和快照宽度字段用于自定义布局；原始版先遵从旧布局响应式规则。
- 背景继续使用实际可见面积、15% 滞后、首图、96px 缓存和两层交叉淡化。过渡时间绑定 CSS/定时器；调时长会收束正在执行的过渡，随后使用新值。
- 系统「减少动态/减少透明度」优先于调参值；工具会提示，不覆盖无障碍偏好。

桌面展开后为抽屉预留 20rem 页面空间，按剩余空间收起侧栏，不遮住卡片或操作。关闭后恢复完整可用宽度。窄屏面板在页面上方的正常文流中，限制自身高度并滚动，不浮在正文或输入框上；完整调参优先建议桌面使用。

桌面/手机参数分开保存，面板显示当前在调哪一组。分界跟随页面的 48rem 视口规则。桌面抽屉占空间导致单栏，不代表参数自动变成手机组。

## 保存、恢复、复制、导出

- 「保存到本地」保存当前完整预览，包括桌面、手机及布局模式。
- 「恢复上次保存」显式载入。重载页面不会偷偷把保存值应用到生产页面。
- 本地存储键为 `lx_glass_studio_v1`，不读取或覆盖访客 UUID、点赞状态、评论 Token。
- 同一浏览器、同一 localhost 端口的中英文页面共用保存记录。更换端口或清除站点数据后，请用导出的 JSON 恢复。
- 「复制完整配置」复制完整 JSON；Clipboard 被拒绝时会选中只读导出框，允许手动复制。
- 「导出 JSON」「导出 CSS」下载配置，并在导出框保留内容。CSS 包含全部桌面变量和手机媒体覆盖。
- 可选「导入完整 JSON」校验版本、完整字段、数值范围后应用；不接收任意 CSS 或 HTML。

调好后把 JSON 文件或完整配置发给助手，再进入阶段二整理正式 CSS 默认值及必要清理。本轮不会自动读取下载文件并改仓库。

## 文件与测试

- `moments-glass.css`：可调变量、建议布局和尺寸、原始布局快照规则。
- `js/moments-appearance.js`：可用空间预算、单位读取、变量应用；不包含调参 UI 或本地存储读取。
- `js/moments-glass.js`：仅将背景过渡时间接入可调变量并处理调参通知；面积选择等核心逻辑保留。
- `moments.html`、`zh/moments.html`：接入小型布局适配脚本，正常 HTML 不引用 dev 文件。
- `dev/serve-glass-studio.py`、`dev/glass-model.js`、`dev/glass-studio.js`、`dev/glass-studio.css`：本地开发工具。
- `tests/glass-studio.test.cjs`、`tests/glass-studio-browser.cjs`：预设、验证、隐藏、布局及完整 UI 流程。
- `tests/moments-glass-browser.cjs`：原有交互回归，更新本轮明确要求改变的宽度断言。

测试依赖安装在仓库外，不修改 package.json 或锁文件。运行单元/DOM 套件：

```sh
NODE_PATH=/tmp/lx-blog-tests/node_modules node --test tests/glass-studio.test.cjs tests/moments-glass.test.cjs tests/blog-reading.test.cjs tests/blog.test.cjs tests/comments.test.cjs tests/moments-likes.test.cjs
```

真实 Chromium 测试同时需要普通本地服务器 8091 和专用 Studio 服务器 8092：

```sh
python3 -m http.server 8091 --bind 127.0.0.1
# 另一终端：
python3 dev/serve-glass-studio.py --port 8092
# 再一终端，使用仓库外的 playwright-core：
NODE_PATH=/tmp/lx-blog-tests/node_modules node tests/glass-studio-browser.cjs
NODE_PATH=/tmp/lx-blog-tests/node_modules node tests/moments-glass-browser.cjs
```

51 项单元/DOM 测试通过。Studio 两种语言完整流程通过，包括实际拖动、全部 41 项参数、原始/建议/对比、保存/重载/恢复、JSON/CSS 下载、Clipboard 与存储失败降级、数字限幅、桌面/手机分组、普通页面不加载工具。8 个宽度（320–1600px）的预览基线检查通过；参数数据与普通页面 CSS 对照通过。

现有面积选择、背景交叉淡化、快速滚动、评论增高、点赞、评论编辑删除和 Lightbox 继续通过 Chromium 回归。所有 API 写入均 Mock。没有更改 Blog、原始 Moments 数据、Worker、D1、API、鉴权或部署配置。

局限：尚无真实 iPhone Safari/WebKit 或低功耗手机的持续帧率测量；原始图库仍有较大文件。本地 CORS 与真实网络行为需要在用户浏览器中检查，工具不绕过 API 策略。极端透明度、模糊或字号是用户调参选择，不代表已通过最终可访问性/性能验收。

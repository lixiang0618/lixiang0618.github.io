# Glass Studio：在 Vercel Preview 调参

## 当前确认配置

桌面逐项采用用户提供的 JSON。手机保留用户 JSON 的原有值，**只将朋友圈正文字号从 15px 改成 17px**，没有改手机透明度、模糊、阴影、头像、评论、按钮、留白或过渡时间。

- `dev/glass-user-config.json`：原始提交记录，保持用户提供的 desktop/mobile 值。
- `dev/glass-review.json`：当前已确认配置，desktop 与提交记录完全相同，mobile 只有 bodySize=17 的差异。
- `moments-glass.css`：已经按当前确认值整理默认变量；分支未合并，不等于正式网站已经更新。

桌面关键值为：卡片不透明度 .49、玻璃模糊 18px、饱和度 1.79、圆角 28px、阴影强度 .225 / 模糊 48px / 扩散 9px，背景模糊 28px、亮度 .92、蒙层 .57、过渡 150ms；中栏最大宽度 600px，正文 17.5px。实际卡片约 574px（扣除中栏边距）。手机材质仍为原始 .68 / blur 10px，背景 blur 40px / 700ms，仅正文变为 17px。

## 不必在本机启动服务器

1. 打开现有 Vercel 项目的 Deployments。
2. 选择分支 `feature/moments-glass-studio` 的**最新 Preview 部署**，等待构建 Ready。
3. 点击 Visit，使用 Vercel 生成的 `*.vercel.app` 预览域名。
4. 在预览地址后访问 `/moments.html` 或 `/zh/moments.html`。
5. 点击导航里的「调参」。页面默认已加载当前确认配置，不必重新粘贴 JSON。

旧的 localhost 地址是开发服务器地址，不是用户电脑能访问的云端预览地址。也不要在正式 `lxiang.cc` 上寻找面板；正式构建不包含 Studio。没有 `?studio=1` 之类的生产开启参数。

## Preview / Production 隔离

为让云端分支可直接预览，`vercel.json` 添加了构建命令 `node dev/build-vercel.js` 和静态输出目录 `dist`，不修改项目、域名或 API。

- 只有 `VERCEL_ENV=preview` 时，构建才给两个 Moments HTML 注入 Studio，生成带完整确认配置的 JS/CSS，并复制所需开发资源。
- Production、Development 或缺少明确 Preview 环境值时均排除 dev 目录，不注入工具。每次先清理生成目录，避免残留 Preview 资产。
- 浏览器还检查显式 `vercel-preview` 构建标记和 `.vercel.app` 域名；正式域名拒绝面板，即使误用了 Preview HTML。
- 普通 HTML 源文件仍不引用 dev 工具；正式页面也不读取 Studio 的本地保存值。
- 此面板不是后台鉴权或账号权限系统，只有当前浏览器的视觉预览；不会写 Worker、D1 或正式默认参数。

`dist/` 是忽略的生成目录。原照片、Markdown、JSON、点赞/评论脚本按原路径复制，构建不修改源文件。GitHub Pages 的既有 workflow 不变，其源 HTML 也不会加载 Studio。

## 真实页面调参

这不是静态 Demo。Studio 直接控制真实朋友圈和固定照片背景，按四组提供 41 项中文参数：卡片材质、动态照片背景、布局与阅读尺寸、细节尺寸与间距。

- 拖动或输入数字后，下一帧更新已有 CSS 变量。不插入新 CSS 规则，不重建朋友圈，也不整卡 zoom/scale。
- 玻璃背景模糊和照片背景模糊是两套独立变量；真实图库和 Lightbox 照片保持清晰。
- 可切换「原始版本」「建议版本」「你的已确认配置」。原始快照来自第一轮 `ff0ee16` 实测；建议预设仅保留为对比起点，不覆盖当前确认默认值。
- 「对比原始版本」临时显示旧版并保留调整值；「返回当前调整」恢复。对比时禁用滑块，防止误改。
- 卡片内部间距会同步评论区与图库/按钮/评论底部留白；细节组仍可分别微调。
- 桌面与手机参数分开，面板显示当前分组。缩小窗口到页面的 48rem 分界以下即可调手机参数。
- 桌面抽屉为自己预留右侧空间，不遮挡卡片；窄屏改为页面上方正常文流内的面板。
- 内容优先布局根据中栏、侧栏和间距的可用空间预算收起侧栏，不用挤窄正文换三栏。原始预设保留旧响应式规则。
- 动态背景仍按实际可见面积、15% 滞后、首张照片、96px 缓存及两层交叉淡化工作。过渡定时器使用当前 CSS 时长。
- 系统减少动态/透明度偏好保持优先。

## 保存与导出

「保存到本地」保存完整桌面/手机参数到 `lx_glass_studio_v1`；「恢复上次保存」显式恢复。不会改访客 UUID、点赞状态或评论 Token。保存按浏览器和预览域名隔离，换一个 Vercel 部署域名可能没有旧记录，请自行导出。

「复制完整配置」提供 JSON，Clipboard 失败会选中导出框便于手动复制。「导出 JSON」「导出 CSS」会下载文件，CSS 包含桌面和手机覆盖。可导入完整 JSON，版本、字段与数值范围都经过验证。

「你的已确认配置」始终恢复仓库里的确认快照，不会被本次临时调整覆盖。后续若还想改，导出 JSON 发回即可；工具不会自动把浏览器保存值写入源码或合并 main。

## 本地开发仍可用

```sh
python3 dev/serve-glass-studio.py --port 8092
```

本机浏览器访问 `http://127.0.0.1:8092/moments.html` 或中文路径。该服务器只绑定回环地址，显式注入 local 标记；普通静态服务器不启用面板。Windows 可用 `py -3`。若本地 API CORS 不允许请求，不要为调参修改 Worker；可用 Vercel Preview 检查真实业务。

## 验证与限制

56 项单元/DOM 测试通过，包含构建 Preview/Production 隔离、无旧资产残留、桌面值精确保留、手机仅一个字号差异、配置/导出/验证及现有 Blog/Moments 回归。

构建产物在模拟 `.vercel.app` 来源的真实 Chromium 中验证了中英文 Studio、实时调参、已确认配置恢复，并确认正式域名不能通过构建标记/查询参数启用。完整生产输出检查了正常 HTML、媒体和业务脚本存在且 dev 工具不存在。

另有完整 Studio 参数、保存恢复、导出、响应式布局及原有照片背景/点赞/评论/Lightbox 浏览器回归。API 写入全为 Mock，未操作生产评论。真实 Vercel 构建结果以平台部署状态为准；Safari/WebKit、低功耗手机帧率及真实网络 CORS 仍需用户验收。

可使用仓库外的 jsdom / playwright-core 运行 tests/glass-preview-build.test.cjs、tests/glass-preview-browser.cjs、tests/glass-studio.test.cjs、tests/glass-studio-browser.cjs 及原有回归。浏览器构建测试前运行 `VERCEL_ENV=preview node dev/build-vercel.js`。

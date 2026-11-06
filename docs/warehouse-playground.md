# Warehouse Simulation Playground

## Git 与范围

初版基于 Lab Shell 开发；当前 UI/UX 调整直接在 `lab` 提交并推送，`main`、其他 Lab 页面和部署配置保持不变。

入口保持 `/lab/projects/or/` 和 `/zh/lab/projects/or/`。复用现有导航、页脚、语言结构及 `lx_blog_theme`。本功能没有后端、外部计算服务、数据库、库存或调度；本次不调整其他 Lab 项目。

## 文件职责

- `lab/warehouse/core.js`：独立数值模块，配置、式（16）、货位坐标、单任务分解、随机任务、在线统计、CI、Gap、收敛检查点与小系统枚举，无 DOM。
- `lab/warehouse/worker.js`：真正的 Monte Carlo 工作线程，返回进度和当前运行统计，不存全部样本。
- `lab/warehouse/visual.js`：固定轴测几何、资源位置、SVG 收敛图；不计算作业规则。
- `lab/warehouse/app.js`：输入校验、运行状态、取消/过期、原三维场景与共享 DC 时钟联动、结果及图表检查点。
- `lab/warehouse/cycle.js`：由现有 breakdown 构造连续 DC 与 SC 对照轨迹，纯函数，可独立测试。
- `lab/warehouse/cycle-view.js`：两个二维 SVG、共享物理时间轴、连续播放和阶段边界控制。
- `lab/warehouse/page.js`、`warehouse.css`：双语静态内容及作用域样式。
- `dev/build-lab-pages.js`：为 OR 加载专用页面与周期动画脚本；其他项目的生成结果不变。
- `lab/shared/project-registry.js`：OR 与 warehouse 实验开放状态和真实来源；其他项目保持原状态。
- `lab/shared/lab-render.js`：首页页脚说明更新为仓储实验已开放。
- `js/lab.js`：OR 由专用控制器负责；保留共有语言和主题功能。
- 生成页面：`lab.html`、`zh/lab.html`、`lab/projects/or/index.html`、`zh/lab/projects/or/index.html`。
- `tests/fixtures/warehouse/warehouse_core.py`：用户 ZIP 中原样保存的计算核心；`source-README.md` 为原 README。
- `tests/fixtures/warehouse/generate.py`、`oracle.json`：Python 生成的数值对照，测试专用，不作为网页运行结果。
- `tests/warehouse-core.test.cjs`、`tests/warehouse-browser.cjs`：数值与交互测试；原 Lab 测试同步兼容已开放的 OR。

## 来源分层

权威计算来源是用户提供的 `warehouse_dc.zip` 中 `warehouse_core.py`、README、已运行 Notebook 与 results；权威物理布局参考是用户附带的论文仓库图。

论文信息按 Notebook 转录：Tian Liu, Xianhao Xu, Hu Qin, Andrew Lim (2016), *Travel time analysis of the dual command cycle in the split-platform AS/RS with I/O dwell point policy*, Flexible Services and Manufacturing Journal 28:442–460，DOI `10.1007/s10696-015-9221-7`。没有推断未提供的文献或声称独立核验了全文。

- **材料所述论文规则**：每架 VP、每层 HP；存完揭示取货；恒速、零交接；异层 VP 移层与取货 HP 整个往返并行。
- **Python 复现约定**：层列独立均匀、有放回，允许同货位；每 DC 独立重置，默认 tier1_origin，最高离散层 `(n−1)h`，连续理论高度仍为 `nh`；另有两种敏感性坐标。不能把这些补充约定说成作者公开源码。
- **网页展示选择**：固定轴测双排货架、教学节奏、合并网格、示意深度、浏览器随机数发生器；这些不增加额外物理行程。

## 数学与统计

`L=mw`, `H=nh`, `t_h=L/v_h`, `b=(H/v_v)/t_h`。期望按原式以 `b≤2` 与 `b>2` 分段，不舍入 b。默认值的解析期望为 136.3125 s，仅在用户运行后显示。

令 `X_i=x_i/v_h`, `Y_i=y_i/v_v`：

- 存储：`T_s=X_1+Y_1`，先 VP 后 HP。
- 同层取货：`|X_1-X_2|+X_2+Y_1`。
- 异层取货：`max(|Y_1-Y_2|,2X_2)+Y_2`，保留并行最大值，不能相加。
- 送回 I/O 即结束，不加异层存储 HP 空载回位时间。

采用 Welford 在线统计，样本方差除以 `N−1`；95% 正态近似区间为 `mean ± 1.959963984540054·s/√N`。相对差值分母为解析值绝对值，零分母返回 null/未定义。逐点区间不是整条曲线的同时置信带，也不是解析公式的不确定性。

浏览器使用 Mulberry32（uint32 种子），整数拒绝抽样避免取模偏差，每任务独立抽四个索引。NumPy 使用 PCG64，且批量生成顺序不同，因此相同种子不应承诺相同序列。核心数值验证使用 Python 预生成的完全相同任务。

Worker 支持 100～1,000,000 次。使用最多 182 个对数检查点，包含最终点，每 10,000 次发送进度。取消通过 terminate；运行 ID 和配置版本阻止旧响应覆盖新状态。修改参数会取消正在运行的任务，旧完整结果标为过期；新运行开始清空旧统计，失败不伪造输出。

页面 UI 限制层/列为 1～1000，宽高与速度为 0.1～100；这些是交互边界，不是论文证明的物理适用范围。

## 可视化与交互

静态结构包含两排长货架、层列、每层 HP 轨道、前端 VP、I/O。S 为橙色实线，R 为蓝色虚线；文字和线型补充颜色。大规模最多展示 12 个层组、20 个列组，实际任务参考点在各轴内按模型坐标投影。极端长宽高比例仅在展示上压缩，并标注非严格比例，避免网格不可读。深度只示意，不计算第三维行程。

周期探索器为 DC / SC 等尺寸二维正视图，自动连续播放一次（减少动态效果时停在初态，使用步进）。存取设备与货物用实际坐标连续移动，共享物理时钟线性映射为约 18 秒，DC 与 SC 各自完成时停止。时间轴、播放暂停、前后阶段边界、重播均可用；页面后台暂停。共同存储动作显示居中说明，阶段分歧时显示两列说明。R 在存储完成后揭示。二维绘图与原三维场景使用同一 DC 时钟；原 renderer 的几何、视角和位置函数保留，三维仅在阶段变化时重建，帧间只更新资源位置。

SC 是两次返回 I/O 的标准单指令机制对照，不参与 DC 的解析值或 Monte Carlo。沿用独立 VP/每层 HP、恒速与零交接，存储 HP 空载复位与 VP 返回并行。第二个取货指令从 VP 回到 I/O 后释放；同层 HP 若尚未复位，则先完成复位才开始取货。VP 与 HP 均就绪才交接并返回 I/O。令 tS=Y1+X1、release=tS+Y1、hpStart=max(release,tS+X1)（同层，否则 release），则 join=max(release+Y2,hpStart+2X2)，SC 对照终点=join+Y2。该派生时序是透明的设备可用性机制示意，不声称是论文的 SC 统计结果。新增测试检查阶段边界的所有设备位置连续、交接同位、等待和最终送达；不改变 DC 核心。

配置与运行合并为参数/原三维预览双栏。所有原参数范围、默认值、随机种子与三种坐标约定保留，货格宽高改为 Cell Width/Height。高级设置默认折叠。运行反馈为 idle/running/completed/error，并保留取消、过期标记与 Worker 错误恢复。

收敛图使用本次 Worker 返回的前缀统计：对数样本轴、蓝色均值、橙色虚线解析值、浅蓝逐点区间。可用鼠标、触摸及键盘滑块检查所有指标；原生 SVG 无大型图表依赖。解读报告实际 CI 半宽、SE、Gap 和早期检查点精度；没有自造好坏阈值，不把小 Gap 等同于高效率或全局最优。

## 重现测试

```sh
python -B tests/fixtures/warehouse/generate.py
node tests/warehouse-core.test.cjs
node dev/build-lab-pages.js
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules node tests/lab-shell.test.cjs
node dev/build-vercel.js
# 浏览器测试需本地静态服务器、playwright-core 与 Chromium
NODE_PATH=/workspace/.onboarding/lx-tests/node_modules SITE_TEST_URL=http://127.0.0.1:8110 node tests/warehouse-browser.cjs
```

计算测试覆盖 32 个公式向量（包含 b=2 两侧及 n=1）、三种坐标下 1920 个固定任务、两种运动分支、VP/HP 等待、倍速缩放、均值/方差/CI/Gap、完全枚举、固定种子、抽样及无效输入。容差为 `1e-10 + 1e-11·|reference|`。实际最大绝对差异：公式 0，单任务 0，所比较统计量 `5.0737192225369654e-14`。

尚未进行生产部署或真实 Safari/手机硬件验证。浏览器测速只代表本次机器，不能保证所有设备耗时。数值实验没有增加连续库存、队列、加减速、非零交接、SC 统计或其他停驻策略。参考 ZIP 中的发表模拟数值不作为网页运行结果或调参目标。

## 初版历史验收记录

- 计算与几何测试 8/8、Lab 注册与生成测试 8/8 通过；全套 102 项中 99 项通过。3 项失败来自原有博客文章顺序、数量和元数据基线，不修改无关内容。
- 源站仓储测试覆盖 375、430、768、1024、1366、1440px × 中英文 × 浅深主题的 24 组；均执行真正 Worker 模拟、任务分支和坐标/图表检查。
- 百万次模拟在源站测试机器约 2.321 秒完成，主线程 20ms 心跳触发 115 次；这是本机观测，非所有设备性能承诺。
- 测试取消、参数变更中止、失效结果标记、Worker 加载失败与重试、无 Worker、无 JavaScript 提示、减少动态效果、完整重播、键盘检查点和主题语言。
- 原 Lab 九个页面在六种宽度、两种语言和主题下共 216 个页面组合回归通过。
- 最终静态构建再次运行仓储测试及原首页/导航/博客目录浏览器回归。截图检查覆盖手机与桌面、浅色与深色；真实 Safari/手机实机未验证。


## Industrial UI/UX 改造验收

- 三个主要章节：二维 DC/SC 连续周期 → Configure & Run → Simulation Results。方法、限制与来源统一折叠。
- OR 页面作用域工业配色：#E9EDF0 页面、#F9FAFB 卡片、#CDD5DD 边框、#426C8C 强调色。DC 和 SC 使用同一背景；DC 用布局无偏移的内描边强调。结果仅 Relative Gap 使用 #DDEBF5 / #93B4D1，其余五卡一致。
- 六张结果卡在桌面 3×2；窄屏重排。收敛图保留原本真实前缀统计与参考线，并添加清晰图例。原 core.js、worker.js 未修改；visual.js 仅更新图表坐标轴文字。
- 5 项新增连续轨迹测试和原 8 项数值/几何测试通过；8 项 Lab 页面生成测试通过。
- 4 组 Warehouse 定向 Chromium 测试（375px/1280px × 中英文）验证动画控制、同层/异层、原三维参数联动、实际 1000 次 Worker 输出与收敛图、卡片对齐与无溢出；额外正常动态上下文验证自动播放、暂停、继续和结束。
- 320px/1024px 额外布局检查使用实际 100 次模拟，验证置信区间完整显示与参数/三维对齐。截图已查看；发现的 HP 文本重叠改用图形图例，避免设备与目标标记互相遮挡。
- 只执行改动相关检查，没有全站回归或百万次性能复测。静态构建与 JavaScript 语法检查通过。没有合并 main、后端或部署配置改动。

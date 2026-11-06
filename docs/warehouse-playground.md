# Warehouse Simulation Playground

## Git 与范围

基线为已推送的 `feat/interactive-lab-shell`，提交 `cbbae202def814b336a0f013ff3e12026b8c9b45`，不是 main。仓储功能在独立分支 `feat/warehouse-simulation-playground` 开发。若建立 PR，base 应选 Lab Shell 分支。不要合并或部署。

入口保持 `/lab/projects/or/` 和 `/zh/lab/projects/or/`。复用现有导航、页脚、语言结构及 `lx_blog_theme`。本功能没有后端、外部计算服务、数据库、库存或调度；其他 Lab 项目仍保持开发中或概念状态。

## 文件职责

- `lab/warehouse/core.js`：独立数值模块，配置、式（16）、货位坐标、单任务分解、随机任务、在线统计、CI、Gap、收敛检查点与小系统枚举，无 DOM。
- `lab/warehouse/worker.js`：真正的 Monte Carlo 工作线程，返回进度和当前运行统计，不存全部样本。
- `lab/warehouse/visual.js`：固定轴测几何、资源位置、SVG 收敛图；不计算作业规则。
- `lab/warehouse/app.js`：输入校验、运行状态、取消/过期、教学重播、结果与解读、图表检查点。
- `lab/warehouse/page.js`、`warehouse.css`：双语静态内容及作用域样式。
- `dev/build-lab-pages.js`：仅对 OR 使用专用页面，其余继续共用原模板。
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

探索器支持新任务、同层/异层示例、前后步骤与重播。示例不改变统计模拟分布。检索位置在存储完成前不显示，相关总时间也不提前显示。重播将物理段压缩为教学时长，图旁明确区分播放节奏与物理秒数。异层 VP/HP 分别按各自时长完成，并等待另一方；时间线按比例显示并行段、等待段与最终下降。减少动态效果时使用离散步骤，切后台停止重播。

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

尚未进行生产部署或真实 Safari/手机硬件验证。浏览器测速只代表本次机器，不能保证所有设备耗时。没有模拟连续库存、队列、加减速、非零交接、SC、其他停驻策略或额外回位策略。参考 ZIP 中的发表模拟数值不作为网页运行结果或调参目标。

## 本次验收记录

- 计算与几何测试 8/8、Lab 注册与生成测试 8/8 通过；全套 102 项中 99 项通过。3 项失败来自原有博客文章顺序、数量和元数据基线，不修改无关内容。
- 源站仓储测试覆盖 375、430、768、1024、1366、1440px × 中英文 × 浅深主题的 24 组；均执行真正 Worker 模拟、任务分支和坐标/图表检查。
- 百万次模拟在源站测试机器约 2.321 秒完成，主线程 20ms 心跳触发 115 次；这是本机观测，非所有设备性能承诺。
- 测试取消、参数变更中止、失效结果标记、Worker 加载失败与重试、无 Worker、无 JavaScript 提示、减少动态效果、完整重播、键盘检查点和主题语言。
- 原 Lab 九个页面在六种宽度、两种语言和主题下共 216 个页面组合回归通过。
- 最终静态构建再次运行仓储测试及原首页/导航/博客目录浏览器回归。截图检查覆盖手机与桌面、浅色与深色；真实 Safari/手机实机未验证。

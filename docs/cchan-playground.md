# Fraud Detection Playground — 当前实现

## 范围与结构

继续在 `lab` 分支更新原有 `/lab/projects/cchan/` 与 `/zh/lab/projects/cchan/`，不创建新页面，不修改其他 Lab 项目或部署配置。标题更新为 Fraud Detection Playground / 欺诈预测 Playground，保留浅绿色主题和一句介绍。

四段连续探索：错误路径 → 耦合建图 → 患者决策／成本敏感学习 → Top-K 实验。页面默认展示完整结果结构，解释通过浮动气泡按需展开，不使用底部小字更新解释。

## 交互与布局

1. **Why Coupling**：保留 Case A/B 和自动节点融合动画。Joint Semantics 高亮医院、疾病与 Case B 路径；Group Semantics 高亮患者与共享路径，解释其为另一种建模需求。动画保留原 H/D 节点，支持暂停、播放、重播与减少动态效果。
2. **Graph Construction**：连续轨道连接三个默认可见阶段，去掉孤立小箭头。左侧为完整横向医疗记录卡，中间为均匀网格，最终图沿用此前已核对的 13 个节点、16 条实线／虚线及其坐标。记录与其三个联合耦合节点联动；群体节点的反向来源指向两条记录，不声称单条记录即可生成群体关系。节点、记录、公式的说明统一使用浮动气泡。
3. **患者与成本**：醒目的单患者核查问题、紧凑 A/B 卡片；默认 A 被选中。左侧两个场景分别表示真阳性的有效检查成本、假阴性的漏查损失，与右侧自然语言成本矩阵双向高亮。其他单元格适度弱化，点击／触摸保留对应状态。数值参数与 TN/FP/FN/TP 不作为矩阵主体显示。结论收为“预测准确率更高 ≠ 监管总成本必然更低”。
4. **Cost-BCE 架构**：依据本次完整参考图补齐 Last/Current/Next Epoch、两条对称注意力分支、元路径表示、β 融合、MLP、Sigmoid、预测、成本矩阵、归一化权重、BCE 和反馈。复杂数学符号使用仓库现有 KaTeX，在构建时输出 HTML/MathML，通过 SVG foreignObject 显示，不引入新依赖。四阶段支持悬浮预览、点击锁定、Show All；小屏点击阶段会水平定位对应结构。标签和箭头分开布置，真实标签与预测分别进入成本权重／BCE，反馈表示参数更新而不是下一轮输入特征。
5. **患者级损失探索**：沿用既有 `CchanEngine.lossBatch` 的论文式 11–14，改为 A/B 两患者的联动样本组。切换 A/B 同步填入 90%/$300 或 65%/$10,000，可修改标签假设和评分，观察两位患者的 BCE、归一化成本权重和 Cost-BCE。此操作不改变核查默认选择，不重新训练模型。
6. **Top-K**：固定窗口、约 4.8 秒处理加短暂完成过渡；一次只渲染最多 7 行，连续向上移动。完成后队列淡出，同一区域显示互动曲线。提供暂停／播放／重播，后台标签暂停；减少动态效果时直接展示稳定结果。

全局 Tooltip 作为单个 `body` 下的 fixed 元素实现，支持悬停、聚焦、点击／触摸、Escape 与外部点击关闭，位置按视口边缘夹取，不受卡片或 SVG 滚动容器裁剪。小屏采用单栏工作流、重排后的成本模块和响应式图表；复杂架构图可内部平移，页面本身不横向溢出。

## 数据与来源

### 本次 JSON

`lab/cchan/topk_cost_data.json` 是用户上传文件的逐字节复制，SHA-256 保存在 `research-sources.json`。Schema 为：

```text
{k: number[100], LR: number[100], RF: number[100], SVM: number[100],
 XGB: number[100], GCN: number[100], GAT: number[100],
 GraphSAGE: number[100], CCHAN: number[100]}
```

- 100 个 K 从 0 到 100，包含小数；按原值、原顺序绘图，不取整、不拟合、不补点。
- 八条曲线共 800 个成本数据点全部参与 SVG 折线。
- 颜色沿用参考图：LR 蓝、RF 橙、SVM 绿、XGB 金、GCN 紫、GAT 棕、GraphSAGE 粉、CCHAN 红；CCHAN 加粗。
- 图上指针或键盘左右／Home／End 定位原始数据点，浮动气泡显示原始 K 与八模型数值。图例悬浮／聚焦高亮曲线。
- JSON 缺失或不合法时提供重试，不用旧图片、随机曲线或模拟数组替代。
- JSON 不含逐患者预测、风险或欺诈标签。因此当前队列只生成匿名演示编号和处理状态，已经删除先前队列的模拟风险与标签字段。队列不被用于计算八条模型曲线。

### 论文与参考图

本次未附新 PDF，使用此前上传的 `healthcare fraud detection-DSS(1)(1).docx` 与这次完整机制参考图。公式及成本定义仍以论文式 5–14、表 3 为依据。

论文完整数据集为 20,000 名患者，其中 1,000 名欺诈患者（5%），1,830,386 条索赔；Top-K 子集为 1,000 名患者：900 正常、100 欺诈，其中 20 个高索赔、80 个较低索赔欺诈案例。界面主显示 Top-K 设置，完整数据集说明放入气泡，避免长段落。

此前提取的论文原始 Figure 7 PNG 仍保留为归档，当前结果图已完全改用上传 JSON。不得把上传曲线称为由前端队列或前端训练生成。

既有来源差异保留在 `research-sources.json`：图 3 的 DD–P1/P2 描画与严格共同邻居规则存在差异，当前沿用原图，不自行补推观测关系；图 4 描画 MLP，正文式 9 为线性分类器加 sigmoid，当前按完整参考图展示而不执行新模型架构。β 的数学展示保留原图符号，交互按论文的语义权重解释，不估计注意力数值。

## 文件

- `lab/cchan/page.js`：原页面的共享中英文结构、自然语言成本矩阵、连贯工作流。
- `lab/cchan/app.js`：浮动气泡、三图来源联动、双向成本联动、阶段锁定与患者损失联动；复用原动画生命周期。
- `lab/cchan/architecture.js`：完整轮次架构的 SVG/KaTeX 静态渲染。
- `lab/cchan/chart.js`：JSON 校验、全点折线、响应式绘图与原始点 Tooltip。
- `lab/cchan/research.js`：保留已核对图拓扑／融合动画；删除旧机制 renderer 和队列风险／标签。
- `lab/cchan/topk_cost_data.json`、`research-sources.json`：上传原始数据与来源记录。
- `lab/cchan/cchan.css`：项目内布局、数学标签、图表与气泡样式。
- `dev/build-lab-pages.js`：仅调整 CCHAN 页面脚本／现有 KaTeX 样式引用，停止加载本页不再使用的旧教学数据和 renderer。
- 中英文 CCHAN 生成 HTML、对应单元与浏览器测试。

## 定向验收

- 单元测试保留原论文损失与图拓扑测试，新增 JSON 字节哈希、800 点、非整数 K、不修改数组、无风险／标签队列、自然语言成本表、KaTeX 完整机制结构。
- Chromium：375px 中文浅色、430px 英文深色、1440px 英文浅色；检查记录→中间节点→最终图、双向成本高亮、Tooltip 视口边界、阶段锁定／Show All、A/B 损失预设、自动队列／完成／重播、8×100 点、键盘访问最后一点与小数 K、图例高亮、无控制台错误和整页溢出。
- 额外检查减少动态效果、语言锚点、JSON 失败及重试、后台暂停／恢复及退出页面后的气泡清理。此前动画的可见性暂停与页面退出清理逻辑继续使用，新增 chart ResizeObserver 在退出时销毁。
- 检查实际桌面与手机渲染截图。未声称使用真实 iPhone Safari 验证。

```sh
node dev/build-lab-pages.js
NODE_PATH=/path/to/test/dependencies node --test tests/cchan.test.cjs tests/lab-shell.test.cjs
SITE_TEST_URL=http://127.0.0.1:8118 NODE_PATH=/path/to/test/dependencies node tests/cchan-browser.cjs
node dev/build-vercel.js
```

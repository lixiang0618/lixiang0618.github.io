# Warehouse DC reproduction

解压后打开 warehouse_dc_reproduction.ipynb，按顺序运行全部单元格。
核心为 warehouse_core.py；results/ 包含已运行的 CSV 和 PNG。
安装依赖：pip install -r requirements.txt
默认每组100000次，种子20261106。
默认离散坐标 tier1_origin：x=(j+1)w，y=rh；论文连续理论面L=mw、H=nh。
坐标是显式复现约定，非论文公开源码；详见Notebook。
模拟按论文取货送达I/O计时，不额外等待异层存储HP空载回位；各DC独立重置。
只实现DC与式(16)，零交接时间，无SC、前端和API。
发表基准：Liu et al., 2016, DOI 10.1007/s10696-015-9221-7, Tables 1–2.

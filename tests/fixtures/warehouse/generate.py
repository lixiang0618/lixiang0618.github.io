"""Generate cross-language oracle using unchanged supplied Python core."""
import json
from dataclasses import asdict
from pathlib import Path
import numpy as np
from warehouse_core import *
out={'formula':[], 'cases':[]}
for n in (1,2,12,864):
 for b in (.0001,.5,1,2-1e-9,2,2+1e-9,4,576):
  out['formula'].append({'b':b,'n':n,'value':expected_normalized_dc(b,n)})
for mode in ('tier1_origin','cell_centers','far_edges'):
 for n,m in ((1,1),(1,3),(2,3),(4,2),(12,24)):
  c=WarehouseConfig(n,m,2,3,2,1,mode)
  tasks=generate_tasks(c,128,20261106)
  samples=task_time(c,**tasks)
  out['cases'].append({'config':asdict(c),'theory':theoretical_expected_time(c),'tasks':[{k:int(v[i]) for k,v in tasks.items()} for i in range(128)],'times':samples.tolist(),'metrics':gap_metrics(theoretical_expected_time(c),samples),'exact':exact_discrete_mean(c) if n*m<=8 else None})
p=Path(__file__).with_name('oracle.json');p.write_text(json.dumps(out,indent=2));print('Python oracle:',len(out['formula']),'formula vectors,',len(out['cases'])*128,'tasks')

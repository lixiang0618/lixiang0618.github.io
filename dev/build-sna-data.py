"""Extract only verified SNA research fields. Requires supplied originals + openpyxl.
No raw report/student identifiers or Gephi binary are published.
"""
import argparse, hashlib, json, math, zipfile
from pathlib import Path
import openpyxl

def extract(matrix_file, results_file, report_file, gephi_file):
    wm=openpyxl.load_workbook(matrix_file,data_only=True);wr=openpyxl.load_workbook(results_file,data_only=True)
    s=wm['Sheet1'];names=[s.cell(1,j+2).value for j in range(26)]
    assert len(set(names))==26 and [s.cell(i+2,1).value for i in range(26)]==names
    a=[[s.cell(i+2,j+2).value for j in range(26)] for i in range(26)]
    assert all(isinstance(v,(int,float)) and math.isfinite(v) and v>=0 for r in a for v in r)
    assert all(a[i][i]==0 for i in range(26))
    means=[sum(a[i][j] for i in range(26))/26 for j in range(26)]
    b=[[int(i!=j and a[i][j]>=means[j]) for j in range(26)] for i in range(26)]
    assert sum(map(sum,b))==269
    aliases={'武汉城市学院':names[24],'武汉科技大学城市学院':names[24]}
    def canon(n):return aliases.get(n,n)
    def table(sheet,key_col,start,end,cols):
        out={}
        for row in range(start,end+1):
            name=wr[sheet].cell(row,key_col).value
            if name is None:continue
            name=canon(name);assert name in names,(sheet,row,name)
            assert name not in out,(sheet,name)
            out[name]={k:wr[sheet].cell(row,col).value for k,col in cols.items()}
        return out
    degrees=table('度',1,2,27,{'in':2,'out':3,'closeness':9,'betweenness':10,'eigenvector':14})
    holes=table('结构洞',1,2,27,{'effectiveSize':2,'efficiency':3,'constraint':4,'hierarchy':5,'egoBetweenness':6})
    between=table('中介中心性',2,2,27,{'value':3,'normalized':4})
    weighted=table('degree',2,2,27,{'out':3,'in':4})
    brokerage=table('中间人',1,2,27,dict(zip(['coordinator','gatekeeper','representative','consultant','liaison','total'],range(2,8))))
    group=[int(wr['块模型'].cell(26,i+2).value) for i in range(26)]
    named_groups=table('块模型',2,32,57,{'group':3})
    assert all(named_groups[n]['group']==group[i] for i,n in enumerate(names))
    fit=float(wr['核心边缘结构']['A1'].value.rsplit('=',1)[1]);assert fit==.9723
    core_text=wr['核心边缘结构']['A5'].value.split(':',1)[1].split()
    core=[names.index(n) for n in core_text];assert len(core)==11
    core_edges=sum(b[i][j] for i in core for j in core);assert core_edges==108
    counts=[[sum(b[i][j] for i in range(26) if group[i]==g for j in range(26) if group[j]==h) for h in range(1,5)] for g in range(1,5)]
    saved_counts=[[wr['块模型'].cell(i+2,j+2).value for j in range(4)] for i in range(4)];assert counts==saved_counts
    sizes=[group.count(g) for g in range(1,5)]
    density=[[counts[i][j]/(sizes[i]*(sizes[j]-(i==j))) if sizes[i]*(sizes[j]-(i==j)) else None for j in range(4)] for i in range(4)]
    reported_density=[[wr['块模型'].cell(i+9,j+2).value for j in range(4)] for i in range(4)]
    ideal=[[wr['块模型'].cell(i+10,j+11).value for j in range(4)] for i in range(4)]
    expected_ideal=[[int((density[i][j] or 0)>269/650) for j in range(4)] for i in range(4)]
    roles=[]
    for g,row in enumerate([43,46,48,51]):
        r=wr['块模型'];inside=counts[g][g];sent=sum(counts[g])-inside;received=sum(counts[i][g] for i in range(4) if i!=g)
        assert [r.cell(row,c).value for c in [30,31,32,33,34]]==[sizes[g],inside,received,inside,sent]
        roles.append({'group':g+1,'role':r.cell(row,35).value,'inside':inside,'sentOutside':sent,'receivedOutside':received,'expectedInsideRatio':(sizes[g]-1)/25,'actualInsideRatio':inside/(inside+sent) if inside+sent else None,'receivedToSentRatio':received/sent if sent else None,'reportedRatios':{'expected':r.cell(g+2,12).value,'inside':r.cell(g+2,13).value,'outside':r.cell(g+2,14).value}})
    # Stable force layout, derived only from this verified binary matrix.
    xy=[[math.cos(2*math.pi*i/26)*180,math.sin(2*math.pi*i/26)*180] for i in range(26)]
    undirected=[(i,j) for i in range(26) for j in range(i+1,26) if b[i][j] or b[j][i]]
    for step in range(450):
        forces=[[0.,0.] for _ in range(26)]
        for i in range(26):
            for j in range(i+1,26):
                dx,dy=xy[i][0]-xy[j][0],xy[i][1]-xy[j][1];d=max(math.hypot(dx,dy),.1);f=1800/d**2
                for axis,v in enumerate([dx/d,dy/d]):forces[i][axis]+=f*v;forces[j][axis]-=f*v
        for i,j in undirected:
            dx,dy=xy[j][0]-xy[i][0],xy[j][1]-xy[i][1];d=max(math.hypot(dx,dy),.1);f=.018*(d-95)
            for axis,v in enumerate([dx/d,dy/d]):forces[i][axis]+=f*v;forces[j][axis]-=f*v
        for i in range(26):
            for axis in range(2):xy[i][axis]+=max(-3,min(3,forces[i][axis]-.002*xy[i][axis]))*(1-step/600)
    bounds=[(min(p[k] for p in xy),max(p[k] for p in xy)) for k in range(2)]
    positions=[[round(70+(p[0]-bounds[0][0])/(bounds[0][1]-bounds[0][0])*680,3),round(65+(p[1]-bounds[1][0])/(bounds[1][1]-bounds[1][0])*430,3)] for p in xy]
    english=['Wuhan University','Huazhong University of Science and Technology','Wuhan University of Technology','Central China Normal University','Wuhan Textile University','Zhongnan University of Economics and Law','China University of Geosciences (Wuhan)','Jianghan University','South-Central Minzu University','Wuhan University of Science and Technology','Hubei University','Wuhan Technology and Business University','China Three Gorges University','Yangtze University','Huazhong Agricultural University','Wuhan Polytechnic University','Hubei University of Economics','Hubei Engineering University','Hubei University of Police','Hubei University of Technology','Wuhan Institute of Technology','Wuhan Sports University','Wuhan Conservatory of Music','Wuhan Institute of Bioengineering','Wuhan City University','Wuhan Software Engineering Vocational College']
    nodes=[]
    for i,n in enumerate(names):
        assert degrees[n]['in']==sum(b[j][i] for j in range(26)) and degrees[n]['out']==sum(b[i])
        assert abs(weighted[n]['out']-sum(a[i]))<.00051
        assert abs(weighted[n]['in']-sum(a[j][i] for j in range(26)))<.00051
        nodes.append({'id':i,'code':f'{i+1:02}','name':{'zh':n,'en':english[i]},'core':i in core,'group':group[i],'position':positions[i],'degree':degrees[n],'strength':{'out':sum(a[i]),'in':sum(a[j][i] for j in range(26))},'holes':holes[n],'betweenness':between[n],'brokerage':brokerage.get(n)})
    # Independent graph reachability verifies SCC/core correspondence, not equivalence of methods.
    reach=[]
    for i in range(26):
        seen={i};stack=[i]
        while stack:
            for j,v in enumerate(b[stack.pop()]):
                if v and j not in seen:seen.add(j);stack.append(j)
        reach.append(seen)
    components=[];remaining=set(range(26))
    while remaining:
        i=min(remaining);c=sorted(j for j in remaining if j in reach[i] and i in reach[j]);components.append(c);remaining-=set(c)
    assert set(max(components,key=len))==set(core)
    verified_brokerage=[]
    for broker in range(26):
        c={k:0 for k in ['coordinator','gatekeeper','representative','consultant','liaison']}
        for u in range(26):
            for v in range(26):
                if len({u,broker,v})<3 or not(b[u][broker] and b[broker][v]) or b[u][v]:continue
                ga,gb,gc=group[u],group[broker],group[v]
                k='coordinator' if ga==gb==gc else 'gatekeeper' if ga!=gb and gb==gc else 'representative' if ga==gb and gb!=gc else 'consultant' if ga==gc and ga!=gb else 'liaison'
                c[k]+=1
        c['total']=sum(c.values());verified_brokerage.append(c)
        if nodes[broker]['brokerage'] is not None:assert c==nodes[broker]['brokerage'],names[broker]
    geo=zipfile.ZipFile(gephi_file)
    workspaces=[]
    import xml.etree.ElementTree as ET
    for name in geo.namelist():
        if name.startswith('Workspace_') and name.count('_')==2 and name.endswith('_xml'):
            e=ET.fromstring(geo.read(name));workspaces.append({'id':e.attrib.get('id'),'name':e.attrib.get('name')})
    sources=[{'file':Path(p).name,'sha256':hashlib.sha256(Path(p).read_bytes()).hexdigest()} for p in [matrix_file,results_file,report_file,gephi_file]]
    return {'version':1,'sources':sources,'nodes':nodes,'weights':a,'columnMeans':means,'binary':b,'core':{'fit':fit,'members':core,'internalEdges':core_edges},'blocks':{'sizes':sizes,'counts':counts,'density':density,'reportedDensity':reported_density,'reportedIdeal':ideal,'densityThresholdIdeal':expected_ideal,'roles':roles},'qap':{'correlation':[{'id':'cooperation','value':wr['微博相关性分析']['C2'].value,'p':wr['微博相关性分析']['D2'].value,'nObs':wr['微博相关性分析']['K2'].value},{'id':'distance','value':wr['距离相关性分析']['C2'].value,'p':wr['距离相关性分析']['D2'].value,'nObs':wr['距离相关性分析']['K2'].value}],'regression':{'r2':wr['回归性分析']['B2'].value,'observations':wr['回归性分析']['B4'].value,'permutations':wr['回归性分析']['B5'].value,'variables':[{'id':'cooperation','coefficient':wr['回归性分析']['F2'].value,'standardized':wr['回归性分析']['G2'].value,'p':wr['回归性分析']['H2'].value},{'id':'distance','coefficient':wr['回归性分析']['F5'].value,'standardized':wr['回归性分析']['G5'].value,'pVersions':[{'cell':'H5','value':wr['回归性分析']['H5'].value},{'cell':'O9','value':wr['回归性分析']['O9'].value}]}]}},'validation':{'nodes':26,'edges':269,'coreNodes':11,'coreEdges':108,'sccs':components,'brokerageObservedRows':len(brokerage),'brokerageRecomputed':verified_brokerage,'gephiWorkspaces':workspaces,'layout':'deterministic-force-v1; Gephi graphstore binary coordinates not decoded','issues':['Block 3 density: sheet B9:E12 reports 0.28, 2/(9*8)=0.0277777778.','Block 2→1 reported ideal=0 while density 0.8 exceeds whole-network density 269/650. Both preserved.','Block 4 ratio 0/0 undefined; source inside=0/outside=1 not adopted as a computed ratio.','Distance regression p versions H5=0.073663, O9=0.083663; neither selected.','Observed brokerage row for Wuhan Software Engineering Vocational College absent; saved expected/relative rows are not used as observed counts.','Use complete named membership B32:C57 and column classes B26:AA26; shorthand block-4 lists omit two members.']}}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--matrix',required=True);p.add_argument('--results',required=True);p.add_argument('--report',required=True);p.add_argument('--gephi',required=True);p.add_argument('--output',default='lab/sna/data.json');args=p.parse_args()
    data=extract(args.matrix,args.results,args.report,args.gephi);out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print('Verified:',data['validation']['nodes'],'nodes,',data['validation']['edges'],'edges,',data['validation']['coreEdges'],'core edges; observed brokerage rows',data['validation']['brokerageObservedRows'])

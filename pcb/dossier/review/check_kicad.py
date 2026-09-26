import sexpdata as s,json,math,collections,zipfile,sys
from pathlib import Path
P=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'design'
D=json.loads((P/'circuit.json').read_text())
z=zipfile.ZipFile(P/'kicad-project.zip')
b=s.loads(z.read(next(n for n in z.namelist() if n.endswith('.kicad_pcb'))).decode())
def kids(a,key):return [x for x in a if isinstance(x,list) and str(x[0])==key]
def one(a,key):return kids(a,key)[0]
for f in kids(b,'footprint')[:3]:
 print(one(f,'property'),one(f,'at'));print(kids(f,'pad')[:1])
print('KiCad elements',collections.Counter(str(x[0]) for x in b if isinstance(x,list)))
sc={x['source_component_id']:x['name'] for x in D if x['type']=='source_component'};pc={x['pcb_component_id']:sc.get(x['source_component_id'],x['source_component_id']) for x in D if x['type']=='pcb_component'}
jpads={}
for x in D:
 if x['type']=='pcb_smtpad':jpads[(pc[x['pcb_component_id']],x['port_hints'][0].replace('pin',''))]=(x['x'],x['y'])
miss=[];n=0
for f in kids(b,'footprint'):
 props=kids(f,'property');refs=[p[2] for p in props if p[1]=='Reference'];ref=refs[0] if refs else '?'
 a=one(f,'at');rot=-math.radians(a[3] if len(a)>3 else 0)
 for p in kids(f,'pad'):
  k=(ref,str(p[1]))
  if k not in jpads:continue
  loc=one(p,'at');x=a[1]+loc[1]*math.cos(rot)-loc[2]*math.sin(rot)-100;y=100-(a[2]+loc[1]*math.sin(rot)+loc[2]*math.cos(rot));n+=1
  if math.dist((x,y),jpads[k])>1e-5:miss.append((k,(x,y),jpads[k]))
print('KiCad SMT pad positions compared',n,'mismatches',miss)
# Verify all exported copper track centerline segments against circuit JSON.
def segkey(layer,a,b,w):return (layer,tuple(sorted((tuple(round(v,6) for v in a),tuple(round(v,6) for v in b)))),round(w,6))
js=collections.Counter()
for tr in D:
 if tr['type']!='pcb_trace':continue
 r=tr['route']
 for a,c in zip(r,r[1:]):
  if a['route_type']==c['route_type']=='wire' and a['layer']==c['layer'] and math.dist((a['x'],a['y']),(c['x'],c['y']))>1e-7:js[segkey(a['layer'],(a['x'],a['y']),(c['x'],c['y']),a['width'])]+=1
ks=collections.Counter()
for x in kids(b,'segment'):
 a=one(x,'start')[1:];c=one(x,'end')[1:];ks[segkey('top' if str(one(x,'layer')[1])=='F.Cu' else 'bottom',(a[0]-100,100-a[1]),(c[0]-100,100-c[1]),one(x,'width')[1])]+=1
# KiCad stores coordinates to 1 nm. Match the remaining segments within
# 2 nm after exact multiset matching; decimal-bin boundaries must not fail
# an otherwise identical export. Counts, layers, widths and both ends matter.
missing=list((js-ks).elements());extra=list((ks-js).elements())
def equivalent(a,b):
 return a[0]==b[0] and abs(a[2]-b[2])<=.000002 and all(math.dist(x,y)<=.000002 for x,y in zip(a[1],b[1]))
unmatched=[]
for a in missing:
 match=next((i for i,b in enumerate(extra) if equivalent(a,b)),None)
 if match is None:unmatched.append(a)
 else:extra.pop(match)
print('Segments unmatched after 2 nm export tolerance',len(unmatched),len(extra))
print('JSON track segments' ,sum(js.values()),'KiCad track segments',sum(ks.values()),'missing from KiCad',len(js-ks),'extra in KiCad',len(ks-js))
print('Missing sample',list((js-ks).items())[:3]);print('Extra sample',list((ks-js).items())[:3])

if miss or unmatched or extra:
 sys.exit(1)

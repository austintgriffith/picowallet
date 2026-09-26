import json,re,math,collections,warnings,sys
from pathlib import Path
from gerbonara import GerberFile
from shapely.geometry import Point,LineString,Polygon,box
from shapely.ops import unary_union
from shapely.affinity import rotate
from shapely.strtree import STRtree
warnings.filterwarnings('ignore', message='.*Unknown statement.*')
P=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'design'
d=json.loads((P/'circuit.json').read_text())
class DSU:
 def __init__(s):s.p={}
 def root(s,a):
  s.p.setdefault(a,a)
  if s.p[a]!=a:s.p[a]=s.root(s.p[a])
  return s.p[a]
 def join(s,a,b):s.p[s.root(a)]=s.root(b)
net=DSU()
for t in d:
 if t['type']=='source_trace':
  a=t['connected_source_port_ids']+t['connected_source_net_ids']
  for v in a:net.join(a[0],v)
sc={x['source_component_id']:x['name'] for x in d if x['type']=='source_component'}
sp={x['source_port_id']:x for x in d if x['type']=='source_port'}
for v in d:
 if v['type']=='source_manually_placed_via':
  for sid,p in sp.items():
   if p['source_component_id']==v['source_manually_placed_via_id']:net.join(sid,v['source_net_id'])
names={i:sc.get(x['source_component_id'],x['source_component_id'])+'.'+str(x.get('pin_number',x.get('name'))) for i,x in sp.items()}
netnames={net.root(x['source_net_id']):x['name'] for x in d if x['type']=='source_net'}
polys=[];layers=[];objs=[]
for layer,file in [('top','F_Cu.gbr'),('bottom','B_Cu.gbr')]:
 text=(P/file).read_text(); lr=0;rots=[]
 for line in text.splitlines():
  if m:=re.match(r'%LR([\d.-]+)',line):lr=float(m[1])
  if line.endswith('D03*'):rots.append(lr)
 ri=iter(rots)
 for obj in GerberFile.open(P/file).objects:
  angle=next(ri) if type(obj).__name__=='Flash' else 0
  pieces=[]
  for p in obj.to_primitives():
   assert p.polarity_dark == obj.polarity_dark, "Mixed aperture exposure requires explicit handling"
   t=type(p).__name__
   if t=='Circle':g=Point(p.x,p.y).buffer(p.r,quad_segs=32)
   elif t=='Rectangle':g=rotate(box(p.x-p.w/2,p.y-p.h/2,p.x+p.w/2,p.y+p.h/2),p.rotation*180/math.pi,origin=(p.x,p.y))
   elif t=='Line':g=LineString([(p.x1,p.y1),(p.x2,p.y2)]).buffer(p.width/2,quad_segs=32)
   elif t=='ArcPoly':g=Polygon(p.approximate_arcs(max_error=0.0001).outline)
   else:raise ValueError(t)
   pieces.append(g)
  g=unary_union(pieces)
  if angle:g=rotate(g,angle,origin=(obj.x,obj.y))
  if obj.polarity_dark:
   polys.append(g);layers.append(layer);objs.append(obj)
  else:
   # Gerber clear polarity subtracts from previously drawn copper on this layer.
   for i,previous in enumerate(polys):
    if layers[i]==layer and previous.intersects(g):polys[i]=previous.difference(g)
# A clear operation can split one region: disconnected islands must NOT be
# treated as electrically joined merely because they came from one object.
split_polys=[];split_layers=[];split_objs=[]
for g,layer,obj in zip(polys,layers,objs):
 parts=[g] if g.geom_type=='Polygon' else list(g.geoms)
 for part in parts:
  if part.is_empty or part.area<1e-12:continue
  assert part.geom_type=='Polygon',part.geom_type
  split_polys.append(part);split_layers.append(layer);split_objs.append(obj)
polys,layers,objs=split_polys,split_layers,split_objs
print('Gerber objects',len(polys))
cu=DSU();tree=STRtree(polys)
for i,g in enumerate(polys):
 cu.root(i)
 for j in tree.query(g.buffer(0.000002)):
  if layers[i]==layers[j] and g.distance(polys[j])<0.000002:cu.join(i,int(j))
# Join top and bottom only at plated holes explicitly present in drill file.
for line in (P/'drill-L1-L2.drl').read_text().splitlines():
 if m:=re.match(r'X(-?[\d.]+)Y(-?[\d.]+)',line):
  pt=Point(float(m[1]),float(m[2]));a=[int(j) for j in tree.query(pt.buffer(.001)) if polys[j].distance(pt)<.001]
  for j in a:cu.join(a[0],j)
missing_ports=[]
actual=collections.defaultdict(set);expected=collections.defaultdict(set);ports_by_cu=collections.defaultdict(list)
for p in d:
 if p['type']!='pcb_port':continue
 sid=p['source_port_id'];pt=Point(p['x'],p['y']);a=[int(j) for j in tree.query(pt.buffer(.001)) if layers[j] in p['layers'] and polys[j].distance(pt)<.001]
 if not a:missing_ports.append(names[sid]);print('NO COPPER',names[sid]);continue
 r=cu.root(a[0]);n=net.root(sid);actual[r].add(n);expected[n].add(r);ports_by_cu[r].append(names[sid])
shorts={r:n for r,n in actual.items() if len(n)>1}
opens={n:r for n,r in expected.items() if len(r)>1}
print('SHORTS',len(shorts))
for r,n in shorts.items():print('SHORT',ports_by_cu[r])
print('OPENS',len(opens))
for n,r in opens.items():print('OPEN',netnames.get(n,n),[ports_by_cu[v] for v in r])
for p in d:
 if p['type']=='pcb_port' and sc.get(sp[p['source_port_id']]['source_component_id'])=='J3':
  sid=p['source_port_id'];print('J3 NET',names[sid],netnames.get(net.root(sid),''),[names[k] for k in sp if net.root(k)==net.root(sid)])
# Distances between different physical copper networks.
near=[]
for i,g in enumerate(polys):
 for j in tree.query(g.buffer(.15)):
  j=int(j)
  if j<=i or layers[i]!=layers[j] or cu.root(i)==cu.root(j):continue
  distance=g.distance(polys[j])
  if distance<.149:near.append((distance,i,j))
print('Clearances <0.149 mm',len(near))
for dist,i,j in sorted(near)[:15]:print(round(dist,6),layers[i],polys[i].centroid.coords[:],polys[j].centroid.coords[:],ports_by_cu[cu.root(i)][:3],ports_by_cu[cu.root(j)][:3])
# Annulus nominal
print('via drill sizes',collections.Counter((x.get('outer_diameter'),x.get('hole_diameter')) for x in d if x['type']=='pcb_via'))
# Board edge and nonplated hole copper clearances, based on actual geometry.
board=next(x for x in d if x['type']=='pcb_board')
if board.get('outline'):
 board_shape=Polygon([(p['x'],p['y']) for p in board['outline']])
else:
 cx,cy=board['center']['x'],board['center']['y']
 board_shape=box(cx-board['width']/2,cy-board['height']/2,cx+board['width']/2,cy+board['height']/2)
assert board_shape.is_valid, 'Invalid board outline'
boundary=board_shape.boundary
outside_copper=[i for i,g in enumerate(polys) if g.difference(board_shape.buffer(.000002)).area>1e-8]
print('Copper objects outside board',len(outside_copper))
edges=[(g.distance(boundary),i) for i,g in enumerate(polys)]
print('Minimum copper/board edge clearance',min(edges))
for h in d:
 if h['type']=='pcb_hole':
  center=h.get('x'),h.get('y');hole=Point(*center).buffer(h['hole_diameter']/2) if 'hole_diameter' in h else Point(*center).buffer(h['diameter']/2)
  near=sorted((g.distance(hole),i) for i,g in enumerate(polys))[:1];print('NPTH copper clearance',center,near)
vs=[x for x in d if x['type']=='pcb_via'];ds=[]
for i,a in enumerate(vs):
 for b in vs[i+1:]:ds.append((math.hypot(a['x']-b['x'],a['y']-b['y'])-(a['hole_diameter']+b['hole_diameter'])/2,a['pcb_via_id'],b['pcb_via_id']))
print('Min via hole edge spacing',min(ds))

# Check via drill clearance to copper on a different net.
vc=[]
for v in vs:
 pt=Point(v['x'],v['y']);owners=[int(i) for i in tree.query(pt) if polys[i].distance(pt)<.000002]
 roots={cu.root(i) for i in owners}
 hole=pt.buffer(v['hole_diameter']/2,quad_segs=32)
 for i in tree.query(hole.buffer(.2)):
  i=int(i)
  if cu.root(i) not in roots and hole.distance(polys[i])<.1999:vc.append((hole.distance(polys[i]),v['pcb_via_id'],i,(v['x'],v['y']),layers[i],ports_by_cu[cu.root(i)][:2]))
print('Via hole to foreign copper <.2 mm',len(vc))
for x in sorted(vc)[:8]:print(x)
trackvc=[a for a in vc if type(objs[a[2]]).__name__=='Line']
print('Confirmed via hole to foreign TRACK violations',len(trackvc))
for a in sorted(trackvc)[:6]:print(a,objs[a[2]])

# Nonzero exit makes this usable as a manufacturing build gate.
min_copper=min(
    (g.distance(polys[int(j)]) for i,g in enumerate(polys)
     for j in tree.query(g.buffer(.101))
     if int(j)>i and layers[i]==layers[int(j)] and cu.root(i)!=cu.root(int(j))),default=.101)
npth_min=min((g.distance(Point(h['x'],h['y']).buffer(h.get('hole_diameter',h.get('diameter'))/2))
    for h in d if h['type']=='pcb_hole' for g in polys),default=1)
summary=dict(outside_copper_objects=len(outside_copper),shorts=len(shorts),opens=len(opens),missing_ports=missing_ports,
    via_to_foreign_copper_violations=len(vc),via_to_track_violations=len(trackvc),
    min_copper_clearance_mm=min_copper,min_npth_clearance_mm=npth_min,
    min_board_edge_clearance_mm=min(edges)[0],min_via_hole_spacing_mm=min(ds)[0])
print('CHECK SUMMARY',json.dumps(summary))
if outside_copper or shorts or opens or missing_ports or vc or min_copper<.0999 or npth_min<.1999 or min(edges)[0]<.1999 or min(ds)[0]<.1999:
    sys.exit(1)

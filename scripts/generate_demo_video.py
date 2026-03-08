from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import random

W,H = 1280,720
CELL=8
GW,GH=120,72
FRAMES=300
OUT=Path('docs/media')
FR=OUT/'video_frames'
FR.mkdir(parents=True, exist_ok=True)

try:
    f_title=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',54)
    f_head=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',34)
    f_body=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',24)
except:
    f_title=f_head=f_body=ImageFont.load_default()

def step(alive):
    n={}
    for x,y in alive:
        for yy in range(y-1,y+2):
            for xx in range(x-1,x+2):
                if xx==x and yy==y: continue
                n[(xx,yy)] = n.get((xx,yy),0)+1
    out=set()
    for c,k in n.items():
        if (k==3) or (k==2 and c in alive):
            if 0<=c[0]<GW and 0<=c[1]<GH:
                out.add(c)
    return out

# seed with dramatic scene
alive=set()
random.seed(7)
for _ in range(500):
    alive.add((random.randint(8,GW-8), random.randint(8,GH-8)))
# glider gun-ish seeds mirrored
base=[(1,5),(2,5),(1,6),(2,6),(11,5),(11,6),(11,7),(12,4),(12,8),(13,3),(13,9),(14,3),(14,9),(15,6),(16,4),(16,8),(17,5),(17,6),(17,7),(18,6),(21,3),(21,4),(21,5),(22,3),(22,4),(22,5),(23,2),(23,6),(25,1),(25,2),(25,6),(25,7),(35,3),(35,4),(36,3),(36,4)]
for dx,dy in base:
    alive.add((dx+8,dy+10)); alive.add((GW-dx-9, GH-dy-11))

captions=[
    (0,70,'AUTOMATA ARCADE','A playful engineering lab for Conway\'s Game of Life'),
    (70,135,'Drag Machine Prefabs','Gliders, guns, seeds, eaters, oscillators'),
    (135,200,'Wire Emergent Circuits','Route moving signals through space-time logic'),
    (200,255,'Arcade Missions','Complete objectives with score and combo multipliers'),
    (255,300,'Built for Learning','Perfect for demos, classrooms, and curious builders')
]

for i in range(FRAMES):
    img=Image.new('RGB',(W,H),(7,16,28))
    d=ImageDraw.Draw(img)
    for y in range(0,H,2):
        d.line((0,y,W,y), fill=(8,20 + int(30*y/H),38))
    ox,oy=120,115
    # board backdrop
    d.rounded_rectangle((ox-10, oy-10, ox+GW*CELL+10, oy+GH*CELL+10), radius=16, fill=(10,24,36), outline=(65,105,130), width=2)
    # grid
    for x in range(GW+1):
        d.line((ox+x*CELL, oy, ox+x*CELL, oy+GH*CELL), fill=(22,42,56))
    for y in range(GH+1):
        d.line((ox, oy+y*CELL, ox+GW*CELL, oy+y*CELL), fill=(22,42,56))
    for x,y in alive:
        px,py=ox+x*CELL, oy+y*CELL
        d.rectangle((px+1,py+1,px+CELL-1,py+CELL-1), fill=(91,224,188))

    # HUD
    d.rounded_rectangle((30,24,1248,92), radius=16, fill=(14,35,52), outline=(82,132,160), width=2)
    d.text((52,38),'Automata Arcade Demo',font=f_head, fill=(242,184,75))
    d.text((740,44),f'Generation {i*3:03d}   Population {len(alive):04d}',font=f_body,fill=(220,243,255))

    # side cards
    d.rounded_rectangle((1015,120,1248,675), radius=16, fill=(17,41,58), outline=(90,140,170), width=2)
    d.text((1035,145),'Palette', font=f_head, fill=(91,224,188))
    for j,t in enumerate(['Glider','LWSS','Gosper Gun','Eater-1','Pulse Seed','Clock Seed']):
        yy=190+j*62
        d.rounded_rectangle((1032,yy,1230,yy+48), radius=10, fill=(23,55,77), outline=(99,150,184), width=2)
        d.text((1048,yy+12),t,font=f_body,fill=(230,245,255))

    # captions timeline
    for a,b,title,sub in captions:
        if a <= i < b:
            d.rounded_rectangle((38,610,992,700), radius=14, fill=(15,38,55), outline=(92,146,176), width=2)
            d.text((60,628),title,font=f_title,fill=(242,184,75))
            d.text((62,676),sub,font=f_body,fill=(226,243,255))
            break

    img.save(FR/f'frame_{i:04d}.png')
    # faster evolution for motion
    for _ in range(3):
        alive = step(alive)

print('frames generated', FRAMES)

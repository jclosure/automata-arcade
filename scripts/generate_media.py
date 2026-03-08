from PIL import Image, ImageDraw, ImageFont
import random
from pathlib import Path
W,H=1200,675
CELL=8
GW,GH=120,70
OUT=Path('docs/media'); OUT.mkdir(parents=True,exist_ok=True)
alive=set(); random.seed(4)
for _ in range(700): alive.add((random.randint(10,GW-10), random.randint(8,GH-8)))
for dx,dy in [(1,5),(2,5),(1,6),(2,6),(11,5),(11,6),(11,7),(12,4),(12,8),(13,3),(13,9),(14,3),(14,9),(15,6),(16,4),(16,8),(17,5),(17,6),(17,7),(18,6),(21,3),(21,4),(21,5),(22,3),(22,4),(22,5),(23,2),(23,6),(25,1),(25,2),(25,6),(25,7),(35,3),(35,4),(36,3),(36,4)]:
    alive.add((dx+10,dy+10)); alive.add((GW-dx-10,GH-dy-10))
def step(al):
    nbr={}
    for x,y in al:
        for yy in range(y-1,y+2):
            for xx in range(x-1,x+2):
                if xx==x and yy==y: continue
                nbr[(xx,yy)] = nbr.get((xx,yy),0)+1
    out=set()
    for c,n in nbr.items():
        if n==3 or (n==2 and c in al):
            if 0<=c[0]<GW and 0<=c[1]<GH: out.add(c)
    return out
try:
    font_big=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',58)
    font_mid=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',28)
    font_sm=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',20)
except: font_big=font_mid=font_sm=ImageFont.load_default()
frames=[]; state=set(alive)
for i in range(36):
    img=Image.new('RGB',(W,H),(8,18,30)); d=ImageDraw.Draw(img)
    for y in range(0,H,3):
        c=20+int(20*(y/H)); d.line((0,y,W,y),fill=(8,c,40))
    ox,oy=120,120
    for x in range(GW+1): d.line((ox+x*CELL,oy,ox+x*CELL,oy+GH*CELL),fill=(24,45,60))
    for y in range(GH+1): d.line((ox,oy+y*CELL,ox+GW*CELL,oy+y*CELL),fill=(24,45,60))
    for x,y in state:
        px,py=ox+x*CELL,oy+y*CELL
        d.rectangle((px+1,py+1,px+CELL-1,py+CELL-1),fill=(91,224,188))
    d.rounded_rectangle((40,30,1160,100),radius=18,fill=(15,38,55),outline=(90,140,170),width=2)
    d.text((60,44),'AUTOMATA ARCADE',font=font_big,fill=(242,184,75))
    d.text((650,52),f'Generation: {i*4:03d}   Population: {len(state):04d}',font=font_mid,fill=(218,246,255))
    d.rounded_rectangle((40,605,1160,655),radius=14,fill=(15,38,55),outline=(90,140,170),width=2)
    d.text((60,620),'Drag prefabs, route gliders, solve arcade objectives. Sandbox + missions + machine palette.',font=font_sm,fill=(220,240,255))
    frames.append(img)
    for _ in range(4): state=step(state)
frames[0].save(OUT/'hero.gif',save_all=True,append_images=frames[1:],duration=90,loop=0)
frames[12].save(OUT/'hero-still.png')
info=Image.new('RGB',(1200,700),(10,22,34)); d=ImageDraw.Draw(info)
d.rounded_rectangle((30,30,1170,670),radius=20,fill=(18,42,60),outline=(95,145,175),width=3)
d.text((60,60),'What is Automata Arcade?',font=font_big,fill=(242,184,75))
for y,t in enumerate([
"• Learn Conway's Game of Life by building real signal machinery",
'• Use draggable prefabs: gliders, LWSS, guns, eaters, seeds, oscillators',
'• Play arcade missions: hit receptors, keep cores alive, trigger switch logic',
'• Great for teaching emergence, computation, and systems thinking'
]): d.text((80,160+y*90),t,font=font_mid,fill=(220,240,255))
info.save(OUT/'what-is-it.png')
feat=Image.new('RGB',(1200,700),(12,25,38)); d=ImageDraw.Draw(feat)
d.text((60,50),'Feature Highlights',font=font_big,fill=(242,184,75))
boxes=[('Sandbox Physics','Pan/zoom, paint, step, speed controls'),('Machine Palette','Drop prefabs with rotate/flip'),('Arcade Challenges','5 levels, score, combos, fail states'),('Offline + Deployable','Vanilla app, ready for Vercel')]
for i,(a,b) in enumerate(boxes):
    x=70+(i%2)*560; y=150+(i//2)*240
    d.rounded_rectangle((x,y,x+500,y+180),radius=18,fill=(20,50,72),outline=(100,155,190),width=3)
    d.text((x+20,y+24),a,font=font_mid,fill=(91,224,188))
    d.text((x+20,y+90),b,font=font_sm,fill=(230,245,255))
feat.save(OUT/'feature-highlights.png')
print('generated media')

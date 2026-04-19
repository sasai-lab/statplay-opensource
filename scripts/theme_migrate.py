#!/usr/bin/env python3
"""Migrate Canvas modules to use themeColors() instead of hardcoded hex colors."""
import re, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(p):
    with open(os.path.join(BASE, p), "r", encoding="utf-8") as f:
        return f.read()

def write(p, c):
    with open(os.path.join(BASE, p), "w", encoding="utf-8", newline="\n") as f:
        f.write(c)

# 1. Update imports
mods = [
    "js/modules/stdnorm.js", "js/modules/clt.js", "js/modules/lln.js",
    "js/modules/normal.js", "js/modules/ci.js", "js/modules/htest.js",
    "js/modules/errs.js", "js/modules/dist.js", "js/modules/reg.js",
    "js/modules/mreg.js", "js/modules/bayes.js", "js/modules/hero.js",
]
for mod in mods:
    c = read(mod)
    m = re.search(r"import \{([^}]+)\} from '([^']+utils\.js)';", c)
    if m and "themeColors" not in m.group(1):
        imp = m.group(1).rstrip() + ", themeColors, withAlpha"
        ni = "import {" + imp + "} from '" + m.group(2) + "';"
        c = c[:m.start()] + ni + c[m.end():]
        write(mod, c)
        print("  import: " + mod)

c = read("js/modules/morep.js")
if "themeColors" not in c:
    c = c.replace(
        "import { $, TAU, resizeCanvas, drawGrid, neonLine, neonFill, normPDF, binomPMF, poissonPMF, expPDF } from '../utils.js';",
        "import { $, TAU, resizeCanvas, drawGrid, neonLine, neonFill, normPDF, binomPMF, poissonPMF, expPDF, themeColors, withAlpha } from '../utils.js';",
    )
    write("js/modules/morep.js", c)
    print("  import: morep")
print("Imports done")


# 2. Add tc=themeColors() + color replacements
def mig(path, repls):
    c = read(path)
    if "const tc=themeColors()" not in c:
        c = c.replace("drawGrid(ctx,w,h);", "drawGrid(ctx,w,h);const tc=themeColors();")
        c = c.replace("drawGrid(ctx, w, h);", "drawGrid(ctx, w, h);const tc=themeColors();")
    for o, n in repls:
        c = c.replace(o, n)
    write(path, c)
    print("  mig: " + path)


mig("js/modules/stdnorm.js", [
    ("neonFill(ctx,pts,'#00f3ff',.35)", "neonFill(ctx,pts,tc.cyan,.35)"),
    ("neonFill(ctx,ps,'#ff2bd6',.35)", "neonFill(ctx,ps,tc.magenta,.35)"),
    ("neonLine(ctx,curve,'#00f3ff',14,2.5)", "neonLine(ctx,curve,tc.cyan,14,2.5)"),
    ("ctx.strokeStyle='rgba(0,243,255,.35)'", "ctx.strokeStyle=withAlpha(tc.cyan,.35)"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
    ("ctx.strokeStyle='rgba(255,230,0,.8)'", "ctx.strokeStyle=withAlpha(tc.yellow,.8)"),
    ("ctx.fillStyle='#ffe600'", "ctx.fillStyle=tc.yellow"),
    ("ctx.fillStyle='#00f3ff'", "ctx.fillStyle=tc.cyan"),
    ("neonLine(ctx,ghost,'#ff2bd6',10,1.5)", "neonLine(ctx,ghost,tc.magenta,10,1.5)"),
    ("const color=tt>.9?'#ff2bd6':'#00f3ff'", "const color=tt>.9?tc.magenta:tc.cyan"),
    ("ctx.strokeStyle='rgba(255,230,0,.7)'", "ctx.strokeStyle=withAlpha(tc.yellow,.7)"),
])
mig("js/modules/lln.js", [
    ("ctx.strokeStyle='rgba(255,230,0,.7)'", "ctx.strokeStyle=withAlpha(tc.yellow,.7)"),
    ("ctx.fillStyle='#ffe600'", "ctx.fillStyle=tc.yellow"),
    ("neonLine(ctx,pts,'#00f3ff',10,2)", "neonLine(ctx,pts,tc.cyan,10,2)"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
])
mig("js/modules/normal.js", [
    ("ctx.strokeStyle='rgba(0,243,255,.35)'", "ctx.strokeStyle=withAlpha(tc.cyan,.35)"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
    ("neonFill(ctx,pts,'#ff2bd6',.35)", "neonFill(ctx,pts,tc.magenta,.35)"),
    ("neonLine(ctx,curve,'#00f3ff',14,2.5)", "neonLine(ctx,curve,tc.cyan,14,2.5)"),
    ("ctx.strokeStyle='rgba(255,230,0,.7)'", "ctx.strokeStyle=withAlpha(tc.yellow,.7)"),
    ("ctx.fillStyle='#ffe600'", "ctx.fillStyle=tc.yellow"),
    ("ctx.fillStyle='#00f3ff'", "ctx.fillStyle=tc.cyan"),
    ("ctx.strokeStyle=`rgba(139,92,255,${.6-k*.15})`", "ctx.strokeStyle=withAlpha(tc.purple,.6-k*.15)"),
])
mig("js/modules/ci.js", [
    ("ctx.strokeStyle='rgba(255,230,0,.8)'", "ctx.strokeStyle=withAlpha(tc.yellow,.8)"),
    ("ctx.fillStyle='#ffe600'", "ctx.fillStyle=tc.yellow"),
    ("const color=hit?'#00f3ff':'#ff2bd6'", "const color=hit?tc.cyan:tc.magenta"),
])
mig("js/modules/htest.js", [
    ("neonFill(ctx,pts,'#ff2bd6',.35)", "neonFill(ctx,pts,tc.magenta,.35)"),
    ("neonLine(ctx,curve,'#00f3ff',14,2.5)", "neonLine(ctx,curve,tc.cyan,14,2.5)"),
    ("ctx.strokeStyle='rgba(255,230,0,.8)'", "ctx.strokeStyle=withAlpha(tc.yellow,.8)"),
    ("ctx.strokeStyle='#00ff9c'", "ctx.strokeStyle=tc.green"),
    ("ctx.shadowColor='#00ff9c'", "ctx.shadowColor=tc.green"),
    ("ctx.fillStyle='#00ff9c'", "ctx.fillStyle=tc.green"),
    ("neonFill(ctx,pp,'#ff8c00',.25)", "neonFill(ctx,pp,tc.orange,.25)"),
    ("ctx.fillStyle='#ff8c00'", "ctx.fillStyle=tc.orange"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
])
mig("js/modules/errs.js", [
    ("neonFill(ctx,betaPts,'#8b5cff',.4)", "neonFill(ctx,betaPts,tc.purple,.4)"),
    ("neonFill(ctx,aPts,'#ff2bd6',.45)", "neonFill(ctx,aPts,tc.magenta,.45)"),
    ("neonFill(ctx,pPts,'#00ff9c',.3)", "neonFill(ctx,pPts,tc.green,.3)"),
    ("neonLine(ctx,h0,'#00f3ff',14,2.5)", "neonLine(ctx,h0,tc.cyan,14,2.5)"),
    ("neonLine(ctx,h1,'#8b5cff',14,2.5)", "neonLine(ctx,h1,tc.purple,14,2.5)"),
    ("ctx.strokeStyle='rgba(255,230,0,.8)'", "ctx.strokeStyle=withAlpha(tc.yellow,.8)"),
    ("ctx.fillStyle='#ffe600'", "ctx.fillStyle=tc.yellow"),
    ("ctx.fillStyle='#00f3ff'", "ctx.fillStyle=tc.cyan"),
    ("ctx.fillStyle='#8b5cff'", "ctx.fillStyle=tc.purple"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
])
mig("js/modules/reg.js", [
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
    ("neonLine(ctx,[[0,b0],[w,b0+b1*w]],'#00f3ff',14,2.5)", "neonLine(ctx,[[0,b0],[w,b0+b1*w]],tc.cyan,14,2.5)"),
    ("ctx.strokeStyle='rgba(0,255,156,.6)'", "ctx.strokeStyle=withAlpha(tc.green,.6)"),
    ("ctx.fillStyle=`rgba(255,43,214,${alpha})`", "ctx.fillStyle=withAlpha(tc.magenta,alpha)"),
    ("ctx.shadowColor='#ff2bd6'", "ctx.shadowColor=tc.magenta"),
])
mig("js/modules/mreg.js", [
    ("ctx.strokeStyle='rgba(255,43,214,.45)'", "ctx.strokeStyle=withAlpha(tc.magenta,.45)"),
    ("ctx.strokeStyle=res>=0?'rgba(0,255,156,.7)':'rgba(255,43,214,.7)'", "ctx.strokeStyle=res>=0?withAlpha(tc.green,.7):withAlpha(tc.magenta,.7)"),
    ("ctx.fillStyle='#00f3ff'", "ctx.fillStyle=tc.cyan"),
    ("ctx.shadowColor='#00f3ff'", "ctx.shadowColor=tc.cyan"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
    ("[[-2.5,0,0],[2.5,0,0],'#00f3ff','x1']", "[[-2.5,0,0],[2.5,0,0],tc.cyan,'x1']"),
    ("[[0,-2.5,0],[0,2.5,0],'#ff2bd6','y']", "[[0,-2.5,0],[0,2.5,0],tc.magenta,'y']"),
    ("[[0,0,-2.5],[0,0,2.5],'#ffe600','x2']", "[[0,0,-2.5],[0,0,2.5],tc.yellow,'x2']"),
])
mig("js/modules/clt.js", [
    ("ctx.strokeStyle='rgba(0,243,255,.25)'", "ctx.strokeStyle=withAlpha(tc.cyan,.25)"),
    ("ctx.fillStyle='#d8f7ff'", "ctx.fillStyle=tc.text"),
    ("g.addColorStop(1,'rgba(255,43,214,.25)')", "g.addColorStop(1,withAlpha(tc.magenta,.25))"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
    ("ctx.fillStyle='#ffe600'", "ctx.fillStyle=tc.yellow"),
    ("'rgba(255,43,214,.85)', '#ff2bd6'", "withAlpha(tc.magenta,.85), tc.magenta"),
    ("'rgba(0,243,255,.9)', '#ffe600'", "withAlpha(tc.cyan,.9), tc.yellow"),
])
mig("js/modules/dist.js", [
    ("ctx.strokeStyle='rgba(0,243,255,.3)'", "ctx.strokeStyle=withAlpha(tc.cyan,.3)"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
    ("neonLine(ctx,nPts,'#8b5cff',8,1.5)", "neonLine(ctx,nPts,tc.purple,8,1.5)"),
    ("neonLine(ctx,tPts,'#00f3ff',14,2.5)", "neonLine(ctx,tPts,tc.cyan,14,2.5)"),
    ("ctx.fillStyle='#00f3ff'", "ctx.fillStyle=tc.cyan"),
    ("ctx.fillStyle='#8b5cff'", "ctx.fillStyle=tc.purple"),
    ("ctx.fillStyle='#ffe600'", "ctx.fillStyle=tc.yellow"),
    ("neonFill(ctx,fill,'#ff2bd6',.18)", "neonFill(ctx,fill,tc.magenta,.18)"),
    ("neonLine(ctx,pts,'#ff2bd6',14,2.5)", "neonLine(ctx,pts,tc.magenta,14,2.5)"),
    ("ctx.strokeStyle='rgba(255,230,0,.75)'", "ctx.strokeStyle=withAlpha(tc.yellow,.75)"),
    ("ctx.strokeStyle='rgba(0,243,255,.55)'", "ctx.strokeStyle=withAlpha(tc.cyan,.55)"),
    ("neonLine(ctx,nPts,'#8b5cff',8,1.6)", "neonLine(ctx,nPts,tc.purple,8,1.6)"),
    ("ctx.fillStyle='#ff2bd6'", "ctx.fillStyle=tc.magenta"),
    ("neonFill(ctx,fill,'#ffe600',.18)", "neonFill(ctx,fill,tc.yellow,.18)"),
    ("neonLine(ctx,pts,'#ffe600',14,2.5)", "neonLine(ctx,pts,tc.yellow,14,2.5)"),
    ("ctx.strokeStyle='rgba(0,243,255,.7)'", "ctx.strokeStyle=withAlpha(tc.cyan,.7)"),
    ("ctx.strokeStyle='rgba(255,43,214,.5)'", "ctx.strokeStyle=withAlpha(tc.magenta,.5)"),
])
mig("js/modules/morep.js", [
    ("ctx.fillStyle = 'rgba(0,243,255,.28)'", "ctx.fillStyle = withAlpha(tc.cyan,.28)"),
    ("ctx.strokeStyle = '#00f3ff'", "ctx.strokeStyle = tc.cyan"),
    ("ctx.strokeStyle = '#ff2bd6'", "ctx.strokeStyle = tc.magenta"),
    ("ctx.fillStyle = '#ff2bd6'", "ctx.fillStyle = tc.magenta"),
    ("ctx.fillStyle = 'rgba(255,255,255,.25)'", "ctx.fillStyle = tc.dim"),
    ("ctx.fillStyle = 'rgba(255,230,0,.28)'", "ctx.fillStyle = withAlpha(tc.yellow,.28)"),
    ("ctx.strokeStyle = '#ffe600'", "ctx.strokeStyle = tc.yellow"),
    ("neonLine(ctx, pts, '#00f3ff', 10, 1.5)", "neonLine(ctx, pts, tc.cyan, 10, 1.5)"),
    ("ctx.fillStyle = '#ffe600'", "ctx.fillStyle = tc.yellow"),
    ("neonFill(ctx, pts, '#ff2bd6', 0.22)", "neonFill(ctx, pts, tc.magenta, 0.22)"),
    ("neonLine(ctx, pts, '#ff2bd6', 12, 2)", "neonLine(ctx, pts, tc.magenta, 12, 2)"),
    ("ctx.strokeStyle = '#00f3ff'", "ctx.strokeStyle = tc.cyan"),
    ("ctx.fillStyle = '#00f3ff'", "ctx.fillStyle = tc.cyan"),
])
mig("js/modules/bayes.js", [
    ("ctx.fillStyle='rgba(0,243,255,.06)'", "ctx.fillStyle=withAlpha(tc.cyan,.06)"),
    ("ctx.fillStyle='rgba(139,92,255,.06)'", "ctx.fillStyle=withAlpha(tc.purple,.06)"),
    ("ctx.fillStyle='rgba(255,43,214,.08)'", "ctx.fillStyle=withAlpha(tc.magenta,.08)"),
    ("ctx.fillStyle='rgba(122,138,166,.05)'", "ctx.fillStyle=withAlpha(tc.dim,.05)"),
    ("ctx.fillStyle='#ffe600'", "ctx.fillStyle=tc.yellow"),
    ("ctx.fillStyle='#00f3ff'", "ctx.fillStyle=tc.cyan"),
    ("ctx.fillStyle='#7a8aa6'", "ctx.fillStyle=tc.dim"),
    ("drawDots(ctx,dotArea(rects.TP),Math.round(TP),'#00f3ff')", "drawDots(ctx,dotArea(rects.TP),Math.round(TP),tc.cyan)"),
    ("drawDots(ctx,dotArea(rects.FN),Math.round(FN),'#8b5cff')", "drawDots(ctx,dotArea(rects.FN),Math.round(FN),tc.purple)"),
    ("drawDots(ctx,dotArea(rects.FP),Math.round(FP),'#ff2bd6')", "drawDots(ctx,dotArea(rects.FP),Math.round(FP),tc.magenta)"),
    ("drawDots(ctx,dotArea(rects.TN),Math.round(TN),'rgba(122,138,166,.7)')", "drawDots(ctx,dotArea(rects.TN),Math.round(TN),withAlpha(tc.dim,.7))"),
    ("zoneBox(ctx,rects.TP,'rgba(0,243,255,.9)',", "zoneBox(ctx,rects.TP,withAlpha(tc.cyan,.9),"),
    ("zoneBox(ctx,rects.FN,'rgba(139,92,255,.9)',", "zoneBox(ctx,rects.FN,withAlpha(tc.purple,.9),"),
    ("zoneBox(ctx,rects.FP,'rgba(255,43,214,.9)',", "zoneBox(ctx,rects.FP,withAlpha(tc.magenta,.9),"),
    ("zoneBox(ctx,rects.TN,'rgba(122,138,166,.9)',", "zoneBox(ctx,rects.TN,withAlpha(tc.dim,.9),"),
    ("ctx.strokeStyle='rgba(255,230,0,.5)'", "ctx.strokeStyle=withAlpha(tc.yellow,.5)"),
    ("ctx.fillStyle='rgba(5,6,15,.72)'", "ctx.fillStyle=withAlpha('#050610',.72)"),
    ("ctx.strokeStyle='rgba(0,243,255,.12)'", "ctx.strokeStyle=withAlpha(tc.cyan,.12)"),
    ("ctx.fillStyle='#d8f7ff'", "ctx.fillStyle=tc.text"),
])

# hero - uses themeColors() directly (no draw/grid pattern)
c = read("js/modules/hero.js")
hr = [
    ("col:'#00f3ff'", "col:themeColors().cyan"),
    ("return [x,y,'#00f3ff']", "return [x,y,themeColors().cyan]"),
    ("return [x,y,'#ffe600']", "return [x,y,themeColors().yellow]"),
    ("const col=i%9===0?'#ff2bd6':'#8b5cff'", "const col=i%9===0?themeColors().magenta:themeColors().purple"),
    ("const col=(i<20)?'#00f3ff':(i<30)?'#ff2bd6':'rgba(122,138,166,0.6)'", "const col=(i<20)?themeColors().cyan:(i<30)?themeColors().magenta:withAlpha(themeColors().dim,0.6)"),
    ("const col=captured?'rgba(0,243,255,0.9)':'#ff2bd6'", "const col=captured?withAlpha(themeColors().cyan,0.9):themeColors().magenta"),
    ("ctx.fillStyle=`rgba(139,92,255,${f.op*fFade})`", "ctx.fillStyle=withAlpha(themeColors().purple,f.op*fFade)"),
    ("ctx.strokeStyle=`rgba(0,243,255,${alpha})`", "ctx.strokeStyle=withAlpha(themeColors().cyan,alpha)"),
]
for o, n in hr:
    c = c.replace(o, n)
write("js/modules/hero.js", c)
print("  mig: hero.js")

print("\nAll modules migrated!")

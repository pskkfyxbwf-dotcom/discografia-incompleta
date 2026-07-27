#!/usr/bin/env python3
"""
Ensambla discografia-incompleta.html desde src/player.template.html + src/player.js
+ assets/fonts/*.b64 + assets/vendor/three.min.js

Uso: python3 build.py
Genera: build/discografia-incompleta.html
"""
import os
BASE = os.path.dirname(os.path.abspath(__file__))
fonts_dir = os.path.join(BASE, "assets/fonts")
photos_dir = os.path.join(BASE, "assets/photos")
vendor_dir = os.path.join(BASE, "assets/vendor")
src_dir = os.path.join(BASE, "src")
build_dir = os.path.join(BASE, "build")

def b64(name):
    with open(os.path.join(fonts_dir, name)) as f:
        return f.read().strip()

def b64p(name):
    with open(os.path.join(photos_dir, name)) as f:
        return f.read().strip()

font_css = f"""
@font-face{{font-family:'DotGothic16';font-style:normal;font-weight:400;font-display:swap;
src:url(data:font/woff2;base64,{b64('dotgothic16-400.b64')}) format('woff2');}}
@font-face{{font-family:'Big Shoulders Stencil';font-style:normal;font-weight:400 900;font-display:swap;
src:url(data:font/woff2;base64,{b64('big-shoulders-stencil-var.b64')}) format('woff2');}}
@font-face{{font-family:'Space Mono';font-style:normal;font-weight:400;font-display:swap;
src:url(data:font/woff2;base64,{b64('space-mono-400.b64')}) format('woff2');}}
@font-face{{font-family:'Space Mono';font-style:normal;font-weight:700;font-display:swap;
src:url(data:font/woff2;base64,{b64('space-mono-700.b64')}) format('woff2');}}
"""

photos_css = f"""--img-guitar:url(data:image/png;base64,{b64p('out_guitar.b64')});
  --img-turntable:url(data:image/jpeg;base64,{b64p('out_turntable.b64')});
  --img-headphones:url(data:image/jpeg;base64,{b64p('out_headphones.b64')});
  --img-vinyl:url(data:image/jpeg;base64,{b64p('out_vinyl.b64')});
  --img-cassette:url(data:image/jpeg;base64,{b64p('out_cassette.b64')});"""

with open(os.path.join(vendor_dir, "three.min.js"), encoding="utf-8") as f:
    threejs = f.read()

with open(os.path.join(src_dir, "player.template.html"), encoding="utf-8") as f:
    html = f.read()
with open(os.path.join(src_dir, "player.js"), encoding="utf-8") as f:
    js = f.read()

html = html.replace("/*__FONTS__*/", font_css)
html = html.replace("/*__PHOTOS__*/", photos_css)
html = html.replace("/*__THREEJS__*/", threejs)
html = html.replace("/*__SCRIPT__*/", js)

out_path = os.path.join(build_dir, "discografia-incompleta.html")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(html)
print(f"OK: {out_path} ({len(html)} bytes)")

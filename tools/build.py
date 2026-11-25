#!/usr/bin/env python3
"""Inline three.js r180 + src/*.js into ONE html file.
  python3 tools/build.py                         -> every module            -> dist/pelican-market-3d.html
  python3 tools/build.py --studio NAME a.js b.js -> core + named modules    -> dist/studio-NAME.html   (core = 00..16, 80, 90)
A module that fails `node --check` stops a studio build that asked for it; in the full build it is skipped with a warning.
"""
import glob, os, re, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(ROOT, "src"); V = os.path.join(ROOT, "vendor")
a = sys.argv[1:]; studio = a[1] if a and a[0] == "--studio" else None; names = a[2:] if studio else None
CORE = ["00_i18n.js", "00_util.js", "02_sdf.js", "04_sculpt.js", "06_score.js", "08_look.js", "10_sky.js", "16_path.js", "80_post.js", "90_main.js"]
OUT = os.path.join(ROOT, "dist", f"studio-{studio}.html" if studio else "pelican-market-3d.html")
core = open(os.path.join(V, "three.core.min.js"), encoding="utf-8").read(); mod = open(os.path.join(V, "three.module.min.js"), encoding="utf-8").read()
def pairs(body):
    out = []
    for it in body.split(","):
        it = it.strip()
        if not it: continue
        if " as " in it: x, y = [q.strip() for q in it.split(" as ")]; out.append((x, y))
        else: out.append((it, it))
    return out
mc = re.search(r'export\s*\{([^}]*)\}\s*;?\s*$', core.strip()); core_body = core.strip()[:mc.start()]; core_exports = pairs(mc.group(1))
mi = re.search(r'import\s*\{([^}]*)\}\s*from\s*"\./three\.core\.min\.js"\s*;?', mod); imports = pairs(mi.group(1))
reexp = re.search(r'export\s*\{([^}]*)\}\s*from\s*"\./three\.core\.min\.js"\s*;?', mod)
mod_body = mod.replace(mi.group(0), "", 1)
if reexp: mod_body = mod_body.replace(reexp.group(0), "", 1)
mo = re.search(r'export\s*\{([^}]*)\}\s*;?\s*$', mod_body.strip()); own = pairs(mo.group(1)); mod_body = mod_body.strip()[:mo.start()]
reexported = [n for _, n in pairs(reexp.group(1))] if reexp else []
three = ("var THREE=(function(){'use strict';var __core=(function(){'use strict';" + core_body + ";return{" + ",".join(f"{n}:{l}" for l, n in core_exports) + "};})();" +
  "var __mod=(function(__core){'use strict';var{" + ",".join(f"{n}:{l}" for n, l in imports) + "}=__core;" + mod_body +
  ";return{" + ",".join([f"{n}:__core.{n}" for n in reexported] + [f"{n}:{l}" for l, n in own]) + "};})(__core);return Object.freeze(Object.assign({},__core,__mod));})();")
files = sorted(glob.glob(os.path.join(SRC, "*.js")))
if studio: files = [f for f in files if os.path.basename(f) in CORE or any(os.path.basename(f).startswith(n.replace(".js", "")) for n in names)]
app = []
for f in files:
    src = open(f, encoding="utf-8").read(); assert "</script" not in src.lower(), f
    r = subprocess.run(["node", "--check", f], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"SYNTAX ERROR in {os.path.basename(f)}:\n{r.stderr.strip()[:900]}")
        if studio or os.path.basename(f) in CORE: sys.exit(1)
        print("  -> skipped"); continue
    app.append(f"// ===== {os.path.basename(f)} =====\n" + src.replace("'use strict';", "", 1))
joined = "'use strict';\n" + "\n".join(app)
with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".js", delete=False) as tf: tf.write(joined)
r = subprocess.run(["node", "--check", tf.name], capture_output=True, text=True); os.unlink(tf.name)
if r.returncode != 0: print("SYNTAX ERROR in the joined app (same top-level name in two modules?):\n" + r.stderr.strip()[:1500]); sys.exit(1)
out = open(os.path.join(SRC, "shell.html"), encoding="utf-8").read().replace("{{THREE}}", three).replace("{{APP}}", joined)
os.makedirs(os.path.dirname(OUT), exist_ok=True); tmp = OUT + f".{os.getpid()}.tmp"; open(tmp, "w", encoding="utf-8").write(out); os.replace(tmp, OUT)
print(f"built {os.path.relpath(OUT, ROOT)} {len(out)/1024:.0f} KB ({len(app)} modules)")

"""Embed the shared feature sources in the offline game and server engine."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
here=Path(__file__).resolve().parent
for target in ('index.html','kozin-online/full-v3/engine.cjs'):
 p=root/target;s=p.read_text()
 start='// BEGIN NEW HEROES\n';end='// END NEW HEROES\n'
 if start in s:s=s[:s.index(start)]+s[s.index(end)+len(end):]
 code=(here/'powers.js').read_text()
 if target=='index.html':code+='\n'+(here/'render.js').read_text()
 anchor='const assets=new AssetStore();' if target=='index.html' else 'module.exports={RunnerGame'
 s=s.replace(anchor,start+code+'\n'+end+anchor)
 p.write_text(s)

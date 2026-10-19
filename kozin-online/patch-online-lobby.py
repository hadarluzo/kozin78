from pathlib import Path
import subprocess

p = Path('index.html')
source = p.read_text(encoding='utf-8')
original = "dom('lobbyOnline').onclick=()=>{location.href=new URL('online.html',location.href).href;};"
updated = "dom('lobbyOnline').onclick=()=>{location.href=new URL('online.html?enter=1',location.href).href;};"
sha = subprocess.check_output(['git', 'hash-object', str(p)], text=True).strip()
expected = 'cbb3a3ef85d4b0563d2a0625c89c0567118714cb'
assert sha == expected, f'Game changed since verification: {sha}; refusing to overwrite'
assert source.count(original) == 1, 'Online lobby link not found exactly once'
assert source.count("button('lobbyOnline'") == 1, 'Online lobby button changed'
p.write_text(source.replace(original, updated, 1), encoding='utf-8')
print('Online button opens multiplayer only on explicit click; original startup remains untouched.')

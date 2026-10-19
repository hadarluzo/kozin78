from pathlib import Path
import subprocess
p=Path('index.html')
source=p.read_text(encoding='utf-8')
if "dom('lobbyOnline')" in source:
    print('Online lobby button already present, no changes.')
    raise SystemExit(0)
expected='a225a0ca221925f2e42ac327cfab58240a8f3fe6'
actual=subprocess.check_output(['git','hash-object',str(p)],text=True).strip()
assert actual == expected, f'Unexpected main game version {actual}; refusing to change.'
replacements=[
 ('.prem-bottom{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))', '.prem-bottom{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))'),
 ("    ${button('lobbyPlayers','players','שחקנים','דמויות וכוחות')}", "    ${button('lobbyPlayers','players','שחקנים','דמויות וכוחות')}\n    ${button('lobbyOnline','players','אונליין','שחק עם חבר בחדר פרטי')}"),
 ("  dom('lobbyPlayers').onclick=()=>showPlayers();", "  dom('lobbyPlayers').onclick=()=>showPlayers();\n  dom('lobbyOnline').onclick=()=>{location.href=new URL('online.html',location.href).href;};")
]
for old,new in replacements:
    assert source.count(old)==1, f'Expected exactly one occurrence of {old!r}, found {source.count(old)}'
    source=source.replace(old,new,1)
p.write_text(source,encoding='utf-8')
print('Online lobby button added without modifying save code or gameplay')

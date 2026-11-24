s = open('../m55a/gen.mjs').read()
s = s.replace('m55a', 'm57a').replace('m54c', 'm55a')
old = "the special implants of the implant row are picked from a list (Root, Straumann, zygoma, nasal, pterygoid) and each is priced with its own tariff."
assert old in s
s = s.replace(old, "All on X may be Korean too; SMS line in the PDF of a patient who wants to think; the consultant keeps several patients open.")
a = "  h = rep(h, NL + '</body>', NL + '<script>' + JS + '</script>' + NL + '</body>', 'JS');\n"
assert a in s
new = a + """  h = rep(h, `(x.price==='aox'?'<p class="note">فقط برند ایتالیایی.</p>':'')`, `(x.price==='aox'?'<p class="note">برند ایتالیایی یا کره‌ای.</p>':'')`, 'aox note');
  h = rep(h, "const g=IMPSID==='aox'?'it':(", "const g=IMPSID==='aox'?(SURG.rec.brand==='ko'?'ko':'it'):(", 'surgery aox default brand');
  h = rep(h, "((sid || 'imp') !== 'aox' || c.g === 'it')", "((sid || 'imp') !== 'aox' || c.g === 'it' || c.g === 'ko')", 'surgery aox last brand');
  h = rep(h, "try{(window.M48PB||[]).forEach(b=>blocks.push(b))}catch(e){}", "try{(window.M48PB||[]).forEach(b=>blocks.push(b))}catch(e){}try{(window.M57PB||[]).forEach(b=>blocks.push(b))}catch(e){}", 'pdf sms block');
"""
s = s.replace(a, new)
open('gen.mjs', 'w').write(s)
print('ok')

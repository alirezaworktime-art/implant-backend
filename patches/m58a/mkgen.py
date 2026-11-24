s = open('../m57a/gen.mjs').read()
s = s.replace("'---------- m57a ('", "'---------- m58a ('").replace("'already m57a'", "'already m58a'")
s = s.replace("'---------- m55a ('", "'---------- m57a ('").replace("'needs the m55a bundle'", "'needs the m57a bundle'")
s = s.replace('patch-m57a', 'patch-m58a').replace("'m57a patched ok'", "'m58a patched ok'")
s = s.replace('Input: the m55a bundle', 'Input: the m57a bundle')
s = s.replace("(owner, 2026-11-18): All on X may be Korean too; SMS line in the PDF of a patient who wants to think; the consultant keeps several patients open.",
              "(owner, 2026-11-20): prosthesis card — «کار امروز» (file + PDF) and «سفارش لابراتوار» are two separate buttons.")
i = s.index("  h = rep(h, \">فقط برند")
j = s.index("  return h;\n}", i)
s = s[:i] + '''  h = rep(h, "if(s.work){if(!LO)loInit(j);let lf=''", "if(false){if(!LO)loInit(j);let lf=''", 'l5 no lab form');
  h = rep(h, "const A=[];if(s.work)A.push(", "const A=[];if(false)A.push(", 'l5 one button');
  h = rep(h, "L5.res='';if(L5.work&&!LO)loInit(PF.j);", "L5.res='';", 'l5 chip no lab');
  h = rep(h, "if(L5.work&&!LO)loInit(PF.j);renderFile();try{", "LO=null;renderFile();try{", 'l5 open no lab');
''' + s[j:]
assert 'm57a' not in s.replace("'---------- m57a ('", '').replace("'needs the m57a bundle'", '').replace('Input: the m57a bundle', ''), [l for l in s.split('\n') if 'm57a' in l]
open('gen.mjs', 'w').write(s)
print('ok')

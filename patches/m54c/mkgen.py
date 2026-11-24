s = open('gen.mjs').read()
a = "  h = rep(h, \"K.push(['تسویه اختلاف',QITEMS.filter(x=>x.settle==='pending').length,'bad']);\", \"\", 'consultant kpi settle');\n"
assert a in s
s = s.replace(a, '')
old = "patients waiting for the settlement of a surgery cost difference are reception's work, not the consultant's."
assert old in s
s = s.replace(old, "the extra fields of m54a are taken away (patient extras, medical alerts, cheque owner / warranty / satisfaction, surgery extras); closing a file stays.")
open('gen.mjs', 'w').write(s)
print('ok')

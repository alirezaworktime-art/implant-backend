s = open('../m52a/gen.mjs').read()
s = s.replace('m52a', 'm54b').replace('m51a', 'm54a')
a = s.index("  h = rep(h, \"...q('reviewing')")
b = s.index("  h = rep(h, NL + '</body>'")
new = "  h = rep(h, \"K.push(['تسویه اختلاف',QITEMS.filter(x=>x.settle==='pending').length,'bad']);\", \"\", 'consultant kpi settle');\n"
s = s[:a] + new + s[b:]
old = "after surgery the two parts are settled separately and the cash discount is only on the surgery part; «منتظر پزشک» until the plan is sent; plan count in the doctor's archive."
assert old in s
s = s.replace(old, "patients waiting for the settlement of a surgery cost difference are reception's work, not the consultant's.")
open('gen.mjs', 'w').write(s)
print('gen written')

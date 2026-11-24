s = open('gen.mjs').read()
old = "the extra fields of m54a are taken away (patient extras, medical alerts, cheque owner / warranty / satisfaction, surgery extras); closing a file stays."
assert old in s
s = s.replace(old, "the special implants of the implant row are picked from a list (Root, Straumann, zygoma, nasal, pterygoid) and each is priced with its own tariff.")
open('gen.mjs', 'w').write(s)
print('ok')

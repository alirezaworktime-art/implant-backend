s = open('../m55a/gen.mjs').read()
s = s.replace('m55a', 'm56a').replace('m54c', 'm55a')
old = "the special implants of the implant row are picked from a list (Root, Straumann, zygoma, nasal, pterygoid) and each is priced with its own tariff."
assert old in s
s = s.replace(old, "tariffs of the clinics Baseri and University (our fee, «انجام کار» only); fixtures and special surgeries counted from the special rows of the implant card.")
open('gen.mjs', 'w').write(s)
print('ok')

import base64,json,re
G='/home/claude/gh/'
A={}
html=open(G+'index.html').read()
a="const CF_URL='https://implant-api.implant-yazd.workers.dev/'; //"
assert a in html
html=html.replace(a,"const CF_URL=(location.protocol.startsWith('http')?location.origin:'https://implant-api.implant-yazd.workers.dev')+'/'; //")
A['/']=('text/html; charset=utf-8',html,0)
A['/manifest.webmanifest']=('application/manifest+json; charset=utf-8',open(G+'manifest.webmanifest').read().replace('#17624f','#075a62'),0)
sw=open(G+'sw.js').read().replace(r"/\/implant-plan\/(index\.html)?$/",r"/\/(index\.html)?$/")
assert r"/\/(index\.html)?$/" in sw
A['/sw.js']=('text/javascript; charset=utf-8',sw,0)
A['/p']=('text/html; charset=utf-8',open(G+'p.html').read(),0)
A['/probe']=('text/html; charset=utf-8',open(G+'probe.html').read(),0)
for f in ['icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png']:A['/'+f]=('image/png',base64.b64encode(open(G+f,'rb').read()).decode(),1)
A['/implant-plan.apk']=('application/vnd.android.package-archive',base64.b64encode(open(G+'implant-plan.apk','rb').read()).decode(),1)
A['/index.html']=A['/']
open('assets.js','w').write('const ASSETS='+json.dumps({k:{'t':v[0],'d':v[1],'b':v[2]} for k,v in A.items()},ensure_ascii=False)+';\n')
print('ok',sum(len(v[1]) for v in A.values()))

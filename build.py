# Собирает index.html и 404.html из src/ (app.html + parser.js + sets.js + i18n.js)
a=open('src/app.html',encoding='utf-8').read()
for k,f in (('/*PARSER*/','parser.js'),('/*SETS*/','sets.js'),('/*I18N*/','i18n.js')):
    a=a.replace(k,open('src/'+f,encoding='utf-8').read())
for out in ('index.html','404.html'): open(out,'w',encoding='utf-8').write(a)
print('built',len(a))

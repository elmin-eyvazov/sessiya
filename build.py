# Собирает index.html и 404.html из src/ (app.html + tools.js + board.js + parser.js + sets.js + i18n.js),
# а также статические SEO-страницы банков t/<id>.html, t/index.html и sitemap.xml.
import json, os, html, shutil, datetime

BASE = 'https://elmin-eyvazov.github.io/sessiya/'   # при переезде на свой домен поменять здесь

a = open('src/app.html', encoding='utf-8').read()
for k, f in (('/*TOOLSJS*/', 'tools.js'), ('/*BOARDJS*/', 'board.js'), ('/*PARSER*/', 'parser.js'), ('/*SETS*/', 'sets.js'), ('/*I18N*/', 'i18n.js')):
    a = a.replace(k, open('src/' + f, encoding='utf-8').read())
for out in ('index.html', '404.html'):
    open(out, 'w', encoding='utf-8').write(a)
print('built', len(a))

# ---------- SEO pages ----------
E = lambda s: html.escape(str(s or ''), quote=True)
L = {
    'az': dict(tq='test sualları və cavabları', wq='imtahan sualları və cavabları', start='▶ Testi interaktiv həll et', startw='▶ Kartlar və biletlərlə öyrən',
               answer='Cavabı göstər', n='{} sual', all='Bütün banklar', home='Sessiya+ ana səhifə', idx_t='Test bankları və imtahan sualları',
               idx_d='Azərbaycan universitetləri üçün test bankları və imtahan sualları: məşq, imtahan rejimi, kartlar və biletlər.',
               desc='{subj}: {n} {kind}. Onlayn məşq et, imtahan rejimində yoxla, səhvlər üzərində işlə — pulsuz, Sessiya+.',
               foot='Suallar Sessiya+ tərəfindən tərtib olunub. Səhv görsəniz, saytda “Xəta bildir” düyməsindən istifadə edin.'),
    'ru': dict(tq='тестовые вопросы и ответы', wq='экзаменационные вопросы и ответы', start='▶ Решить тест интерактивно', startw='▶ Учить по карточкам и билетам',
               answer='Показать ответ', n='{} вопросов', all='Все банки', home='Главная Sessiya+', idx_t='Тестовые банки и экзаменационные вопросы',
               idx_d='Тестовые банки и вопросы к экзаменам для студентов вузов Азербайджана.',
               desc='{subj}: {n} {kind}. Тренируйся онлайн, проверь себя в режиме экзамена — бесплатно, Sessiya+.',
               foot='Вопросы составлены Sessiya+. Нашли ошибку — сообщите на сайте.'),
}
CSS = """body{margin:0;font-family:Inter,system-ui,sans-serif;background:#f4f5f7;color:#16181d;line-height:1.5}
.w{max-width:780px;margin:0 auto;padding:18px 16px 60px}a{color:#2f5bea}
.logo{font-weight:800;font-size:22px;text-decoration:none;color:#16181d}.logo b{color:#2f5bea}
.crumb{font-size:13px;color:#6b7280;margin:14px 0 4px}h1{font-size:26px;margin:4px 0 8px;letter-spacing:-.02em}
.btn{display:inline-block;background:#2f5bea;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:12px;margin:8px 0 18px}
.q{background:#fff;border:1px solid #e3e6eb;border-radius:14px;padding:14px 16px;margin-bottom:10px}
.q h2{font-size:16px;margin:0 0 8px}.q ol{margin:0;padding-left:22px}.q li.ok{color:#16a34a;font-weight:700}
details summary{cursor:pointer;color:#2f5bea;font-size:14px;margin-top:6px}details p{margin:6px 0 0;white-space:pre-line}
.muted{color:#6b7280;font-size:14px}ul.l li{margin:6px 0}"""

def page(lang, title, desc, url, body):
    return f"""<!DOCTYPE html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)}</title><meta name="description" content="{E(desc)}"><link rel="canonical" href="{url}">
<meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:url" content="{url}"><meta property="og:type" content="website">
<style>{CSS}</style></head><body><div class="w"><a class="logo" href="../">Sessiya<b>+</b></a>
{body}</div></body></html>"""

cat = json.load(open('data/catalog.json', encoding='utf-8'))
shutil.rmtree('t', ignore_errors=True); os.makedirs('t')
today = datetime.date.today().isoformat()
urls = [BASE, BASE + 't/']
items = []
for m in cat['banks']:
    if m.get('hidden'): continue
    p = f"data/banks/{m['id']}.json"
    if not os.path.exists(p): continue
    qs = json.load(open(p, encoding='utf-8'))['qs']
    lang = m.get('lang') if m.get('lang') in L else 'az'; T = L[lang]
    W = m.get('type') == 'written'
    kind = T['wq'] if W else T['tq']
    subj = m.get('subj') or m['name']
    title = f"{subj} — {kind} ({len(qs)}) | Sessiya+"
    desc = T['desc'].format(subj=subj, n=len(qs), kind=kind)
    url = f"{BASE}t/{m['id']}.html"
    qh = []
    for i, x in enumerate(qs, 1):
        if W:
            qh.append(f'<div class="q"><h2>{i}. {E(x["q"])}</h2><details><summary>{T["answer"]}</summary><p>{E(x.get("ans"))}</p></details></div>')
        else:
            lis = ''.join(f'<li>{E(o)}</li>' for o in x['o'])
            qh.append(f'<div class="q"><h2>{i}. {E(x["q"])}</h2><ol type="A">{lis}</ol><details><summary>{T["answer"]}</summary><p>{"ABCDEFGH"[x["a"]]}) {E(x["o"][x["a"]])}</p></details></div>')
    body = (f'<div class="crumb"><a href="../">{T["home"]}</a> › <a href="./">{T["all"]}</a> › {E(m.get("uniLabel"))} › {E(m.get("fac"))}</div>'
            f'<h1>{E(m["name"])}</h1><div class="muted">{T["n"].format(len(qs))} · {E(subj)}</div>'
            f'<a class="btn" href="../#b-{m["id"]}">{T["startw"] if W else T["start"]}</a>' + ''.join(qh) +
            f'<a class="btn" href="../#b-{m["id"]}">{T["startw"] if W else T["start"]}</a><p class="muted">{T["foot"]}</p>')
    open(f"t/{m['id']}.html", 'w', encoding='utf-8').write(page(lang, title, desc, url, body))
    urls.append(url); items.append((m, len(qs)))

groups = {}
for m, n in items:
    groups.setdefault((m.get('uniLabel') or m.get('uni'), m.get('fac') or ''), []).append((m, n))
ib = f'<h1>{L["az"]["idx_t"]}</h1><p class="muted">{L["az"]["idx_d"]}</p><a class="btn" href="../#catalog">Kataloqu aç</a>'
for (u, f), lst in groups.items():
    ib += f'<h2 style="font-size:18px;margin:18px 0 4px">{E(u)} · {E(f)}</h2><ul class="l">' + ''.join(
        f'<li><a href="{m["id"]}.html">{E(m["name"])}</a> <span class="muted">({n})</span></li>' for m, n in lst) + '</ul>'
open('t/index.html', 'w', encoding='utf-8').write(page('az', L['az']['idx_t'] + ' | Sessiya+', L['az']['idx_d'], BASE + 't/', ib))

open('sitemap.xml', 'w', encoding='utf-8').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'<url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
open('robots.txt', 'w', encoding='utf-8').write(f'User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n')
print('seo pages', len(items))

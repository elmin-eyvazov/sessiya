# Sessiya+

Interaktiv test platforması: universitet test banklarını (PDF/DOCX/TXT) brauzerdə testə çevirir. Dillər: AZ / RU / EN.

- Sayt: https://elmin-eyvazov.github.io/sessiya/
- Alətlər (`#tools`): bal kalkulyatoru (50+50, imtahanda min. 17), ÜOMG kalkulyatoru, imtahan təqvimi (geri sayım), Pomodoro taymer
- Əsas səhifədə irəliləyiş: ardıcıl günlər, bu gün həll edilən suallar, növbəti imtahan; bankda sual axtarışı; nəticəni paylaşmaq
- Elanlar lövhəsi (`#board`): otaq yoldaşı / mənzil, kitab və əşyalar, repetitorlar, iş, itirilmiş. Baza: Firebase Firestore (`src/board.js` → `FB_CONFIG`, qaydalar: `firestore.rules`). Konfiqsiz test: `?demo#board`
- `src/` — mənbə kodu (`app.html`, `tools.js`, `board.js`, `parser.js`, `sets.js`, `i18n.js`); `python3 build.py` → `index.html`
- `data/catalog.json` — kataloq (vuz → fakültə → fənn), `data/banks/<id>.json` — suallar
- SEO: `build.py` hər bank üçün statik səhifə `t/<id>.html`, siyahı `t/index.html` və `sitemap.xml` yaradır (`BASE` — saytın ünvanı, domen alınanda dəyişdirilməli)

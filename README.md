# Sessiya+

Interaktiv test platforması: universitet test banklarını (PDF/DOCX/TXT) brauzerdə testə çevirir. Dillər: AZ / RU / EN.

- Sayt: https://elmin-eyvazov.github.io/sessiya/
- Alətlər (`#tools`): bal kalkulyatoru (50+50, imtahanda min. 17), ÜOMG kalkulyatoru, imtahan təqvimi (geri sayım), Pomodoro taymer
- Əsas səhifədə irəliləyiş: ardıcıl günlər, bu gün həll edilən suallar, növbəti imtahan; bankda sual axtarışı; nəticəni paylaşmaq
- `src/` — mənbə kodu (`app.html`, `tools.js`, `parser.js`, `sets.js`, `i18n.js`); `python3 build.py` → `index.html`
- `data/catalog.json` — kataloq (vuz → fakültə → fənn), `data/banks/<id>.json` — suallar

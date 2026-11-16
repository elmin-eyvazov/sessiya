# Sessiya+

Azərbaycan tələbələri üçün platforma: imtahan testləri və kartlar, otaq yoldaşı / mənzil və digər elanlar, tələbə alətləri. Dillər: AZ / RU / EN.

- Sayt: https://elmin-eyvazov.github.io/sessiya/ · Android tətbiqi (APK): `app/sessiya.apk`
- Giriş məcburidir: Google (One Tap), e-poçt + şifrə; telefon (SMS) — `FB_PHONE` (Blaze planı lazımdır)
- Bölmələr: Əsas · Testlər (Kataloq / Mənim banklarım / Yüklə) · Elanlar · Alətlər · Profil

## Struktur
- `src/app.html` — interfeys və əsas məntiq; `src/auth.js` — Firebase, giriş ekranı (Gate), profil, sinxronizasiya;
  `src/board.js` — elanlar; `src/tools.js` — alətlər; `src/parser.js` — fayl təhlili; `src/sets.js` — hazır mini testlər; `src/i18n.js` — mətnlər
- `python3 build.py` → `index.html`, `404.html`, SEO səhifələri `t/<id>.html`, `t/index.html`, `sitemap.xml` (`BASE` — saytın ünvanı)
- `data/catalog.json` + `data/banks/<id>.json` — daxili banklar; yeni bank: `tools/add_bank.py`
- Tələbələrin bankları və elanlar: Firebase Firestore (`banks`, `bankdata/{id}/parts`, `ads`, `users`, `reports`), qaydalar: `firestore.rules`
- Moderatorlar (`ADMIN_EMAILS` — `src/auth.js` və `firestore.rules`): istənilən bankı gizlədə, istənilən elanı silə bilər
- Firebase layihəsi: `sessiya-23601` (quraşdırma: `FIREBASE_SETUP.md`); ikonlar və OG şəkli: `tools/make_icons.py`

## Domen alınanda
1. `build.py` → `BASE`; 2. Firebase → Authentication → Settings → Authorized domains; 3. Google Cloud → Auth Platform → Clients → Web client → Authorized JavaScript origins;
4. `.well-known/assetlinks.json` domen kökündə olmalıdır (Android tətbiqində ünvan sətri görünməsin).

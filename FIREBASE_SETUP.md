# Подключение Firebase: вход (Google / почта / телефон) + доска объявлений (~10 минут, бесплатно)

1. Открой https://console.firebase.google.com → **Create a project** → название `sessiya` → Google Analytics выключи → **Create**.
2. **Build → Authentication → Get started → Sign-in method**, включи:
   - **Google** → включи, выбери свою почту в «Project support email» → **Save**;
   - **Email/Password** → включи только первый переключатель → **Save**;
   - **Anonymous** → включи → **Save**.
   - (позже, по желанию) **Phone** — работает только на тарифе Blaze (нужна карта; первые 10 SMS в день бесплатно).
3. Там же вкладка **Settings → Authorized domains → Add domain** → `elmin-eyvazov.github.io` (когда купишь домен — добавь и его).
4. **Build → Firestore Database → Create database** → регион **Europe (eur3)** → режим **production**.
5. Вкладка **Rules** → удали всё → вставь текст из
   https://raw.githubusercontent.com/elmin-eyvazov/sessiya/main/firestore.rules → **Publish**.
6. Шестерёнка → **Project settings** → внизу «Your apps» → значок **`</>`** (Web) → любое имя → **Register** →
   скопируй блок `firebaseConfig = { ... }` и пришли его Claude в чат.

Блок `firebaseConfig` не секретный — его можно отправлять.
Claude вставит его в `src/auth.js` (`const FB_CONFIG=...`) — и заработают вход в «Профиле» и доска объявлений.
Вход по телефону включается флагом `FB_PHONE=true` в `src/auth.js` после перехода на Blaze.

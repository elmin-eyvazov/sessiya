# Подключение базы для доски объявлений (Firebase, бесплатно, ~5 минут)

1. Открой https://console.firebase.google.com → **Create a project** → название `sessiya` → Google Analytics выключи → **Create**.
2. Слева **Build → Authentication** → **Get started** → вкладка **Sign-in method** → **Anonymous** → включи → **Save**.
3. **Build → Firestore Database** → **Create database** → регион **Europe (eur3)** → режим **production**.
4. Там же вкладка **Rules** → удали всё → вставь текст из файла
   https://raw.githubusercontent.com/elmin-eyvazov/sessiya/main/firestore.rules → **Publish**.
5. Шестерёнка → **Project settings** → внизу «Your apps» → значок **`</>`** (Web) → любое имя → **Register** →
   скопируй блок `firebaseConfig = { ... }` и пришли его Claude в чат.

Блок `firebaseConfig` не секретный — его можно отправлять.
После этого Claude вставит его в `src/board.js` (`const FB_CONFIG=...`) — и доска заработает у всех.

Проверить доску без базы: https://elmin-eyvazov.github.io/sessiya/?demo#board

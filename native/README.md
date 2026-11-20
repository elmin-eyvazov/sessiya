# Sessiya+ — приложение для iPhone (App Store) и Android (Google Play)

Это Capacitor-обёртка над сайтом: тот же код (`index.html`), но как настоящее приложение из магазина.

## Что нужно
- **iOS:** Mac с Xcode 16+, аккаунт Apple Developer ($99 в год), Node.js 20+.
- **Android (Google Play):** Android Studio, аккаунт Google Play Console ($25 один раз). Готовый APK для сайта уже лежит в `app/sessiya.apk`.

## Сборка
```bash
cd native
npm install
npx cap add ios        # один раз (для Android: npx cap add android)
npm run ios            # копирует сайт в www, синхронизирует и открывает Xcode
```
В Xcode: Signing & Capabilities → выбрать свою команду (Team) → Product → Archive → Distribute App → App Store Connect.

Иконку 1024×1024 взять из `icons/icon-512.png` (увеличить) или сгенерировать: `npx @capacitor/assets generate --iconBackgroundColor '#2f5bea'`.

## Важно для проверки Apple
- **Вход через Google** в WebView приложения Google блокирует. В приложении работают вход по почте и гостевой режим; для Google нужен плагин `@capacitor-firebase/authentication` (нативный вход). Apple также требует **«Sign in with Apple»**, если есть вход через Google — добавить вместе с плагином.
- Apple отклоняет «просто сайт в обёртке» (Guideline 4.2). У нас есть офлайн-банки, тесты, карточки, ИИ, дуэли, достижения — это нативная ценность; в описании для ревью перечислить эти функции.
- Нужна ссылка на политику конфиденциальности (раздел «О сайте») и кнопка удаления аккаунта (есть в профиле).
- Для ревьюера дать тестовый e-mail и пароль в App Store Connect → App Review Information.

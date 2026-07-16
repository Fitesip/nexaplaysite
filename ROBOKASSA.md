# Настройка Robokassa

## 1. Переменные окружения

Добавьте в `.env`:

```env
ROBOKASSA_MERCHANT_LOGIN=YOUR_ROBOKASSA_STORE_LOGIN
ROBOKASSA_PASSWORD_1=YOUR_ROBOKASSA_PASSWORD_1
ROBOKASSA_PASSWORD_2=YOUR_ROBOKASSA_PASSWORD_2
ROBOKASSA_HASH_ALGORITHM=md5
ROBOKASSA_TEST_MODE=true
ROBOKASSA_PAYMENT_URL=https://auth.robokassa.ru/Merchant/Payment/Index
```

- `ROBOKASSA_MERCHANT_LOGIN` — идентификатор магазина в Robokassa.
- `ROBOKASSA_PASSWORD_1` — пароль №1 из технических настроек.
- `ROBOKASSA_PASSWORD_2` — пароль №2 из технических настроек.
- `ROBOKASSA_HASH_ALGORITHM` — алгоритм подписи из настроек магазина: `md5`, `sha256` или `sha512`.
- `ROBOKASSA_TEST_MODE=true` добавляет `IsTest=1`. После успешной проверки и активации магазина установите `false`.
- Пароли в `.env` должны совпадать с паролями для выбранного режима (тестового или рабочего) в кабинете Robokassa.

## 2. URL в технических настройках Robokassa

Замените `https://example.com` на публичный HTTPS-домен сайта:

| Настройка | URL | Рекомендуемый метод |
| --- | --- | --- |
| Result URL | `https://example.com/api/payments/robokassa/result` | `POST` |
| Success URL | `https://example.com/api/payments/robokassa/success` | `GET` |
| Fail URL | `https://example.com/api/payments/robokassa/fail` | `GET` |

Все три обработчика принимают и `GET`, и `POST`, поэтому метод можно изменить в кабинете без доработки сайта. Для Result URL рекомендуется `POST`: это серверное подтверждение оплаты, по которому заказ выдаётся пользователю. Success/Fail URL только возвращают браузер пользователя на сайт.

## 3. Миграция

Перед запуском примените:

```text
sql/migration_robokassa.sql
```

Миграция добавляет статус `pending`, токен платежа, время оплаты и снимки параметров выдачи товара.

## 4. Логика оплаты

1. Сайт проверяет корзину, резервирует остаток и использование промокода, создаёт заказ со статусом `pending`.
2. Браузер перенаправляется на Robokassa.
3. Robokassa отправляет подписанный запрос на Result URL.
4. Сайт проверяет подпись, сумму и токен заказа.
5. Только после проверки заказ получает статус `completed`, пользователю выдаются товары/кейсы, а рефереру начисляется вознаграждение.
6. При временно недоступном RCON Result URL отвечает ошибкой, заказ остаётся `pending`, а Robokassa может повторить уведомление без двойной выдачи.

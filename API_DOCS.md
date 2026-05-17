# SyncFlow Restaurant — API Documentation


---

## Содержание

1. [Общее](#1-общее)
2. [Аутентификация](#2-аутентификация)
3. [Клиент](#3-клиент)
4. [Официант](#4-официант)
5. [Повар](#5-повар)
6. [Менеджер смены](#6-менеджер-смены)
7. [Управляющий](#7-управляющий)
8. [Уведомления](#8-уведомления)
9. [Справочник статусов](#9-справочник-статусов)
10. [Коды ошибок](#10-коды-ошибок)

---

## 1. Общее

**Base URL:** `http://186.246.5.94`

**Swagger:** `http://186.246.5.94/swagger-ui.html`

**Формат данных:** JSON (`Content-Type: application/json`)

**Авторизация:** все запросы, кроме `/api/*/auth/*`, `GET /api/menu/client` и `GET /api/menu/recommended`, требуют заголовок:
```
Authorization: Bearer <accessToken>
```

**Мультиресторанность:** сервер поддерживает несколько ресторанов. Если не передавать заголовок — используется ресторан по умолчанию (`restaurant1`). Для явного указания:
```
X-Restaurant-ID: restaurant1
```

**Форматы значений:**
| Тип | Формат | Пример |
|-----|--------|--------|
| Дата | `YYYY-MM-DD` | `"2026-05-06"` |
| Время | `HH:mm:ss` | `"18:00:00"` |
| Дата-время | ISO-8601 UTC | `"2026-05-06T15:30:00Z"` |
| Деньги | число с двумя знаками | `850.00` |

### Тестовые учётные данные

**Сотрудники** → `POST /api/employee/auth/login`

| Логин | Пароль | Роль |
|-------|--------|------|
| `ivanov_mgr` | `Admin@2024` | Управляющий |
| `petrova_shift` | `Manager@2024` | Менеджер смены |
| `sidorov_w` | `Waiter@123` | Официант |
| `kozlova_w` | `Waiter@456` | Официант |
| `novikov_cook` | `Cook@2024` | Повар |
| `morozova_cook` | `Cook@5678` | Повар |

**Гости** → `POST /api/guest/auth/login`

| Логин | Пароль |
|-------|--------|
| `smirnov_p` | `Guest@111` |
| `belova_o` | `Guest@222` |
| `tarasov_i` | `Guest@333` |
| `fedorova_s` | `Guest@444` |
| `romanov_a` | `Guest@555` |

---

## 2. Аутентификация

- [2.1 Вход сотрудника](#21-вход-сотрудника)
- [2.2 Регистрация клиента](#22-регистрация-клиента)
- [2.3 Вход клиента](#23-вход-клиента)
- [2.4 Обновление accessToken без пароля](#24-обновление-accesstoken-без-пароля)
- [2.5 Полное обновление обоих токенов](#25-полное-обновление-обоих-токенов)
- [2.6 Восстановление пароля клиента](#26-восстановление-пароля-клиента)

---

Две независимых цепочки: **сотрудники** и **гости (клиенты)**.

### 2.1 Вход сотрудника

```
POST /api/employee/auth/login
```
**Тело запроса:**
```json
{
  "login": "ivanov",
  "password": "secret"
}
```
**Ответ `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```
`accessToken` действует **30 минут**, `refreshToken` — **24 часа**.

### 2.2 Регистрация клиента

```
POST /api/guest/auth/register
```
**Тело запроса:**
```json
{
  "firstName": "Иван",
  "lastName": "Петров",
  "patronymic": "Сергеевич",
  "login": "ivan_p",
  "password": "mypassword",
  "phoneNumber": "+79991234567",
  "email": "ivan@example.com",
  "dateOfBirth": "1995-03-15"
}
```
> `patronymic`, `email`, `dateOfBirth`, `phoneNumber` — необязательные.

**Ответ `201`:** объект `GuestDTO`.

### 2.3 Вход клиента

```
POST /api/guest/auth/login
```
Тело и ответ — такие же, как у сотрудника (2.1).

### 2.4 Обновление accessToken без пароля

```
POST /api/employee/auth/token   (для сотрудника)
POST /api/guest/auth/token      (для клиента)
```
**Тело запроса:**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }
```
**Ответ `200`:**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiJ9...", "refreshToken": null }
```
> `refreshToken` обязателен — `null` или отсутствие поля вернёт `401`.  
> Уволенный сотрудник и удалённый гость получат `401` при попытке обновить токен.

### 2.5 Полное обновление обоих токенов

```
POST /api/employee/auth/refresh
POST /api/guest/auth/refresh
```
Тело то же, что в 2.4. Ответ — оба новых токена.  
> Те же ограничения: уволенный / удалённый пользователь → `401`.

### 2.6 Восстановление пароля клиента

Двухшаговый процесс. Авторизация не требуется.

#### Шаг 1 — запрос кода

```
POST /api/guest/auth/reset-password/request
```
**Тело запроса:**
```json
{ "email": "p.smirnov@mail.ru" }
```

**Ответ `200`:**
```json
{ "message": "Код отправлен на p.smirnov@mail.ru" }
```

На указанный email придёт письмо с 6-значным кодом. Код действителен **15 минут**.

> `404` — аккаунт с таким email не найден.  
> `409` — не удалось отправить письмо (проблема с SMTP).

---

#### Шаг 2 — подтверждение кода и смена пароля

```
POST /api/guest/auth/reset-password/confirm
```
**Тело запроса:**
```json
{
  "email": "p.smirnov@mail.ru",
  "code": "482910",
  "newPassword": "NewPass123"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `email` | String | Email аккаунта |
| `code` | String | 6-значный код из письма |
| `newPassword` | String | Новый пароль (минимум 6 символов) |

**Ответ `200`:**
```json
{ "message": "Пароль успешно обновлён" }
```

> `401` — неверный код, истёкший код или код уже использован.  
> `404` — аккаунт с таким email не найден.  
> `400` — нарушение формата (код не 6 символов, пароль короче 6).

После смены пароля нужно заново войти через `POST /api/guest/auth/login`.

---

## 3. Клиент

**Роль:** `CLIENT`

- [3.1 Просмотр меню](#31-просмотр-меню)
- [3.2 Рекомендуемые блюда](#32-рекомендуемые-блюда)
- [3.3 Состав блюда (ингредиенты)](#33-состав-блюда-ингредиенты)
- [3.4 Модификаторы блюда](#34-модификаторы-блюда)
- [3.5 Свободные столы для бронирования](#35-свободные-столы-для-бронирования)
- [3.6 Бронирование стола](#36-бронирование-стола)
- [3.7 Заказы (самовывоз)](#37-заказы-самовывоз)
- [3.8 Программа лояльности](#38-программа-лояльности)
- [3.9 Промокод](#39-промокод)
- [3.10 Избранное](#310-избранное)
- [3.11 Отзывы](#311-отзывы)
- [3.12 Профиль](#312-профиль)

---

### 3.1 Просмотр меню

Не требует авторизации — доступен всем.

```
GET /api/menu/client
```

**Параметры фильтрации и сортировки (все необязательные):**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `categoryId` | Long | Только блюда указанной категории |
| `name` | String | Поиск по названию блюда (содержит, без учёта регистра) |
| `minPrice` | Decimal | Минимальная цена |
| `maxPrice` | Decimal | Максимальная цена |
| `sortBy` | String | `totalDishPrice` или `dish.name` (по умолчанию `totalDishPrice`) |
| `sortDir` | String | `asc` / `desc` (по умолчанию `asc`) |

**Пример:** `GET /api/menu/client?categoryId=2&maxPrice=1000&sortBy=totalDishPrice&sortDir=asc`

**Ответ `200`:**
```json
[
  {
    "id": 1,
    "category": { "id": 2, "name": "Горячее", "extraChargePercentage": 10.00 },
    "dish": {
      "id": 5,
      "name": "Стейк рибай",
      "price": 1200.00,
      "description": "Сочный стейк из мраморной говядины",
      "netWeight": 300.00,
      "cookingTime": "00:25:00",
      "unit": { "id": 1, "name": "г" },
      "photoUrl": "https://storage.googleapis.com/syncflow/dishes/steak.jpg"
    },
    "totalDishPrice": 1320.00,
    "isAvailable": true,
    "availabilityHourFrom": null,
    "availabilityHourTo": null,
    "availabilityDateFrom": null,
    "availabilityDateTo": null
  }
]
```
> `totalDishPrice` — финальная цена с наценкой категории. Показывайте её клиенту.

### 3.2 Рекомендуемые блюда

Не требует авторизации. Возвращает топ блюд по частоте заказов. Если статистики ещё нет — возвращает самые доступные по цене.

```
GET /api/menu/recommended?limit=10
```

| Параметр | Тип | Описание |
|----------|-----|----------|
| `limit` | Int | Количество блюд (1–50, по умолчанию 10) |

**Ответ `200`:** список `DishInCategoryDTO` — тот же формат, что у `GET /api/menu/client`.

### 3.3 Состав блюда (ингредиенты)

```
GET /api/ingredient-in-dish/dish/{dishId}
Authorization: Bearer <token>
```

### 3.4 Модификаторы блюда

```
GET /api/modificator-in-dish/dish/{dishId}
Authorization: Bearer <token>
```

### 3.5 Свободные столы для бронирования

```
GET /api/tables/available?date=2026-05-10&from=19:00:00&to=21:00:00&seats=2
Authorization: Bearer <token>
```
> Доступен клиентам и сотрудникам с правом `tables:read` (официант, менеджер смены, управляющий).  
> Возвращает столы, у которых достаточно мест и нет пересечений по времени с существующими бронированиями.

> **Важно для разработчика:** в системе два независимых понятия статуса стола:
>
> | | `table.status` | `GET /tables/available` |
> |--|----------------|------------------------|
> | **Что это** | Ручная метка для карты зала | Умная проверка по времени |
> | **Кто обновляет** | Официант вручную | Считается автоматически из броней |
> | **Когда использовать** | Карта зала в реальном времени (кто сидит сейчас) | При создании бронирования |
> | **Учитывает время** | Нет | Да — проверяет пересечение часов |
>
> Пример: стол может быть `AVAILABLE` в 14:00 и при этом иметь бронь на 20:00 — `GET /tables/available?from=14:00&to=16:00` вернёт его как свободный, а `?from=19:00&to=21:00` — нет.

**Ответ `200`:**
```json
[
  { "id": 3, "seatCount": 4, "status": "AVAILABLE" },
  { "id": 5, "seatCount": 6, "status": "AVAILABLE" }
]
```

### 3.6 Бронирование стола

#### Создать бронирование
```
POST /api/reservations
Authorization: Bearer <token>
```
**Тело запроса:**
```json
{
  "table": { "id": 3 },
  "reservDate": "2026-05-10",
  "reservHourFrom": "19:00:00",
  "reservHourTo": "21:00:00",
  "guestName": "Иван Петров",
  "guestPhoneNumber": "+79991234567"
}
```
> Сервер проверяет пересечение по времени на том же столе. Если стол занят — `409`.  
> `reservDate` не может быть в прошлом, `reservHourFrom` должен быть раньше `reservHourTo` — иначе `409`.  
> **Клиент создаёт** → статус `CREATED`, все менеджеры смены получают уведомление.  
> **Сотрудник создаёт** → статус `RESERVED` сразу, гость получает уведомление о подтверждении.  
> Нельзя менять статус уже отменённого или завершённого бронирования — `409`.

**Ответ `200`:**
```json
{
  "id": 42,
  "table": { "id": 3, "seatCount": 4, "status": "AVAILABLE" },
  "status": "CREATED",
  "reservDate": "2026-05-10",
  "reservHourFrom": "19:00:00",
  "reservHourTo": "21:00:00",
  "guestName": "Иван Петров",
  "guestPhoneNumber": "+79991234567"
}
```

#### Предзаказ блюд к бронированию

Клиент может заранее указать блюда, которые должны быть готовы к его приходу.

**Просмотр предзаказа:**
```
GET /api/reservations/{id}/preorder
Authorization: Bearer <token>
```
**Ответ `200`:**
```json
[
  {
    "id": 1,
    "dishInCategoryId": 3,
    "dishName": "Стейк из говядины",
    "price": 1260.00,
    "photoUrl": null,
    "quantity": 1,
    "note": null
  },
  {
    "id": 2,
    "dishInCategoryId": 7,
    "dishName": "Тирамису",
    "price": 462.00,
    "photoUrl": null,
    "quantity": 2,
    "note": "побольше соуса"
  }
]
```

**Добавить блюдо в предзаказ:**
```
POST /api/reservations/{id}/preorder
Authorization: Bearer <token>
```
```json
{
  "dishInCategoryId": 3,
  "quantity": 2,
  "note": "без соли"
}
```
> `dishInCategoryId` — обязателен. `quantity` по умолчанию 1. `note` — необязателен.

**Ответ `201`:** объект `ReservationPreorderItemDTO` (см. пример выше).

**Удалить позицию из предзаказа:**
```
DELETE /api/reservations/{id}/preorder/{itemId}
Authorization: Bearer <token>
```
**Ответ `204`:** пустой.

#### Просмотр всех бронирований
```
GET /api/reservations
Authorization: Bearer <token>
```

#### Получить бронирование по ID
```
GET /api/reservations/{id}
Authorization: Bearer <token>
```

### 3.7 Заказы (самовывоз)

#### Создать заказ на самовывоз
```
POST /api/orders/my
Authorization: Bearer <token>
```
Тело запроса необязательно. Если передать список блюд — они будут добавлены в заказ сразу.  
> Блюда из стоп-листа (`isAvailable: false`) вернут `409` с именем блюда.  
> Если у гостя `discountPercentage > 0` — гостевая скидка применяется **автоматически** при создании заказа (видна в `GET /api/orders/{id}/summary`).

**Тело запроса (необязательное):**
```json
{
  "dishes": [
    {
      "dishInCategoryId": 3,
      "quantity": 1,
      "note": "без соли",
      "modificatorIds": [1, 2]
    },
    {
      "dishInCategoryId": 9,
      "quantity": 2
    }
  ]
}
```

| Поле | Тип | Обязательное | Описание |
|------|-----|-------------|----------|
| `dishInCategoryId` | Long | да | ID позиции из `GET /api/menu/client` |
| `quantity` | Int | нет (по умолч. 1) | Количество порций |
| `note` | String | нет | Комментарий повару |
| `modificatorIds` | Long[] | нет | ID модификаторов (из `GET /api/modificator-in-dish/dish/{id}`) |

**Ответ `200`:**
```json
{
  "id": 93,
  "dailyNumber": 3,
  "datetimeOrder": "2026-05-07T12:00:00Z",
  "status": "CREATED",
  "orderType": "TAKEAWAY",
  "guest": { "id": 7, "firstName": "Павел", "lastName": "Смирнов" },
  "employee": null,
  "table": null
}
```

После получения `id` заказа можно посмотреть добавленные блюда:
```
GET /api/orders/{orderId}/dishes
Authorization: Bearer <token>
```

#### История своих заказов
```
GET /api/orders/my
Authorization: Bearer <token>
```
**Ответ `200`:** список заказов, отсортированных по дате (новые первые).

#### Оплатить заказ
```
PATCH /api/orders/my/{id}/pay
Authorization: Bearer <token>
```
> Переводит заказ в статус `PAID`. При изменении статуса придёт push-уведомление.  
> **Автоматически:**
> - начисляет 5% от суммы заказа бонусами на счёт клиента
> - увеличивает `visitsCount` гостя на 1
> - пересчитывает `discountPercentage` по шкале лояльности (см. 3.8)

### 3.8 Программа лояльности

#### Шкала персональной скидки

`discountPercentage` пересчитывается автоматически при каждой оплате заказа:

| Кол-во посещений | Скидка |
|------------------|--------|
| 0–4  | 0% |
| 5–9  | 3% |
| 10–19 | 5% |
| 20+  | 10% |

Скидка применяется через специальную запись «Постоянный гость» в `POST /api/discounts/orders/{orderId}/apply/{discountId}`. При применении берётся актуальный `discountPercentage` гостя.

#### Баланс бонусов
```
GET /api/bonus/my/balance
Authorization: Bearer <token>
```
**Ответ `200`:** число — текущий баланс.
```json
350.00
```

#### История начислений и списаний
```
GET /api/bonus/my/transactions
Authorization: Bearer <token>
```
**Ответ `200`:**
```json
[
  {
    "id": 12,
    "guestId": 7,
    "type": "ACCRUAL",
    "amount": 66.00,
    "createdAt": "2026-05-06T14:22:00Z",
    "orderId": 88,
    "description": "Начислено 66.00 бонусов за заказ #88"
  }
]
```
> `type`: `ACCRUAL` — начисление, `SPENDING` — списание.  
> Бонусы начисляются автоматически при оплате заказа через `PATCH /api/orders/my/{id}/pay`.

#### Списать бонусы при оплате
```
POST /api/bonus/my/spend
Authorization: Bearer <token>
```
```json
{
  "amount": 100.00,
  "orderId": 91
}
```
> Если бонусов недостаточно — `409 Conflict`.

### 3.9 Промокод

Проверить промокод **до создания заказа** — узнать размер скидки без её применения.

```
POST /api/guest/promo/check
Authorization: Bearer <token>
```
```json
{ "code": "SUMMER10" }
```

**Ответ `200`:**
```json
{
  "name": "Летняя акция",
  "code": "SUMMER10",
  "value": 10.00,
  "isPercentage": true
}
```
> Если код не найден, истёк или лимит исчерпан — `409 Conflict`.

Применить промокод к уже созданному заказу:
```
POST /api/discounts/orders/{orderId}/promo
Authorization: Bearer <token>
```
```json
{ "code": "SUMMER10" }
```

### 3.10 Избранное

#### Список избранных блюд
```
GET /api/guest/favorites
Authorization: Bearer <token>
```
**Ответ `200`:** список `DishDTO`.
```json
[
  { "id": 3, "name": "Стейк из говядины", "price": 1200.00, "photoUrl": null },
  { "id": 7, "name": "Тирамису", "price": 420.00, "photoUrl": null }
]
```

#### Добавить блюдо в избранное
```
POST /api/guest/favorites/{dishId}
Authorization: Bearer <token>
```
**Ответ `201`:** пустой.  
> Если блюдо уже в избранном — `409 Conflict`.

#### Удалить из избранного
```
DELETE /api/guest/favorites/{dishId}
Authorization: Bearer <token>
```
**Ответ `204`:** пустой.

### 3.11 Отзывы

```
POST /api/reviews
Authorization: Bearer <token>
```
```json
{
  "stars": 5,
  "description": "Отличное обслуживание!"
}
```
> `stars` — целое число от 1 до 5. Автор определяется по токену.

### 3.12 Профиль

#### Просмотр профиля
```
GET /api/guest/profile
Authorization: Bearer <token>
```
**Ответ `200`:**
```json
{
  "id": 1,
  "firstName": "Павел",
  "lastName": "Смирнов",
  "patronymic": "Олегович",
  "login": "smirnov_p",
  "phoneNumber": "+7-911-100-22-00",
  "email": "p.smirnov@mail.ru",
  "dateOfBirth": "1990-05-20",
  "visitsCount": 12,
  "discountPercentage": 5,
  "bonusBalance": 350.00,
  "registrationDate": "2024-01-15"
}
```
> `discountPercentage` — текущий % персональной скидки, пересчитывается автоматически при каждой оплате.  
> `bonusBalance` — текущий баланс бонусов.

#### Обновление профиля
```
PATCH /api/guest/profile
Authorization: Bearer <token>
```
```json
{
  "firstName": "Иван",
  "lastName": "Петров",
  "phoneNumber": "+79991234567",
  "email": "new@email.com"
}
```
> Передавайте только те поля, которые нужно изменить.

#### Удалить аккаунт
```
DELETE /api/guest/profile
Authorization: Bearer <token>
```

---

## 4. Официант

**Роль:** `официант`  
**Permissions:** `menu:read`, `dishes:read`, `orders:read`, `orders:create`, `dishes_in_orders:read`, `dishes_in_orders:create`, `dishes_in_orders:update`, `tables:read`, `reservations:read`, `modificators:read`

- [4.1 Меню с учётом стоп-листа](#41-меню-с-учётом-стоп-листа)
- [4.2 Создание заказа](#42-создание-заказа)
- [4.3 Добавить блюдо в заказ](#43-добавить-блюдо-в-заказ)
- [4.4 Просмотр блюд в заказе](#44-просмотр-блюд-в-заказе)
- [4.5 Обновление статуса блюда](#45-обновление-статуса-блюда)
- [4.6 Удалить блюдо из заказа](#46-удалить-блюдо-из-заказа)
- [4.7 Обновить статус заказа](#47-обновить-статус-заказа)
- [4.8 Все заказы](#48-все-заказы)
- [4.9 Отменить заказ](#49-отменить-заказ)
- [4.10 Создать платёж (пречек)](#410-создать-платёж-пречек)
- [4.11 Столы](#411-столы)
- [4.12 Текущая бронь стола](#412-текущая-бронь-стола)
- [4.13 Чек заказа (summary)](#413-чек-заказа-summary)
- [4.14 Бронирования (просмотр)](#414-бронирования-просмотр)

---

### 4.1 Меню с учётом стоп-листа

```
GET /api/menu/employee
Authorization: Bearer <token>
```

**Параметры фильтрации и сортировки (все необязательные):**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `categoryId` | Long | Только блюда указанной категории |
| `name` | String | Поиск по названию |
| `minPrice` | Decimal | Минимальная цена |
| `maxPrice` | Decimal | Максимальная цена |
| `sortBy` | String | `totalDishPrice` или `dish.name` |
| `sortDir` | String | `asc` / `desc` |

**Ответ `200`:** список всех позиций, включая стоп-лист (`isAvailable: false`).

### 4.2 Создание заказа

```
POST /api/orders
Authorization: Bearer <token>
```
**Тело запроса:**
```json
{
  "employee": { "id": 3 },
  "table": { "id": 2 },
  "guest": { "id": 7 }
}
```
> `table` и `guest` — необязательные.  
> `orderType` не передавать — сервер автоматически ставит `DINE_IN`.  
> Если передан несуществующий `guest.id` или `table.id` — `404`.  
> Если стол был в статусе `RESERVED` — он переходит в `OCCUPIED`, а ближайшая активная бронь на сегодня автоматически получает статус `COMPLETED`.

**Ответ `200`:**
```json
{
  "id": 92,
  "dailyNumber": 4,
  "datetimeOrder": "2026-05-06T15:45:00Z",
  "status": "CREATED",
  "orderType": "DINE_IN",
  "employee": { "id": 3, "firstName": "Алексей", "lastName": "Смирнов" },
  "guest": { "id": 7, "firstName": "Игорь", "lastName": "Тарасов" },
  "table": { "id": 2, "seatCount": 4, "status": "OCCUPIED" }
}
```

### 4.3 Добавить блюдо в заказ

```
POST /api/orders/{orderId}/dishes
Authorization: Bearer <token>
```
```json
{
  "order": { "id": 92 },
  "dish": { "id": 5 },
  "description": "Без соли",
  "basePrice": 1200.00,
  "priceWithCategory": 1320.00,
  "totalPrice": 1320.00
}
```

| Поле | Описание |
|------|----------|
| `basePrice` | Базовая цена блюда из справочника |
| `priceWithCategory` | Цена с наценкой категории — отображать гостю |
| `totalPrice` | `priceWithCategory × (1 − discount_ratio)` — финальная цена **только блюда** без модификаторов; пересчитывается автоматически при применении скидки к заказу |

> `totalPrice` модификаторов хранится отдельно в `ModificatorInOrder.totalPrice`.  
> Сумма к оплате = Σ `dish.totalPrice` + Σ `mod.totalPrice`.

**Ответ `200`:**
```json
{
  "id": 145,
  "order": { "id": 92 },
  "dish": { "id": 5, "name": "Стейк рибай" },
  "description": "Без соли",
  "cookingStatus": "CREATED",
  "datetimeAdd": "2026-05-06T15:46:00Z",
  "basePrice": 1200.00,
  "priceWithCategory": 1320.00,
  "totalPrice": 1320.00
}
```

> **Важно:** если заказ находился в статусе `READY` — добавление нового блюда автоматически переводит его обратно в `IN_PROGRESS`.

### 4.4 Просмотр блюд в заказе

```
GET /api/orders/{orderId}/dishes
Authorization: Bearer <token>
```

### 4.5 Обновление статуса блюда

```
PATCH /api/orders/{orderId}/dishes/{dishInOrderId}/status?status=COMPLETED
Authorization: Bearer <token>
```
> Официант использует этот эндпоинт чтобы отметить блюдо как поданное (`COMPLETED`), когда принёс его гостю.  
> Статус `READY` ставит повар, статус `COMPLETED` ставит официант.  
> Нельзя изменить статус `CANCELLED` или `COMPLETED` блюда — `409`.

### 4.6 Удалить блюдо из заказа

```
DELETE /api/orders/{orderId}/dishes/{dishInOrderId}
Authorization: Bearer <token>
```

### 4.7 Обновить статус заказа

```
PATCH /api/orders/{id}/status?status=IN_PROGRESS
Authorization: Bearer <token>
```
> Если у заказа есть привязанный гость — он получит push-уведомление о смене статуса.

**Доступные переходы статусов:** `CREATED` → `IN_PROGRESS` → `READY` → `COMPLETED` → `PAID`

| Переход | Ограничения |
|---------|-------------|
| → `READY` | Все некансельнутые блюда должны быть в статусе `READY`. В заказе должно быть хотя бы одно активное блюдо. Иначе — `409`. |
| → `COMPLETED` | Сервисный сбор применяется **автоматически**. |
| `CANCELLED` / `PAID` | Изменить статус невозможно — `409`. |

### 4.8 Все заказы

```
GET /api/orders
Authorization: Bearer <token>
```

**Параметры фильтрации (все необязательные):**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `status` | Status | Фильтр по статусу |
| `orderType` | OrderType | `DINE_IN` или `TAKEAWAY` |
| `employeeId` | Long | Заказы конкретного сотрудника |
| `guestId` | Long | Заказы конкретного гостя |
| `tableId` | Long | Заказы конкретного стола |
| `sortBy` | String | `datetimeOrder` или `status` |
| `sortDir` | String | `asc` / `desc` |

### 4.9 Отменить заказ

```
DELETE /api/orders/{id}
Authorization: Bearer <token>
```
> Запрещено, если хотя бы одно блюдо имеет статус `READY` — вернёт `409`.

### 4.10 Создать платёж (пречек)

```
POST /api/payments
Authorization: Bearer <token>
```
```json
{
  "status": "CREATED",
  "paymentType": "CARD",
  "totalPrice": 2640.00
}
```
**Ответ `201`:** объект `PaymentDTO`.

### 4.11 Столы

```
GET /api/tables
GET /api/tables/{id}
Authorization: Bearer <token>
```
> `table.status` — метка для карты зала (`AVAILABLE` / `RESERVED` / `OCCUPIED`).  
> Автоматически обновляется планировщиком каждые 15 минут (AVAILABLE↔RESERVED). `OCCUPIED` проставляется при создании заказа и снимается вручную официантом.  
> Для проверки доступности при бронировании — используй `GET /api/tables/available` (учитывает время).

### 4.12 Текущая бронь стола

Используй перед созданием заказа на `RESERVED` стол чтобы уточнить — правильный ли гость пришёл.

```
GET /api/tables/{id}/current-reservation
Authorization: Bearer <token>
```

**Ответ `200`** — бронь найдена:
```json
{
  "id": 1,
  "table": { "id": 4 },
  "status": "RESERVED",
  "reservDate": "2026-05-11",
  "reservHourFrom": "19:00:00",
  "reservHourTo": "21:00:00",
  "guestName": "Александр Иванов",
  "guestPhoneNumber": "+79991234567",
  "guest": { "id": 7, "firstName": "Александр", "lastName": "Иванов" }
}
```
**Ответ `204`** — нет активной или ближайшей (в течение 30 мин) брони.

**Флоу при создании заказа на RESERVED стол:**
1. `GET /api/tables/{id}/current-reservation` → показать попап с данными гостя
2. Официант подтверждает что гость совпадает
3. `POST /api/orders` → стол автоматически переходит в `OCCUPIED`, ближайшая активная бронь получает статус `COMPLETED`

### 4.12 Чек заказа (summary)

Используется для отображения итогового экрана перед оплатой. Показывает разбивку по блюдам, скидкам и сервисному сбору.

```
GET /api/orders/{id}/summary
Authorization: Bearer <token>
```

**Ответ `200`:**
```json
{
  "orderId": 1,
  "dailyNumber": 1,
  "grossTotal": 1690.00,
  "discounts": [
    { "name": "Скидка выходного дня", "value": 169.00, "isPercentage": true, "isGuestDiscount": false }
  ],
  "subtotal": 1521.00,
  "serviceCharge": { "name": "Сервисный сбор", "value": 152.10, "isPercentage": true, "isGuestDiscount": false },
  "finalTotal": 1673.10,
  "dishes": [
    {
      "dishInOrderId": 1,
      "dishName": "Борщ",
      "priceWithCategory": 350.00,
      "totalPrice": 315.00,
      "cookingStatus": "COMPLETED",
      "description": null,
      "modificators": []
    },
    {
      "dishInOrderId": 2,
      "dishName": "Стейк из говядины",
      "priceWithCategory": 1260.00,
      "totalPrice": 1134.00,
      "cookingStatus": "COMPLETED",
      "description": null,
      "modificators": [
        { "modificatorInOrderId": 1, "name": "Пармезан", "basePrice": 80.00, "totalPrice": 72.00 }
      ]
    }
  ]
}
```

> `grossTotal` — итог до скидок (Σ `priceWithCategory` + Σ `mod.basePrice`).  
> `subtotal` — итог после скидок (Σ `dish.totalPrice` + Σ `mod.totalPrice`).  
> `serviceCharge` — `null` если сервисный сбор не применён (заказ ещё не `COMPLETED`).  
> `finalTotal` = `subtotal` + `serviceCharge.value` — сумма к оплате.  
> Доступен и клиенту (`CLIENT`), и персоналу.

### 4.13 Бронирования (просмотр)

Официант может просматривать бронирования — чтобы знать какой стол занят и когда.

```
GET /api/reservations
GET /api/reservations/{id}
Authorization: Bearer <token>
```

---

## 5. Повар

**Роль:** `повар`  
**Permissions:** `menu:read`, `dishes:read`, `orders:read`, `ingredients:read`, `dishes_in_orders:read`, `dishes_in_orders:update`, `modificators:read`

- [5.1 Очередь приготовления (по приоритету)](#51-очередь-приготовления-по-приоритету)
- [5.2 Блюда конкретного заказа](#52-блюда-конкретного-заказа)
- [5.3 Обновить статус блюда](#53-обновить-статус-блюда)
- [5.4 Меню (состав блюд)](#54-меню-состав-блюд)

---

### 5.1 Очередь приготовления (по приоритету)

Возвращает все блюда в статусах `CREATED` и `IN_PROGRESS` из **всех заказов**, отсортированные по времени добавления — **самое старое блюдо первым**. Это основной экран повара.

```
GET /api/cook/queue
Authorization: Bearer <token>
```

**Ответ `200`:**
```json
[
  {
    "id": 145,
    "order": {
      "id": 92,
      "dailyNumber": 4,
      "table": { "id": 2, "seatCount": 4, "status": "OCCUPIED" },
      "orderType": "DINE_IN",
      "status": "IN_PROGRESS"
    },
    "dish": { "id": 5, "name": "Стейк из говядины" },
    "description": "Без соли",
    "cookingStatus": "CREATED",
    "datetimeAdd": "2026-05-07T12:00:00Z",
    "basePrice": 1200.00,
    "priceWithCategory": 1260.00,
    "totalPrice": 1260.00
  }
]
```
> Поля `order.table.id`, `order.dailyNumber` и `order.orderType` помогают повару понять: столик или самовывоз и номер заказа дня.

### 5.2 Блюда конкретного заказа

```
GET /api/orders/{orderId}/dishes
Authorization: Bearer <token>
```

### 5.3 Обновить статус блюда

```
PATCH /api/orders/{orderId}/dishes/{dishInOrderId}/status?status=IN_PROGRESS
PATCH /api/orders/{orderId}/dishes/{dishInOrderId}/status?status=READY
Authorization: Bearer <token>
```

**Типичный сценарий:**
1. Повар видит блюдо со статусом `CREATED` → ставит `IN_PROGRESS` (начал готовить)
2. Блюдо готово → ставит `READY`

**При переводе блюда в `READY` автоматически:**
- Официанту (если назначен) уведомление: `"Готово: Борщ (заказ #5, стол 3)"`
- Если все некансельнутые блюда заказа теперь `READY` → заказ **автоматически** переходит в `READY`:
  - Гость получает: `"Ваш заказ готов к самовывозу"`
  - Для TAKEAWAY — все активные менеджеры смены получают: `"Заказ #5 (самовывоз) готов к выдаче"`

### 5.4 Меню (состав блюд)

```
GET /api/menu/employee
Authorization: Bearer <token>
```

---

## 6. Менеджер смены

**Роль:** `менеджер смены`  
**Permissions:** `menu:read`, `menu:update`, `dishes:read`, `orders:read`, `orders:create`, `dishes_in_orders:read`, `dishes_in_orders:create`, `reservations:read`, `reservations:create`, `reservations:update`, `tables:read`, `tables:update`, `ingredients:read`, `modificators:read`

Менеджер смены имеет все возможности официанта плюс следующие.

- [6.1 Управление стоп-листом](#61-управление-стоп-листом)
- [6.2 Поиск гостя по телефону](#62-поиск-гостя-по-телефону)
- [6.3 Создание бронирования (от имени ресторана)](#63-создание-бронирования-от-имени-ресторана)
- [6.4 Подтверждение / отмена бронирования](#64-подтверждение--отмена-бронирования)
- [6.4 Обновить статус стола](#64-обновить-статус-стола)
- [6.5 Сводка по текущей смене](#65-сводка-по-текущей-смене)
- [6.6 Начислить бонусы клиенту (вручную)](#66-начислить-бонусы-клиенту-вручную)

---

### 6.1 Управление стоп-листом

#### Добавить в стоп-лист
```
PATCH /api/menu/{dishInCategoryId}/stoplist?isAvailable=false
Authorization: Bearer <token>
```

#### Убрать из стоп-листа
```
PATCH /api/menu/{dishInCategoryId}/stoplist?isAvailable=true
Authorization: Bearer <token>
```
> `dishInCategoryId` — `id` записи из ответа `GET /api/menu/employee`.

### 6.2 Поиск гостя по телефону

Перед созданием брони — проверить есть ли у гостя аккаунт в системе.

```
GET /api/guest/by-phone?phone=+79991234567
Authorization: Bearer <token>
```

**Ответ `200`** — гость найден, бронь можно привязать к его профилю:
```json
{
  "id": 7,
  "firstName": "Александр",
  "lastName": "Иванов",
  "phoneNumber": "+79991234567",
  "visitsCount": 8,
  "discountPercentage": 3,
  "bonusBalance": 250.00
}
```
**Ответ `204`** — аккаунта нет, бронь создаётся с `guestName` + `guestPhoneNumber`.

### 6.3 Создание бронирования (от имени ресторана)

Менеджер смены может создать бронирование вручную — например, по звонку гостя.

```
POST /api/reservations
Authorization: Bearer <token>
```
```json
{
  "table": { "id": 3 },
  "reservDate": "2026-05-15",
  "reservHourFrom": "19:00:00",
  "reservHourTo": "21:00:00",
  "guestName": "Александр Иванов",
  "guestPhoneNumber": "+79991234567"
}
```
> Поля `guestName` и `guestPhoneNumber` используются для walk-in гостей без аккаунта.  
> Если гость зарегистрирован — можно передать `"guest": { "id": 7 }` вместо имени и телефона.  
> После создания все менеджеры смены получат уведомление.

### 6.3 Подтверждение / отмена бронирования

```
PATCH /api/reservations/{id}/status?status=RESERVED
PATCH /api/reservations/{id}/status?status=CANCELLED
Authorization: Bearer <token>
```
> Гость получит push-уведомление при подтверждении или отмене.

#### Все бронирования
```
GET /api/reservations
Authorization: Bearer <token>
```

**Параметры фильтрации:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `status` | Status | Фильтр по статусу |
| `tableId` | Long | Бронирования конкретного стола |
| `date` | Date | Бронирования на конкретную дату |
| `sortBy` | String | `reservDate`, `reservHourFrom`, `status` |
| `sortDir` | String | `asc` / `desc` |

### 6.4 Обновить статус стола

```
PUT /api/tables/{id}
Authorization: Bearer <token>
```
```json
{
  "seatCount": 4,
  "status": "OCCUPIED"
}
```

### 6.5 Сводка по текущей смене

```
GET /api/analytics/shift
Authorization: Bearer <token>
```
> Всегда возвращает данные за сегодня, параметры не нужны.

**Ответ `200`:**
```json
{
  "date": "2026-05-07",
  "totalOrdersToday": 12,
  "activeOrdersCount": 3,
  "ordersByStatus": {
    "CREATED": 1,
    "IN_PROGRESS": 2,
    "COMPLETED": 8,
    "CANCELLED": 1
  },
  "ordersByType": {
    "DINE_IN": 10,
    "TAKEAWAY": 2
  },
  "revenueToday": 18450.00,
  "reservationsToday": 5,
  "confirmedReservationsToday": 4
}
```

### 6.6 Начислить бонусы клиенту (вручную)

```
POST /api/bonus/{guestId}/accrue
Authorization: Bearer <token>
```
```json
{
  "orderTotal": 1320.00,
  "orderId": 92
}
```
> Начисляется 5% от `orderTotal`. Для заказа на 1320 руб. — 66 бонусов.  
> Для клиентских TAKEAWAY-заказов бонусы начисляются **автоматически** при `PATCH /orders/my/{id}/pay`. Эта ручная операция — для заказов в зале.

---

## 7. Управляющий

**Роль:** `управляющий`  
**Permissions:** все (`menu:*`, `dishes:*`, `orders:*`, `tables:*`, `ingredients:*`, `reservations:*`, `reviews:read`, `dishes_in_orders:*`, `modificators:*`, `guests:read`)

- [7.0 Профиль текущего сотрудника](#70-профиль-текущего-сотрудника)
- [7.1 Управление сотрудниками](#71-управление-сотрудниками)
- [7.2 Управление меню](#72-управление-меню)
- [7.3 Управление блюдами](#73-управление-блюдами)
- [7.4 Категории блюд](#74-категории-блюд)
- [7.5 Единицы измерения](#75-единицы-измерения)
- [7.6 Управление столами](#76-управление-столами)
- [7.7 Ингредиенты и состав блюд](#77-ингредиенты-и-состав-блюд)
- [7.8 Модификаторы](#78-модификаторы)
- [7.9 Складской учёт](#79-складской-учёт)
- [7.10 Скидки и промокоды](#710-скидки-и-промокоды)
- [7.11 Бонусы клиентов](#711-бонусы-клиентов)
- [7.12 Аналитика](#712-аналитика)
- [7.13 Платежи](#713-платежи)
- [7.14 Отзывы клиентов](#714-отзывы-клиентов)
- [7.15 Список клиентов](#715-список-клиентов)

---

### 7.0 Профиль текущего сотрудника

Доступно **любому** авторизованному сотруднику независимо от роли.

```
GET /api/employee/me
Authorization: Bearer <token>
```

**Ответ `200`:**
```json
{
  "id": 1,
  "firstName": "Алексей",
  "lastName": "Иванов",
  "patronymic": "Сергеевич",
  "login": "ivanov_mgr",
  "phoneNumber": "+7-900-111-22-33",
  "email": "a.ivanov@syncflow.ru",
  "role": { "id": 1, "name": "управляющий" }
}
```

### 7.1 Управление сотрудниками

#### Список сотрудников
```
GET /api/employee/all
Authorization: Bearer <token>
```

**Параметры фильтрации:**
| Параметр | Описание |
|----------|----------|
| `roleId` | Фильтр по роли |
| `lastName` | Поиск по фамилии |
| `sortBy` | Поле сортировки |
| `sortDir` | `asc` / `desc` |

#### Получить сотрудника
```
GET /api/employee/{id}
Authorization: Bearer <token>
```

#### Создать сотрудника
```
POST /api/employee
Authorization: Bearer <token>
```
```json
{
  "firstName": "Алексей",
  "lastName": "Смирнов",
  "patronymic": "Иванович",
  "login": "smirnov_a",
  "password": "secure123",
  "roleId": 3,
  "phoneNumber": "+79991112233",
  "email": "a.smirnov@restaurant.ru",
  "dateOfBirth": "1990-07-20",
  "hireDate": "2026-05-01",
  "salary": 65000.00,
  "addressOfResidence": "г. Москва, ул. Ленина, д. 5",
  "passport": 4512345678
}
```
> `roleId`: 1 — управляющий, 2 — менеджер смены, 3 — официант, 4 — повар.

#### Обновить данные сотрудника
```
PUT /api/employee/{id}
Authorization: Bearer <token>
```
Тело — такое же, как при создании. Если `password` пустой — пароль не меняется.

#### Уволить сотрудника (soft delete)
```
DELETE /api/employee/{id}
Authorization: Bearer <token>
```

### 7.2 Управление меню

#### Добавить блюдо в категорию
```
POST /api/menu
Authorization: Bearer <token>
```
```json
{
  "category": { "id": 2 },
  "dish": { "id": 5 },
  "totalDishPrice": 1320.00,
  "isAvailable": true,
  "availabilityHourFrom": "12:00:00",
  "availabilityHourTo": "23:00:00"
}
```

#### Убрать блюдо из меню (soft delete)
```
DELETE /api/menu/{dishInCategoryId}
Authorization: Bearer <token>
```

### 7.3 Управление блюдами

#### Список блюд
```
GET /api/dishes
Authorization: Bearer <token>
```

**Параметры фильтрации:**
| Параметр | Описание |
|----------|----------|
| `name` | Поиск по названию (содержит) |
| `minPrice` | Минимальная цена |
| `maxPrice` | Максимальная цена |
| `sortBy` | `name`, `price`, `netWeight` |
| `sortDir` | `asc` / `desc` |

#### Создать блюдо
```
POST /api/dishes
Authorization: Bearer <token>
```
```json
{
  "name": "Стейк рибай",
  "price": 1200.00,
  "description": "Сочный стейк из мраморной говядины",
  "netWeight": 300.00,
  "cookingTime": "00:25:00",
  "unit": { "id": 1 },
  "photoUrl": "https://storage.googleapis.com/syncflow/dishes/steak.jpg"
}
```
> `photoUrl` — необязательное поле.

#### Обновить блюдо
```
PUT /api/dishes/{id}
Authorization: Bearer <token>
```

#### Удалить блюдо (soft delete)
```
DELETE /api/dishes/{id}
Authorization: Bearer <token>
```

### 7.4 Категории блюд

```
GET    /api/categories
POST   /api/categories
PUT    /api/categories/{id}
DELETE /api/categories/{id}
Authorization: Bearer <token>
```
```json
{
  "name": "Горячее",
  "extraChargePercentage": 10.00
}
```

### 7.5 Единицы измерения

```
GET    /api/units
POST   /api/units
DELETE /api/units/{id}
Authorization: Bearer <token>
```
```json
{ "name": "кг" }
```

### 7.6 Управление столами

```
GET    /api/tables
POST   /api/tables
PUT    /api/tables/{id}
DELETE /api/tables/{id}
Authorization: Bearer <token>
```
```json
{
  "seatCount": 4,
  "status": "AVAILABLE"
}
```

### 7.7 Ингредиенты и состав блюд

#### Список ингредиентов
```
GET /api/ingredients
Authorization: Bearer <token>
```

**Параметры фильтрации:**
| Параметр | Описание |
|----------|----------|
| `name` | Поиск по названию |
| `sortBy` | `name` или `currentStock` |
| `sortDir` | `asc` / `desc` |

#### Создать ингредиент
```
POST /api/ingredients
Authorization: Bearer <token>
```
```json
{
  "name": "Говядина мраморная",
  "currentStock": 0,
  "unit": { "id": 2 }
}
```

#### Добавить ингредиент в состав блюда
```
POST /api/ingredient-in-dish
Authorization: Bearer <token>
```
```json
{
  "ingredient": { "id": 1 },
  "dish": { "id": 5 },
  "processingType": "жарка",
  "grossWeight": 350.00
}
```

#### Удалить ингредиент из состава
```
DELETE /api/ingredient-in-dish/{id}
Authorization: Bearer <token>
```

### 7.8 Модификаторы

#### Список модификаторов
```
GET /api/modificators
Authorization: Bearer <token>
```

#### Создать модификатор
```
POST /api/modificators
Authorization: Bearer <token>
```
```json
{
  "ingredient": { "id": 7 },
  "grossWeight": 50.00,
  "price": 80.00,
  "unit": { "id": 5 }
}
```

#### Привязать модификатор к блюду
```
POST /api/modificator-in-dish
Authorization: Bearer <token>
```
```json
{
  "dish": { "id": 5 },
  "modificator": { "id": 2 }
}
```

### 7.9 Складской учёт

#### Приход ингредиента
```
POST /api/stock/{ingredientId}/receipt
Authorization: Bearer <token>
```
```json
{
  "amount": 10.00,
  "description": "Поставка от 06.05.2026"
}
```

#### Списание ингредиента
```
POST /api/stock/{ingredientId}/write-off
Authorization: Bearer <token>
```
```json
{
  "amount": 2.50,
  "description": "Списание по акту"
}
```
> Если остатка недостаточно — `409 Conflict`.

#### История движения
```
GET /api/stock/{ingredientId}/movements
Authorization: Bearer <token>
```
**Ответ `200`:**
```json
[
  {
    "id": 5,
    "ingredientId": 1,
    "type": "RECEIPT",
    "amount": 10.00,
    "createdAt": "2026-05-06T10:00:00Z",
    "description": "Поставка от 06.05.2026"
  }
]
```

#### Предупреждения о низких остатках
```
GET /api/stock/alerts?threshold=5.0
Authorization: Bearer <token>
```
> По умолчанию `threshold=5.0`. Возвращает ингредиенты, где `currentStock <= threshold`.

### 7.10 Скидки и промокоды

#### Список скидок
```
GET /api/discounts
Authorization: Bearer <token>
```

#### Создать скидку / промокод / сервисный сбор
```
POST /api/discounts
Authorization: Bearer <token>
```
```json
{
  "name": "Летняя акция",
  "value": 10.00,
  "isPercentage": true,
  "isActive": true,
  "code": "SUMMER10",
  "maxUsages": 100,
  "validFrom": "2026-06-01",
  "validTo": "2026-08-31"
}
```
> **Сервисный сбор** (`isServiceCharge: true`): в системе может быть только один. Применяется **автоматически** при переводе заказа в статус `COMPLETED`. Вручную применить нельзя — `409`. Считается от `gross − Σ обычных скидок`. Не влияет на `totalPrice` блюд — хранится отдельной записью в `discounts_in_orders`. Посмотреть: `GET /api/discounts/orders/{orderId}`.  
> **Гостевая скидка** (`isGuestDiscount: true`): в системе может быть только одна («Постоянный гость»). Применяется без ограничений. `value` игнорируется — процент берётся из `guest.discountPercentage` (автоматически растёт с визитами).  
> **Ручная скидка**: не более одной на заказ. Попытка применить вторую → `409`. Нельзя применить к заказу в статусе `PAID` или `CANCELLED` → `409`. В статусе `COMPLETED` разрешено — сервисный сбор пересчитывается автоматически.  
> **Промокод**: не более одного на заказ, применяется через `POST .../promo`. Нельзя применить к `PAID`/`CANCELLED`. В `COMPLETED` разрешено — сервисный сбор пересчитывается.

#### Как работает пересчёт цен при применении скидки

При вызове `apply` или `promo` сервер автоматически пересчитывает `totalPrice` каждого блюда и модификатора в заказе:

```
orderGross = Σ dish.priceWithCategory + Σ mod.basePrice  (некансельнутые)
ratio      = Σ DiscountInOrder.value (только не-сервисные) / orderGross

dish.totalPrice = priceWithCategory × (1 − ratio)
mod.totalPrice  = basePrice × (1 − ratio)
```

Сервисный сбор на `totalPrice` не влияет — он учитывается отдельно при формировании платежа.

Итог к оплате = Σ `dish.totalPrice` + Σ `mod.totalPrice` + сервисный сбор (`DiscountInOrder.value` где `isServiceCharge=true`)

#### Обновить скидку
```
PUT /api/discounts/{id}
Authorization: Bearer <token>
```

#### Удалить скидку
```
DELETE /api/discounts/{id}
Authorization: Bearer <token>
```

#### Применить скидку к заказу (по ID)
```
POST /api/discounts/orders/{orderId}/apply/{discountId}
Authorization: Bearer <token>
```

#### Применить промокод к заказу
```
POST /api/discounts/orders/{orderId}/promo
Authorization: Bearer <token>
```
```json
{ "code": "SUMMER10" }
```

#### Скидки по заказу
```
GET /api/discounts/orders/{orderId}
Authorization: Bearer <token>
```

### 7.11 Бонусы клиентов

#### Баланс конкретного клиента
```
GET /api/bonus/{guestId}/balance
Authorization: Bearer <token>
```

#### История транзакций клиента
```
GET /api/bonus/{guestId}/transactions
Authorization: Bearer <token>
```

#### Начислить бонусы клиенту
```
POST /api/bonus/{guestId}/accrue
Authorization: Bearer <token>
```
```json
{
  "orderTotal": 1320.00,
  "orderId": 92
}
```

#### Списать бонусы от имени клиента
```
POST /api/bonus/{guestId}/spend
Authorization: Bearer <token>
```
```json
{
  "amount": 200.00,
  "orderId": 92
}
```

### 7.12 Аналитика

> Для всех аналитических запросов: `from` не может быть позже `to` — иначе `409`.

#### Выручка и средний чек
```
GET /api/analytics?from=2026-05-01&to=2026-05-31
Authorization: Bearer <token>
```
**Ответ `200`:**
```json
{
  "totalRevenue": 1250000.00,
  "averageCheck": 1520.00,
  "orderCount": 822,
  "periodFrom": "2026-05-01",
  "periodTo": "2026-05-31"
}
```

#### Популярность блюд
```
GET /api/analytics/dishes?from=2026-05-01&to=2026-05-31&limit=10
Authorization: Bearer <token>
```
**Ответ `200`:**
```json
[
  { "dishName": "Стейк рибай", "orderCount": 142, "revenue": 187440.00 },
  { "dishName": "Паста карбонара", "orderCount": 98, "revenue": 68600.00 }
]
```

#### Загруженность зала
```
GET /api/analytics/occupancy?from=2026-05-01&to=2026-05-31
Authorization: Bearer <token>
```
**Ответ `200`:**
```json
{
  "totalReservations": 256,
  "confirmedReservations": 198,
  "occupancyByDate": [
    { "date": "2026-05-01", "count": 12 },
    { "date": "2026-05-02", "count": 9 }
  ]
}
```

#### Сводка по текущей смене
```
GET /api/analytics/shift
Authorization: Bearer <token>
```
> Данные за сегодня, без параметров. Описание ответа — в разделе 6.4.

### 7.13 Платежи

```
GET /api/payments
GET /api/payments/{id}
Authorization: Bearer <token>
```

**Параметры фильтрации для GET /api/payments:**
| Параметр | Описание |
|----------|----------|
| `paymentType` | Тип оплаты (`CASH`, `CARD`, `ONLINE`) |
| `sortBy` | `datetimePayment` или `totalPrice` |
| `sortDir` | `asc` / `desc` (по умолчанию `desc`) |

### 7.14 Отзывы клиентов

```
GET /api/reviews
Authorization: Bearer <token>
```

**Параметры фильтрации:**
| Параметр | Описание |
|----------|----------|
| `minStars` | Минимальная оценка (1–5) |
| `maxStars` | Максимальная оценка (1–5) |
| `sortBy` | `datetimeReview` или `stars` |
| `sortDir` | `asc` / `desc` (по умолчанию `desc`) |

### 7.15 Список клиентов

#### Все клиенты

```
GET /api/guest/all
Authorization: Bearer <token>
```

**Параметры (необязательные):**

| Параметр | Описание |
|----------|----------|
| `search` | Поиск по имени, фамилии, логину или номеру телефона (без учёта регистра) |

**Ответ `200`:**
```json
[
  {
    "id": 7,
    "firstName": "Игорь",
    "lastName": "Тарасов",
    "patronymic": "Михайлович",
    "login": "tarasov_i",
    "phoneNumber": "+79031234567",
    "dateOfBirth": "1990-06-15",
    "email": "tarasov@mail.ru",
    "visitsCount": 12,
    "discountPercentage": 5,
    "bonusBalance": 340.50,
    "lastLogin": "2026-05-11T18:30:00Z",
    "registrationDate": "2025-11-01"
  }
]
```

#### Клиент по ID

```
GET /api/guest/{id}
Authorization: Bearer <token>
```

**Ответ `200`:** объект `GuestDTO` (см. выше).  
**Ответ `404`:** клиент не найден или удалён.

---

## 8. Уведомления

Работает для **обеих ролей** — клиентов (`CLIENT`) и сотрудников. После каждого события сервер сохраняет уведомление в базу данных и при наличии Firebase-токена отправляет push.

- [8.1 Зарегистрировать токен устройства](#81-зарегистрировать-токен-устройства)
- [8.2 Удалить токен устройства](#82-удалить-токен-устройства)
- [8.3 Список уведомлений](#83-список-уведомлений)
- [8.4 Счётчик непрочитанных (для бейджа)](#84-счётчик-непрочитанных-для-бейджа)
- [8.5 Отметить уведомление прочитанным](#85-отметить-уведомление-прочитанным)
- [8.6 Отметить все прочитанными](#86-отметить-все-прочитанными)

---

### Когда приходят уведомления

| Событие | Кто получает | Текст уведомления |
|---------|-------------|-------------------|
| Клиент создал бронирование | Все менеджеры смены | "Новое бронирование на {дата} {время} — стол №{N} ({имя})" |
| Сотрудник создал / подтвердил бронирование | Гость (если привязан) | "Ваше бронирование на {дата} в {время} подтверждено" |
| Бронирование → `RESERVED` (вручную) | Гость (если привязан) | "Ваше бронирование на {дата} в {время} подтверждено" |
| Бронирование → `CANCELLED` | Гость (если привязан) | "Ваше бронирование на {дата} отменено" |
| За сутки до бронирования (12:00 МСК) | Гость (если привязан) | "Напоминаем: завтра {дата} в {время} у вас забронирован стол №{N}" |
| Блюдо → `READY` | Официант на заказе (только DINE_IN) | "Готово: {блюдо} (заказ #{N}, стол {T})" |
| Все блюда → `READY` (авто, DINE_IN) | Гость (если привязан) | "Ваш заказ готов к самовывозу" |
| Все блюда → `READY` (авто, TAKEAWAY) | Гость | "Ваш заказ готов к самовывозу" |
| Все блюда → `READY` (авто, TAKEAWAY) | Все менеджеры смены | "Заказ #{dailyNumber} (самовывоз) готов к выдаче" |
| Заказ → `IN_PROGRESS` (вручную) | Гость (если привязан) | "Ваш заказ принят и готовится" |
| Заказ → `COMPLETED` | Гость (если привязан) | "Ваш заказ завершён. Спасибо!" |
| Заказ → `PAID` | Гость (если привязан) | "Оплата принята. Спасибо!" |
| Заказ → `CANCELLED` | Гость (если привязан) | "Ваш заказ отменён" |

### 8.1 Зарегистрировать токен устройства

Вызывать после каждого входа в аккаунт.

```
POST /api/notifications/token
Authorization: Bearer <token>
```
```json
{
  "token": "<FCM_TOKEN>",
  "platform": "ANDROID"
}
```
> `platform`: `ANDROID` или `IOS`.

**Ответ `200`:** пустой.

### 8.2 Удалить токен устройства

Вызывать при выходе из аккаунта.

```
DELETE /api/notifications/token?token=<FCM_TOKEN>
Authorization: Bearer <token>
```

### 8.3 Список уведомлений

```
GET /api/notifications/my
Authorization: Bearer <token>
```
> Возвращает последние 50 уведомлений, новые первыми.

**Ответ `200`:**
```json
[
  {
    "id": 14,
    "title": "Статус заказа",
    "body": "Ваш заказ принят и готовится",
    "read": false,
    "createdAt": "2026-05-07T12:05:00Z"
  },
  {
    "id": 13,
    "title": "Бронирование",
    "body": "Ваше бронирование на 2026-05-10 подтверждено",
    "read": true,
    "createdAt": "2026-05-06T18:00:00Z"
  }
]
```

### 8.4 Счётчик непрочитанных (для бейджа)

```
GET /api/notifications/my/unread-count
Authorization: Bearer <token>
```
**Ответ `200`:** число.
```json
3
```

### 8.5 Отметить уведомление прочитанным

```
PATCH /api/notifications/{id}/read
Authorization: Bearer <token>
```

### 8.6 Отметить все прочитанными

```
PATCH /api/notifications/my/read-all
Authorization: Bearer <token>
```

---

## 9. Справочник статусов

### Тип заказа (`order.orderType`)

| Значение | Описание |
|----------|----------|
| `DINE_IN` | Заказ в зале (создан сотрудником) |
| `TAKEAWAY` | Самовывоз (создан клиентом через приложение) |

### Статус заказа (`order.status`)

| Значение | Описание |
|----------|----------|
| `CREATED` | Заказ создан, ещё не принят кухней |
| `IN_PROGRESS` | Заказ в работе |
| `READY` | Все блюда готовы |
| `COMPLETED` | Заказ завершён |
| `CANCELLED` | Заказ отменён |
| `PAID` | Заказ оплачен |

### Статус блюда в заказе (`dishInOrder.cookingStatus`)

| Значение | Описание |
|----------|----------|
| `CREATED` | Блюдо передано на кухню |
| `IN_PROGRESS` | Повар готовит |
| `READY` | Блюдо готово, ждёт подачи |
| `COMPLETED` | Подано гостю |
| `CANCELLED` | Блюдо отменено |

### Статус стола (`table.status`)

| Значение | Описание |
|----------|----------|
| `AVAILABLE` | Свободен |
| `RESERVED` | Забронирован |
| `OCCUPIED` | Занят |

### Статус бронирования (`reservation.status`)

| Значение | Описание |
|----------|----------|
| `CREATED` | Заявка создана, ожидает подтверждения |
| `RESERVED` | Подтверждено менеджером |
| `COMPLETED` | Гость пришёл, бронирование закрыто |
| `CANCELLED` | Отменено |

### Тип транзакции бонусов (`BonusTransactionDTO.type`)

| Значение | Описание |
|----------|----------|
| `ACCRUAL` | Начисление |
| `SPENDING` | Списание |

### Тип движения склада (`StockMovementDTO.type`)

| Значение | Описание |
|----------|----------|
| `RECEIPT` | Приход |
| `WRITE_OFF` | Списание |

---

## 10. Коды ошибок

Все ошибки возвращают JSON вида:
```json
{ "message": "Текст ошибки" }
```

| HTTP код | Когда возникает |
|----------|-----------------|
| `400 Bad Request` | Некорректный формат запроса, неверный тип параметра, отсутствует обязательное поле, нарушение валидации (`stars` вне 1–5, `amount <= 0` и т.д.) |
| `401 Unauthorized` | Неверный логин/пароль, отсутствует/истёк токен, уволенный сотрудник, удалённый гость |
| `403 Forbidden` | Токен валиден, но роли недостаточно |
| `404 Not Found` | Запрошенная сущность или URL не найдены |
| `405 Method Not Allowed` | Неверный HTTP-метод для данного URL |
| `409 Conflict` | Нарушение бизнес-правила или уникальности |
| `415 Unsupported Media Type` | Неверный `Content-Type` (ожидается `application/json`) |
| `500 Internal Server Error` | Непредвиденная ошибка сервера |

### Типичные сценарии ошибок

**401:**
```
{ "message": "Неправильный пароль" }
{ "message": "Пользователь не найден" }          — уволенный сотрудник
{ "message": "Необходимо передать refreshToken" }
```

**400:**
```
{ "message": "dishInCategoryId: обязателен" }
{ "message": "Оценка должна быть от 1 до 5" }
{ "message": "Некорректный параметр запроса: ..." }
{ "message": "Неверный формат тела запроса" }
{ "message": "Отсутствует обязательный параметр: from" }
```

**404:**
```
{ "message": "Блюдо не найдено: id=999" }
{ "message": "Ресурс не найден: /api/unknown" }
```

**409:**
```
{ "message": "Стол недоступен на выбранное время" }
{ "message": "Нельзя отменить заказ: одно или несколько блюд уже готовы" }
{ "message": "Заказ уже оплачен" }
{ "message": "Невозможно применить промокод к уже оплаченному заказу" }
{ "message": "Промокод не найден или неактивен: OLDCODE" }
{ "message": "Недостаточно бонусов. Доступно: 150.00" }
{ "message": "Блюдо уже в избранном" }
{ "message": "Блюдо недоступно (стоп-лист): Стейк из говядины" }
{ "message": "Нельзя создать бронирование на прошедшую дату" }
{ "message": "Невозможно изменить статус отменённого бронирования" }
{ "message": "Дата начала не может быть позже даты окончания" }
{ "message": "Запись с такими данными уже существует" }   — duplicate key в БД
{ "message": "Невозможно выполнить операцию: есть связанные записи" }
```

---

## Быстрый старт для клиентского приложения

```
1. Регистрация:
   POST /api/guest/auth/register → получить токены

2. Зарегистрировать токен для пушей:
   POST /api/notifications/token  { "token": "<FCM_TOKEN>", "platform": "ANDROID" }

3. Просмотр меню (без токена):
   GET /api/menu/client

4. Рекомендации (без токена):
   GET /api/menu/recommended?limit=5

5. Проверить промокод:
   POST /api/guest/promo/check  { "code": "SUMMER10" }

6. Найти свободный стол:
   GET /api/tables/available?date=2026-05-10&from=19:00:00&to=21:00:00&seats=2

7. Забронировать и указать предзаказ:
   POST /api/reservations
   POST /api/reservations/{id}/preorder

8. Создать заказ на самовывоз с блюдами:
   POST /api/orders/my  { "dishes": [{ "dishInCategoryId": 3, "quantity": 1 }] }

9. Посмотреть блюда в заказе:
   GET /api/orders/{orderId}/dishes

10. Применить промокод к заказу:
    POST /api/discounts/orders/{orderId}/promo  { "code": "SUMMER10" }

11. Потратить бонусы:
    POST /api/bonus/my/spend  { "amount": 100.00, "orderId": 93 }

12. Посмотреть итоговый чек (grossTotal, скидки, finalTotal):
    GET /api/orders/{id}/summary

13. Оплатить (бонусы начисляются автоматически, visitsCount++):
    PATCH /api/orders/my/{id}/pay

13. Добавить в избранное:
    POST /api/guest/favorites/{dishId}

14. Оставить отзыв:
    POST /api/reviews  { "stars": 5, "description": "..." }

15. При выходе — удалить токен:
    DELETE /api/notifications/token?token=<FCM_TOKEN>
```

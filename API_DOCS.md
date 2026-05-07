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

**Авторизация:** все запросы, кроме `/api/*/auth/*` и `GET /api/menu/client`, требуют заголовок:
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

**Ответ `200`:** объект `GuestDTO`.

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

### 2.5 Полное обновление обоих токенов

```
POST /api/employee/auth/refresh
POST /api/guest/auth/refresh
```
Тело то же, что в 2.4. Ответ — оба новых токена.

---

## 3. Клиент

**Роль:** `CLIENT`

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
      "unit": { "id": 1, "name": "г" }
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

### 3.2 Состав блюда (ингредиенты)

```
GET /api/ingredient-in-dish/dish/{dishId}
Authorization: Bearer <token>
```

### 3.3 Модификаторы блюда

```
GET /api/modificator-in-dish/dish/{dishId}
Authorization: Bearer <token>
```

### 3.4 Свободные столы для бронирования

```
GET /api/tables/available?date=2026-05-10&from=19:00:00&to=21:00:00&seats=2
Authorization: Bearer <token>
```
> Возвращает столы, у которых достаточно мест и нет пересечений по времени с существующими бронированиями.

**Ответ `200`:**
```json
[
  { "id": 3, "seatCount": 4, "status": "AVAILABLE" },
  { "id": 5, "seatCount": 6, "status": "AVAILABLE" }
]
```

### 3.5 Бронирование стола

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
> Сервер проверяет пересечение по времени на том же столе. Если стол занят — `409 Conflict`.
> После создания все менеджеры смены получат уведомление. После подтверждения (`RESERVED`) или отмены (`CANCELLED`) уведомление придёт клиенту.

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

### 3.6 Заказы (самовывоз)

#### Создать заказ на самовывоз
```
POST /api/orders/my
Authorization: Bearer <token>
```
> Создаёт заказ с `orderType: TAKEAWAY` без привязки к столу и сотруднику.

**Ответ `200`:**
```json
{
  "id": 93,
  "datetimeOrder": "2026-05-07T12:00:00Z",
  "status": "CREATED",
  "orderType": "TAKEAWAY",
  "guestId": 7,
  "employee": null,
  "tableId": null
}
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

### 3.7 Программа лояльности

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

### 3.8 Отзывы

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

### 3.9 Профиль

#### Просмотр профиля
```
GET /api/guest/profile
Authorization: Bearer <token>
```

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
**Permissions:** `menu:read`, `dishes:read`, `orders:read`, `orders:create`, `dishes_in_orders:read`, `dishes_in_orders:create`, `tables:read`, `reservations:read`

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
  "guestId": 7
}
```
> `table` и `guestId` — необязательные.  
> `orderType` не передавать — сервер автоматически ставит `DINE_IN`.

**Ответ `200`:**
```json
{
  "id": 92,
  "datetimeOrder": "2026-05-06T15:45:00Z",
  "status": "CREATED",
  "orderType": "DINE_IN",
  "employee": { "id": 3, "firstName": "Алексей", "lastName": "Смирнов" },
  "guestId": 7,
  "tableId": 2
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

### 4.4 Просмотр блюд в заказе

```
GET /api/orders/{orderId}/dishes
Authorization: Bearer <token>
```

### 4.5 Обновление статуса блюда

```
PATCH /api/orders/{orderId}/dishes/{dishInOrderId}/status?status=READY
Authorization: Bearer <token>
```
> Когда статус меняется на `READY` — официант на этом заказе получает push-уведомление.

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

---

## 5. Повар

**Роль:** `повар`  
**Permissions:** `menu:read`, `dishes:read`, `orders:read`, `dishes_in_orders:read`

### 5.1 Очередь заказов

```
GET /api/orders
Authorization: Bearer <token>
```

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
2. Блюдо готово → ставит `READY` → официант получает push-уведомление

### 5.4 Меню (состав блюд)

```
GET /api/menu/employee
Authorization: Bearer <token>
```

---

## 6. Менеджер смены

**Роль:** `менеджер смены`  
**Permissions:** `menu:read`, `menu:update`, `dishes:read`, `orders:read`, `orders:create`, `dishes_in_orders:read`, `dishes_in_orders:create`, `reservations:read`, `reservations:create`, `reservations:update`, `tables:read`, `tables:update`

Менеджер смены имеет все возможности официанта плюс следующие.

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

### 6.2 Подтверждение / отмена бронирования

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

### 6.3 Обновить статус стола

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

### 6.4 Сводка по текущей смене

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

### 6.5 Начислить бонусы клиенту

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

---

## 7. Управляющий

**Роль:** `управляющий`  
**Permissions:** все (`menu:*`, `dishes:*`, `orders:*`, `tables:*`, `ingredients:*`, `reservations:*`, `reviews:read`, `dishes_in_orders:*`)

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
  "unit": { "id": 1 }
}
```

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

### 7.10 Скидки

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
  "name": "Скидка 10%",
  "type": "PROMO",
  "value": 10.00,
  "isPercentage": true,
  "isActive": true
}
```

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

#### Применить скидку к заказу
```
POST /api/discounts/orders/{orderId}/apply
Authorization: Bearer <token>
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

---

## 8. Уведомления

Работает для **обеих ролей** — клиентов (`CLIENT`) и сотрудников. После каждого события сервер сохраняет уведомление в базу данных и при наличии Firebase-токена отправляет push.

### Когда приходят уведомления

| Событие | Кто получает | Текст уведомления |
|---------|-------------|-------------------|
| Клиент создал бронирование | Все менеджеры смены | "Новое бронирование на {дата} {время} — стол №{N} ({имя гостя})" |
| Бронирование → `RESERVED` | Гость | "Ваше бронирование на {дата} подтверждено" |
| Бронирование → `CANCELLED` | Гость | "Ваше бронирование на {дата} отменено" |
| Блюдо → `READY` | Официант на заказе | "Готово: {название блюда} (заказ #{N})" |
| Заказ → `IN_PROGRESS` | Гость (если заказ с гостем) | "Ваш заказ принят и готовится" |
| Заказ → `READY` | Гость (если заказ с гостем) | "Ваш заказ готов к самовывозу" |
| Заказ → `COMPLETED` | Гость (если заказ с гостем) | "Ваш заказ завершён. Спасибо!" |
| Заказ → `PAID` | Гость (если заказ с гостем) | "Оплата принята. Спасибо!" |
| Заказ → `CANCELLED` | Гость (если заказ с гостем) | "Ваш заказ отменён" |

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
| `400 Bad Request` | Некорректный формат запроса, неизвестный `X-Restaurant-ID` |
| `401 Unauthorized` | Неверный логин/пароль, не передан или истёк токен |
| `403 Forbidden` | Токен валиден, но роли недостаточно |
| `404 Not Found` | Запрошенная сущность не найдена |
| `409 Conflict` | Нарушение бизнес-правила |
| `500 Internal Server Error` | Ошибка сервера |

### Типичные сценарии ошибок

```json
// 401 — неверный пароль
{ "message": "Неправильный пароль" }

// 404 — блюдо не найдено
{ "message": "Блюдо не найдено: id=999" }

// 409 — стол занят
{ "message": "Стол недоступен на выбранное время" }

// 409 — нельзя отменить заказ
{ "message": "Нельзя отменить заказ: одно или несколько блюд уже готовы" }

// 409 — мало бонусов
{ "message": "Недостаточно бонусов. Доступно: 150.00" }

// 400 — неизвестный ресторан
{ "error": "Unknown restaurant ID: restaurant99" }
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

4. Найти свободный стол:
   GET /api/tables/available?date=2026-05-10&from=19:00:00&to=21:00:00&seats=2

5. Забронировать:
   POST /api/reservations

6. Создать заказ на самовывоз:
   POST /api/orders/my

7. Потратить бонусы:
   POST /api/bonus/my/spend  { "amount": 100.00, "orderId": 93 }

8. Оплатить:
   PATCH /api/orders/my/{id}/pay

9. Оставить отзыв:
   POST /api/reviews  { "stars": 5, "description": "..." }

10. При выходе — удалить токен:
    DELETE /api/notifications/token?token=<FCM_TOKEN>
```

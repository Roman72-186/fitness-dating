# WATBOT API — справочник по спискам проекта fitness-dating

**Base URL:** `https://watbot.ru/api/v1`  
**Auth:** `api_token` в теле POST-запроса  
**Параметр списка:** `schema_id` (не `list_id`!)

---

## Эндпоинты

```
POST /api/v1/getListSchema   — схема полей списка
POST /api/v1/getListItems    — получить элементы с фильтрами и пагинацией
POST /api/v1/addListItem     — добавить элемент (write)
```

**Тело getListItems:**
```json
{
  "api_token": "...",
  "schema_id": "...",
  "filters": { "id_tg_m": "12345" },
  "limit": 100,
  "page": 1
}
```

**Ответ getListItems:**
```json
{
  "data": [...],
  "meta": { "current_page": 1, "last_page": 68, "total": 135, "per_page": 2 }
}
```

Пагинация: `meta.last_page` — количество страниц. По умолчанию limit = 10 (не указан). Рекомендуется: limit 100-500.

---

## Список 1: Анкеты
**schema_id:** `69707769a7b40f826a0d9e22`  
**Записей:** ~135

### Поля (slug → название)

| slug | название | тип | примечание |
|---|---|---|---|
| `klub` | Клуб | string | Например: `"BF_Сити Молл"` |
| `kak_obrashhatsia` | Как обращаться | string | Имя пользователя |
| `s_kem_poznakomitsia` | С кем познакомиться | string | `"С девушками"` / `"С парнями"` / `"Все равно"` |
| `o_sebe` | О себе | string | |
| `foto` | Фото | **image object** | `{ url, name, size, meta: {width, height} }` |
| `gorod` | Город | string | |
| `vozrast` | Возраст | string | Число строкой: `"28"` |
| `client_id` | ID | contact | Внутренний ID контакта WATBOT |
| `nomer` | номер | string | Порядковый номер анкеты |
| `id_tg` | id_tg | string | **Telegram ID пользователя** |
| `pol` | пол | string | `"🙋‍♂️ Мужской"` / `"🙋‍♀️ Женский"` |

**⚠️ Отсутствует:** поле `training_time` (время тренировок) в реальных данных нет.  
**⚠️ `foto`** — объект, URL достается через `.foto.url`. Не строка!

### Пример записи

```json
{
  "id": "69c26b1fa2a80c71010c7cb2",
  "contact_id": 7593711,
  "created_at": "2026-03-24T10:44:47+00:00",
  "updated_at": "2026-04-09T10:27:13+00:00",
  "klub": "BF_Сити Молл",
  "kak_obrashhatsia": "Nikita",
  "s_kem_poznakomitsia": "С девушками",
  "o_sebe": "Tsss",
  "foto": {
    "type": "image",
    "mime_type": "image/jpeg",
    "url": "https://storage.watbot.ru/bots/87556/contacts/7593711/chat/7479ec4e-...jpeg?expires_at=...&sign=...",
    "name": "file_767.jpg",
    "size": 41776,
    "storage": "s3",
    "meta": { "width": 640, "height": 640, "duration": null, "codec": null }
  },
  "gorod": "Тюмень",
  "vozrast": "28",
  "client_id": 7593711,
  "nomer": "200",
  "id_tg": "270703004",
  "pol": "🙋‍♂️ Мужской"
}
```

### Маппинг `pol` → gender

| Значение в WATBOT | gender |
|---|---|
| содержит "Мужской" | `male` |
| содержит "Женский" | `female` |

### Маппинг `s_kem_poznakomitsia` → preference

| Значение в WATBOT | preference |
|---|---|
| содержит "девушк" | `female` |
| содержит "парн" или "мужч" | `male` |
| иное / "Все равно" | `any` |

---

## Список 2: Просмотрено
**schema_id:** `69936100f3fde52dee0c3f42`  
**Записей:** ~97

### Поля

| slug | название | назначение |
|---|---|---|
| `id_tg_m` | id_tg_m | Кто смотрел (viewer) |
| `id_tg` | id_tg | Чью анкету смотрели (target) |

**Пример:** `id_tg_m` видел `id_tg`.

```json
{
  "id": "69c2a3e4e8874484f7079482",
  "created_at": "2026-03-24T14:47:00+00:00",
  "id_tg_m": "1330165438",
  "id_tg": "270703004"
}
```

**Запрос просмотренных для пользователя:**
```json
{ "api_token": "...", "schema_id": "69936100f3fde52dee0c3f42", "filters": { "id_tg_m": "USER_ID" }, "limit": 500 }
```

---

## Список 3: Лайки
**schema_id:** `698ed7fcd1c36079cf06f482`  
**Записей:** ~18

### Поля

Без `_m` суффикса — профиль того, кого **лайкнули** (target).  
С `_m` суффиксом — профиль того, **кто лайкнул** (liker).

| slug | назначение |
|---|---|
| `id_tg` | Telegram ID того, кого лайкнули |
| `nomer` | То же что `id_tg` (дублирует) |
| `imia` | Имя цели |
| `vozrast` | Возраст цели |
| `klub` | Клуб цели |
| `gorod` | Город цели |
| `o_sebe` | О себе цели |
| `foto` | Фото цели (URL строкой, не объектом!) |
| `id_tg_m` | Telegram ID лайкнувшего |
| `imia_m` | Имя лайкнувшего |
| `vozrast_m` | Возраст лайкнувшего |
| `klub_m` | Клуб лайкнувшего |
| `gorod_m` | Город лайкнувшего |
| `o_sebe_m` | О себе лайкнувшего |
| `foto_m` | Фото лайкнувшего (URL строкой) |

**⚠️ `foto` здесь — обычная строка (URL), не объект как в анкетах!**

```json
{
  "id": "69c6328bba101b039d057a22",
  "nomer": "572842175",
  "klub": "BF_Широкая речка",
  "imia": "эндж",
  "o_sebe": "йоу",
  "foto": "https://storage.watbot.ru/...",
  "gorod": "Екатеринбург",
  "vozrast": "24",
  "id_tg": "572842175",
  "klub_m": "BF_Максидом",
  "vozrast_m": "37",
  "imia_m": "ер",
  "o_sebe_m": "апт",
  "foto_m": "https://storage.watbot.ru/...",
  "gorod_m": "Екатеринбург",
  "id_tg_m": "7020407232"
}
```

**Запросы:**
```json
// Кто лайкнул меня (id_tg = мой ID):
{ "filters": { "id_tg": "MY_ID" } }

// Лайкал ли я кого-то (id_tg_m = мой ID):
{ "filters": { "id_tg_m": "MY_ID" } }

// Взаимность: лайкнул ли target меня:
{ "filters": { "id_tg_m": "TARGET_ID", "id_tg": "MY_ID" } }
```

---

## Список 4: Лайки (взаимные) — Мэтчи
**schema_id:** `6994a0d2f1b6aaef1d0f9333`  
**Записей:** ~5

### Поля

Идентичны списку Лайков + дополнительное поле:

| slug | назначение |
|---|---|
| `username` | Telegram username (может быть null) |
| все остальные | аналогично списку Лайки |

```json
{
  "id": "69ca1a04d7a3216bb30f5582",
  "nomer": "7020407232",
  "id_tg": "7020407232",
  "imia": "ер",
  "foto": "https://storage.watbot.ru/...",
  "gorod": "Екатеринбург",
  "vozrast": "37",
  "klub": "BF_Максидом",
  "id_tg_m": "270703004",
  "imia_m": "nik",
  "foto_m": "https://storage.watbot.ru/...",
  "gorod_m": "Екатеринбург",
  "vozrast_m": "21",
  "klub_m": "BF_Широкая речка",
  "username": null
}
```

---

## Ключевые различия от первоначальных предположений

| Что предполагалось | Реальность |
|---|---|
| `list_id` параметр | `schema_id` параметр |
| `from_user_id` / `to_user_id` | `id_tg_m` (liker) / `id_tg` (liked) |
| `photos: string[]` | `foto` — объект в анкетах, строка в лайках |
| `gender: 'male'/'female'` | `pol: "🙋‍♂️ Мужской"` — требует маппинга |
| `preference: 'male'/'female'/'any'` | `s_kem_poznakomitsia: "С девушками"` — требует маппинга |
| `training_time` | **Поля нет в реальных данных** |
| `active` boolean | **Поля нет**, нет флага активности |
| `is_viewed` в лайках | **Поля нет**, просмотры — отдельный список |
| Фото как массив | Одно фото на анкету |

---

## Как работает write (addListItem)

Эндпоинт для записи в список — `POST /api/v1/addListItem`:

```json
{
  "api_token": "...",
  "schema_id": "69936100f3fde52dee0c3f42",
  "id_tg_m": "USER_ID",
  "id_tg": "TARGET_ID"
}
```

Поля передаются прямо в тело запроса (не вложенным объектом).

---

## Статистика списков (апрель 2026)

| Список | schema_id | Записей |
|---|---|---|
| Анкеты | `69707769a7b40f826a0d9e22` | ~135 |
| Просмотрено | `69936100f3fde52dee0c3f42` | ~97 |
| Лайки | `698ed7fcd1c36079cf06f482` | ~18 |
| Лайки взаимные | `6994a0d2f1b6aaef1d0f9333` | ~5 |

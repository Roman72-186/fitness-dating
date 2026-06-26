# Правило: skip не сбрасывается при обновлении анкеты

Дата: 2026-06-26

## Проблема

Пользователь скипал анкету, но она могла снова появиться в ленте после обновления профиля.

Причина была не в фильтре ленты: `/api/feed` и `/api/profiles/next` корректно исключают `target_profile_id` из `fetchActedTargetIds()`. Ошибка была в том, что обычное сохранение анкеты вызывало сброс истории `skip`.

## Правило

`skip` в `profile_actions` — постоянное пользовательское действие. Его нельзя удалять при:

- регистрации или повторной регистрации через `/api/bot/register-profile`;
- создании профиля через `POST /api/profile`;
- обновлении профиля через `PUT /api/profile`;
- синхронизации полей анкеты, фото, города, клуба или описания.

## Где можно удалять skip

Удаление `skip` допустимо только как явное административное действие, где оператор осознанно выбирает сброс пропусков. Сейчас это `/api/admin/reset-views` с параметром `resetSkips`.

## Проверка

1. Пользователь A скипает пользователя B.
2. В `profile_actions` есть запись `viewer_profile_id=A`, `target_profile_id=B`, `action=skip`.
3. Пользователь A обновляет свою анкету.
4. Пользователь B обновляет свою анкету.
5. `/api/feed` и `/api/profiles/next` для A больше не возвращают B.

## Связь с другими файлами

- `src/lib/db.ts`
- `src/app/api/action/route.ts`
- `src/app/api/feed/route.ts`
- `src/app/api/profiles/next/route.ts`
- `src/app/api/bot/register-profile/route.ts`
- `src/app/api/profile/route.ts`
- `src/app/api/admin/reset-views/route.ts`

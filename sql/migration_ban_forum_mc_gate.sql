-- Миграция: временные баны, отдельный бан на форуме
-- Выполнить один раз на существующей базе `nexa`.
use nexa;

-- 1. Срок действия обычной блокировки. NULL + banned=1 = блокировка навсегда;
--    banned_until в будущем = временная блокировка; в прошлом = уже истекла
--    (снимается фоновым воркером в server.js).
ALTER TABLE `users`
  ADD COLUMN `banned_until` DATETIME NULL AFTER `banned_reason`;

-- 2. Отдельная блокировка на форуме — не мешает заходить на сайт/сервер,
--    только запрещает создавать темы и писать комментарии.
ALTER TABLE `users`
  ADD COLUMN `forum_banned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `banned_until`,
  ADD COLUMN `forum_banned_reason` VARCHAR(255) NULL AFTER `forum_banned`,
  ADD COLUMN `forum_banned_until` DATETIME NULL AFTER `forum_banned_reason`;

ALTER TABLE `users`
  ADD KEY `idx_users_ban_sweep` (`banned`, `banned_until`),
  ADD KEY `idx_users_forum_ban_sweep` (`forum_banned`, `forum_banned_until`);

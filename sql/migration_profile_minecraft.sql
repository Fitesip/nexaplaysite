-- Миграция: аватар, смена никнейма, привязка Minecraft-аккаунта
-- Выполнить один раз на существующей базе `nexa`.
use nexa;

-- 1. Аватар и данные привязанного Minecraft-аккаунта
ALTER TABLE `users`
  ADD COLUMN `avatar_url` VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL AFTER `email`,
  ADD COLUMN `minecraft_username` VARCHAR(16) COLLATE utf8mb4_unicode_ci NULL AFTER `avatar_url`,
  ADD COLUMN `minecraft_uuid` CHAR(36) COLLATE utf8mb4_unicode_ci NULL AFTER `minecraft_username`,
  ADD COLUMN `minecraft_linked_at` TIMESTAMP NULL DEFAULT NULL AFTER `minecraft_uuid`,
  ADD UNIQUE KEY `uniq_minecraft_uuid` (`minecraft_uuid`);

-- 2. Заявки на привязку Minecraft-аккаунта (код подтверждения, ждём, пока игрок
--    зайдёт на сервер под этим ником — тогда мы можем проверить его через RCON/статус).
CREATE TABLE `minecraft_link_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `nickname` VARCHAR(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uuid` CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` VARCHAR(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_link_request_user` (`user_id`),
  CONSTRAINT `minecraft_link_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

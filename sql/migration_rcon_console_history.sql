-- Миграция: история RCON-консоли отдельно для каждого сотрудника.
-- Выполнить один раз на существующей базе `nexa`.
use nexa;

CREATE TABLE `rcon_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `kind` ENUM('input','output','error') COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rcon_logs_user` (`user_id`, `created_at`),
  CONSTRAINT `rcon_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

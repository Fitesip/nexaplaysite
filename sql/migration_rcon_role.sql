-- Миграция: отдельная роль с доступом только к RCON.
-- Выполнить один раз на базе `nexa` после sql/migration_admin_panel.sql.
use nexa;

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user','rcon','helper','admin','main_admin')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user';

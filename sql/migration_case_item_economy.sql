-- Миграция: стоимость предметов кейса и компенсации за дубликаты.
-- Выполнить один раз на базе `nexa` после sql/migration_cases_v2.sql.
use nexa;

ALTER TABLE `users`
  ADD COLUMN `game_currency` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `role`;

ALTER TABLE `case_items`
  ADD COLUMN `price_currency` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `image_url`;

UPDATE `case_items`
SET `is_unique` = 1
WHERE `item_type` IN ('privilege', 'cosmetic', 'pet', 'title');

ALTER TABLE `user_cases`
  ADD COLUMN `compensation_amount` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `won_item_image`,
  ADD COLUMN `compensated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `compensation_amount`;

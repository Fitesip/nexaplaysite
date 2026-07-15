-- Миграция: единый справочник стоимости предметов и компенсации за дубликаты.
-- Выполнить один раз на базе `nexa` после sql/migration_cases_v2.sql.
use nexa;

ALTER TABLE `users`
  ADD COLUMN `game_currency` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `role`;

CREATE TABLE `item_prices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_type` ENUM('item','privilege','currency','cosmetic','pet','title','other')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'item',
  `price_currency` INT UNSIGNED NOT NULL DEFAULT 0,
  `available_in_shop` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_prices_identity` (`name`, `item_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `item_prices` (`name`, `item_type`, `price_currency`)
SELECT DISTINCT `name`, `item_type`, 0
FROM `case_items`
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

ALTER TABLE `case_items`
  ADD COLUMN `item_price_id` INT NULL AFTER `case_id`,
  ADD KEY `idx_case_items_price` (`item_price_id`),
  ADD CONSTRAINT `case_items_ibfk_2`
    FOREIGN KEY (`item_price_id`) REFERENCES `item_prices` (`id`);

UPDATE `case_items` ci
JOIN `item_prices` ip ON ip.`name` = ci.`name` AND ip.`item_type` = ci.`item_type`
SET ci.`item_price_id` = ip.`id`;

ALTER TABLE `case_items`
  MODIFY COLUMN `item_price_id` INT NOT NULL;

UPDATE `case_items`
SET `is_unique` = 1
WHERE `item_type` IN ('privilege', 'cosmetic', 'pet', 'title');

ALTER TABLE `user_cases`
  ADD COLUMN `won_item_price_id` INT NULL AFTER `won_case_item_id`,
  ADD COLUMN `compensation_amount` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `won_item_image`,
  ADD COLUMN `compensated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `compensation_amount`,
  ADD KEY `idx_user_cases_won_price` (`won_item_price_id`),
  ADD CONSTRAINT `user_cases_ibfk_4`
    FOREIGN KEY (`won_item_price_id`) REFERENCES `item_prices` (`id`) ON DELETE SET NULL;

UPDATE `user_cases` uc
JOIN `item_prices` ip
  ON ip.`name` = uc.`won_item_name`
  AND ip.`item_type` = COALESCE(uc.`won_item_type`, 'item')
SET uc.`won_item_price_id` = ip.`id`
WHERE uc.`won_item_name` IS NOT NULL;

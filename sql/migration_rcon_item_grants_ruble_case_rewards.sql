-- RCON-выдача товаров/наград и рублёвые награды из кейсов.
-- Выполнить один раз после migration_ruble_balance_referral_rewards.sql.
use nexa;

ALTER TABLE `catalog_items`
  ADD COLUMN `grant_command` VARCHAR(500) COLLATE utf8mb4_unicode_ci NULL AFTER `is_case`;

ALTER TABLE `case_items`
  MODIFY COLUMN `item_type`
    ENUM('item','privilege','currency','cosmetic','pet','title','rubles','other')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'item',
  ADD COLUMN `grant_command` VARCHAR(500) COLLATE utf8mb4_unicode_ci NULL AFTER `price_currency`,
  ADD COLUMN `ruble_amount_kopecks` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `grant_command`;

ALTER TABLE `user_cases`
  MODIFY COLUMN `won_item_type`
    ENUM('item','privilege','currency','cosmetic','pet','title','rubles','other')
    COLLATE utf8mb4_unicode_ci NULL,
  ADD COLUMN `won_grant_command` VARCHAR(500) COLLATE utf8mb4_unicode_ci NULL AFTER `won_item_image`,
  ADD COLUMN `won_ruble_amount_kopecks` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `won_grant_command`;

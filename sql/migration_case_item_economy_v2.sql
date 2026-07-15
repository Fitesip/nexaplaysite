-- Переход с таблицы item_prices на цену непосредственно в case_items.
-- Выполнить только если прежняя версия migration_case_item_economy.sql уже применена.
use nexa;

ALTER TABLE `case_items`
  ADD COLUMN `price_currency` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `image_url`;

UPDATE `case_items` ci
JOIN `item_prices` ip ON ip.`id` = ci.`item_price_id`
SET ci.`price_currency` = ip.`price_currency`;

ALTER TABLE `user_cases`
  DROP FOREIGN KEY `user_cases_ibfk_4`,
  DROP KEY `idx_user_cases_won_price`,
  DROP COLUMN `won_item_price_id`;

ALTER TABLE `case_items`
  DROP FOREIGN KEY `case_items_ibfk_2`,
  DROP KEY `idx_case_items_price`,
  DROP COLUMN `item_price_id`;

DROP TABLE `item_prices`;

-- Рублёвый баланс и вступительный бонус для уже зарегистрированных рефералов.
-- Выполнить один раз после migration_notifications_referrals_reactions_moderation.sql
-- и migration_case_item_economy.sql.
use nexa;

ALTER TABLE `users`
  ADD COLUMN `balance_kopecks` BIGINT UNSIGNED NOT NULL DEFAULT 0 AFTER `game_currency`;

ALTER TABLE `orders`
  ADD COLUMN `checkout_request_id` CHAR(36) COLLATE utf8mb4_unicode_ci NULL AFTER `promo_code`,
  ADD UNIQUE KEY `uniq_orders_user_checkout_request` (`user_id`, `checkout_request_id`);

UPDATE `users`
SET `balance_kopecks` = 2500
WHERE `referred_by` IS NOT NULL;

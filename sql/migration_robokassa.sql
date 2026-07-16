-- Robokassa: pending orders are only fulfilled after a signed ResultURL callback.
-- Apply after migration_ruble_balance_referral_rewards.sql and
-- migration_rcon_item_grants_ruble_case_rewards.sql.

ALTER TABLE `orders`
  MODIFY COLUMN `status`
    ENUM('pending','completed','cancelled')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  ADD COLUMN `payment_token` CHAR(36) COLLATE utf8mb4_unicode_ci NULL
    AFTER `checkout_request_id`,
  ADD COLUMN `paid_at` TIMESTAMP NULL DEFAULT NULL AFTER `payment_token`,
  ADD UNIQUE KEY `uq_orders_payment_token` (`payment_token`);

ALTER TABLE `order_items`
  ADD COLUMN `is_case_snapshot` TINYINT(1) NOT NULL DEFAULT 0 AFTER `qty`,
  ADD COLUMN `grant_command_snapshot` VARCHAR(500) COLLATE utf8mb4_unicode_ci NULL
    AFTER `is_case_snapshot`;

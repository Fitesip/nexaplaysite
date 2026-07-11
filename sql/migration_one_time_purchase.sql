-- Миграция: одноразовые товары (можно купить только один раз на аккаунт).
-- Выполнить один раз на существующей базе `nexa`, после migration_admin_panel.sql.
use nexa;

ALTER TABLE `catalog_items`
  ADD COLUMN `one_time_purchase` TINYINT(1) NOT NULL DEFAULT 0 AFTER `hidden`;

-- Индекс ускоряет проверку "уже покупал ли этот пользователь этот товар"
-- (смотрим на order_items через заказы конкретного пользователя).
ALTER TABLE `order_items`
  ADD KEY `idx_order_items_catalog_item` (`catalog_item_id`);

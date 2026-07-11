-- Миграция: разграничение товаров каталога по игровым режимам.
-- Выполнить один раз на существующей базе `nexa`, после предыдущих миграций.
use nexa;

ALTER TABLE `catalog_items`
  ADD COLUMN `game_mode` ENUM('terryx', 'bloodborne', 'heaven', 'games') NOT NULL DEFAULT 'terryx' AFTER `category`;

-- индекс — публичный каталог всегда фильтрует по режиму
ALTER TABLE `catalog_items`
  ADD KEY `idx_catalog_items_game_mode` (`game_mode`);

-- Снимок режима на момент покупки — чтобы история заказов тоже могла показывать,
-- к какому режиму относился товар, даже если админ потом переназначит/удалит исходный товар.
ALTER TABLE `order_items`
  ADD COLUMN `game_mode` ENUM('terryx', 'bloodborne', 'heaven', 'games') NOT NULL DEFAULT 'terryx' AFTER `catalog_item_id`;

-- Миграция: кейсы v2 — тип дропа, уникальные награды, иконки предметов и «забрать награду».
-- Выполнить один раз на базе `nexa` после sql/migration_cases.sql.
use nexa;

-- 1. Расширяем содержимое кейса: тип дропа, уникальность и иконка предмета.
ALTER TABLE `case_items`
  ADD COLUMN `item_type` ENUM('item','privilege','currency','cosmetic','pet','title','other')
    COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'item' AFTER `rarity`,
  ADD COLUMN `is_unique` TINYINT(1) NOT NULL DEFAULT 0 AFTER `item_type`,
  ADD COLUMN `image_url` VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL AFTER `is_unique`;

-- 2. Инвентарь кейсов: снимок типа/иконки выпавшего предмета + статус «забрано».
ALTER TABLE `user_cases`
  ADD COLUMN `won_item_type` ENUM('item','privilege','currency','cosmetic','pet','title','other')
    COLLATE utf8mb4_unicode_ci NULL AFTER `won_item_rarity`,
  ADD COLUMN `won_item_image` VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL AFTER `won_item_type`,
  ADD COLUMN `claimed` TINYINT(1) NOT NULL DEFAULT 0 AFTER `won_item_image`,
  ADD COLUMN `claimed_at` TIMESTAMP NULL DEFAULT NULL AFTER `claimed`;

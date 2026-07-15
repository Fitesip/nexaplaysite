-- Миграция: кейсы (лутбоксы).
-- Кейс — обычный товар каталога с флагом is_case: его можно купить сколько угодно раз,
-- каждый купленный экземпляр падает в инвентарь пользователя (`user_cases`) и открывается
-- по отдельности. У каждого предмета внутри кейса своя редкость и вес (шанс выпадения).
-- Выполнить один раз на существующей базе `nexa`, после предыдущих миграций.
use nexa;

-- 1. Флаг «этот товар — кейс» на каталоге.
ALTER TABLE `catalog_items`
  ADD COLUMN `is_case` TINYINT(1) NOT NULL DEFAULT 0 AFTER `one_time_purchase`;

-- 2. Содержимое кейса: возможные предметы с редкостью и весом.
--    Шанс выпадения = weight / (сумма weight всех предметов этого кейса).
CREATE TABLE IF NOT EXISTS `case_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `case_id` INT NOT NULL,
  `name` VARCHAR(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rarity` ENUM('common','uncommon','rare','epic','legendary','mythic') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'common',
  `weight` INT NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_case_items_case` (`case_id`),
  CONSTRAINT `case_items_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `catalog_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Инвентарь купленных кейсов: одна строка = один купленный экземпляр кейса.
--    После открытия строка не удаляется, а помечается opened + сохраняет выпавший предмет
--    (снимок названия/редкости — чтобы история осталась даже если админ поменяет кейс).
CREATE TABLE IF NOT EXISTS `user_cases` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `case_id` INT NULL,
  `case_name` VARCHAR(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `game_mode` ENUM('terryx','bloodborne','heaven','games') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'terryx',
  `status` ENUM('unopened','opened') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unopened',
  `won_case_item_id` INT NULL,
  `won_item_name` VARCHAR(120) COLLATE utf8mb4_unicode_ci NULL,
  `won_item_rarity` ENUM('common','uncommon','rare','epic','legendary','mythic') COLLATE utf8mb4_unicode_ci NULL,
  `obtained_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `opened_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_cases_user` (`user_id`, `status`),
  CONSTRAINT `user_cases_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_cases_ibfk_2` FOREIGN KEY (`case_id`) REFERENCES `catalog_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `user_cases_ibfk_3` FOREIGN KEY (`won_case_item_id`) REFERENCES `case_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

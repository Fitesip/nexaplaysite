-- Миграция: админ-панель, роли, история заказов, кол-во товара
-- Выполнить один раз на существующей базе `nexa`.
-- Порядок ALTER важен (сначала расширяем enum, потом используем новые значения).
use nexa;
-- 1. Роли пользователей: user -> helper -> admin -> main_admin
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user','helper','admin','main_admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user';

-- 2. Блокировка пользователей
ALTER TABLE `users`
  ADD COLUMN `banned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `role`,
  ADD COLUMN `banned_reason` VARCHAR(255) NULL AFTER `banned`;

-- Делаем первого существующего admin'а главным администратором (main_admin),
-- чтобы в системе сразу был хотя бы один пользователь с правом назначать админов.
-- Если это не тот человек, кому нужно быть главным - поменяйте вручную:
--   UPDATE users SET role='main_admin' WHERE username='ИМЯ';
UPDATE `users` SET `role` = 'main_admin' WHERE `role` = 'admin' ORDER BY `id` ASC LIMIT 1;

-- 3. Каталог: количество товара (NULL = не ограничено) и скрытие товара
ALTER TABLE `catalog_items`
  ADD COLUMN `stock` INT NULL DEFAULT NULL AFTER `price_rub`,
  ADD COLUMN `hidden` TINYINT(1) NOT NULL DEFAULT 0 AFTER `stock`;

-- 4. История заказов
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;

CREATE TABLE `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `subtotal` INT NOT NULL,
  `discount_amount` INT NOT NULL DEFAULT 0,
  `total` INT NOT NULL,
  `promo_code` VARCHAR(40) COLLATE utf8mb4_unicode_ci NULL,
  `status` ENUM('completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`user_id`, `created_at`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `catalog_item_id` INT NULL,
  `name` VARCHAR(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` INT NOT NULL,
  `qty` INT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Немного демо-товаров в каталог (раньше они были захардкожены во фронтенде)
INSERT INTO `catalog_items` (`name`, `category`, `price_rub`, `stock`, `hidden`, `description`) VALUES
  ('Странник', 'Привилегии', 199, NULL, 0, 'Цветной ник, /kit ежедневно, доступ к /home x3.'),
  ('Хранитель', 'Привилегии', 449, NULL, 0, 'Всё из «Странника» + /fly в своём регионе, /home x6.'),
  ('Легенда', 'Привилегии', 899, NULL, 0, 'Максимальный набор привилегий, приоритетный вход, /home x10.'),
  ('Частицы «Пиксельная буря»', 'Косметика', 149, NULL, 0, 'Эффект частиц вокруг персонажа.'),
  ('Набор питомца', 'Косметика', 129, NULL, 0, 'Компаньон, следующий за игроком по миру.'),
  ('Стартовый набор строителя', 'Наборы', 249, 50, 0, 'Блоки, инструменты и WorldEdit-лицензия на 7 дней.');

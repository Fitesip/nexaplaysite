-- Миграция: форум (категории, темы, теги, комментарии с ответами в 1 уровень вложенности)
-- Выполнить один раз на существующей базе `nexa`.
use nexa;

-- 1. Категории тем ("Общее обсуждение", "Вопросы по игре", "Тех. вопросы" и т.д.)
CREATE TABLE `forum_categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(200) COLLATE utf8mb4_unicode_ci NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Темы форума
CREATE TABLE `forum_topics` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `title` VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_forum_topics_category` (`category_id`, `created_at`),
  KEY `idx_forum_topics_user` (`user_id`),
  CONSTRAINT `forum_topics_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `forum_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_topics_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Теги (общие для всех тем, назначаются many-to-many)
CREATE TABLE `forum_tags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `forum_topic_tags` (
  `topic_id` INT NOT NULL,
  `tag_id` INT NOT NULL,
  PRIMARY KEY (`topic_id`, `tag_id`),
  KEY `idx_forum_topic_tags_tag` (`tag_id`),
  CONSTRAINT `forum_topic_tags_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_topic_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `forum_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Комментарии. Вложенность ограничена одним уровнем:
--    `parent_id`            — id корневого комментария ветки (NULL для комментариев верхнего уровня);
--    `reply_to_comment_id`  — конкретный комментарий, на который отвечают (для подписи «в ответ ник»);
--    если пользователь отвечает на ответ, он всё равно подшивается к тому же `parent_id`,
--    а `reply_to_comment_id` указывает именно на тот вложенный комментарий.
CREATE TABLE `forum_comments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `topic_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `parent_id` INT NULL,
  `reply_to_comment_id` INT NULL,
  `body` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_forum_comments_topic` (`topic_id`, `created_at`),
  KEY `idx_forum_comments_parent` (`parent_id`),
  CONSTRAINT `forum_comments_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `forum_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_comments_ibfk_4` FOREIGN KEY (`reply_to_comment_id`) REFERENCES `forum_comments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Стартовый набор категорий
INSERT INTO `forum_categories` (`slug`, `name`, `description`, `sort_order`) VALUES
  ('general', 'Общее обсуждение', 'Всё, что не подошло под другие разделы.', 0),
  ('gameplay', 'Вопросы по игре', 'Механики, квесты, гильдии, экономика сервера.', 1),
  ('tech', 'Тех. вопросы', 'Проблемы с подключением, лаги, баги, установка модов.', 2),
  ('suggestions', 'Предложения', 'Идеи по развитию сервера и новым фичам.', 3);

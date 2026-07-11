-- Миграция: уведомления, реферальная система, реакции на форуме, жалобы/модерация
-- Выполнить один раз на существующей базе `nexa`. Требует MySQL 8+ (используется CHECK).
use nexa;

-- 1. Уведомления пользователей (ответы на форуме, реакции, рефералы и т.д.)
CREATE TABLE `notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `type` VARCHAR(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` VARCHAR(300) COLLATE utf8mb4_unicode_ci NULL,
  `link` VARCHAR(200) COLLATE utf8mb4_unicode_ci NULL,
  `read_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`, `read_at`, `created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Реферальная система: у каждого юзера свой код, плюс ссылка на того, кто его пригласил
ALTER TABLE `users`
  ADD COLUMN `referral_code` VARCHAR(12) COLLATE utf8mb4_unicode_ci NULL AFTER `role`,
  ADD COLUMN `referred_by` INT NULL AFTER `referral_code`,
  ADD UNIQUE KEY `referral_code` (`referral_code`),
  ADD KEY `idx_users_referred_by` (`referred_by`),
  ADD CONSTRAINT `users_ibfk_referred_by` FOREIGN KEY (`referred_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- backfill кодов для уже существующих пользователей
UPDATE `users` SET `referral_code` = UPPER(SUBSTRING(MD5(CONCAT(id, '-', RAND())), 1, 8)) WHERE `referral_code` IS NULL;

-- 3. Реакции на темы и комментарии форума (эмодзи, по одной реакции каждого вида на юзера)
CREATE TABLE `forum_reactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `topic_id` INT NULL,
  `comment_id` INT NULL,
  `emoji` VARCHAR(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_reaction_topic` (`user_id`, `topic_id`, `emoji`),
  UNIQUE KEY `uniq_reaction_comment` (`user_id`, `comment_id`, `emoji`),
  KEY `idx_forum_reactions_topic` (`topic_id`),
  KEY `idx_forum_reactions_comment` (`comment_id`),
  CONSTRAINT `forum_reactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reactions_ibfk_2` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reactions_ibfk_3` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reaction_target` CHECK ((`topic_id` IS NULL) <> (`comment_id` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Жалобы на темы/комментарии — очередь модерации для helper/admin
CREATE TABLE `forum_reports` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reporter_id` INT NOT NULL,
  `topic_id` INT NULL,
  `comment_id` INT NULL,
  `reason` VARCHAR(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` ENUM('open','resolved','dismissed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `resolved_by` INT NULL,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_forum_reports_status` (`status`, `created_at`),
  KEY `idx_forum_reports_topic` (`topic_id`),
  KEY `idx_forum_reports_comment` (`comment_id`),
  CONSTRAINT `forum_reports_ibfk_1` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reports_ibfk_2` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reports_ibfk_3` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reports_ibfk_4` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

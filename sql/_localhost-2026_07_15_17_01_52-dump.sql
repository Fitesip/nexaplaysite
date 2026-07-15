-- MySQL dump 10.13  Distrib 9.7.0, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: nexa
-- ------------------------------------------------------
-- Server version	9.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'f1ad2683-6372-11f1-b578-02509ad31b1e:1-632';

--
-- Table structure for table `catalog_items`
--

DROP TABLE IF EXISTS `catalog_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalog_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `game_mode` enum('terryx','bloodborne','heaven','games') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'terryx',
  `price_rub` int NOT NULL,
  `stock` int DEFAULT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT '0',
  `one_time_purchase` tinyint(1) NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_catalog_items_game_mode` (`game_mode`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalog_items`
--

LOCK TABLES `catalog_items` WRITE;
/*!40000 ALTER TABLE `catalog_items` DISABLE KEYS */;
INSERT INTO `catalog_items` VALUES (1,'Странник','Привилегии','terryx',199,NULL,1,1,'Цветной ник, /kit ежедневно, доступ к /home x3.','2026-07-11 00:08:37'),(2,'Хранитель','Привилегии','terryx',449,NULL,0,1,'Всё из «Странника» + /fly в своём регионе, /home x6.','2026-07-11 00:08:37'),(3,'Легенда','Привилегии','terryx',899,NULL,0,0,'Максимальный набор привилегий, приоритетный вход, /home x10.','2026-07-11 00:08:37'),(4,'Частицы «Пиксельная буря»','Косметика','terryx',149,NULL,0,0,'Эффект частиц вокруг персонажа.','2026-07-11 00:08:37'),(5,'Набор питомца','Косметика','terryx',129,NULL,0,1,'Компаньон, следующий за игроком по миру.','2026-07-11 00:08:37'),(6,'Стартовый набор строителя','Наборы','terryx',249,2,0,1,'Блоки, инструменты и WorldEdit-лицензия на 7 дней.','2026-07-11 00:08:37'),(7,'Странник','Привилегии','bloodborne',199,NULL,1,1,'Цветной ник, /kit ежедневно, доступ к /home x3.','2026-07-11 00:08:37'),(8,'Хранитель','Привилегии','bloodborne',449,NULL,0,1,'Всё из «Странника» + /fly в своём регионе, /home x6.','2026-07-11 00:08:37'),(9,'Легенда','Привилегии','bloodborne',899,NULL,0,1,'Максимальный набор привилегий, приоритетный вход, /home x10.','2026-07-11 00:08:37'),(10,'Частицы «Пиксельная буря»','Косметика','bloodborne',149,NULL,0,1,'Эффект частиц вокруг персонажа.','2026-07-11 00:08:37'),(11,'Набор питомца','Косметика','bloodborne',129,NULL,0,1,'Компаньон, следующий за игроком по миру.','2026-07-11 00:08:37'),(12,'Стартовый набор строителя','Наборы','bloodborne',249,2,0,1,'Блоки, инструменты и WorldEdit-лицензия на 7 дней.','2026-07-11 00:08:37'),(13,'Странник','Привилегии','heaven',199,NULL,1,1,'Цветной ник, /kit ежедневно, доступ к /home x3.','2026-07-11 00:08:37'),(14,'Хранитель','Привилегии','heaven',449,NULL,0,1,'Всё из «Странника» + /fly в своём регионе, /home x6.','2026-07-11 00:08:37'),(15,'Легенда','Привилегии','heaven',899,NULL,0,1,'Максимальный набор привилегий, приоритетный вход, /home x10.','2026-07-11 00:08:37'),(16,'Частицы «Пиксельная буря»','Косметика','heaven',149,NULL,0,1,'Эффект частиц вокруг персонажа.','2026-07-11 00:08:37'),(17,'Набор питомца','Косметика','heaven',129,NULL,0,1,'Компаньон, следующий за игроком по миру.','2026-07-11 00:08:37'),(18,'Стартовый набор строителя','Наборы','heaven',249,2,0,1,'Блоки, инструменты и WorldEdit-лицензия на 7 дней.','2026-07-11 00:08:37'),(19,'Странник','Привилегии','games',199,NULL,1,1,'Цветной ник, /kit ежедневно, доступ к /home x3.','2026-07-11 00:08:37'),(20,'Хранитель','Привилегии','games',449,NULL,0,1,'Всё из «Странника» + /fly в своём регионе, /home x6.','2026-07-11 00:08:37'),(21,'Легенда','Привилегии','games',899,NULL,0,1,'Максимальный набор привилегий, приоритетный вход, /home x10.','2026-07-11 00:08:37'),(22,'Частицы «Пиксельная буря»','Косметика','games',149,NULL,0,1,'Эффект частиц вокруг персонажа.','2026-07-11 00:08:37'),(23,'Набор питомца','Косметика','games',129,NULL,0,1,'Компаньон, следующий за игроком по миру.','2026-07-11 00:08:37'),(24,'Стартовый набор строителя','Наборы','games',249,2,0,1,'Блоки, инструменты и WorldEdit-лицензия на 7 дней.','2026-07-11 00:08:37'),(25,'Hui1','Привилегии','heaven',199,NULL,1,1,'Цветной ник, /kit ежедневно, доступ к /home x3.','2026-07-11 00:08:37'),(26,'Hui2','Привилегии','heaven',449,NULL,0,1,'Всё из «Странника» + /fly в своём регионе, /home x6.','2026-07-11 00:08:37'),(27,'Hui3','Привилегии','heaven',899,NULL,0,1,'Максимальный набор привилегий, приоритетный вход, /home x10.','2026-07-11 00:08:37'),(28,'Hui4','Косметика','heaven',149,NULL,0,1,'Эффект частиц вокруг персонажа.','2026-07-11 00:08:37'),(29,'Hui5','Косметика','heaven',129,NULL,0,1,'Компаньон, следующий за игроком по миру.','2026-07-11 00:08:37'),(30,'Hui6','Наборы','heaven',249,2,0,1,'Блоки, инструменты и WorldEdit-лицензия на 7 дней.','2026-07-11 00:08:37'),(31,'Странник','Привилегии','terryx',199,NULL,1,1,'Цветной ник, /kit ежедневно, доступ к /home x3.','2026-07-11 00:08:37'),(32,'Хранитель','Привилегии','terryx',449,NULL,0,1,'Всё из «Странника» + /fly в своём регионе, /home x6.','2026-07-11 00:08:37'),(33,'Легенда','Привилегии','terryx',899,NULL,0,1,'Максимальный набор привилегий, приоритетный вход, /home x10.','2026-07-11 00:08:37'),(34,'Частицы «Пиксельная буря»','Косметика','terryx',149,NULL,0,1,'Эффект частиц вокруг персонажа.','2026-07-11 00:08:37'),(35,'Набор питомца','Косметика','terryx',129,NULL,0,1,'Компаньон, следующий за игроком по миру.','2026-07-11 00:08:37'),(36,'Стартовый набор строителя','Наборы','terryx',249,2,0,1,'Блоки, инструменты и WorldEdit-лицензия на 7 дней.','2026-07-11 00:08:37'),(37,'Странник','Привилегии','bloodborne',199,NULL,1,1,'Цветной ник, /kit ежедневно, доступ к /home x3.','2026-07-11 00:08:37'),(38,'Хранитель','Привилегии','bloodborne',449,NULL,0,1,'Всё из «Странника» + /fly в своём регионе, /home x6.','2026-07-11 00:08:37'),(39,'Легенда','Привилегии','bloodborne',899,NULL,0,1,'Максимальный набор привилегий, приоритетный вход, /home x10.','2026-07-11 00:08:37'),(40,'Частицы «Пиксельная буря»','Косметика','bloodborne',149,NULL,0,0,'Эффект частиц вокруг персонажа.','2026-07-11 00:08:37'),(41,'Набор питомца','Косметика','bloodborne',129,NULL,0,1,'Компаньон, следующий за игроком по миру.','2026-07-11 00:08:37'),(42,'Стартовый набор строителя','Наборы','bloodborne',249,2,0,1,'Блоки, инструменты и WorldEdit-лицензия на 7 дней.','2026-07-11 00:08:37'),(43,'Странник','Привилегии','games',199,NULL,1,1,'Цветной ник, /kit ежедневно, доступ к /home x3.','2026-07-11 00:08:37'),(44,'Хранитель','Привилегии','games',449,NULL,0,1,'Всё из «Странника» + /fly в своём регионе, /home x6.','2026-07-11 00:08:37'),(45,'Легенда','Привилегии','games',899,NULL,0,1,'Максимальный набор привилегий, приоритетный вход, /home x10.','2026-07-11 00:08:37'),(46,'Частицы «Пиксельная буря»','Косметика','games',149,NULL,0,1,'Эффект частиц вокруг персонажа.','2026-07-11 00:08:37'),(47,'Набор питомца','Косметика','games',129,NULL,0,1,'Компаньон, следующий за игроком по миру.','2026-07-11 00:08:37'),(48,'Стартовый набор строителя','Наборы','games',249,2,0,1,'Блоки, инструменты и WorldEdit-лицензия на 7 дней.','2026-07-11 00:08:37');
/*!40000 ALTER TABLE `catalog_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_messages`
--

DROP TABLE IF EXISTS `contact_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contact_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `topic` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_messages`
--

LOCK TABLES `contact_messages` WRITE;
/*!40000 ALTER TABLE `contact_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_categories`
--

DROP TABLE IF EXISTS `forum_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_categories`
--

LOCK TABLES `forum_categories` WRITE;
/*!40000 ALTER TABLE `forum_categories` DISABLE KEYS */;
INSERT INTO `forum_categories` VALUES (1,'general','Общее обсуждение','Всё, что не подошло под другие разделы.',0,'2026-07-11 01:04:25'),(2,'gameplay','Вопросы по игре','Механики, квесты, гильдии, экономика сервера.',1,'2026-07-11 01:04:25'),(3,'tech','Тех. вопросы','Проблемы с подключением, лаги, баги, установка модов.',2,'2026-07-11 01:04:25'),(4,'suggestions','Предложения','Идеи по развитию сервера и новым фичам.',3,'2026-07-11 01:04:25');
/*!40000 ALTER TABLE `forum_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_comments`
--

DROP TABLE IF EXISTS `forum_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `topic_id` int NOT NULL,
  `user_id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `reply_to_comment_id` int DEFAULT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_forum_comments_topic` (`topic_id`,`created_at`),
  KEY `idx_forum_comments_parent` (`parent_id`),
  KEY `forum_comments_ibfk_2` (`user_id`),
  KEY `forum_comments_ibfk_4` (`reply_to_comment_id`),
  CONSTRAINT `forum_comments_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `forum_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_comments_ibfk_4` FOREIGN KEY (`reply_to_comment_id`) REFERENCES `forum_comments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_comments`
--

LOCK TABLES `forum_comments` WRITE;
/*!40000 ALTER TABLE `forum_comments` DISABLE KEYS */;
INSERT INTO `forum_comments` VALUES (1,1,2,NULL,NULL,'ХУЙЙЙЙ','2026-07-11 01:05:34'),(2,1,1,1,1,'сам ты хуй сука','2026-07-11 01:05:44'),(3,1,2,NULL,NULL,'ладно не хуй','2026-07-11 01:05:49'),(4,1,1,3,3,'так то лучше','2026-07-11 01:05:56'),(5,1,2,1,2,'соси','2026-07-11 01:05:59'),(6,1,2,3,4,'ХУУУУУУУУУУУУУУЙ','2026-07-11 02:04:58');
/*!40000 ALTER TABLE `forum_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_reactions`
--

DROP TABLE IF EXISTS `forum_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_reactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `topic_id` int DEFAULT NULL,
  `comment_id` int DEFAULT NULL,
  `emoji` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_reaction_topic` (`user_id`,`topic_id`,`emoji`),
  UNIQUE KEY `uniq_reaction_comment` (`user_id`,`comment_id`,`emoji`),
  KEY `idx_forum_reactions_topic` (`topic_id`),
  KEY `idx_forum_reactions_comment` (`comment_id`),
  CONSTRAINT `forum_reactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reactions_ibfk_2` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reactions_ibfk_3` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reaction_target` CHECK (((`topic_id` is null) <> (`comment_id` is null)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_reactions`
--

LOCK TABLES `forum_reactions` WRITE;
/*!40000 ALTER TABLE `forum_reactions` DISABLE KEYS */;
INSERT INTO `forum_reactions` VALUES (3,2,NULL,4,'❤️','2026-07-11 02:04:47'),(4,2,NULL,4,'😮','2026-07-11 02:04:48');
/*!40000 ALTER TABLE `forum_reactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_reports`
--

DROP TABLE IF EXISTS `forum_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reporter_id` int NOT NULL,
  `topic_id` int DEFAULT NULL,
  `comment_id` int DEFAULT NULL,
  `reason` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('open','resolved','dismissed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `resolved_by` int DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_forum_reports_status` (`status`,`created_at`),
  KEY `idx_forum_reports_topic` (`topic_id`),
  KEY `idx_forum_reports_comment` (`comment_id`),
  KEY `forum_reports_ibfk_1` (`reporter_id`),
  KEY `forum_reports_ibfk_4` (`resolved_by`),
  CONSTRAINT `forum_reports_ibfk_1` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reports_ibfk_2` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reports_ibfk_3` FOREIGN KEY (`comment_id`) REFERENCES `forum_comments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_reports_ibfk_4` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_reports`
--

LOCK TABLES `forum_reports` WRITE;
/*!40000 ALTER TABLE `forum_reports` DISABLE KEYS */;
INSERT INTO `forum_reports` VALUES (1,2,NULL,4,'ПИДОР','dismissed',1,'2026-07-11 02:07:08','2026-07-11 02:04:53');
/*!40000 ALTER TABLE `forum_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_tags`
--

DROP TABLE IF EXISTS `forum_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_tags`
--

LOCK TABLES `forum_tags` WRITE;
/*!40000 ALTER TABLE `forum_tags` DISABLE KEYS */;
INSERT INTO `forum_tags` VALUES (4,'а'),(2,'залупа'),(3,'пиздец'),(1,'хуй'),(5,'ываываыв');
/*!40000 ALTER TABLE `forum_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_topic_tags`
--

DROP TABLE IF EXISTS `forum_topic_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_topic_tags` (
  `topic_id` int NOT NULL,
  `tag_id` int NOT NULL,
  PRIMARY KEY (`topic_id`,`tag_id`),
  KEY `idx_forum_topic_tags_tag` (`tag_id`),
  CONSTRAINT `forum_topic_tags_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `forum_topics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_topic_tags_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `forum_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_topic_tags`
--

LOCK TABLES `forum_topic_tags` WRITE;
/*!40000 ALTER TABLE `forum_topic_tags` DISABLE KEYS */;
INSERT INTO `forum_topic_tags` VALUES (1,1),(1,2),(1,3);
/*!40000 ALTER TABLE `forum_topic_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_topics`
--

DROP TABLE IF EXISTS `forum_topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_topics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pinned` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_forum_topics_category` (`category_id`,`created_at`),
  KEY `idx_forum_topics_user` (`user_id`),
  CONSTRAINT `forum_topics_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `forum_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_topics_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_topics`
--

LOCK TABLES `forum_topics` WRITE;
/*!40000 ALTER TABLE `forum_topics` DISABLE KEYS */;
INSERT INTO `forum_topics` VALUES (1,1,1,'Сиске','Писке сиске хуиске',0,'2026-07-11 01:05:03');
/*!40000 ALTER TABLE `forum_topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `minecraft_link_requests`
--

DROP TABLE IF EXISTS `minecraft_link_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `minecraft_link_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `nickname` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_link_request_user` (`user_id`),
  CONSTRAINT `minecraft_link_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `minecraft_link_requests`
--

LOCK TABLES `minecraft_link_requests` WRITE;
/*!40000 ALTER TABLE `minecraft_link_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `minecraft_link_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `news`
--

DROP TABLE IF EXISTS `news`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `news` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `pinned` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `news`
--

LOCK TABLES `news` WRITE;
/*!40000 ALTER TABLE `news` DISABLE KEYS */;
INSERT INTO `news` VALUES (1,'Открытие сезона 3','Новая карта, обновлённая экономика и свежие подземелья уже доступны.','Сезон 3 стартовал: карта перегенерирована, добавлены три новых авторских подземелья и переработана система торговых гильдий. Все привилегии сезона 2 переносятся автоматически.',0,'2026-07-10 20:32:47'),(2,'Обновление магазина','В каталоге появились новые косметические наборы.','Мы добавили несколько новых косметических наборов и обновили цены на часть привилегий с учётом обратной связи от игроков.',1,'2026-07-10 20:32:47'),(3,'Плановые технические работы','Сервер будет недоступен несколько минут во время обновления.','В ближайшую субботу с 04:00 до 05:00 по МСК пройдут плановые технические работы, связанные с обновлением ядра сервера. Просим отнестись с пониманием.',0,'2026-07-10 20:32:47');
/*!40000 ALTER TABLE `news` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`,`read_at`,`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'forum_reaction','Кто-то отреагировал на вашу тему','❤️','#forum/topic/1','2026-07-11 02:05:23','2026-07-11 02:03:34'),(2,1,'forum_reaction','Кто-то отреагировал на ваш комментарий','❤️','#forum/topic/1','2026-07-11 02:05:23','2026-07-11 02:04:44'),(3,1,'forum_reaction','Кто-то отреагировал на ваш комментарий','❤️','#forum/topic/1','2026-07-11 02:05:23','2026-07-11 02:04:47'),(4,1,'forum_reaction','Кто-то отреагировал на ваш комментарий','😮','#forum/topic/1','2026-07-11 02:05:10','2026-07-11 02:04:48'),(5,1,'forum_reply','Новый комментарий в вашей теме','Сиске','#forum/topic/1','2026-07-11 02:05:17','2026-07-11 02:04:58'),(6,2,'moderation','Ваша тема была удалена модератором','аывавыа',NULL,'2026-07-11 16:54:02','2026-07-11 02:08:17'),(7,2,'support_reply','Ответ от поддержки',',,,,,','#cabinet','2026-07-11 16:54:02','2026-07-11 16:53:48'),(8,2,'support_reply','Ответ от поддержки','рмиораировк','#cabinet','2026-07-11 17:27:19','2026-07-11 16:54:05'),(9,2,'support_reply','Ответ от поддержки','dada','#cabinet','2026-07-11 17:27:19','2026-07-11 17:00:13'),(10,2,'support_reply','Ответ от поддержки','sam','#cabinet','2026-07-11 17:27:19','2026-07-11 17:00:32'),(11,2,'support_reply','Ответ от поддержки','sam','#cabinet','2026-07-11 17:27:19','2026-07-11 17:19:45'),(12,2,'support_reply','Ответ от поддержки','net ti','#cabinet','2026-07-11 17:27:19','2026-07-11 17:19:55'),(13,2,'support_reply','Ответ от поддержки','фыавываывааываыв','#cabinet','2026-07-11 17:27:19','2026-07-11 17:20:08'),(14,2,'support_reply','Ответ от поддержки','trewertrdte','#cabinet','2026-07-11 17:27:19','2026-07-11 17:26:01'),(15,2,'support_reply','Ответ от поддержки','ыфавыаыв','#cabinet',NULL,'2026-07-11 17:27:22'),(16,2,'support_reply','Ответ от поддержки','сячсячэ','#cabinet',NULL,'2026-07-11 17:43:19'),(17,2,'support_reply','Ответ от поддержки','выфвфыв','#cabinet',NULL,'2026-07-11 17:44:46'),(18,2,'support_reply','Ответ от поддержки','аниче','#cabinet',NULL,'2026-07-11 17:45:01'),(19,2,'support_reply','Ответ от поддержки','прохладнло','#cabinet',NULL,'2026-07-11 17:45:27'),(20,2,'support_reply','Ответ от поддержки','&&&&&','#cabinet',NULL,'2026-07-11 18:33:43'),(21,2,'support_reply','Ответ от поддержки','kek','#cabinet',NULL,'2026-07-11 18:33:49'),(22,2,'support_reply','Ответ от поддержки','ура работает сука','#cabinet',NULL,'2026-07-11 18:44:39'),(23,2,'support_reply','Ответ от поддержки','Ыфь еш зшылф','#cabinet',NULL,'2026-07-14 11:02:11'),(24,2,'support_reply','Ответ от поддержки','ладно','#cabinet',NULL,'2026-07-14 11:02:20'),(25,2,'support_reply','Ответ от поддержки','че???','#cabinet',NULL,'2026-07-14 11:02:26'),(26,2,'support_ticket_closed','Тикет закрыт','Ваше обращение в поддержку было закрыто. Если проблема не решена — создайте новый тикет.','#cabinet',NULL,'2026-07-14 11:09:48'),(27,2,'support_ticket_closed','Тикет закрыт','Ваше обращение в поддержку было закрыто. Если проблема не решена — создайте новый тикет.','#cabinet',NULL,'2026-07-14 11:10:30'),(28,2,'support_reply','Ответ от поддержки','уедлокулепкудолекдул','#cabinet',NULL,'2026-07-14 22:38:43'),(29,2,'support_reply','Ответ от поддержки','екуекуеку','#cabinet',NULL,'2026-07-14 22:38:51'),(30,2,'support_reply','Ответ от поддержки','аывавы','#cabinet',NULL,'2026-07-14 22:39:30'),(31,2,'support_reply','Ответ от поддержки','павпав','#cabinet',NULL,'2026-07-14 22:41:34'),(32,2,'support_reply','Ответ от поддержки','супар','#cabinet',NULL,'2026-07-14 22:41:37'),(33,2,'support_reply','Ответ от поддержки','павпав','#cabinet',NULL,'2026-07-14 22:41:41'),(34,2,'support_reply','Ответ от поддержки','павпавпва','#cabinet',NULL,'2026-07-14 22:41:43'),(35,2,'support_reply','Ответ от поддержки','пукукеку','#cabinet',NULL,'2026-07-14 22:41:45'),(36,2,'support_reply','Ответ от поддержки','уке','#cabinet',NULL,'2026-07-14 22:41:45'),(37,2,'support_reply','Ответ от поддержки','куе','#cabinet',NULL,'2026-07-14 22:41:46'),(38,2,'support_reply','Ответ от поддержки','п','#cabinet',NULL,'2026-07-14 22:41:47'),(39,2,'support_reply','Ответ от поддержки','авыаыв','#cabinet',NULL,'2026-07-14 22:46:27'),(40,2,'support_reply','Ответ от поддержки','аываыва','#cabinet',NULL,'2026-07-14 22:46:28'),(41,2,'support_reply','Ответ от поддержки','аываыва','#cabinet',NULL,'2026-07-14 22:46:29'),(42,2,'support_reply','Ответ от поддержки','см','#cabinet',NULL,'2026-07-14 22:46:29'),(43,2,'support_reply','Ответ от поддержки','м','#cabinet',NULL,'2026-07-14 22:46:30'),(44,2,'support_reply','Ответ от поддержки','м','#cabinet',NULL,'2026-07-14 22:46:30'),(45,2,'support_reply','Ответ от поддержки','?????????','#cabinet',NULL,'2026-07-14 22:46:32'),(46,2,'support_reply','Ответ от поддержки','в','#cabinet',NULL,'2026-07-14 22:56:08'),(47,2,'support_reply','Ответ от поддержки','в','#cabinet',NULL,'2026-07-14 22:56:08'),(48,2,'support_reply','Ответ от поддержки','в','#cabinet',NULL,'2026-07-14 22:56:09'),(49,2,'support_reply','Ответ от поддержки','в','#cabinet',NULL,'2026-07-14 22:56:11'),(50,2,'support_reply','Ответ от поддержки','вуйц','#cabinet',NULL,'2026-07-14 22:56:12'),(51,2,'support_reply','Ответ от поддержки','фваыфывфы','#cabinet',NULL,'2026-07-14 22:56:13'),(52,2,'support_reply','Ответ от поддержки','савячсяч','#cabinet',NULL,'2026-07-14 22:56:14'),(53,2,'support_reply','Ответ от поддержки','выфвфывфы','#cabinet',NULL,'2026-07-14 22:56:21'),(54,2,'support_reply','Ответ от поддержки','сячсяч','#cabinet',NULL,'2026-07-14 22:56:22'),(55,2,'support_reply','Ответ от поддержки','мсчмчс','#cabinet',NULL,'2026-07-14 22:56:23'),(56,2,'support_reply','Ответ от поддержки','вфывфыв','#cabinet',NULL,'2026-07-14 23:03:34'),(57,2,'support_reply','Ответ от поддержки','вфывфывфы','#cabinet',NULL,'2026-07-14 23:03:35'),(58,2,'support_reply','Ответ от поддержки','вфывфывфыв','#cabinet',NULL,'2026-07-14 23:03:36'),(59,2,'support_reply','Ответ от поддержки','вфывфывфыв','#cabinet',NULL,'2026-07-14 23:03:37'),(60,2,'support_reply','Ответ от поддержки','другое дело','#cabinet',NULL,'2026-07-14 23:32:27');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `catalog_item_id` int DEFAULT NULL,
  `game_mode` enum('terryx','bloodborne','heaven','games') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'terryx',
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` int NOT NULL,
  `qty` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_catalog_item` (`catalog_item_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`catalog_item_id`) REFERENCES `catalog_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `subtotal` int NOT NULL,
  `discount_amount` int NOT NULL DEFAULT '0',
  `total` int NOT NULL,
  `promo_code` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`user_id`,`created_at`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promocodes`
--

DROP TABLE IF EXISTS `promocodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promocodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_type` enum('percent','fixed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'percent',
  `discount_value` int NOT NULL,
  `max_uses` int DEFAULT NULL,
  `used_count` int NOT NULL DEFAULT '0',
  `min_subtotal` int NOT NULL DEFAULT '0',
  `expires_at` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promocodes`
--

LOCK TABLES `promocodes` WRITE;
/*!40000 ALTER TABLE `promocodes` DISABLE KEYS */;
INSERT INTO `promocodes` VALUES (1,'WELCOME10','percent',10,NULL,0,0,NULL,1,'2026-07-10 20:32:47'),(2,'NEXA200','fixed',200,100,0,500,NULL,1,'2026-07-10 20:32:47'),(3,'PIDOR','percent',100,NULL,0,0,NULL,1,'2026-07-10 20:46:55');
/*!40000 ALTER TABLE `promocodes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rcon_logs`
--

DROP TABLE IF EXISTS `rcon_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rcon_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `kind` enum('input','output','error') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rcon_logs_user` (`user_id`,`created_at`),
  CONSTRAINT `rcon_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rcon_logs`
--

LOCK TABLES `rcon_logs` WRITE;
/*!40000 ALTER TABLE `rcon_logs` DISABLE KEYS */;
INSERT INTO `rcon_logs` VALUES (1,2,'input','tps','2026-07-11 15:48:50'),(2,2,'output','§6TPS from last 1m, 5m, 15m: §a20.0§r, §a20.0§r, §a19.72','2026-07-11 15:48:50'),(3,2,'input','say SUS','2026-07-11 15:48:58'),(4,2,'output','(сервер вернул пустой ответ — команда выполнена)','2026-07-11 15:48:58'),(5,2,'input','tell Fitesip HUIIIII','2026-07-11 15:49:05'),(6,2,'output','§cThis command is only for players.','2026-07-11 15:49:05'),(7,2,'input','msg Fitesip HUIIIII','2026-07-11 15:49:14'),(8,2,'output','§cThis command is only for players.','2026-07-11 15:49:14'),(9,2,'input','suka','2026-07-11 15:49:17'),(10,2,'output','Unknown command. Type \"/help\" for help.','2026-07-11 15:49:17'),(11,2,'input','tps','2026-07-11 15:49:26'),(12,2,'output','§6TPS from last 1m, 5m, 15m: §a20.0§r, §a20.0§r, §a20.0','2026-07-11 15:49:26'),(13,2,'input','say Привет с сайта!','2026-07-11 15:49:57'),(14,2,'output','(сервер вернул пустой ответ — команда выполнена)','2026-07-11 15:49:57'),(15,1,'input','list','2026-07-14 11:12:13'),(16,1,'error','Не удалось подключиться к серверу по RCON. Проверьте, что сервер запущен, RCON включён (enable-rcon=true) и адрес/порт/пароль в .env верны.','2026-07-14 11:12:13');
/*!40000 ALTER TABLE `rcon_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_attachments`
--

DROP TABLE IF EXISTS `support_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_attachments_message` (`message_id`),
  CONSTRAINT `support_attachments_message_fk` FOREIGN KEY (`message_id`) REFERENCES `support_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_attachments`
--

LOCK TABLES `support_attachments` WRITE;
/*!40000 ALTER TABLE `support_attachments` DISABLE KEYS */;
INSERT INTO `support_attachments` VALUES (1,50,'/uploads/support/4/fcbce427-3941-4f72-ae30-8b86589deee3.jpg','Scan_20260304_211707.jpg','image/jpeg',1250678,'2026-07-14 10:59:50'),(2,50,'/uploads/support/4/73cbe802-2744-4d97-af5f-d2895d8308a2.jpg','Scan_20260304_211838.jpg','image/jpeg',1267855,'2026-07-14 10:59:50'),(3,50,'/uploads/support/4/4090af82-3435-4847-ab8b-9d3a922710f5.jpg','Scan_20260409_235845.jpg','image/jpeg',4102847,'2026-07-14 10:59:50'),(4,50,'/uploads/support/4/83b44f71-de59-4828-a202-500e3e143e6d.jpg','Scan_20260409_235954_001.jpg','image/jpeg',3230640,'2026-07-14 10:59:50'),(5,50,'/uploads/support/4/f3379cc6-bd15-491f-952e-bef5d8c7371c.jpg','Scan_20260615_003808.jpg','image/jpeg',1776533,'2026-07-14 10:59:50'),(6,50,'/uploads/support/4/b81d6efb-5ccf-463f-b288-02c324d69b6b.jpg','Scan_20260615_233207.jpg','image/jpeg',2790546,'2026-07-14 10:59:50'),(7,50,'/uploads/support/4/5e2bb208-1599-4de7-b8b5-2766ea4e7c3f.jpg','Scan_20260615_233423.jpg','image/jpeg',7501734,'2026-07-14 10:59:50'),(8,50,'/uploads/support/4/bbf174ee-844f-4850-9a42-e40b941c1001.jpg','Scan_20260622_100605.jpg','image/jpeg',5905601,'2026-07-14 10:59:50'),(9,50,'/uploads/support/4/2e9f772e-3988-4f59-8c15-8cc9981babf7.jpg','Scan_20260622_100605_001.jpg','image/jpeg',3749049,'2026-07-14 10:59:50'),(10,50,'/uploads/support/4/6894ccb5-5894-4248-a407-a88685276176.jpg','Scan_20260629_145734.jpg','image/jpeg',1845603,'2026-07-14 10:59:50'),(11,56,'/uploads/support/5/b47b4015-c8a8-4179-9e6f-f1f048d4ae44.jpg','Scan_20260304_211707.jpg','image/jpeg',1250678,'2026-07-14 11:10:01'),(12,56,'/uploads/support/5/04388c85-848c-482d-af4a-47eb1ea7f9cd.jpg','Scan_20260304_211838.jpg','image/jpeg',1267855,'2026-07-14 11:10:01'),(13,56,'/uploads/support/5/a02b0472-180f-45e2-8a82-82af8a788779.jpg','Scan_20260409_235845.jpg','image/jpeg',4102847,'2026-07-14 11:10:01'),(14,56,'/uploads/support/5/09849ac7-b9bd-44a9-b182-61d757159295.jpg','Scan_20260409_235954_001.jpg','image/jpeg',3230640,'2026-07-14 11:10:01'),(15,56,'/uploads/support/5/de3d8336-d2d3-4071-8cd4-87e3e14ca9df.jpg','Scan_20260615_003808.jpg','image/jpeg',1776533,'2026-07-14 11:10:01'),(16,75,'/uploads/support/6/60ab80ba-0225-4b66-8da7-7393122cb009.jpg','Scan_20260304_211838.jpg','image/jpeg',1267855,'2026-07-14 22:20:29');
/*!40000 ALTER TABLE `support_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_messages`
--

DROP TABLE IF EXISTS `support_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ticket_id` int NOT NULL,
  `sender_role` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` int NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_by_admin` tinyint(1) NOT NULL DEFAULT '0',
  `read_by_user` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_user` (`user_id`,`created_at`),
  KEY `idx_support_messages_ticket` (`ticket_id`,`created_at`),
  CONSTRAINT `support_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `support_messages_ticket_fk` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=135 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_messages`
--

LOCK TABLES `support_messages` WRITE;
/*!40000 ALTER TABLE `support_messages` DISABLE KEYS */;
INSERT INTO `support_messages` VALUES (1,1,1,'user',1,'Piska',1,1,'2026-07-10 21:27:39'),(2,1,1,'admin',1,'Sosiska',1,1,'2026-07-10 21:27:48'),(3,1,1,'user',1,'Ladno',1,1,'2026-07-10 21:27:55'),(4,1,1,'user',1,'3542etghsrgew',1,1,'2026-07-10 21:42:36'),(5,1,1,'admin',1,'poshel nahui',1,1,'2026-07-10 21:42:46'),(6,2,2,'user',2,'fsdfds',1,1,'2026-07-11 00:24:37'),(7,2,2,'user',2,'&&&',1,1,'2026-07-11 00:24:46'),(8,2,2,'user',2,'3121312',1,1,'2026-07-11 00:24:51'),(9,2,2,'user',2,'htdfgfgh',1,1,'2026-07-11 00:26:18'),(10,2,2,'admin',1,'tr534tr4e',1,1,'2026-07-11 00:26:36'),(11,2,2,'admin',1,'паывапвап',1,1,'2026-07-11 02:04:24'),(12,2,2,'admin',1,'пвапвапав',1,1,'2026-07-11 02:04:30'),(13,1,1,'admin',2,'2пеарпапрпарпарап',1,1,'2026-07-11 02:06:04'),(14,2,2,'admin',1,',,,,,',1,1,'2026-07-11 16:53:48'),(15,2,2,'admin',1,'рмиораировк',1,1,'2026-07-11 16:54:05'),(16,2,2,'user',2,'аываывавы',1,1,'2026-07-11 16:54:07'),(17,2,2,'user',2,'СУКА(((',1,1,'2026-07-11 16:54:11'),(18,2,2,'admin',1,'dada',1,1,'2026-07-11 17:00:13'),(19,2,2,'user',2,'PIZDA SUKA',1,1,'2026-07-11 17:00:21'),(20,2,2,'admin',1,'sam',1,1,'2026-07-11 17:00:32'),(21,2,2,'user',2,'suchka',1,1,'2026-07-11 17:19:29'),(22,2,2,'admin',1,'sam',1,1,'2026-07-11 17:19:45'),(23,2,2,'user',2,'net ti',1,1,'2026-07-11 17:19:50'),(24,2,2,'admin',1,'net ti',1,1,'2026-07-11 17:19:55'),(25,2,2,'admin',1,'фыавываывааываыв',1,1,'2026-07-11 17:20:08'),(26,2,2,'user',2,'тол',1,1,'2026-07-11 17:24:50'),(27,2,2,'user',2,'gdffgdbdfg',1,1,'2026-07-11 17:25:56'),(28,2,2,'admin',1,'trewertrdte',1,1,'2026-07-11 17:26:01'),(29,2,2,'user',2,'qreewrewrw',1,1,'2026-07-11 17:26:07'),(30,2,2,'admin',1,'ыфавыаыв',1,1,'2026-07-11 17:27:22'),(31,2,2,'user',2,'екууке',1,1,'2026-07-11 17:29:23'),(32,2,2,'user',2,'паввап',1,1,'2026-07-11 17:43:11'),(33,2,2,'admin',1,'сячсячэ',1,1,'2026-07-11 17:43:19'),(34,2,2,'user',2,'ыфвыфв',1,1,'2026-07-11 17:44:38'),(35,2,2,'admin',1,'выфвфыв',1,1,'2026-07-11 17:44:46'),(36,2,2,'user',2,'че',1,1,'2026-07-11 17:44:50'),(37,2,2,'admin',1,'аниче',1,1,'2026-07-11 17:45:01'),(38,2,2,'user',2,'ладно',1,1,'2026-07-11 17:45:13'),(39,2,2,'admin',1,'прохладнло',1,1,'2026-07-11 17:45:27'),(40,2,2,'user',2,'ывааыв',1,1,'2026-07-11 17:48:25'),(41,2,2,'user',2,'фвыфыв',1,1,'2026-07-11 17:51:09'),(42,2,2,'user',2,'adssdasda',1,1,'2026-07-11 17:55:48'),(43,2,2,'user',2,'rkjghdjfskg',1,1,'2026-07-11 18:33:30'),(44,2,2,'admin',1,'&&&&&',1,1,'2026-07-11 18:33:43'),(45,2,2,'user',2,'lol',1,1,'2026-07-11 18:33:47'),(46,2,2,'admin',1,'kek',1,1,'2026-07-11 18:33:49'),(47,2,2,'user',2,'ваппва',1,1,'2026-07-11 18:37:26'),(48,2,2,'user',2,'аыыва',1,1,'2026-07-11 18:44:33'),(49,2,2,'admin',1,'ура работает сука',1,1,'2026-07-11 18:44:39'),(50,2,4,'user',2,'Ppiska',1,1,'2026-07-14 10:59:50'),(51,2,4,'admin',1,'Ыфь еш зшылф',1,1,'2026-07-14 11:02:11'),(52,2,4,'admin',1,'ладно',1,1,'2026-07-14 11:02:20'),(53,2,4,'admin',1,'че???',1,1,'2026-07-14 11:02:26'),(54,2,4,'user',2,'авыываыва',1,1,'2026-07-14 11:02:49'),(55,2,4,'user',2,'вяаавч',1,1,'2026-07-14 11:05:11'),(56,2,5,'user',2,'???????????',1,1,'2026-07-14 11:10:01'),(57,2,5,'user',2,'впкепав',1,1,'2026-07-14 11:10:09'),(58,2,5,'user',2,'ав',1,1,'2026-07-14 11:10:09'),(59,2,5,'user',2,'выа',1,1,'2026-07-14 11:10:09'),(60,2,5,'user',2,'выа',1,1,'2026-07-14 11:10:09'),(61,2,5,'user',2,'аыв',1,1,'2026-07-14 11:10:09'),(62,2,5,'user',2,'ыав',1,1,'2026-07-14 11:10:09'),(63,2,5,'user',2,'а',1,1,'2026-07-14 11:10:09'),(64,2,5,'user',2,'апып',1,1,'2026-07-14 11:10:10'),(65,2,5,'user',2,'а',1,1,'2026-07-14 11:10:10'),(66,2,5,'user',2,'авы',1,1,'2026-07-14 11:10:10'),(67,2,5,'user',2,'вап',1,1,'2026-07-14 11:10:10'),(68,2,5,'user',2,'п',1,1,'2026-07-14 11:10:10'),(69,2,5,'user',2,'аыв',1,1,'2026-07-14 11:10:10'),(70,2,5,'user',2,'аы',1,1,'2026-07-14 11:10:10'),(71,2,5,'user',2,'павы',1,1,'2026-07-14 11:10:11'),(72,2,5,'user',2,'павы',1,1,'2026-07-14 11:10:11'),(73,2,5,'user',2,'ва',1,1,'2026-07-14 11:10:11'),(74,2,6,'user',2,'аываыва',1,1,'2026-07-14 22:20:24'),(75,2,6,'user',2,'',1,1,'2026-07-14 22:20:29'),(76,2,7,'user',2,'вапвапвапвап',1,1,'2026-07-14 22:38:37'),(77,2,7,'admin',1,'уедлокулепкудолекдул',1,1,'2026-07-14 22:38:43'),(78,2,7,'admin',1,'екуекуеку',1,1,'2026-07-14 22:38:51'),(79,2,7,'admin',1,'аывавы',1,1,'2026-07-14 22:39:30'),(80,2,7,'admin',1,'павпав',1,1,'2026-07-14 22:41:34'),(81,2,7,'admin',1,'супар',1,1,'2026-07-14 22:41:37'),(82,2,7,'user',2,'папа',1,1,'2026-07-14 22:41:40'),(83,2,7,'admin',1,'павпав',1,1,'2026-07-14 22:41:41'),(84,2,7,'admin',1,'павпавпва',1,1,'2026-07-14 22:41:43'),(85,2,7,'admin',1,'пукукеку',1,1,'2026-07-14 22:41:45'),(86,2,7,'admin',1,'уке',1,1,'2026-07-14 22:41:45'),(87,2,7,'admin',1,'куе',1,1,'2026-07-14 22:41:46'),(88,2,7,'admin',1,'п',1,1,'2026-07-14 22:41:47'),(89,2,7,'user',2,'пваавп',1,1,'2026-07-14 22:41:49'),(90,2,7,'user',2,'апв',1,1,'2026-07-14 22:41:50'),(91,2,7,'user',2,'вап',1,1,'2026-07-14 22:41:50'),(92,2,7,'user',2,'авп',1,1,'2026-07-14 22:41:51'),(93,2,7,'user',2,'ааыв',1,1,'2026-07-14 22:46:24'),(94,2,7,'user',2,'авы',1,1,'2026-07-14 22:46:24'),(95,2,7,'user',2,'авы',1,1,'2026-07-14 22:46:24'),(96,2,7,'user',2,'авы',1,1,'2026-07-14 22:46:24'),(97,2,7,'user',2,'авы',1,1,'2026-07-14 22:46:25'),(98,2,7,'admin',1,'авыаыв',1,1,'2026-07-14 22:46:27'),(99,2,7,'admin',1,'аываыва',1,1,'2026-07-14 22:46:28'),(100,2,7,'admin',1,'аываыва',1,1,'2026-07-14 22:46:29'),(101,2,7,'admin',1,'см',1,1,'2026-07-14 22:46:29'),(102,2,7,'admin',1,'м',1,1,'2026-07-14 22:46:30'),(103,2,7,'admin',1,'м',1,1,'2026-07-14 22:46:30'),(104,2,7,'admin',1,'?????????',1,1,'2026-07-14 22:46:32'),(105,2,7,'user',2,'р',1,1,'2026-07-14 22:56:05'),(106,2,7,'admin',1,'в',1,1,'2026-07-14 22:56:08'),(107,2,7,'admin',1,'в',1,1,'2026-07-14 22:56:08'),(108,2,7,'admin',1,'в',1,1,'2026-07-14 22:56:09'),(109,2,7,'admin',1,'в',1,1,'2026-07-14 22:56:11'),(110,2,7,'admin',1,'вуйц',1,1,'2026-07-14 22:56:12'),(111,2,7,'admin',1,'фваыфывфы',1,1,'2026-07-14 22:56:13'),(112,2,7,'admin',1,'савячсяч',1,1,'2026-07-14 22:56:14'),(113,2,7,'user',2,'вфывфывф',1,1,'2026-07-14 22:56:16'),(114,2,7,'user',2,'вфывфыв',1,1,'2026-07-14 22:56:17'),(115,2,7,'user',2,'вфывфывыф',1,1,'2026-07-14 22:56:18'),(116,2,7,'user',2,'вфывфывфы',1,1,'2026-07-14 22:56:19'),(117,2,7,'admin',1,'выфвфывфы',1,1,'2026-07-14 22:56:21'),(118,2,7,'admin',1,'сячсяч',1,1,'2026-07-14 22:56:22'),(119,2,7,'admin',1,'мсчмчс',1,1,'2026-07-14 22:56:23'),(120,2,7,'user',2,'вфывыф',1,1,'2026-07-14 23:03:30'),(121,2,7,'user',2,'выфвыф',1,1,'2026-07-14 23:03:31'),(122,2,7,'user',2,'вфывфывфы',1,1,'2026-07-14 23:03:32'),(123,2,7,'user',2,'выфвфывфы',1,1,'2026-07-14 23:03:33'),(124,2,7,'admin',1,'вфывфыв',1,0,'2026-07-14 23:03:34'),(125,2,7,'admin',1,'вфывфывфы',1,0,'2026-07-14 23:03:35'),(126,2,7,'admin',1,'вфывфывфыв',1,0,'2026-07-14 23:03:36'),(127,2,7,'admin',1,'вфывфывфыв',1,0,'2026-07-14 23:03:37'),(128,2,7,'user',2,'павпав',1,1,'2026-07-14 23:14:03'),(129,2,7,'user',2,'павпавпва',1,1,'2026-07-14 23:14:04'),(130,2,7,'user',2,'павпавпав',1,1,'2026-07-14 23:14:05'),(131,2,7,'user',2,'fsdfsd',1,1,'2026-07-14 23:32:19'),(132,2,7,'user',2,'fdsfsdfsd',1,1,'2026-07-14 23:32:20'),(133,2,7,'user',2,'fsdfsdf',1,1,'2026-07-14 23:32:20'),(134,2,7,'admin',1,'другое дело',1,0,'2026-07-14 23:32:27');
/*!40000 ALTER TABLE `support_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `subject` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('open','closed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` timestamp NULL DEFAULT NULL,
  `closed_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_support_tickets_user` (`user_id`,`created_at`),
  KEY `support_tickets_closed_by_fk` (`closed_by`),
  CONSTRAINT `support_tickets_closed_by_fk` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `support_tickets_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
INSERT INTO `support_tickets` VALUES (1,1,'Обращение (перенесено из старого чата)','closed','2026-07-10 21:27:39','2026-07-11 02:06:04',NULL),(2,2,'Обращение (перенесено из старого чата)','closed','2026-07-11 00:24:37','2026-07-11 18:44:39',NULL),(4,2,'Siska','closed','2026-07-14 10:59:50','2026-07-14 11:09:48',1),(5,2,'авпапвавп','closed','2026-07-14 11:10:01','2026-07-14 11:10:30',1),(6,2,'акыыв','closed','2026-07-14 22:20:24','2026-07-14 22:38:17',2),(7,2,'аыкевыапва','open','2026-07-14 22:38:37',NULL,NULL);
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minecraft_username` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minecraft_uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minecraft_linked_at` timestamp NULL DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','helper','admin','main_admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `referral_code` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referred_by` int DEFAULT NULL,
  `banned` tinyint(1) NOT NULL DEFAULT '0',
  `banned_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banned_until` datetime DEFAULT NULL,
  `forum_banned` tinyint(1) NOT NULL DEFAULT '0',
  `forum_banned_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `forum_banned_until` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `referral_code` (`referral_code`),
  UNIQUE KEY `uniq_minecraft_uuid` (`minecraft_uuid`),
  KEY `idx_users_referred_by` (`referred_by`),
  KEY `idx_users_ban_sweep` (`banned`,`banned_until`),
  KEY `idx_users_forum_ban_sweep` (`forum_banned`,`forum_banned_until`),
  CONSTRAINT `users_ibfk_referred_by` FOREIGN KEY (`referred_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Fitesip','lokasad124@gmail.com','/uploads/avatars/1-8eea8bef-da1c-4539-bcad-c11ffe2a83b6.jpg',NULL,NULL,NULL,'$2a$10$/GeNhMMBose7tAXgsm4fSuUIhEsbkAKZ0zZXhK.YUxrd7eQlyNQDS','main_admin','9D27D1D5',NULL,0,NULL,NULL,0,NULL,NULL,'2026-07-09 03:38:04'),(2,'Pidor','pidor@gmail.com',NULL,'Fitesip','b0361376-7b7b-4883-b8bd-dfd25111b1b4','2026-07-11 14:59:48','$2a$10$jpr9Djqg389QAravOCAlUOh8mMIP7v0G1JbdHITZyIZCP05W3rpeS','user','AF446A9B',NULL,0,NULL,NULL,0,NULL,NULL,'2026-07-11 00:24:28');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-15 17:01:54

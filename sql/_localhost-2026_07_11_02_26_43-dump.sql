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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'f1ad2683-6372-11f1-b578-02509ad31b1e:1-224';

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
  `price_rub` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalog_items`
--

LOCK TABLES `catalog_items` WRITE;
/*!40000 ALTER TABLE `catalog_items` DISABLE KEYS */;
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
INSERT INTO `news` VALUES (1,'Открытие сезона 3','Новая карта, обновлённая экономика и свежие подземелья уже доступны.','Сезон 3 стартовал: карта перегенерирована, добавлены три новых авторских подземелья и переработана система торговых гильдий. Все привилегии сезона 2 переносятся автоматически.',1,'2026-07-10 20:32:47'),(2,'Обновление магазина','В каталоге появились новые косметические наборы.','Мы добавили несколько новых косметических наборов и обновили цены на часть привилегий с учётом обратной связи от игроков.',0,'2026-07-10 20:32:47'),(3,'Плановые технические работы','Сервер будет недоступен несколько минут во время обновления.','В ближайшую субботу с 04:00 до 05:00 по МСК пройдут плановые технические работы, связанные с обновлением ядра сервера. Просим отнестись с пониманием.',0,'2026-07-10 20:32:47');
/*!40000 ALTER TABLE `news` ENABLE KEYS */;
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
-- Table structure for table `support_messages`
--

DROP TABLE IF EXISTS `support_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `sender_role` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` int NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_by_admin` tinyint(1) NOT NULL DEFAULT '0',
  `read_by_user` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_user` (`user_id`,`created_at`),
  CONSTRAINT `support_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_messages`
--

LOCK TABLES `support_messages` WRITE;
/*!40000 ALTER TABLE `support_messages` DISABLE KEYS */;
INSERT INTO `support_messages` VALUES (1,1,'user',1,'Piska',1,1,'2026-07-10 21:27:39'),(2,1,'admin',1,'Sosiska',1,1,'2026-07-10 21:27:48'),(3,1,'user',1,'Ladno',1,1,'2026-07-10 21:27:55'),(4,1,'user',1,'3542etghsrgew',1,1,'2026-07-10 21:42:36'),(5,1,'admin',1,'poshel nahui',1,1,'2026-07-10 21:42:46');
/*!40000 ALTER TABLE `support_messages` ENABLE KEYS */;
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
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Fitesip','lokasad124@gmail.com','$2a$10$/GeNhMMBose7tAXgsm4fSuUIhEsbkAKZ0zZXhK.YUxrd7eQlyNQDS','admin','2026-07-09 03:38:04');
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

-- Dump completed on 2026-07-11  2:26:43

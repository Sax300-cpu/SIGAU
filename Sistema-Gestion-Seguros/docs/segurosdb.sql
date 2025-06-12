USE segurosdb;
-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: insurance_db
-- ------------------------------------------------------
-- Server version	8.0.39

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `beneficiaries`
--

DROP TABLE IF EXISTS `beneficiaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `beneficiaries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `relationship` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `percentage` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `policy_id` (`policy_id`),
  CONSTRAINT `beneficiaries_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beneficiaries`
--

LOCK TABLES `beneficiaries` WRITE;
/*!40000 ALTER TABLE `beneficiaries` DISABLE KEYS */;
/*!40000 ALTER TABLE `beneficiaries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `claims`
--

DROP TABLE IF EXISTS `claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `claims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_id` int NOT NULL,
  `claim_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('submitted','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `policy_id` (`policy_id`),
  CONSTRAINT `claims_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `claims`
--

LOCK TABLES `claims` WRITE;
/*!40000 ALTER TABLE `claims` DISABLE KEYS */;
/*!40000 ALTER TABLE `claims` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `first_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dob` date DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_id` int NOT NULL,
  `doc_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `policy_id` (`policy_id`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `policy_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL,
  `method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('paid','due','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'due',
  PRIMARY KEY (`id`),
  KEY `policy_id` (`policy_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`policy_id`) REFERENCES `policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `policies`
--

DROP TABLE IF EXISTS `policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` int DEFAULT NULL,
  `agent_id` int DEFAULT NULL,
  `type_id` int NOT NULL,
  `coverage_details` text COLLATE utf8mb4_unicode_ci,
  `benefits` text COLLATE utf8mb4_unicode_ci,
  `premium_amount` decimal(12,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('active','pending','cancelled','expired') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_frequency` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Mensual',
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `agent_id` (`agent_id`),
  KEY `type_id` (`type_id`),
  CONSTRAINT `policies_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `policies_ibfk_2` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `policies_ibfk_3` FOREIGN KEY (`type_id`) REFERENCES `policy_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `policies`
--

LOCK TABLES `policies` WRITE;
/*!40000 ALTER TABLE `policies` DISABLE KEYS */;
INSERT INTO `policies` VALUES (16,'Premiun',NULL,NULL,2,'Hola mundoasdas','Póliza de vida con cobertura completa',78.00,'2025-01-01','2025-12-31','active','2025-06-06 05:32:03','Trimestral'),(17,'adasasdas',NULL,NULL,2,'asdasd',NULL,23.00,'2025-01-01','2025-12-31','active','2025-06-06 05:32:43','Mensual'),(18,'asdasdasdsaascxzczx',NULL,NULL,3,'adsdsad1221',NULL,231.00,'2025-01-01','2025-12-31','active','2025-06-06 05:33:04','Anual'),(19,'wqeqweqw',NULL,NULL,4,'qweqwe121',NULL,233.00,'2025-01-01','2025-12-31','active','2025-06-06 05:33:49','Trimestral'),(20,'Queso',NULL,NULL,5,'qweqw21',NULL,321.00,'2025-01-01','2025-12-31','active','2025-06-06 05:34:09','Mensual'),(21,'asdasczxcxz',NULL,NULL,1,'asdas',NULL,456.00,'2025-01-01','2025-12-31','active','2025-06-06 06:07:30','Mensual'),(22,'asdaszcxzcxz',NULL,NULL,2,'asdsa21',NULL,45.00,'2025-01-01','2025-12-31','active','2025-06-06 06:07:57','Mensual'),(23,'tututututu',NULL,NULL,1,'asdasdqw2',NULL,456.00,'2025-01-01','2025-12-31','active','2025-06-06 07:43:13','Mensual'),(24,'qwewqewqewqewq',NULL,NULL,4,'asdsa3',NULL,500.00,'2025-01-01','2025-12-31','active','2025-06-06 08:22:36','Mensual'),(25,'Seguro de vida Premiun45s',NULL,NULL,1,'asd2','sadas12',800.00,'2025-01-01','2025-12-31','active','2025-06-06 08:36:15','Anual'),(33,'Amra',NULL,NULL,1,'sdadas1','Póliza de vida con cobertura completa',100.00,'2025-01-01','2025-12-31','active','2025-06-06 09:03:54','Trimestral'),(34,'ewqwe8987',NULL,NULL,3,'asdas2','sadsad54',10.00,'2025-01-01','2025-12-31','active','2025-06-06 09:15:20','Mensual'),(37,'Tierra',NULL,NULL,2,'sadas21dasdasd','Póliza de viajes nacionales e internacionales',500.00,'2025-01-01','2025-12-31','active','2025-06-06 12:00:54','Anual'),(43,'Seguro Los Angeles',NULL,NULL,5,'4560 sadasdas','asbdjhash',450.00,'2025-01-01','2025-12-31','active','2025-06-06 14:29:19','Trimestral');
/*!40000 ALTER TABLE `policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `policy_types`
--

DROP TABLE IF EXISTS `policy_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_frequency` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Mensual',
  `status` enum('Activo','Inactivo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `policy_types`
--

LOCK TABLES `policy_types` WRITE;
/*!40000 ALTER TABLE `policy_types` DISABLE KEYS */;
INSERT INTO `policy_types` VALUES (1,'Vida','Póliza de vida con cobertura completa',0.00,'Mensual','Activo'),(2,'Salud','Póliza de gastos médicos',0.00,'Mensual','Activo'),(3,'Automóvil','Póliza para vehículos',0.00,'Anual','Activo'),(4,'Hogar','Póliza de vivienda',0.00,'Anual','Activo'),(5,'Viaje','Póliza de viajes nacionales e internacionales',0.00,'Anual','Activo'),(6,'Empresarial','Póliza para empresas y comercios',0.00,'Anual','Activo');
/*!40000 ALTER TABLE `policy_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin'),(2,'agent'),(3,'client');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (52,'Mariana','marianae@gmail.com','scrypt:32768:8:1$SDyvd6oO5GN6oWgW$14e366bcfbe4912dde1c9f6dec4f5db8b557952f75030e47cd94e19d2eb7f916ea62a68c25b1b2698b9d6bf3a92707218b03a311f7bebd3bc57a1e5411be1824',1,'2025-06-05 23:23:50'),(53,'Wilmer','wilmerv@gmail.com','scrypt:32768:8:1$psnnIssW8zvqtIA6$942b6f21dc6091052998c3053035725ebcabe483f70da0a3c82502b24ee95086785d69bbf1a8dc53eb841ff3b2ed30d120f8a8a521f5f88268d4b5b385ba5c1b',1,'2025-06-06 00:33:30'),(55,'kevin','kevinv@gmail.com','scrypt:32768:8:1$mrO8uC2iNY8NFFTc$2aba8d935c79b34d376f0e1b0489c2b2410f53194600122a4125d90d0066dcd659c11bece2ce3a6c4ddb2ddf3e0d138e09a9fbb8ce9b84d503b5935482e0a9ae',2,'2025-06-06 07:18:52'),(56,'Matias','matiasB@gmail.com','scrypt:32768:8:1$oDJZcAO6WnCl8YsI$9a93a114ca5830288b1269c4346a555f6faeed4ce4139c0ee6bbb89b929435dfba7721723aca010ef7f76a46eb029a6b8ff12b6fce3552c092cb9237c3797ef6',3,'2025-06-06 08:42:35'),(57,'Karen','karenG@gmail.com','scrypt:32768:8:1$YBL34pA3aW7PosF6$e3cde2719870cdf49a4ee1222be8ff8df73277c8fc1f4f18a088ff614e8b5e6403d382f6a4940ac347847ae433a24edb15e94a343412fb314033481c6f6c3e10',3,'2025-06-06 13:08:02'),(58,'Luis','luisM@gmail.com','scrypt:32768:8:1$gplJ3QRWVAUl3EnN$1bbf17875e5dbcfdef335936ca088e78ef9e9b5a8b621b569b69fed5cddd5c27523d555bab695dbecdfe2a1d18f3e7796917e6639f698c2178945e3e6e976c8c',3,'2025-06-06 14:00:19');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-09 13:26:02

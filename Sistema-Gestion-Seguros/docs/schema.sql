-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema insurance_db
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema insurance_db
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `insurance_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ;
USE `insurance_db` ;

-- -----------------------------------------------------
-- Table `roles`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `roles` ;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `name` (`name` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `users` ;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `username` (`username` ASC) VISIBLE,
  UNIQUE INDEX `email` (`email` ASC) VISIBLE,
  INDEX `role_id` (`role_id` ASC) VISIBLE,
  CONSTRAINT `users_ibfk_1`
    FOREIGN KEY (`role_id`)
    REFERENCES `roles` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 49
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `clients`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `clients` ;

CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `dob` DATE NULL DEFAULT NULL,
  `phone` VARCHAR(20) NULL DEFAULT NULL,
  `address` VARCHAR(200) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `user_id` (`user_id` ASC) VISIBLE,
  CONSTRAINT `clients_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `policy_types`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `policy_types` ;

CREATE TABLE IF NOT EXISTS `policy_types` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL DEFAULT NULL,
  `cost` DECIMAL(12,2) NOT NULL DEFAULT '0.00',
  `payment_frequency` VARCHAR(20) NOT NULL DEFAULT 'Mensual',
  `status` ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `name` (`name` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `policies`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `policies`;

CREATE TABLE IF NOT EXISTS `policies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `client_id` INT NULL,
  `agent_id` INT NULL DEFAULT NULL,
  `type_id` INT NOT NULL,
  `coverage_details` TEXT NULL DEFAULT NULL,
  `benefits` TEXT NULL DEFAULT NULL,            -- ← Nueva columna
  `premium_amount` DECIMAL(12,2) NOT NULL,
  `payment_frequency` VARCHAR(20) NOT NULL DEFAULT 'Mensual',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('active','pending','cancelled','expired') NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `client_id` (`client_id` ASC) VISIBLE,
  INDEX `agent_id` (`agent_id` ASC) VISIBLE,
  INDEX `type_id` (`type_id` ASC) VISIBLE,
  CONSTRAINT `policies_ibfk_1`
    FOREIGN KEY (`client_id`)
    REFERENCES `clients` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `policies_ibfk_2`
    FOREIGN KEY (`agent_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `policies_ibfk_3`
    FOREIGN KEY (`type_id`)
    REFERENCES `policy_types` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `client_policies`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `client_policies` ;

CREATE TABLE IF NOT EXISTS `client_policies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `policy_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `premium_amount` DECIMAL(12,2) NOT NULL,
  `payment_frequency` VARCHAR(20) NOT NULL DEFAULT 'Mensual',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('active', 'pending', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `client_id` (`client_id` ASC) VISIBLE,
  INDEX `policy_id` (`policy_id` ASC) VISIBLE,
  INDEX `agent_id` (`agent_id` ASC) VISIBLE,
  CONSTRAINT `client_policies_ibfk_1`
    FOREIGN KEY (`client_id`)
    REFERENCES `clients` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `client_policies_ibfk_2`
    FOREIGN KEY (`policy_id`)
    REFERENCES `policies` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `client_policies_ibfk_3`
    FOREIGN KEY (`agent_id`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `beneficiaries`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `beneficiaries` ;

CREATE TABLE IF NOT EXISTS `beneficiaries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `contract_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NULL DEFAULT NULL,
  `relationship` VARCHAR(50) NULL DEFAULT NULL,
  `percentage` DECIMAL(5,2) NOT NULL,
  `phone` VARCHAR(20) NULL DEFAULT NULL,
  `identification_number` VARCHAR(20) NULL DEFAULT NULL,
  `address` VARCHAR(200) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `contract_id` (`contract_id` ASC) VISIBLE,
  CONSTRAINT `beneficiaries_ibfk_1`
    FOREIGN KEY (`contract_id`)
    REFERENCES `client_policies` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `claims`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `claims` ;

CREATE TABLE IF NOT EXISTS `claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policy_id` INT NOT NULL,
  `claim_date` DATE NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `status` ENUM('submitted', 'approved', 'rejected') NULL DEFAULT 'submitted',
  `processed_at` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `policy_id` (`policy_id` ASC) VISIBLE,
  CONSTRAINT `claims_ibfk_1`
    FOREIGN KEY (`policy_id`)
    REFERENCES `policies` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `documents`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `documents` ;

CREATE TABLE IF NOT EXISTS `documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `contract_id` INT NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `uploaded_by` VARCHAR(50) NULL DEFAULT NULL,
  `upload_date` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('pending', 'approved', 'rejected') NULL DEFAULT 'pending',
  `reviewed_by` VARCHAR(50) NULL DEFAULT NULL,
  `review_date` DATETIME NULL DEFAULT NULL,
  `review_comment` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `contract_id` (`contract_id` ASC) VISIBLE,
  CONSTRAINT `documents_ibfk_1`
    FOREIGN KEY (`contract_id`)
    REFERENCES `client_policies` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `client_policy_extra_data`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `client_policy_extra_data` ;

CREATE TABLE IF NOT EXISTS `client_policy_extra_data` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `contract_id` INT NOT NULL,
  `field_name` VARCHAR(100) NOT NULL,
  `field_value` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `contract_id` (`contract_id` ASC) VISIBLE,
  CONSTRAINT `client_policy_extra_data_ibfk_1`
    FOREIGN KEY (`contract_id`)
    REFERENCES `client_policies` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `payments`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `payments` ;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `contract_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_date` DATE NOT NULL,
  `method` VARCHAR(30) NULL DEFAULT NULL,
  `status` ENUM('paid', 'due', 'failed') NULL DEFAULT 'due',
  PRIMARY KEY (`id`),
  INDEX `contract_id` (`contract_id` ASC) VISIBLE,
  CONSTRAINT `payments_ibfk_1`
    FOREIGN KEY (`contract_id`)
    REFERENCES `client_policies` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `refunds`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `refunds`;

CREATE TABLE IF NOT EXISTS `refunds` (
  `id` CHAR(36) PRIMARY KEY DEFAULT (UUID()), -- Usamos UUID en lugar de AUTO_INCREMENT
  `contract_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `request_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_date` DATETIME NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reason` ENUM('cancelation', 'overpayment', 'adjustment', 'other') NOT NULL,
  `reason_description` VARCHAR(255) NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'processed') NOT NULL DEFAULT 'pending',
  `payment_method` ENUM('bank_transfer', 'credit_card', 'check', 'cash') NULL,
  `account_details` VARCHAR(255) NULL COMMENT 'Información de cuenta para transferencia',
  `transaction_reference` VARCHAR(100) NULL COMMENT 'Referencia de transacción bancaria',
  `notes` TEXT NULL,
  `created_by` INT NOT NULL COMMENT 'Usuario que creó la solicitud',
  `processed_by` INT NULL COMMENT 'Usuario que procesó la solicitud',
  
  -- Índices para mejorar el rendimiento en búsquedas comunes
  INDEX `idx_refund_contract` (`contract_id`),
  INDEX `idx_refund_client` (`client_id`),
  INDEX `idx_refund_status` (`status`),
  INDEX `idx_refund_dates` (`request_date`, `processed_date`),
  
  -- Relaciones con otras tablas
  CONSTRAINT `fk_refund_contract`
    FOREIGN KEY (`contract_id`)
    REFERENCES `client_policies` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_refund_client`
    FOREIGN KEY (`client_id`)
    REFERENCES `clients` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_refund_agent`
    FOREIGN KEY (`agent_id`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_refund_created_by`
    FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
    
  CONSTRAINT `fk_refund_processed_by`
    FOREIGN KEY (`processed_by`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

SELECT 
  r.id AS refund_id,
  cp.id AS contract_id,
  p.name AS policy_name,
  CONCAT(c.first_name, ' ', c.last_name) AS client_name,
  u.email AS client_email,
  r.amount,
  r.request_date,
  r.status,
  pt.name AS policy_type,
  DATEDIFF(CURRENT_DATE, cp.start_date) AS days_active
FROM 
  refunds r
JOIN 
  client_policies cp ON r.contract_id = cp.id
JOIN 
  policies p ON cp.policy_id = p.id
JOIN 
  clients c ON r.client_id = c.id
JOIN
  users u ON c.user_id = u.id
JOIN
  policy_types pt ON p.type_id = pt.id
WHERE 
  r.status = 'pending'
  AND cp.status = 'active'
ORDER BY 
  r.request_date DESC;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
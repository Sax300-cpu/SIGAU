-- Script de migración para actualizar la estructura de la base de datos
-- Ejecutar este script después de actualizar el schema.sql

-- Crear la tabla client_policies si no existe
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

-- Crear la tabla client_policy_extra_data si no existe
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

-- Actualizar la tabla beneficiaries para usar contract_id
ALTER TABLE `beneficiaries` 
ADD COLUMN `contract_id` INT NULL AFTER `policy_id`,
ADD COLUMN `last_name` VARCHAR(100) NULL DEFAULT NULL AFTER `name`,
ADD COLUMN `phone` VARCHAR(20) NULL DEFAULT NULL AFTER `percentage`,
ADD COLUMN `identification_number` VARCHAR(20) NULL DEFAULT NULL AFTER `phone`,
ADD COLUMN `address` VARCHAR(200) NULL DEFAULT NULL AFTER `identification_number`;

-- Actualizar la tabla documents para usar contract_id
ALTER TABLE `documents` 
ADD COLUMN `contract_id` INT NULL AFTER `policy_id`,
ADD COLUMN `uploaded_by` VARCHAR(50) NULL DEFAULT NULL AFTER `file_path`,
ADD COLUMN `upload_date` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `uploaded_by`,
ADD COLUMN `status` ENUM('pending', 'approved', 'rejected') NULL DEFAULT 'pending' AFTER `upload_date`,
ADD COLUMN `reviewed_by` VARCHAR(50) NULL DEFAULT NULL AFTER `status`,
ADD COLUMN `review_date` DATETIME NULL DEFAULT NULL AFTER `reviewed_by`,
ADD COLUMN `review_comment` TEXT NULL DEFAULT NULL AFTER `review_date`;

-- Actualizar la tabla payments para usar contract_id
ALTER TABLE `payments` 
ADD COLUMN `contract_id` INT NULL AFTER `policy_id`;

-- Actualizar la tabla refunds para usar contract_id
ALTER TABLE `refunds` 
ADD COLUMN `contract_id` INT NULL AFTER `policy_id`;

-- Agregar índices y constraints después de las columnas
ALTER TABLE `beneficiaries` 
ADD INDEX `contract_id` (`contract_id` ASC) VISIBLE,
ADD CONSTRAINT `beneficiaries_ibfk_2`
  FOREIGN KEY (`contract_id`)
  REFERENCES `client_policies` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `documents` 
ADD INDEX `contract_id` (`contract_id` ASC) VISIBLE,
ADD CONSTRAINT `documents_ibfk_2`
  FOREIGN KEY (`contract_id`)
  REFERENCES `client_policies` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `payments` 
ADD INDEX `contract_id` (`contract_id` ASC) VISIBLE,
ADD CONSTRAINT `payments_ibfk_2`
  FOREIGN KEY (`contract_id`)
  REFERENCES `client_policies` (`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `refunds` 
ADD INDEX `policy_id` (`policy_id` ASC) VISIBLE,
ADD CONSTRAINT `refunds_ibfk_2`
  FOREIGN KEY (`contract_id`)
  REFERENCES `client_policies` (`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Nota: Después de ejecutar este script, se deben migrar los datos existentes
-- y eliminar las columnas antiguas (policy_id) de las tablas beneficiarios, 
-- documentos, pagos y reembolsos. 
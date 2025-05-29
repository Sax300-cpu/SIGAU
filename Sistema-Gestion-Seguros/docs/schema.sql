-- 1. Crear la base de datos
DROP DATABASE IF EXISTS insurance_db;
CREATE DATABASE IF NOT EXISTS insurance_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE insurance_db;

-- 2. Tabla de roles
CREATE TABLE roles (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO roles (name) VALUES 
  ('admin'),
  ('agent'),
  ('client');

-- 3. Tabla de usuarios
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL,
  role_id       INT NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Tabla de datos de cliente
CREATE TABLE clients (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name  VARCHAR(50) NOT NULL,
  dob        DATE,
  phone      VARCHAR(20),
  address    VARCHAR(200),
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Tipos de póliza
CREATE TABLE policy_types (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
) ENGINE=InnoDB;

-- 6. Pólizas
CREATE TABLE policies (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  client_id         INT NOT NULL,
  agent_id          INT,
  type_id           INT NOT NULL,
  coverage_details  TEXT,
  premium_amount    DECIMAL(12,2) NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  status            ENUM('active','pending','cancelled','expired') DEFAULT 'pending',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  FOREIGN KEY (type_id) REFERENCES policy_types(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7. Beneficiarios
CREATE TABLE beneficiaries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  policy_id     INT NOT NULL,
  name          VARCHAR(100) NOT NULL,
  relationship  VARCHAR(50),
  percentage    DECIMAL(5,2) NOT NULL,
  FOREIGN KEY (policy_id) REFERENCES policies(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Pagos
CREATE TABLE payments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  policy_id     INT NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  payment_date  DATE NOT NULL,
  method        VARCHAR(30),
  status        ENUM('paid','due','failed') DEFAULT 'due',
  FOREIGN KEY (policy_id) REFERENCES policies(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Reembolsos / Siniestros
CREATE TABLE claims (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  policy_id     INT NOT NULL,
  claim_date    DATE NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  description   TEXT,
  status        ENUM('submitted','approved','rejected') DEFAULT 'submitted',
  processed_at  DATETIME,
  FOREIGN KEY (policy_id) REFERENCES policies(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Documentos asociados a pólizas
CREATE TABLE documents (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  policy_id    INT NOT NULL,
  doc_type     VARCHAR(100),
  file_path    VARCHAR(255) NOT NULL,
  uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_id) REFERENCES policies(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

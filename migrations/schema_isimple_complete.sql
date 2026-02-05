-- =====================================================
-- COMPLETE SCHEMA FOR ISIMPLE MODULE
-- =====================================================
-- This file contains all table definitions for Isimple module
-- Run migrations in order:
-- 1. create_projects_table.sql (if not exists)
-- 2. create_isimple_numbers_table.sql
-- 3. create_isimple_phones_table.sql
-- 4. create_promo_products_table.sql
-- 5. create_isimple_products_table.sql (optional, not currently used)
-- =====================================================

-- =====================================================
-- TABLE: projects
-- Description: Stores project information (Isimple, Tri, Digipos, etc)
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default projects
INSERT INTO projects (name, code, description) VALUES
('Isimple', 'isimple', 'Pengecekan paket data Isimple'),
('Tri Produksi', 'tri', 'Produksi paket data Tri'),
('Digipos', 'digipos', 'Produksi paket data Digipos')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    description = VALUES(description);

-- =====================================================
-- TABLE: isimple_numbers
-- Description: Stores phone numbers to be checked for promo packages
-- Related to: projects (via project_id)
-- =====================================================
CREATE TABLE IF NOT EXISTS isimple_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL DEFAULT 1,
    number VARCHAR(20) NOT NULL,
    status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
    packet_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_number_project (number, project_id),
    INDEX idx_project_id (project_id),
    INDEX idx_status (status),
    INDEX idx_number (number),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: isimple_phones
-- Description: Legacy table for storing phone numbers (may be deprecated)
-- Note: This table is used by isimplePromoCheckController but may be replaced by isimple_numbers
-- =====================================================
CREATE TABLE IF NOT EXISTS isimple_phones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    last_check_status VARCHAR(20) NULL,
    last_check_response TEXT NULL,
    last_check_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone_number (phone_number),
    INDEX idx_last_check_at (last_check_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: promo_products
-- Description: Stores promo packages found for each phone number
-- Related to: isimple_numbers (via isimple_number_id)
-- =====================================================
CREATE TABLE IF NOT EXISTS promo_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    isimple_number_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100) NOT NULL,
    product_amount DECIMAL(10, 2) NOT NULL,
    product_type VARCHAR(100),
    product_type_title VARCHAR(255),
    product_commission DECIMAL(10, 2),
    product_gb DECIMAL(5, 2),
    product_days INT,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (isimple_number_id) REFERENCES isimple_numbers(id) ON DELETE CASCADE,
    INDEX idx_isimple_number_id (isimple_number_id),
    INDEX idx_product_code (product_code),
    INDEX idx_is_selected (is_selected),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: isimple_products (OPTIONAL - NOT CURRENTLY USED)
-- Description: Stores product definitions (currently not used in application)
-- Note: This table exists but routes/controllers are not registered in server.js
-- =====================================================
CREATE TABLE IF NOT EXISTS isimple_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- END OF SCHEMA
-- =====================================================

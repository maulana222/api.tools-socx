-- Create table for storing Isimple check numbers
-- This table stores phone numbers that will be checked for promo packages
CREATE TABLE IF NOT EXISTS isimple_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL DEFAULT 1,
    number VARCHAR(20) NOT NULL,
    status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
    packet_count INT DEFAULT 0,
    name VARCHAR(255) NULL COMMENT 'Keterangan/nama produk',
    last_checked_at DATETIME NULL COMMENT 'Waktu pengecekan promo terakhir',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_number_project (number, project_id),
    INDEX idx_project_id (project_id),
    INDEX idx_status (status),
    INDEX idx_number (number),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
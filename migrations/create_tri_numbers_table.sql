-- Tabel nomor Tri per project (untuk simpan daftar nomor & hasil cek Tri Rita)
-- Mirip isimple_numbers, untuk project dengan code 'tri'
CREATE TABLE IF NOT EXISTS tri_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    number VARCHAR(20) NOT NULL,
    status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
    packet_count INT DEFAULT 0,
    name VARCHAR(255) NULL COMMENT 'Keterangan/nama',
    last_checked_at DATETIME NULL COMMENT 'Waktu pengecekan terakhir',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tri_number_project (number, project_id),
    INDEX idx_tri_project_id (project_id),
    INDEX idx_tri_status (status),
    INDEX idx_tri_number (number),
    INDEX idx_tri_last_checked (last_checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

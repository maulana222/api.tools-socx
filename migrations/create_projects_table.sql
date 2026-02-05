-- Create table for projects (Isimple, Tri, Digipos, etc)
-- Hanya name yang UNIQUE; code boleh sama antar project.
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
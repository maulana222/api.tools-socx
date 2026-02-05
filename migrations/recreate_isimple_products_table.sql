-- =====================================================
-- RECREATE TABLE: isimple_products
-- Deskripsi: Tabel referensi harga pasaran paket Indosat Freedom Internet
-- Digunakan untuk perbandingan di fitur Isimple Produksi
-- =====================================================

DROP TABLE IF EXISTS isimple_products;

CREATE TABLE isimple_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price INT NOT NULL DEFAULT 0 COMMENT 'Harga pasaran (Rp). 0 = belum ada harga',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_name (name),
    INDEX idx_name (name),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Referensi harga pasaran paket Indosat Freedom Internet';

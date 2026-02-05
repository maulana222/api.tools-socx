-- =====================================================
-- RECREATE + SEED: isimple_products
-- Menghapus tabel lama, buat baru, lalu isi data Indosat
-- Sumber data: frontend/src/pages/IsimpleProduksi.js
-- =====================================================

-- 1. Hapus tabel lama
DROP TABLE IF EXISTS isimple_products;

-- 2. Buat tabel baru
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

-- 3. Isi data Indosat Freedom Internet
INSERT INTO isimple_products (name, price) VALUES
('Indosat Freedom Internet 1.5 GB 1 Hari', 5850),
('Indosat Freedom Internet 2 GB 1 Hari', 6770),
('Indosat Freedom Internet 3 GB 1 Hari', 6900),
('Indosat Freedom Internet 10 GB 1 Hari', 0),
('Indosat Freedom Internet 1 GB 2 Hari', 5820),
('Indosat Freedom Internet 5 GB 2 Hari', 8335),
('Indosat Freedom Internet 1.5 GB 3 Hari', 8255),
('Indosat Freedom Internet 2.5 GB 3 Hari', 0),
('Indosat Freedom Internet 3 GB 3 Hari', 11295),
('Indosat Freedom Internet 4 GB 3 Hari', 0),
('Indosat Freedom Internet 5 GB 3 Hari', 12445),
('Indosat Freedom Internet 15 GB 3 Hari', 20975),
('Indosat Freedom Internet 2 GB 5 Hari', 0),
('Indosat Freedom Internet 2.5 GB 5 Hari', 12385),
('Indosat Freedom Internet 3 GB 5 Hari', 0),
('Indosat Freedom Internet 3.5 GB 5 Hari', 13455),
('Indosat Freedom Internet 4 GB 5 Hari', 13565),
('Indosat Freedom Internet 5 GB 5 Hari', 16490),
('Indosat Freedom Internet 6 GB 5 Hari', 16490),
('Indosat Freedom Internet 7 GB 5 Hari', 18800),
('Indosat Freedom Internet 8 GB 5 Hari', 21000),
('Indosat Freedom Internet 15 GB 5 Hari', 0),
('Indosat Freedom Internet 7 GB 7 Hari', 21950),
('Indosat Freedom Internet 9 GB 7 Hari', 0),
('Indosat Freedom Internet 15 GB 7 Hari', 27450),
('Indosat Freedom Internet 18 GB 7 Hari', 34000),
('Indosat Freedom Internet 3 GB 14 Hari', 19503),
('Indosat Freedom Internet 1 GB 28 Hari', 0),
('Indosat Freedom Internet 1.5 GB 28 Hari', 0),
('Indosat Freedom Internet 3 GB 28 Hari', 0),
('Indosat Freedom Internet 4 GB 28 Hari', 29255),
('Indosat Freedom Internet 5 GB 28 Hari', 24900),
('Indosat Freedom Internet 5.5 GB 28 Hari', 28900),
('Indosat Freedom Internet 6 GB 28 Hari', 28850),
('Indosat Freedom Internet 6.5 GB 28 Hari', 30375),
('Indosat Freedom Internet 7 GB 28 Hari', 30410),
('Indosat Freedom Internet 8 GB 28 Hari', 30900),
('Indosat Freedom Internet 9 GB 28 Hari', 33475),
('Indosat Freedom Internet 10 GB 28 Hari', 33485),
('Indosat Freedom Internet 12 GB 28 Hari', 43850),
('Indosat Freedom Internet 13 GB 28 Hari', 47000),
('Indosat Freedom Internet 14 GB 28 Hari', 47425),
('Indosat Freedom Internet 15 GB 28 Hari', 48600),
('Indosat Freedom Internet 16 GB 28 Hari', 48700),
('Indosat Freedom Internet 18 GB 28 Hari', 56000),
('Indosat Freedom Internet 20 GB 28 Hari', 57000),
('Indosat Freedom Internet 25 GB 28 Hari', 58950),
('Indosat Freedom Internet 28 GB 28 Hari', 59400),
('Indosat Freedom Internet 30 GB 28 Hari', 59150),
('Indosat Freedom Internet 35 GB 28 Hari', 79600),
('Indosat Freedom Internet 42 GB 28 Hari', 85750),
('Indosat Freedom Internet 50 GB 28 Hari', 93260),
('Indosat Freedom Internet 80 GB 28 Hari', 0),
('Indosat Freedom Internet 90 GB 28 Hari', 0),
('Indosat Freedom Internet 100 GB 28 Hari', 126500),
('Indosat Freedom Internet 150 GB 28 Hari', 130500),
('Indosat Freedom Internet Sensasi 50 GB 28 Hari', 80975),
('Indosat Freedom Internet Sensasi 100 GB 28 Hari', 100775),
('Indosat Freedom Internet Sensasi 150 GB 28 Hari', 0);

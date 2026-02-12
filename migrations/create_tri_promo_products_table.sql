-- Tabel hasil paket promo Tri Rita per nomor (dari response SOCX)
-- Satu baris = satu paket yang masuk ke satu nomor
CREATE TABLE IF NOT EXISTS tri_promo_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tri_number_id INT NOT NULL,
    product_name VARCHAR(500) NULL COMMENT 'offerShortDesc / recommendationName',
    product_code VARCHAR(100) NOT NULL COMMENT 'registrationKey / offerId',
    product_amount DECIMAL(12, 2) NULL COMMENT 'productPrice (Rp)',
    net_price DECIMAL(12, 2) NULL,
    product_type VARCHAR(100) NULL,
    validity_days INT NULL,
    parameter TEXT NULL COMMENT 'Parameter/JSON dari SOCX',
    raw_response JSON NULL COMMENT 'Response mentah SOCX (opsional)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tri_number_id) REFERENCES tri_numbers(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tri_number_product (tri_number_id, product_code),
    INDEX idx_tri_promo_number (tri_number_id),
    INDEX idx_tri_promo_code (product_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create table for promo products per number
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
    UNIQUE KEY uk_isimple_number_product (isimple_number_id, product_code),
    INDEX idx_isimple_number_id (isimple_number_id),
    INDEX idx_product_code (product_code),
    INDEX idx_is_selected (is_selected)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
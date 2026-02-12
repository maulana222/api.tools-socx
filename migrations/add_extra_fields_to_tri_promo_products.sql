-- Tambah kolom tambahan ke tri_promo_products untuk menyimpan detail lengkap paket Tri Rita
ALTER TABLE tri_promo_products
    ADD COLUMN offer_id VARCHAR(100) NULL AFTER raw_response,
    ADD COLUMN offer_short_desc VARCHAR(500) NULL AFTER offer_id,
    ADD COLUMN registration_key VARCHAR(100) NULL AFTER offer_short_desc,
    ADD COLUMN retailer_incentive DECIMAL(12, 2) NULL AFTER registration_key,
    ADD COLUMN recommendation_name VARCHAR(500) NULL AFTER retailer_incentive,
    ADD COLUMN offer_description TEXT NULL AFTER recommendation_name,
    ADD COLUMN sequence_number INT NULL AFTER offer_description,
    ADD COLUMN starred TINYINT(1) NULL AFTER sequence_number,
    ADD COLUMN banner_color VARCHAR(100) NULL AFTER starred,
    ADD COLUMN discount_value VARCHAR(50) NULL AFTER banner_color,
    ADD COLUMN best_deal TINYINT(1) NULL AFTER discount_value;


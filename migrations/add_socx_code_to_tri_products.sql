-- Tambah kolom kode SOCX ke tri_products (referensi kode produk di SOCX)
ALTER TABLE tri_products
ADD COLUMN socx_code VARCHAR(255) NULL DEFAULT NULL COMMENT 'Kode produk di SOCX' AFTER price;

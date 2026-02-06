-- Tambah kolom kode SOCX ke isimple_products (referensi kode produk di SOCX)
ALTER TABLE isimple_products
ADD COLUMN socx_code VARCHAR(255) NULL DEFAULT NULL COMMENT 'Kode produk di SOCX' AFTER price;

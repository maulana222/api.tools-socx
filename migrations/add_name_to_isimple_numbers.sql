-- Tambah kolom name (keterangan/nama produk) dan last_checked_at (jejak terakhir cek)
ALTER TABLE isimple_numbers 
ADD COLUMN name VARCHAR(255) NULL COMMENT 'Keterangan/nama produk' AFTER number,
ADD COLUMN last_checked_at DATETIME NULL COMMENT 'Waktu pengecekan promo terakhir' AFTER packet_count;

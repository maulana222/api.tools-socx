-- Pastikan product_code unik per nomor: satu (isimple_number_id, product_code) hanya boleh satu baris.
-- Jalankan untuk tabel promo_products yang sudah ada. Untuk instalasi baru, create_promo_products_table.sql sudah memuat UNIQUE.

-- 1. Hapus duplikat: simpan baris dengan id terkecil per (isimple_number_id, product_code)
DELETE pp1 FROM promo_products pp1
INNER JOIN promo_products pp2
  ON pp1.isimple_number_id = pp2.isimple_number_id
  AND pp1.product_code = pp2.product_code
  AND pp1.id > pp2.id;

-- 2. Tambah UNIQUE constraint (jika error "Duplicate key name", constraint sudah ada)
ALTER TABLE promo_products
  ADD UNIQUE KEY uk_isimple_number_product (isimple_number_id, product_code);

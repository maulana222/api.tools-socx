-- Multi-select modul: simpan array ID modul (e.g. [40, 42]) untuk sync hanya ke modul terpilih
-- Tetap pertahankan module_id untuk backward compatibility (single select).
-- Pakai VARCHAR agar kompatibel dengan MySQL 5.6+; isi berupa JSON array "[40,42]".
ALTER TABLE isimple_products
  ADD COLUMN module_ids VARCHAR(500) NULL DEFAULT NULL COMMENT 'JSON array suppliers_modules.id, e.g. [40,42]' AFTER module_id;

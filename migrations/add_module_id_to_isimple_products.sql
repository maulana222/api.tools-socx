-- Tambah kolom module_id: ID modul dari API suppliers_modules/list (indotechapi.socx.app)
ALTER TABLE isimple_products
  ADD COLUMN module_id INT NULL DEFAULT NULL COMMENT 'suppliers_modules.id dari API list' AFTER socx_code,
  ADD INDEX idx_module_id (module_id);

# Migration Files Index

## Urutan Migrasi yang Disarankan

### 1. Setup Awal (Database Baru)
```bash
# Jalankan dalam urutan berikut:
node backend/src/database/run-projects-migration.js
node backend/src/database/run-isimple-numbers-migration.js
node backend/src/database/run-isimple-phones-migration.js
node backend/src/database/run-promo-products-migration.js
```

### 2. Migrasi Tambahan (Jika Perlu)
```bash
# Tambah project_id ke isimple_numbers (jika belum ada)
node backend/src/database/run-add-project-id-migration.js

# Tambah field pengecekan ke isimple_phones
node backend/src/database/run-add-promo-check-fields-migration.js
```

### 3. Schema Lengkap (Alternatif)
```sql
-- Atau gunakan file schema lengkap:
SOURCE backend/migrations/schema_isimple_complete.sql;
```

---

## File Migration SQL

| File | Deskripsi | Status |
|------|-----------|--------|
| `create_projects_table.sql` | Membuat tabel projects | ✅ Aktif |
| `create_isimple_numbers_table.sql` | Membuat tabel isimple_numbers | ✅ Aktif |
| `create_isimple_phones_table.sql` | Membuat tabel isimple_phones | ✅ Aktif (Legacy) |
| `create_promo_products_table.sql` | Membuat tabel promo_products | ✅ Aktif |
| `create_isimple_products_table.sql` | Membuat tabel isimple_products | ⚠️ Tidak digunakan |
| `add_project_id_to_isimple_numbers.sql` | Tambah kolom project_id | ✅ Aktif |
| `add_promo_check_fields_to_isimple_phones.sql` | Tambah field pengecekan | ✅ Aktif |
| `drop_columns_from_isimple_phones.sql` | Hapus kolom yang tidak perlu | ✅ Aktif |
| `schema_isimple_complete.sql` | Schema lengkap semua tabel | 📄 Referensi |

---

## File Migration Runner (JavaScript)

| File | SQL File | Status |
|------|----------|--------|
| `run-projects-migration.js` | `create_projects_table.sql` | ✅ Aktif |
| `run-isimple-numbers-migration.js` | `create_isimple_numbers_table.sql` | ✅ Aktif |
| `run-isimple-phones-migration.js` | `create_isimple_phones_table.sql` | ✅ Aktif |
| `run-promo-products-migration.js` | `create_promo_products_table.sql` | ✅ Aktif |
| `run-isimple-products-migration.js` | `create_isimple_products_table.sql` | ⚠️ Tidak digunakan |
| `run-add-project-id-migration.js` | `add_project_id_to_isimple_numbers.sql` | ✅ Aktif |
| `run-add-promo-check-fields-migration.js` | `add_promo_check_fields_to_isimple_phones.sql` | ✅ Aktif |
| `run-drop-columns-isimple-phones-migration.js` | `drop_columns_from_isimple_phones.sql` | ✅ Aktif |

---

## Catatan

- ✅ **Aktif**: File digunakan dan diperlukan
- ⚠️ **Tidak digunakan**: File ada tapi tidak digunakan dalam aplikasi
- 📄 **Referensi**: File untuk referensi/dokumentasi

---

## File yang Bisa Dihapus (Opsional)

Jika tidak akan menggunakan tabel `isimple_products`:
- `backend/migrations/create_isimple_products_table.sql`
- `backend/src/database/run-isimple-products-migration.js`
- `backend/src/models/IsimpleProduct.js`
- `backend/src/controllers/isimpleProductController.js`
- `backend/src/routes/isimpleProducts.js`

---

**Last Updated**: 2026-02-05

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
| `create_tri_numbers_table.sql` | Membuat tabel tri_numbers (nomor Tri per project) | ✅ Aktif |
| `create_tri_promo_products_table.sql` | Membuat tabel tri_promo_products (hasil paket Tri per nomor) | ✅ Aktif |
| `create_tri_products_table.sql` | Membuat tabel tri_products (referensi harga pasaran Tri Data Happy, incl. socx_code) | ✅ Aktif |
| `add_socx_code_to_tri_products.sql` | Tambah kolom socx_code ke tri_products (jika tabel sudah ada tanpa kolom ini) | ✅ Opsional |
| `add_extra_fields_to_tri_promo_products.sql` | Tambah kolom detail (offerId, registrationKey, dll.) ke tri_promo_products | ✅ Opsional |
| `seed_tri_products.sql` | Seed data Tri Data Happy ke tri_products | ✅ Aktif |
| `create_rita_phones_table.sql` | Membuat tabel rita_phones (sumber nomor untuk cek Tri Rita) | ✅ Aktif |
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
| `run-tri-tables-migration.js` | `create_tri_numbers_table.sql`, `create_tri_promo_products_table.sql` | ✅ Aktif |
| `run-tri-products-migration.js` | `create_tri_products_table.sql`, `seed_tri_products.sql` | ✅ Aktif |
| (manual) | `add_socx_code_to_tri_products.sql` — jalankan jika tri_products sudah ada tanpa socx_code | ✅ Opsional |
| `run-rita-phones-migration.js` | `create_rita_phones_table.sql` | ✅ Aktif |
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

# Database Schema Documentation - Isimple Module

## Overview
Dokumentasi ini menjelaskan struktur database untuk modul Isimple Produksi.

## Tabel yang Digunakan

### 1. `projects`
**Deskripsi**: Menyimpan informasi project (Isimple, Tri, Digipos, dll)

**Kolom**:
- `id` (INT, PK): ID unik project
- `name` (VARCHAR(100)): Nama project (UNIQUE)
- `code` (VARCHAR(20)): Kode project (UNIQUE)
- `description` (TEXT): Deskripsi project
- `status` (ENUM): Status project ('active' atau 'inactive')
- `created_at` (TIMESTAMP): Waktu dibuat
- `updated_at` (TIMESTAMP): Waktu diupdate

**Index**:
- `idx_status`: Index pada kolom status
- `idx_code`: Index pada kolom code

**Data Default**:
- Isimple (code: 'isimple')
- Tri Produksi (code: 'tri')
- Digipos (code: 'digipos')

---

### 2. `isimple_numbers`
**Deskripsi**: Menyimpan nomor telepon yang akan dicek untuk paket promo

**Kolom**:
- `id` (INT, PK): ID unik
- `project_id` (INT, FK): ID project (default: 1 untuk Isimple)
- `number` (VARCHAR(20)): Nomor telepon
- `status` (ENUM): Status pengecekan ('pending', 'processed', 'failed')
- `packet_count` (INT): Jumlah paket yang ditemukan
- `created_at` (TIMESTAMP): Waktu dibuat
- `updated_at` (TIMESTAMP): Waktu diupdate

**Foreign Key**:
- `project_id` → `projects(id)` ON DELETE CASCADE

**Unique Constraint**:
- `unique_number_project`: Kombinasi (number, project_id) harus unik

**Index**:
- `idx_project_id`: Index pada project_id
- `idx_status`: Index pada status
- `idx_number`: Index pada number
- `idx_created_at`: Index pada created_at

**Relasi**:
- Satu project bisa memiliki banyak nomor
- Satu nomor bisa memiliki banyak promo_products

---

### 3. `isimple_phones`
**Deskripsi**: Tabel legacy untuk menyimpan nomor telepon (mungkin deprecated)

**Kolom**:
- `id` (INT, PK): ID unik
- `phone_number` (VARCHAR(20), UNIQUE): Nomor telepon
- `last_check_status` (VARCHAR(20)): Status pengecekan terakhir
- `last_check_response` (TEXT): Response pengecekan terakhir
- `last_check_at` (DATETIME): Waktu pengecekan terakhir
- `created_at` (TIMESTAMP): Waktu dibuat
- `updated_at` (TIMESTAMP): Waktu diupdate

**Index**:
- `idx_phone_number`: Index pada phone_number
- `idx_last_check_at`: Index pada last_check_at

**Catatan**: 
- Tabel ini digunakan oleh `isimplePromoCheckController` tetapi mungkin akan diganti dengan `isimple_numbers`

---

### 4. `promo_products`
**Deskripsi**: Menyimpan paket promo yang ditemukan untuk setiap nomor telepon

**Kolom**:
- `id` (INT, PK): ID unik
- `isimple_number_id` (INT, FK): ID dari isimple_numbers
- `product_name` (VARCHAR(255)): Nama produk
- `product_code` (VARCHAR(100)): Kode produk (DNM code)
- `product_amount` (DECIMAL(10,2)): Harga produk
- `product_type` (VARCHAR(100)): Tipe produk
- `product_type_title` (VARCHAR(255)): Judul tipe produk
- `product_commission` (DECIMAL(10,2)): Komisi produk
- `product_gb` (DECIMAL(5,2)): Jumlah GB
- `product_days` (INT): Jumlah hari berlaku
- `is_selected` (BOOLEAN): Apakah produk dipilih (default: FALSE)
- `created_at` (TIMESTAMP): Waktu dibuat
- `updated_at` (TIMESTAMP): Waktu diupdate

**Foreign Key**:
- `isimple_number_id` → `isimple_numbers(id)` ON DELETE CASCADE

**Index**:
- `idx_isimple_number_id`: Index pada isimple_number_id
- `idx_product_code`: Index pada product_code
- `idx_is_selected`: Index pada is_selected
- `idx_created_at`: Index pada created_at

**Relasi**:
- Satu nomor bisa memiliki banyak promo products

---

### 5. `isimple_products` (OPTIONAL - TIDAK DIGUNAKAN)
**Deskripsi**: Menyimpan definisi produk (saat ini tidak digunakan)

**Kolom**:
- `id` (INT, PK): ID unik
- `name` (VARCHAR(255)): Nama produk
- `price` (INT): Harga produk
- `created_at` (TIMESTAMP): Waktu dibuat
- `updated_at` (TIMESTAMP): Waktu diupdate

**Index**:
- `idx_name`: Index pada name
- `idx_price`: Index pada price

**Catatan**: 
- Tabel ini ada tetapi route/controller tidak terdaftar di server.js
- Bisa dihapus jika tidak akan digunakan

---

## Urutan Migrasi

1. **create_projects_table.sql** - Buat tabel projects (harus pertama)
2. **create_isimple_numbers_table.sql** - Buat tabel isimple_numbers
3. **create_isimple_phones_table.sql** - Buat tabel isimple_phones (optional)
4. **create_promo_products_table.sql** - Buat tabel promo_products
5. **add_project_id_to_isimple_numbers.sql** - Tambah project_id ke isimple_numbers (jika belum ada)
6. **add_promo_check_fields_to_isimple_phones.sql** - Tambah field pengecekan ke isimple_phones

---

## File Migration yang Tersedia

### File Utama:
- `create_projects_table.sql` - Membuat tabel projects
- `create_isimple_numbers_table.sql` - Membuat tabel isimple_numbers
- `create_isimple_phones_table.sql` - Membuat tabel isimple_phones
- `create_promo_products_table.sql` - Membuat tabel promo_products
- `create_isimple_products_table.sql` - Membuat tabel isimple_products (tidak digunakan)

### File Alter/Migration:
- `add_project_id_to_isimple_numbers.sql` - Menambah kolom project_id
- `add_promo_check_fields_to_isimple_phones.sql` - Menambah field pengecekan
- `drop_columns_from_isimple_phones.sql` - Menghapus kolom yang tidak diperlukan

### File Lengkap:
- `schema_isimple_complete.sql` - Schema lengkap semua tabel (untuk referensi)

---

## Model Files (Backend)

- `backend/src/models/Project.js` - Model untuk projects
- `backend/src/models/IsimpleNumber.js` - Model untuk isimple_numbers
- `backend/src/models/IsimplePhone.js` - Model untuk isimple_phones
- `backend/src/models/PromoProduct.js` - Model untuk promo_products
- `backend/src/models/IsimpleProduct.js` - Model untuk isimple_products (tidak digunakan)

---

## Catatan Penting

1. **Foreign Key Constraints**: 
   - `isimple_numbers.project_id` → `projects.id` (CASCADE DELETE)
   - `promo_products.isimple_number_id` → `isimple_numbers.id` (CASCADE DELETE)

2. **Unique Constraints**:
   - `projects.name` dan `projects.code` harus unik
   - `isimple_numbers(number, project_id)` harus unik
   - `isimple_phones.phone_number` harus unik

3. **Default Values**:
   - `isimple_numbers.project_id` default ke 1 (Isimple project)
   - `isimple_numbers.status` default ke 'pending'
   - `promo_products.is_selected` default ke FALSE

4. **Deprecated Tables**:
   - `isimple_phones` mungkin akan diganti dengan `isimple_numbers`
   - `isimple_products` tidak digunakan dan bisa dihapus

---

## Cara Menggunakan

### Setup Database Baru:
```sql
-- 1. Jalankan schema lengkap
SOURCE backend/migrations/schema_isimple_complete.sql;

-- Atau jalankan satu per satu:
SOURCE backend/migrations/create_projects_table.sql;
SOURCE backend/migrations/create_isimple_numbers_table.sql;
SOURCE backend/migrations/create_promo_products_table.sql;
```

### Migrasi dari Database Lama:
```sql
-- Jika sudah ada tabel projects, skip create_projects_table.sql
-- Jika sudah ada isimple_numbers tanpa project_id:
SOURCE backend/migrations/add_project_id_to_isimple_numbers.sql;
```

---

## Maintenance

### Backup:
```bash
mysqldump -u username -p database_name > backup.sql
```

### Reset Database (HATI-HATI!):
```sql
-- Hapus semua data (dalam urutan yang benar karena foreign key)
DELETE FROM promo_products;
DELETE FROM isimple_numbers;
DELETE FROM isimple_phones;
DELETE FROM projects;
```

---

**Last Updated**: 2026-02-05

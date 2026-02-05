-- Hapus UNIQUE dari kolom code (hanya name yang unik).
-- Jalankan jika tabel projects punya UNIQUE pada code dan Anda ingin code boleh duplikat.
-- Jika error "Duplicate key name" atau "check that column/key exists", abaikan (constraint sudah tidak ada).

ALTER TABLE projects DROP INDEX code;

# Cek Promo yang Ada — Alur Data & Pengelolaan

## Ringkasan

- **Isimple**: Nomor dari `isimple_phones` (atau fallback `isimple_numbers` per project) → cek ke SOCX task `hot_promo` (id 40) → simpan ke `isimple_numbers` + `promo_products`. Tampilan: `isimple_numbers` by project dengan `promos` dari `promo_products`.
- **Tri**: Nomor dari `rita_phones` → sinkron ke `tri_numbers` (per project) → cek ke SOCX task `special_offer` (id 57) → simpan ke `tri_promo_products`. Tampilan: `tri_numbers` by project dengan `promos` dari `tri_promo_products`.

---

## Isimple

### Sumber nomor
- **Utama:** `isimple_phones` (Kelola nomor sample). Tidak disalin ke `isimple_numbers` dulu; tiap nomor dicek SOCX dulu, lalu `getOrCreate(project_id, number)` di `isimple_numbers` dan simpan hasil.
- **Fallback:** Jika `isimple_phones` kosong → pakai `isimple_numbers` yang sudah ada untuk project tersebut.

### Backend
- **Controller:** `isimplePromoCheckController.js`
  - `checkAllPromo` → `checkAllPromoByProject`: baca nomor, respond 200 + `started: true, total`, proses di background.
  - **SOCX:** `POST /api/v1/suppliers_modules/task` dengan body `{ id: 40, name: 'isimple', task: 'hot_promo', payload: { msisdn } }`.
  - **Parse response:** `d.data.list` / `d.list` / `d.data` / `d` (array).
  - **Mapping ke DB:** `name` → product_name, `dnmcode` → product_code, `amount` → product_amount, `type` → product_type, `typetitle` → product_type_title, `gb` / `product_gb` → product_gb, `days` / `product_days` → product_days.
  - **Simpan:** `PromoProduct.upsertBatch(isimple_number_id, products)` (UNIQUE `isimple_number_id` + `product_code`), lalu `IsimpleNumber.updateStatus(id, 'processed', packet_count)`.

- **Progress:** `progressCheckAll` (status, total, processed, currentNumber, currentIndex). Polling: `GET /api/isimple-promo-check/check-all/progress`.
- **Stop:** `POST /api/isimple-promo-check/check-all/stop` → set `shouldStopCheckAll = true`.

### Tabel
- **isimple_numbers:** id, project_id, number, name, status, packet_count, last_checked_at, ...
- **promo_products:** id, isimple_number_id, product_code, product_name, product_amount, product_type, product_type_title, product_gb, product_days, is_selected, ...

### Frontend
- **Data:** `GET /api/isimple-numbers/project/:projectId/with-promos` → `IsimpleNumber.getByProjectWithPromos(projectId)` → tiap row punya `promos[]` dari `promo_products`.
- **Matching ke produk harga pasar:** `getMatchingPromosForProduct(product)` — parse GB & Hari dari nama produk dan nama promo; syarat: `promo.gb >= product.gb`, `promo.days >= product.days`, `promo.product_amount <= product.price`.

---

## Tri

### Sumber nomor
- **rita_phones** → sinkron ke **tri_numbers** per project (batch insert). Lalu tiap `tri_number` dicek ke SOCX; hasil disimpan ke `tri_promo_products`.

### Backend
- **Controller:** `triPromoCheckController.js`
  - `checkAllPromoByProject`: baca nomor dari `rita_phones` → `TriNumber.syncFromPhoneList(projectId, phoneList)`, respond 200, proses di background.
  - **SOCX:** `POST /api/v1/suppliers_modules/task` dengan `{ id: 57, name: 'rita', task: 'special_offer', payload: { msisdn } }`.
  - **Parse:** `parseTriRitaList(response)` → `data.data` / `data` (array).
  - **Simpan:** `TriPromoProduct.replaceByTriNumberId(tri_number_id, list)` (replace semua promo untuk nomor itu), lalu `TriNumber.updateStatus(id, 'processed', list.length)`.

- **Progress:** `progressCheckAllTri`. Polling: `GET /api/tri-promo-check/check-all/progress`.
- **Stop:** `POST /api/tri-promo-check/check-all/stop`.

### Tabel
- **tri_numbers:** id, project_id, number, name, status, packet_count, last_checked_at, ...
- **tri_promo_products:** id, tri_number_id, product_name, product_code, product_amount, net_price, product_type, validity_days, parameter (JSON), offer_id, offer_short_desc, registration_key, ...

### Frontend
- **Data:** `GET /api/tri-numbers/project/:projectId/with-promos` → `TriNumber.getByProjectWithPromos(projectId)` → tiap row punya `promos[]` dari `tri_promo_products`.
- **Matching ke produk harga pasar:** `getMatchingPromosForTriProduct(product)` — `extractPackageInfoTri` untuk GB & Hari; syarat: `promo.gb >= product.gb`, `promo.days >= product.days`, `promo.product_amount <= product.price` (sama logika Isimple).

---

## Endpoint terkait promo

| Aksi | Isimple | Tri |
|------|---------|-----|
| Mulai cek | POST `/api/isimple-promo-check/check-all` body `{ project_id }` | POST `/api/tri-promo-check/check-all` body `{ project_id }` |
| Progress | GET `/api/isimple-promo-check/check-all/progress` | GET `/api/tri-promo-check/check-all/progress` |
| Stop | POST `/api/isimple-promo-check/check-all/stop` | POST `/api/tri-promo-check/check-all/stop` |
| Daftar nomor + promo | GET `/api/isimple-numbers/project/:id/with-promos` | GET `/api/tri-numbers/project/:id/with-promos` |

---

## Catatan

- **Isimple** task SOCX: `id: 40, task: 'hot_promo'`. Response: list paket (name, dnmcode, amount, type, gb, days, ...).
- **Tri** task SOCX: `id: 57, task: 'special_offer'`. Response: list paket (offerId, offerShortDesc, productPrice, netPrice, registrationKey, validity, ...).
- Keduanya memakai **Settings** user: `socx_base_url`, `socx_token` untuk panggilan SOCX.

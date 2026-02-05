const axios = require('axios');
const Settings = require('../models/Settings');
const IsimpleNumber = require('../models/IsimpleNumber');
const PromoProduct = require('../models/PromoProduct');
const db = require('../config/database');

/** Progress cek promo (untuk polling frontend): { status, total, processed, currentNumber, currentIndex } */
let progressCheckAll = { status: 'idle', total: 0, processed: 0, currentNumber: null, currentIndex: 0 };
/** Flag untuk hentikan proses cek (dipakai saat user klik Stop) */
let shouldStopCheckAll = false;

/**
 * Parse list dari response SOCX task hot_promo (format bisa bervariasi)
 */
function parsePromoList(response) {
  if (!response || !response.data) return [];
  const d = response.data;
  if (d.data && Array.isArray(d.data.list)) return d.data.list;
  if (Array.isArray(d.list)) return d.list;
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d)) return d;
  return [];
}

/**
 * Ambil daftar nomor dari isimple_phones (untuk diproses satu per satu).
 * Pakai getOrCreate: jika nomor sudah ada di isimple_numbers maka pakai row itu (update nanti), bukan tambah duplikat.
 */
async function getNumbersFromIsimplePhones(projectId = 1) {
  const phones = await db.query('SELECT id, phone_number FROM isimple_phones ORDER BY id ASC');
  const list = Array.isArray(phones) ? phones : [];
  const numbers = [];
  for (const p of list) {
    const num = p.phone_number || p.phoneNumber;
    if (num) {
      const row = await IsimpleNumber.getOrCreate(projectId, num);
      numbers.push(row);
    }
  }
  return numbers;
}

/**
 * Cek promo: ambil nomor dari isimple_phones, request SOCX satu per satu, simpan hasil ke promo_products
 * Body/query: project_id (opsional, default 1) untuk menyimpan hasil di project mana
 */
const checkAllPromoByProject = async (req, res) => {
  try {
    const projectId = req.body?.project_id ?? req.query?.project_id ?? 1;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const baseUrlSetting = await Settings.getByKey(userId, 'socx_base_url');
    const tokenSetting = await Settings.getByKey(userId, 'socx_token');
    const baseUrl = baseUrlSetting?.value || 'https://indotechapi.socx.app';
    const token = tokenSetting?.value;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'SOCX token tidak ditemukan. Set token di Settings.'
      });
    }

    // Sumber nomor: isimple_phones (lalu disinkron ke isimple_numbers untuk simpan hasil)
    let numbers = await getNumbersFromIsimplePhones(projectId);
    if (!numbers || numbers.length === 0) {
      // Fallback: nomor dari isimple_numbers per project
      numbers = await IsimpleNumber.getByProject(projectId);
    }
    if (!numbers || numbers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Tidak ada nomor. Isi tabel isimple_phones (nomor telepon) atau tambah nomor di project lewat "Tambah Produk".',
        total: 0,
        processed: 0
      });
    }

    const total = numbers.length;
    shouldStopCheckAll = false;
    progressCheckAll = { status: 'running', total, processed: 0, currentNumber: null, currentIndex: 0 };

    res.status(200).json({
      success: true,
      started: true,
      message: 'Proses cek promo dimulai. Gunakan endpoint GET /progress untuk melihat progress.',
      total
    });

    setImmediate(async () => {
      let processed = 0;
      const now = new Date();
      const taskPayload = { id: 40, name: 'isimple', task: 'hot_promo' };

      try {
        for (let i = 0; i < numbers.length; i++) {
          if (shouldStopCheckAll) {
            console.log('[SOCX] Proses dihentikan oleh user.');
            progressCheckAll.status = 'stopped';
            break;
          }
          const row = numbers[i];
          const msisdn = row.number;
          const isimpleNumberId = row.id;
          progressCheckAll.currentIndex = i + 1;
          progressCheckAll.currentNumber = msisdn;

          const url = `${baseUrl}/api/v1/suppliers_modules/task`;
          const body = { ...taskPayload, payload: { msisdn } };
          console.log('[SOCX] Request', i + 1, '/', total, '| nomor:', msisdn);

          try {
            const response = await axios.post(url, body, {
              timeout: 30000,
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            const list = parsePromoList(response);
            const packetCount = list.length;
            console.log('[SOCX] Response nomor', msisdn, '| paket:', packetCount);

            // Update data nomor ini (bukan tambah): hapus data promo lama lalu simpan hasil terbaru
            await PromoProduct.deleteByIsimpleNumberId(isimpleNumberId);
            if (list.length > 0) {
              const products = list.map(p => ({
                productName: p.name,
                productCode: p.dnmcode || msisdn,
                productAmount: p.amount ?? 0,
                productType: p.type,
                productTypeTitle: p.typetitle ?? p.name,
                productCommission: p.commision ?? 0,
                productGb: p.gb ?? p.product_gb ?? 0,
                productDays: p.days ?? p.product_days ?? 0
              }));
              await PromoProduct.createBatch(isimpleNumberId, products);
            }

            await IsimpleNumber.updateStatus(isimpleNumberId, 'processed', packetCount, now);
          } catch (err) {
            console.error('[SOCX] Error cek promo', msisdn, '|', err.message);
            await PromoProduct.deleteByIsimpleNumberId(isimpleNumberId);
            await IsimpleNumber.updateStatus(isimpleNumberId, 'failed', 0, now);
          }

          processed++;
          progressCheckAll.processed = processed;
          await new Promise(r => setTimeout(r, 500));
        }

        console.log('[SOCX] Selesai:', processed, '/', total);
      } catch (err) {
        console.error('Error run loop checkAllPromo:', err);
      } finally {
        if (progressCheckAll.status !== 'stopped') progressCheckAll.status = 'idle';
        progressCheckAll.currentNumber = null;
      }
    });
  } catch (error) {
    console.error('Error checkAllPromoByProject:', error);
    progressCheckAll.status = 'idle';
    res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat pengecekan promo'
    });
  }
};

const getProgress = (req, res) => {
  res.json({
    success: true,
    ...progressCheckAll
  });
};

/** Hentikan proses cek promo yang sedang berjalan (flag dicek di dalam loop). */
const stopCheck = (req, res) => {
  shouldStopCheckAll = true;
  res.json({
    success: true,
    message: 'Permintaan stop diterima. Proses akan berhenti setelah nomor saat ini selesai.'
  });
};

/**
 * Entry point: selalu delegasi ke checkAllPromoByProject.
 * checkAllPromoByProject mengambil nomor dari isimple_phones (lalu fallback isimple_numbers), request SOCX satu per satu.
 * Setiap nomor: data yang sudah ada di-update (hapus promo lama lalu simpan hasil terbaru), bukan ditambah duplikat.
 */
const checkAllPromo = async (req, res) => checkAllPromoByProject(req, res);

module.exports = {
  checkAllPromo,
  checkAllPromoByProject,
  getProgress,
  stopCheck
};

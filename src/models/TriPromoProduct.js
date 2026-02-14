const db = require('../config/database');

class TriPromoProduct {
  static async getByTriNumberId(triNumberId) {
    const rows = await db.query(
      'SELECT * FROM tri_promo_products WHERE tri_number_id = ? ORDER BY id ASC',
      [triNumberId]
    );
    return Array.isArray(rows) ? rows : [];
  }

  static async getById(id) {
    const rows = await db.query('SELECT * FROM tri_promo_products WHERE id = ?', [id]);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  /**
   * Simpan satu paket promo Tri (dari response SOCX).
   * Coba insert semua kolom (20) dulu; jika DB belum punya kolom tambahan, fallback ke 9 kolom saja.
   * @param {Object} data - { triNumberId, productName, productCode, ..., rawResponse, offerId, offer_short_desc, ... }
   */
  static async create(data) {
    const {
      triNumberId,
      productName,
      productCode,
      productAmount,
      netPrice,
      productType,
      validityDays,
      parameter,
      rawResponse,
      offerId,
      offerShortDesc,
      registrationKey,
      retailerIncentive,
      recommendationName,
      offerDescription,
      sequenceNumber,
      starred,
      bannerColor,
      discountValue,
      bestDeal
    } = data;

    const baseValues = [
      triNumberId,
      productName ?? null,
      productCode ?? '',
      productAmount ?? null,
      netPrice ?? null,
      productType ?? null,
      validityDays ?? null,
      typeof parameter === 'string' ? parameter : (parameter ? JSON.stringify(parameter) : null),
      rawResponse ? JSON.stringify(rawResponse) : null
    ];

    const extraValues = [
      offerId ?? null,
      offerShortDesc ?? null,
      registrationKey ?? null,
      retailerIncentive ?? null,
      recommendationName ?? null,
      offerDescription ?? null,
      Number.isInteger(sequenceNumber) ? sequenceNumber : null,
      starred === true ? 1 : starred === false ? 0 : null,
      bannerColor ?? null,
      discountValue ?? null,
      bestDeal === true ? 1 : bestDeal === false ? 0 : null
    ];

    const fullValues = [...baseValues, ...extraValues];
    const columnCount = 20;
    const valueCount = fullValues.length;

    if (valueCount !== columnCount) {
      console.error('[TriPromoProduct.create] Jumlah value tidak sama dengan kolom:', {
        columnCount,
        valueCount,
        baseValuesLength: baseValues.length,
        extraValuesLength: extraValues.length,
        productCode: productCode || '(empty)'
      });
    }

    try {
      const result = await db.query(
        `INSERT INTO tri_promo_products 
         (tri_number_id, product_name, product_code, product_amount, net_price, product_type, validity_days, parameter, raw_response,
          offer_id, offer_short_desc, registration_key, retailer_incentive, recommendation_name, offer_description,
          sequence_number, starred, banner_color, discount_value, best_deal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        fullValues
      );
      const r = Array.isArray(result) ? result[0] : result;
      return r?.insertId ?? result?.insertId;
    } catch (err) {
      const isColumnOrCountError =
        err.code === 'ER_BAD_FIELD_ERROR' ||
        err.errno === 1054 ||
        err.code === 'ER_WRONG_VALUE_COUNT' ||
        err.errno === 1136 ||
        (err.message && String(err.message).includes('Column count doesn\'t match value count'));
      if (isColumnOrCountError) {
        console.error('[TriPromoProduct.create] Error kolom/count, fallback ke 9 kolom:', {
          errno: err.errno,
          code: err.code,
          message: err.message,
          paramsLength: fullValues.length,
          productCode: productCode || '(empty)'
        });
        const result = await db.query(
          `INSERT INTO tri_promo_products 
           (tri_number_id, product_name, product_code, product_amount, net_price, product_type, validity_days, parameter, raw_response)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          baseValues
        );
        const r = Array.isArray(result) ? result[0] : result;
        return r?.insertId ?? result?.insertId;
      }
      throw err;
    }
  }

  /**
   * Bangun objek parameter JSON dari response SOCX untuk disimpan di kolom parameter.
   * Format: { type, offerId, offerShortDesc, productPrice, registrationKey, netPrice }
   */
  static buildParameterJson(p) {
    const offerId = p.offerId != null ? String(p.offerId) : '';
    const offerShortDesc = String(p.offerShortDesc || p.recommendationName || p.product_name || '').trim();
    const rawPrice = p.productPrice != null ? p.productPrice : p.product_amount;
    const productPrice = rawPrice !== null && rawPrice !== '' ? String(rawPrice) : '';
    const registrationKey = String(p.registrationKey || p.offerId || p.product_code || '').trim();
    const rawNet = p.netPrice != null ? p.netPrice : p.net_price;
    const netPrice = rawNet !== null && rawNet !== '' ? String(rawNet) : '';
    return {
      type: 'special_offer',
      offerId,
      offerShortDesc,
      productPrice,
      registrationKey,
      netPrice
    };
  }

  /**
   * Normalisasi nilai dari response SOCX Tri (sering string: productPrice "8800", validity "2")
   */
  static normalizeTriOffer(p) {
    const code = String(p.registrationKey || p.offerId || p.product_code || '').trim();
    const name = String(p.offerShortDesc || p.recommendationName || p.product_name || '').trim();
    const rawAmount = p.productPrice != null ? p.productPrice : p.product_amount;
    const rawNet = p.netPrice != null ? p.netPrice : p.net_price;
    const amount = rawAmount !== null && rawAmount !== '' ? Number(rawAmount) : null;
    const net = rawNet !== null && rawNet !== '' ? Number(rawNet) : null;
    const type = p.productType || p.product_type || null;
    const rawValidity = p.validity != null ? p.validity : p.validity_days;
    const validityDays = rawValidity !== null && rawValidity !== '' ? parseInt(rawValidity, 10) : null;
    const paramObj = this.buildParameterJson(p);
    const param = JSON.stringify(paramObj);
    const offerId = p.offerId != null ? String(p.offerId) : null;
    const offerShortDesc = p.offerShortDesc != null ? String(p.offerShortDesc) : null;
    const registrationKey = p.registrationKey != null ? String(p.registrationKey) : null;
    const retailerIncentiveRaw = p.retailerIncentive != null ? p.retailerIncentive : null;
    const retailerIncentive =
      retailerIncentiveRaw !== null && retailerIncentiveRaw !== '' ? Number(retailerIncentiveRaw) : null;
    const recommendationName = p.recommendationName != null ? String(p.recommendationName) : null;
    const offerDescription = p.offerDescription != null ? String(p.offerDescription) : null;
    const rawSeq = p.sequenceNumber != null ? p.sequenceNumber : null;
    const sequenceNumber = rawSeq !== null && rawSeq !== '' ? parseInt(rawSeq, 10) : null;
    const starred = typeof p.starred === 'boolean' ? p.starred : null;
    const bannerColor = p.bannerColor != null ? String(p.bannerColor) : null;
    const discountValue = p.discountValue != null ? String(p.discountValue) : null;
    const bestDeal = typeof p.bestDeal === 'boolean' ? p.bestDeal : null;

    return {
      code,
      name,
      amount,
      net,
      type,
      validityDays,
      param,
      offerId,
      offerShortDesc,
      registrationKey,
      retailerIncentive,
      recommendationName,
      offerDescription,
      sequenceNumber,
      starred,
      bannerColor,
      discountValue,
      bestDeal
    };
  }

  /**
   * Insert banyak promo sekaligus (hindari N+1). Satu INSERT dengan banyak VALUES.
   * @param {Array<Object>} rows - Array objek dengan shape sama create(): triNumberId, productName, productCode, ...
   */
  static async createBatch(rows) {
    if (!rows || rows.length === 0) return 0;
    const cols = 'tri_number_id, product_name, product_code, product_amount, net_price, product_type, validity_days, parameter, raw_response, offer_id, offer_short_desc, registration_key, retailer_incentive, recommendation_name, offer_description, sequence_number, starred, banner_color, discount_value, best_deal';
    const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = [];
    for (const data of rows) {
      const base = [
        data.triNumberId,
        data.productName ?? null,
        data.productCode ?? '',
        data.productAmount ?? null,
        data.netPrice ?? null,
        data.productType ?? null,
        data.validityDays ?? null,
        typeof data.parameter === 'string' ? data.parameter : (data.parameter ? JSON.stringify(data.parameter) : null),
        data.rawResponse ? JSON.stringify(data.rawResponse) : null
      ];
      const extra = [
        data.offerId ?? null,
        data.offerShortDesc ?? null,
        data.registrationKey ?? null,
        data.retailerIncentive ?? null,
        data.recommendationName ?? null,
        data.offerDescription ?? null,
        Number.isInteger(data.sequenceNumber) ? data.sequenceNumber : null,
        data.starred === true ? 1 : data.starred === false ? 0 : null,
        data.bannerColor ?? null,
        data.discountValue ?? null,
        data.bestDeal === true ? 1 : data.bestDeal === false ? 0 : null
      ];
      params.push(...base, ...extra);
    }
    await db.query(
      `INSERT INTO tri_promo_products (${cols}) VALUES ${placeholders}`,
      params
    );
    return rows.length;
  }

  /**
   * Hapus semua promo untuk satu tri_number lalu insert batch (untuk update hasil cek). Satu DELETE + satu INSERT batch (bukan N+1).
   * Response SOCX Tri: { data: [ { offerId, offerShortDesc, productPrice, netPrice, registrationKey, validity, ... } ] }
   */
  static async replaceByTriNumberId(triNumberId, products) {
    await db.query('DELETE FROM tri_promo_products WHERE tri_number_id = ?', [triNumberId]);
    if (!products || products.length === 0) return 0;

    const rows = [];
    for (const p of products) {
      const {
        code,
        name,
        amount,
        net,
        type,
        validityDays,
        param,
        offerId,
        offerShortDesc,
        registrationKey,
        retailerIncentive,
        recommendationName,
        offerDescription,
        sequenceNumber,
        starred,
        bannerColor,
        discountValue,
        bestDeal
      } = this.normalizeTriOffer(p);
      rows.push({
        triNumberId,
        productName: name,
        productCode: code,
        productAmount: Number.isFinite(amount) ? amount : null,
        netPrice: Number.isFinite(net) ? net : null,
        productType: type,
        validityDays: Number.isInteger(validityDays) ? validityDays : null,
        parameter: param,
        rawResponse: p,
        offerId,
        offerShortDesc,
        registrationKey,
        retailerIncentive: Number.isFinite(retailerIncentive) ? retailerIncentive : null,
        recommendationName,
        offerDescription,
        sequenceNumber,
        starred,
        bannerColor,
        discountValue,
        bestDeal
      });
    }
    try {
      return await this.createBatch(rows);
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054 || err.errno === 1136) {
        const fallbackRows = rows.map((r) => ({
          triNumberId: r.triNumberId,
          productName: r.productName,
          productCode: r.productCode,
          productAmount: r.productAmount,
          netPrice: r.netPrice,
          productType: r.productType,
          validityDays: r.validityDays,
          parameter: r.parameter,
          rawResponse: r.rawResponse
        }));
        return await this.createBatchFallback9(fallbackRows);
      }
      throw err;
    }
  }

  /** Fallback batch insert dengan 9 kolom saja (jika DB belum punya kolom tambahan). */
  static async createBatchFallback9(rows) {
    if (!rows || rows.length === 0) return 0;
    const cols = 'tri_number_id, product_name, product_code, product_amount, net_price, product_type, validity_days, parameter, raw_response';
    const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = rows.flatMap((r) => [
      r.triNumberId,
      r.productName ?? null,
      r.productCode ?? '',
      r.productAmount ?? null,
      r.netPrice ?? null,
      r.productType ?? null,
      r.validityDays ?? null,
      typeof r.parameter === 'string' ? r.parameter : (r.parameter ? JSON.stringify(r.parameter) : null),
      r.rawResponse ? JSON.stringify(r.rawResponse) : null
    ]);
    await db.query(`INSERT INTO tri_promo_products (${cols}) VALUES ${placeholders}`, params);
    return rows.length;
  }

  static async deleteByTriNumberId(triNumberId) {
    const result = await db.query('DELETE FROM tri_promo_products WHERE tri_number_id = ?', [triNumberId]);
    const r = Array.isArray(result) ? result[0] : result;
    return r?.affectedRows ?? 0;
  }
}

module.exports = TriPromoProduct;

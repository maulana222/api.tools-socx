const TriPromoProduct = require('../models/TriPromoProduct');

const getProductsByTriNumber = async (req, res) => {
  try {
    const { tri_number_id } = req.params;
    const products = await TriPromoProduct.getByTriNumberId(tri_number_id);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching Tri promo products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo products' });
  }
};

const deleteProductsByTriNumber = async (req, res) => {
  try {
    const { tri_number_id } = req.params;
    const count = await TriPromoProduct.deleteByTriNumberId(tri_number_id);
    res.json({ success: true, message: `Deleted ${count} promo products`, count });
  } catch (error) {
    console.error('Error deleting Tri promo products:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo products' });
  }
};

module.exports = {
  getProductsByTriNumber,
  deleteProductsByTriNumber
};

const PromoProduct = require('../models/PromoProduct');

// Get all promo products for a specific isimple number
const getProductsByIsimpleNumber = async (req, res) => {
  try {
    const { isimple_number_id } = req.params;
    const products = await PromoProduct.getByIsimpleNumberId(isimple_number_id);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching promo products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo products' });
  }
};

// Get single promo product
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await PromoProduct.getById(id);
    if (product) {
      res.json({ success: true, data: product });
    } else {
      res.status(404).json({ success: false, message: 'Promo product not found' });
    }
  } catch (error) {
    console.error('Error fetching promo product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo product' });
  }
};

// Get stats for isimple number
const getProductsStats = async (req, res) => {
  try {
    const { isimple_number_id } = req.params;
    const stats = await PromoProduct.getStatsByIsimpleNumberId(isimple_number_id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching promo products stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo products stats' });
  }
};

// Get all promo products
const getAllPromoProducts = async (req, res) => {
  try {
    const { project_id } = req.query;
    const products = project_id 
      ? await PromoProduct.getAllByProjectId(project_id)
      : await PromoProduct.getAll();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching all promo products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo products' });
  }
};

// Get all selected promo products
const getSelectedProducts = async (req, res) => {
  try {
    const products = await PromoProduct.getSelectedProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching selected promo products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch selected promo products' });
  }
};

// Get selected promo products by project
const getSelectedProductsByProject = async (req, res) => {
  try {
    const { project_id } = req.params;
    const products = await PromoProduct.getSelectedProductsByProject(project_id);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching selected promo products by project:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch selected promo products' });
  }
};

// Get jumlah nomor per product_code + total nomor untuk satu project (untuk angka & rate)
const getCountsByProductCode = async (req, res) => {
  try {
    const { projectId } = req.params;
    const [counts, totalNumbers] = await Promise.all([
      PromoProduct.getCountsByProductCodePerProject(projectId),
      PromoProduct.getTotalNumbersByProjectId(projectId)
    ]);
    res.json({ success: true, data: { counts, totalNumbers } });
  } catch (error) {
    console.error('Error fetching counts by product code:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch counts' });
  }
};

// Create promo product
const createPromoProduct = async (req, res) => {
  try {
    const { isimple_number_id, product_name, product_code, product_amount, 
            product_type, product_type_title, product_commission, 
            product_gb, product_days, is_selected } = req.body;

    if (!isimple_number_id || !product_name || !product_code || !product_amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'isimple_number_id, product_name, product_code, and product_amount are required' 
      });
    }

    const id = await PromoProduct.create({
      isimpleNumberId: isimple_number_id,
      productName: product_name,
      productCode: product_code,
      productAmount: product_amount,
      productType: product_type,
      productTypeTitle: product_type_title,
      productCommission: product_commission,
      productGb: product_gb,
      productDays: product_days,
      isSelected: is_selected
    });

    res.status(201).json({ 
      success: true, 
      data: { id, isimple_number_id, product_name, product_code, product_amount } 
    });
  } catch (error) {
    console.error('Error creating promo product:', error);
    res.status(500).json({ success: false, message: 'Failed to create promo product' });
  }
};

// Create batch promo products for an isimple number
const createBatchPromoProducts = async (req, res) => {
  try {
    const { isimple_number_id, products } = req.body;

    if (!isimple_number_id || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'isimple_number_id and products array are required' 
      });
    }

    const count = await PromoProduct.createBatch(isimple_number_id, products);
    res.status(201).json({ 
      success: true, 
      message: `Created ${count} promo products` 
    });
  } catch (error) {
    console.error('Error creating batch promo products:', error);
    res.status(500).json({ success: false, message: 'Failed to create promo products' });
  }
};

// Update product selected status
const updateProductSelected = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_selected } = req.body;

    const updated = await PromoProduct.updateSelected(id, is_selected);
    if (updated) {
      res.json({ success: true, message: 'Product selection updated' });
    } else {
      res.status(404).json({ success: false, message: 'Promo product not found' });
    }
  } catch (error) {
    console.error('Error updating promo product selection:', error);
    res.status(500).json({ success: false, message: 'Failed to update product selection' });
  }
};

// Delete promo product
const deletePromoProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PromoProduct.delete(id);
    if (deleted) {
      res.json({ success: true, message: 'Promo product deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Promo product not found' });
    }
  } catch (error) {
    console.error('Error deleting promo product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo product' });
  }
};

// Delete all promo products for an isimple number
const deleteProductsByIsimpleNumber = async (req, res) => {
  try {
    const { isimple_number_id } = req.params;
    const count = await PromoProduct.deleteByIsimpleNumberId(isimple_number_id);
    res.json({ success: true, message: `Deleted ${count} promo products` });
  } catch (error) {
    console.error('Error deleting promo products:', error);
    res.status(500).json({ success: false, message: 'Failed to delete promo products' });
  }
};

// Export all functions
module.exports = {
  getAllPromoProducts,
  getProductsByIsimpleNumber,
  getProductById,
  getProductsStats,
  getSelectedProducts,
  getSelectedProductsByProject,
  getCountsByProductCode,
  createPromoProduct,
  createBatchPromoProducts,
  updateProductSelected,
  deletePromoProduct,
  deleteProductsByIsimpleNumber
};

const IsimpleNumber = require('../models/IsimpleNumber');
const Project = require('../models/Project');

// Get all Isimple numbers
const getAllNumbers = async (req, res) => {
  try {
    const { project_id } = req.query;
    const numbers = await IsimpleNumber.getAll(project_id);
    res.json({ success: true, data: numbers });
  } catch (error) {
    console.error('Error fetching Isimple numbers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch numbers' });
  }
};

// Get Isimple numbers by project
const getNumbersByProject = async (req, res) => {
  try {
    const { project_id } = req.params;
    const numbers = await IsimpleNumber.getByProject(project_id);
    res.json({ success: true, data: numbers });
  } catch (error) {
    console.error('Error fetching Isimple numbers by project:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch numbers' });
  }
};

// Get Isimple numbers by project dengan daftar promo (hasil pengecekan) + info project
const getNumbersByProjectWithPromos = async (req, res) => {
  try {
    const { projectId } = req.params;
    const [numbers, project] = await Promise.all([
      IsimpleNumber.getByProjectWithPromos(projectId),
      Project.getById(projectId)
    ]);
    res.json({
      success: true,
      data: numbers,
      project: project ? { id: project.id, name: project.name } : null
    });
  } catch (error) {
    console.error('Error fetching numbers with promos:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch numbers' });
  }
};

// Create new Isimple number
const createNumber = async (req, res) => {
  try {
    const { number, project_id, name } = req.body;
    const num = number ?? req.body.name; // frontend bisa kirim name sebagai nomor

    if (!num) {
      return res.status(400).json({ success: false, message: 'Number is required' });
    }

    const projectId = project_id || 1;
    const id = await IsimpleNumber.create(num, projectId, (name ?? req.body.price) || null);
    res.status(201).json({ success: true, data: { id, number: num, name: name ?? null, status: 'pending', project_id: projectId } });
  } catch (error) {
    console.error('Error creating Isimple number:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'Number already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create number' });
    }
  }
};

// Create multiple Isimple numbers
const createNumbersBatch = async (req, res) => {
  try {
    const { numbers, project_id } = req.body;

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ success: false, message: 'Numbers array is required' });
    }

    const projectId = project_id || 1; // Default to Isimple project (id=1)
    const count = await IsimpleNumber.createBatch(numbers, projectId);
    res.status(201).json({ success: true, message: `Created ${count} numbers` });
  } catch (error) {
    console.error('Error creating Isimple numbers batch:', error);
    res.status(500).json({ success: false, message: 'Failed to create numbers' });
  }
};

// Update number (nomor + keterangan/nama)
const updateNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, name } = req.body;
    const num = number ?? req.body.name;
    const data = {};
    if (num !== undefined) data.number = num;
    if (name !== undefined) data.name = name;
    if (req.body.price !== undefined) data.name = req.body.price; // frontend kirim price = keterangan
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    const updated = await IsimpleNumber.update(id, data);
    if (updated) {
      const row = await IsimpleNumber.getById(id);
      res.json({ success: true, data: row });
    } else {
      res.status(404).json({ success: false, message: 'Number not found' });
    }
  } catch (error) {
    console.error('Error updating Isimple number:', error);
    res.status(500).json({ success: false, message: 'Failed to update number' });
  }
};

// Update number status
const updateNumberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, packetCount } = req.body;

    if (!['pending', 'processed', 'failed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updated = await IsimpleNumber.updateStatus(id, status, packetCount);
    if (updated) {
      res.json({ success: true, message: 'Number status updated' });
    } else {
      res.status(404).json({ success: false, message: 'Number not found' });
    }
  } catch (error) {
    console.error('Error updating Isimple number status:', error);
    res.status(500).json({ success: false, message: 'Failed to update number status' });
  }
};

// Delete number
const deleteNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await IsimpleNumber.delete(id);
    if (deleted) {
      res.json({ success: true, message: 'Number deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Number not found' });
    }
  } catch (error) {
    console.error('Error deleting Isimple number:', error);
    res.status(500).json({ success: false, message: 'Failed to delete number' });
  }
};

// Clear processed numbers
const clearProcessedNumbers = async (req, res) => {
  try {
    const count = await IsimpleNumber.clearProcessed();
    res.json({ success: true, message: `Cleared ${count} processed numbers` });
  } catch (error) {
    console.error('Error clearing processed numbers:', error);
    res.status(500).json({ success: false, message: 'Failed to clear processed numbers' });
  }
};

// Check promo products for a specific number
const checkPromoForNumber = async (req, res) => {
  try {
    const { number } = req.params;
    const { project_id } = req.query;
    
    if (!number) {
      return res.status(400).json({ success: false, message: 'Number is required' });
    }
    
    const promoProducts = await IsimpleNumber.getPromoProductsByNumber(number, project_id);
    res.json({ success: true, data: promoProducts });
  } catch (error) {
    console.error('Error checking promo for number:', error);
    res.status(500).json({ success: false, message: 'Failed to check promo for number' });
  }
};

// Export all functions
const controllerExports = {
  getAllNumbers,
  getNumbersByProject,
  getNumbersByProjectWithPromos,
  createNumber,
  createNumbersBatch,
  updateNumber,
  updateNumberStatus,
  deleteNumber,
  clearProcessedNumbers,
  checkPromoForNumber
};

module.exports = controllerExports;
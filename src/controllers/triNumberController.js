const TriNumber = require('../models/TriNumber');
const Project = require('../models/Project');

const getAllNumbers = async (req, res) => {
  try {
    const { project_id } = req.query;
    const numbers = await TriNumber.getAll(project_id);
    res.json({ success: true, data: numbers });
  } catch (error) {
    console.error('Error fetching Tri numbers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch numbers' });
  }
};

const getNumbersByProject = async (req, res) => {
  try {
    const { project_id } = req.params;
    const numbers = await TriNumber.getByProject(project_id);
    res.json({ success: true, data: numbers });
  } catch (error) {
    console.error('Error fetching Tri numbers by project:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch numbers' });
  }
};

const getNumbersByProjectWithPromos = async (req, res) => {
  try {
    const { projectId } = req.params;
    const [numbers, project] = await Promise.all([
      TriNumber.getByProjectWithPromos(projectId),
      Project.getById(projectId)
    ]);
    res.json({
      success: true,
      data: numbers,
      project: project ? { id: project.id, name: project.name } : null
    });
  } catch (error) {
    console.error('Error fetching Tri numbers with promos:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch numbers' });
  }
};

const createNumber = async (req, res) => {
  try {
    const { number, project_id, name } = req.body;
    const num = number ?? req.body.name;

    if (!num) {
      return res.status(400).json({ success: false, message: 'Number is required' });
    }

    const projectId = project_id || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'project_id is required' });
    }

    const id = await TriNumber.create(String(num).trim(), projectId, (name ?? req.body.price) || null);
    res.status(201).json({ success: true, data: { id, number: String(num).trim(), name: name ?? null, status: 'pending', project_id: projectId } });
  } catch (error) {
    console.error('Error creating Tri number:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'Number already exists in this project' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create number' });
    }
  }
};

const createNumbersBatch = async (req, res) => {
  try {
    const { numbers, project_id } = req.body;

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ success: false, message: 'Numbers array is required' });
    }

    const projectId = project_id || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'project_id is required' });
    }

    const normalized = numbers.map((n) => String(n).trim()).filter(Boolean);
    if (normalized.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid numbers' });
    }

    const count = await TriNumber.createBatch(normalized, projectId);
    res.status(201).json({ success: true, message: `Created ${count} numbers` });
  } catch (error) {
    console.error('Error creating Tri numbers batch:', error);
    res.status(500).json({ success: false, message: 'Failed to create numbers' });
  }
};

const updateNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { number, name } = req.body;
    const num = number ?? req.body.name;
    const data = {};
    if (num !== undefined) data.number = String(num).trim();
    if (name !== undefined) data.name = name;
    if (req.body.price !== undefined) data.name = req.body.price;
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    const updated = await TriNumber.update(id, data);
    if (updated) {
      const row = await TriNumber.getById(id);
      res.json({ success: true, data: row });
    } else {
      res.status(404).json({ success: false, message: 'Number not found' });
    }
  } catch (error) {
    console.error('Error updating Tri number:', error);
    res.status(500).json({ success: false, message: 'Failed to update number' });
  }
};

const updateNumberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, packetCount } = req.body;

    if (!['pending', 'processed', 'failed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updated = await TriNumber.updateStatus(id, status, packetCount ?? 0);
    if (updated) {
      res.json({ success: true, message: 'Number status updated' });
    } else {
      res.status(404).json({ success: false, message: 'Number not found' });
    }
  } catch (error) {
    console.error('Error updating Tri number status:', error);
    res.status(500).json({ success: false, message: 'Failed to update number status' });
  }
};

const deleteNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TriNumber.delete(id);
    if (deleted) {
      res.json({ success: true, message: 'Number deleted' });
    } else {
      res.status(404).json({ success: false, message: 'Number not found' });
    }
  } catch (error) {
    console.error('Error deleting Tri number:', error);
    res.status(500).json({ success: false, message: 'Failed to delete number' });
  }
};

const clearProcessedNumbers = async (req, res) => {
  try {
    const count = await TriNumber.clearProcessed();
    res.json({ success: true, message: `Cleared ${count} processed numbers` });
  } catch (error) {
    console.error('Error clearing processed Tri numbers:', error);
    res.status(500).json({ success: false, message: 'Failed to clear processed numbers' });
  }
};

module.exports = {
  getAllNumbers,
  getNumbersByProject,
  getNumbersByProjectWithPromos,
  createNumber,
  createNumbersBatch,
  updateNumber,
  updateNumberStatus,
  deleteNumber,
  clearProcessedNumbers
};

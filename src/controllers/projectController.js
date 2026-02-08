const Project = require('../models/Project');

// Get all active projects
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.getAll();
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

// Get project by id
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.getById(id);
    if (project) {
      res.json({ success: true, data: project });
    } else {
      res.status(404).json({ success: false, message: 'Project not found' });
    }
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};

// Get project by code
exports.getProjectByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const project = await Project.getByCode(code);
    if (project) {
      res.json({ success: true, data: project });
    } else {
      res.status(404).json({ success: false, message: 'Project not found' });
    }
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};

// Create new project
exports.createProject = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const nameTrimmed = name ? String(name).trim() : '';

    if (!nameTrimmed || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required' });
    }

    const existingByName = await Project.getByName(nameTrimmed);
    if (existingByName) {
      return res.status(400).json({ success: false, message: 'Nama project sudah dipakai (name harus unik)' });
    }

    const id = await Project.create(nameTrimmed, code, description);
    res.status(201).json({ success: true, data: { id, name: nameTrimmed, code, description } });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      const msg = (error.sqlMessage || '').toLowerCase();
      if (msg.includes('code') || msg.includes('idx_code')) {
        return res.status(400).json({
          success: false,
          message: 'Code sudah dipakai. Agar code boleh sama, jalankan migrasi: alter_projects_code_not_unique.sql'
        });
      }
      return res.status(400).json({ success: false, message: 'Nama project sudah dipakai (name harus unik)' });
    }
    res.status(500).json({ success: false, message: 'Failed to create project' });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required' });
    }

    const updated = await Project.update(id, name, code, description);
    if (updated) {
      res.json({ success: true, message: 'Project updated' });
    } else {
      res.status(404).json({ success: false, message: 'Project not found' });
    }
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Failed to update project' });
  }
};

// Delete project (beserta promo_products dan isimple_numbers yang berelasi; isimple_phones tidak dihapus)
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.getById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    const deleted = await Project.deleteWithRelated(id);
    if (deleted) {
      res.json({ success: true, message: 'Project deleted' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to delete project' });
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project' });
  }
};

// Get semua project dengan code = isimple (boleh lebih dari satu)
exports.getIsimpleProject = async (req, res) => {
  try {
    const projects = await Project.getAllByCode('isimple');
    const data = projects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description || null,
      status: p.status || 'active',
      created_at: p.created_at,
      updated_at: p.updated_at
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching isimple projects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch isimple project' });
  }
};

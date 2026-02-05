const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middlewares/auth');

// Get all active projects
router.get('/', authenticateToken, projectController.getAllProjects);

// Get isimple project specifically
router.get('/isimple', authenticateToken, projectController.getIsimpleProject);

// Get project by id (dua bentuk: /id/1 dan /1)
router.get('/id/:id', authenticateToken, projectController.getProjectById);
router.get('/:id', authenticateToken, projectController.getProjectById);

// Get project by code
router.get('/code/:code', authenticateToken, projectController.getProjectByCode);

// Create new project
router.post('/', authenticateToken, projectController.createProject);

// Update project
router.patch('/:id', authenticateToken, projectController.updateProject);

// Delete project
router.delete('/:id', authenticateToken, projectController.deleteProject);

module.exports = router;
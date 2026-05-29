const express = require('express');
const router = express.Router();
const ngoController = require('../controllers/ngoController');
const { protect } = require('../middleware/authMiddleware');

// ─── Public Routes (no auth required) ────────────────────────────────────────
router.get('/directory', ngoController.getDirectory);
router.get('/:ngoId', ngoController.getNGOProfile);

// ─── Protected Routes (JWT required) ─────────────────────────────────────────
router.use(protect);

router.post('/chat/send', ngoController.sendMessage);
router.get('/chat/messages', ngoController.getMessages);
router.get('/chat/messages/:issueId', ngoController.getMessagesByIssue);
router.delete('/chat/messages/:msgId', ngoController.deleteMessage);
router.get('/collaboration/:issueId', ngoController.smartTeamFormation);
router.get('/chat/summary/:issueId', ngoController.getChatSummary);

// Comprehensive NGO Profile (auth required for own profile + mutations)
router.get('/me', ngoController.getMyNGOProfile);
router.put('/:ngoId/update', ngoController.updateNGOProfile);
router.post('/:ngoId/logo', ngoController.uploadNGOLogo);
router.post('/:ngoId/security', ngoController.updateNGOSecurity);

module.exports = router;

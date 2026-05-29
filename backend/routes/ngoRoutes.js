const express = require('express');
const router = express.Router();
const ngoController = require('../controllers/ngoController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes on this router
router.use(protect);

router.post('/chat/send', ngoController.sendMessage);
router.get('/chat/messages', ngoController.getMessages);
router.get('/chat/messages/:issueId', ngoController.getMessagesByIssue);
router.delete('/chat/messages/:msgId', ngoController.deleteMessage);
router.get('/directory', ngoController.getDirectory);
router.get('/collaboration/:issueId', ngoController.smartTeamFormation);
router.get('/chat/summary/:issueId', ngoController.getChatSummary);

// Comprehensive NGO Profile
router.get('/me', ngoController.getMyNGOProfile);
router.get('/:ngoId', ngoController.getNGOProfile);
router.put('/:ngoId/update', ngoController.updateNGOProfile);
router.post('/:ngoId/logo', ngoController.uploadNGOLogo);
router.post('/:ngoId/security', ngoController.updateNGOSecurity);

module.exports = router;

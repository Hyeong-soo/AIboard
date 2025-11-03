const { Router } = require('express');
const decisionsController = require('../controllers/decisions.controller');

const router = Router();

router.get('/', decisionsController.listDecisions);
router.get('/:id', decisionsController.getDecision);

module.exports = router;

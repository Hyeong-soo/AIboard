const { Router } = require('express');
const manualsController = require('../controllers/manuals.controller');

const router = Router();

router.get('/', manualsController.listManuals);
router.get('/:taskType/:llmName', manualsController.getManual);

module.exports = router;

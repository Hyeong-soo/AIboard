const { Router } = require('express');
const llmController = require('../controllers/llm.controller');

const router = Router();

router.get('/', llmController.listLlmStatus);

module.exports = router;

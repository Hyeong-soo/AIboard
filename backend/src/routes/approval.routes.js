const { Router } = require('express');
const approvalController = require('../controllers/approval.controller');

const router = Router();

router.post('/', approvalController.approve);

module.exports = router;

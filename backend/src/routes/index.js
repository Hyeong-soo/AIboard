const { Router } = require('express');
const healthRouter = require('./health.routes');
const approvalRouter = require('./approval.routes');
const decisionsRouter = require('./decisions.routes');
const manualsRouter = require('./manuals.routes');
const llmRouter = require('./llm.routes');

const router = Router();

router.use('/health', healthRouter);
router.use('/approve', approvalRouter);
router.use('/decisions', decisionsRouter);
router.use('/manuals', manualsRouter);
router.use('/llms', llmRouter);

module.exports = router;

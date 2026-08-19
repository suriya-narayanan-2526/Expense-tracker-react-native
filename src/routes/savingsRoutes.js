const express = require('express');
const router = express.Router();
const {
  getSavingsDashboard,
  addSaving,
  getSavings,
  getMonthlySavings,
  updateSaving,
  deleteSaving,
} = require('../controllers/savingsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', getSavingsDashboard);
router.post('/', addSaving);
router.get('/', getSavings);
router.get('/monthly', getMonthlySavings);
router.put('/:id', updateSaving);
router.delete('/:id', deleteSaving);

module.exports = router;

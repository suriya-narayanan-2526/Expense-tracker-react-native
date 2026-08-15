const express = require('express');
const router = express.Router();
const {
  addSaving,
  getSavings,
  getMonthlySavings,
  updateSaving,
  deleteSaving,
} = require('../controllers/savingsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', addSaving);
router.get('/', getSavings);
router.get('/monthly', getMonthlySavings);
router.put('/:id', updateSaving);
router.delete('/:id', deleteSaving);

module.exports = router;

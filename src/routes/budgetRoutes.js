const express = require('express');
const router = express.Router();
const {
  setBudget,
  getBudgets,
  getMonthlyBudgets,
  updateBudget,
  deleteBudget,
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', setBudget);
router.get('/', getBudgets);
router.get('/monthly', getMonthlyBudgets);
router.put('/:id', updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;

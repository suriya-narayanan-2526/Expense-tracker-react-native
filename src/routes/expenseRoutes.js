const express = require('express');
const router = express.Router();
const {
  addExpense,
  getExpenses,
  getTodayExpenses,
  getMonthlyExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', addExpense);
router.get('/', getExpenses);
router.get('/today', getTodayExpenses);
router.get('/monthly', getMonthlyExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;

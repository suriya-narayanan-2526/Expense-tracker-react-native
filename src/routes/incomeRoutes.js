const express = require('express');
const router = express.Router();
const {
  addIncome,
  getIncomes,
  getMonthlyIncomes,
  updateIncome,
  deleteIncome,
} = require('../controllers/incomeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', addIncome);
router.get('/', getIncomes);
router.get('/monthly', getMonthlyIncomes);
router.put('/:id', updateIncome);
router.delete('/:id', deleteIncome);

module.exports = router;

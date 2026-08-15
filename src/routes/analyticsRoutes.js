const express = require('express');
const router = express.Router();
const {
  getDailyAnalytics,
  getMonthlyTrendAnalytics,
  getCategoryAnalytics,
  getIncomeVsExpense,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/daily', getDailyAnalytics);
router.get('/monthly', getMonthlyTrendAnalytics);
router.get('/categories', getCategoryAnalytics);
router.get('/income-vs-expense', getIncomeVsExpense);

module.exports = router;

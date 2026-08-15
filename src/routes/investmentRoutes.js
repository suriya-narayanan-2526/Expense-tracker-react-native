const express = require('express');
const router = express.Router();
const {
  addInvestment,
  getInvestments,
  getInvestmentSummary,
  updateInvestment,
  deleteInvestment,
} = require('../controllers/investmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', addInvestment);
router.get('/', getInvestments);
router.get('/summary', getInvestmentSummary);
router.put('/:id', updateInvestment);
router.delete('/:id', deleteInvestment);

module.exports = router;

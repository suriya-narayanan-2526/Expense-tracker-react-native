const Income = require('../models/Income');

// @desc    Add new income
// @route   POST /api/incomes
// @access  Private
const addIncome = async (req, res, next) => {
  try {
    const {
      amount,
      source,
      description,
      incomeDate,
      isRecurring,
      sender,
      deduplicationKey,
      currency,
    } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid income amount greater than 0',
      });
    }

    // Deduplication check for bank SMS or client idempotency keys
    if (deduplicationKey) {
      const existingIncome = await Income.findOne({
        userId: req.user.id,
        deduplicationKey,
      });

      if (existingIncome) {
        return res.status(409).json({
          success: false,
          isDuplicate: true,
          message: 'This income transaction has already been recorded',
          data: existingIncome,
        });
      }
    }

    const income = await Income.create({
      userId: req.user.id,
      amount: Number(amount),
      source: source || (sender ? 'Bank SMS' : 'Salary'),
      description: description || '',
      incomeDate: incomeDate ? new Date(incomeDate) : new Date(),
      isRecurring: !!isRecurring,
      sender: sender || '',
      deduplicationKey: deduplicationKey || undefined,
      currency: currency || 'INR',
    });

    res.status(201).json({
      success: true,
      data: income,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all incomes
// @route   GET /api/incomes
// @access  Private
const getIncomes = async (req, res, next) => {
  try {
    const { source, startDate, endDate, limit = 50, page = 1 } = req.query;

    const query = { userId: req.user.id };

    if (source) query.source = source;
    if (startDate || endDate) {
      query.incomeDate = {};
      if (startDate) query.incomeDate.$gte = new Date(startDate);
      if (endDate) query.incomeDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [incomes, total] = await Promise.all([
      Income.find(query).sort({ incomeDate: -1 }).skip(skip).limit(Number(limit)),
      Income.countDocuments(query),
    ]);

    const totalAmount = await Income.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      count: incomes.length,
      total,
      totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
      data: incomes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly income summary
// @route   GET /api/incomes/monthly
// @access  Private
const getMonthlyIncomes = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const incomes = await Income.find({
      userId: req.user.id,
      incomeDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ incomeDate: -1 });

    const totalAmount = incomes.reduce((sum, item) => sum + item.amount, 0);

    // Group by source
    const sourceMap = {};
    incomes.forEach((item) => {
      sourceMap[item.source] = (sourceMap[item.source] || 0) + item.amount;
    });

    const sourceBreakdown = Object.keys(sourceMap).map((src) => ({
      source: src,
      amount: sourceMap[src],
      percentage: totalAmount > 0 ? Number(((sourceMap[src] / totalAmount) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      month,
      year,
      totalAmount,
      incomeCount: incomes.length,
      sourceBreakdown,
      data: incomes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update income
// @route   PUT /api/incomes/:id
// @access  Private
const updateIncome = async (req, res, next) => {
  try {
    let income = await Income.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!income) {
      return res.status(404).json({ success: false, message: 'Income record not found' });
    }

    const { amount, source, description, incomeDate, isRecurring } = req.body;

    if (amount !== undefined) income.amount = Number(amount);
    if (source) income.source = source;
    if (description !== undefined) income.description = description;
    if (incomeDate) income.incomeDate = new Date(incomeDate);
    if (isRecurring !== undefined) income.isRecurring = !!isRecurring;

    await income.save();

    res.json({ success: true, data: income });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete income
// @route   DELETE /api/incomes/:id
// @access  Private
const deleteIncome = async (req, res, next) => {
  try {
    const income = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!income) {
      return res.status(404).json({ success: false, message: 'Income record not found' });
    }

    res.json({ success: true, message: 'Income deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addIncome,
  getIncomes,
  getMonthlyIncomes,
  updateIncome,
  deleteIncome,
};

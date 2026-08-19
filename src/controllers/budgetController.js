const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

// Predefined Monthly Budget Template
const DEFAULT_BUDGET_TEMPLATE = [
  { category: 'Bills', monthlyLimit: 300 },
  { category: 'Transport', monthlyLimit: 500 },
  { category: 'Shopping', monthlyLimit: 2500 },
  { category: 'Food', monthlyLimit: 1000 },
];

// Helper to ensure predefined budget exists for current or future months
const ensureMonthlyBudgetExists = async (userId, month, year) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const isCurrentOrFuture = year > currentYear || (year === currentYear && month >= currentMonth);
  if (!isCurrentOrFuture) {
    return;
  }

  const existingCount = await Budget.countDocuments({ userId, month, year });
  if (existingCount === 0) {
    const defaultEntries = DEFAULT_BUDGET_TEMPLATE.map((item) => ({
      userId,
      category: item.category,
      monthlyLimit: item.monthlyLimit,
      month,
      year,
      isCustomized: false,
    }));

    try {
      await Budget.insertMany(defaultEntries, { ordered: false });
    } catch (err) {
      // Ignore duplicate key error in case of concurrent requests
      if (err.code !== 11000 && !err.writeErrors) {
        console.error('Error auto-creating default budget:', err);
      }
    }
  }
};

// @desc    Create or update monthly category budget
// @route   POST /api/budgets
// @access  Private
const setBudget = async (req, res, next) => {
  try {
    const { category, monthlyLimit, month, year } = req.body;

    if (!category || monthlyLimit === undefined || isNaN(monthlyLimit) || Number(monthlyLimit) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category and a valid non-negative monthly limit',
      });
    }

    const now = new Date();
    const bMonth = month ? parseInt(month) : now.getMonth() + 1;
    const bYear = year ? parseInt(year) : now.getFullYear();

    const budget = await Budget.findOneAndUpdate(
      {
        userId: req.user.id,
        category: category.trim(),
        month: bMonth,
        year: bYear,
      },
      {
        userId: req.user.id,
        category: category.trim(),
        monthlyLimit: Number(monthlyLimit),
        month: bMonth,
        year: bYear,
        isCustomized: true,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all budgets
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ userId: req.user.id }).sort({ year: -1, month: -1 });
    res.json({ success: true, count: budgets.length, data: budgets });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly budgets with actual spending & health status
// @route   GET /api/budgets/monthly
// @access  Private
const getMonthlyBudgets = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    // Auto-create predefined budget if current or future month has no budget records
    await ensureMonthlyBudgetExists(req.user.id, month, year);

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch budgets for this month
    const budgets = await Budget.find({
      userId: req.user.id,
      month,
      year,
    });

    // Fetch actual expenses for this month
    const expenses = await Expense.find({
      userId: req.user.id,
      expenseDate: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Group expenses by category
    const expenseMap = {};
    expenses.forEach((item) => {
      expenseMap[item.category] = (expenseMap[item.category] || 0) + item.amount;
    });

    let totalBudget = 0;
    let totalSpentInBudgets = 0;

    const budgetStatus = budgets.map((b) => {
      const spent = expenseMap[b.category] || 0;
      const remaining = b.monthlyLimit - spent;
      const usedPercentage =
        b.monthlyLimit > 0 ? Number(((spent / b.monthlyLimit) * 100).toFixed(1)) : 0;
      const isOverBudget = spent > b.monthlyLimit;
      const isNearLimit = !isOverBudget && usedPercentage >= 80;

      totalBudget += b.monthlyLimit;
      totalSpentInBudgets += spent;

      return {
        _id: b._id,
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        month: b.month,
        year: b.year,
        isCustomized: b.isCustomized,
        spentAmount: spent,
        remainingAmount: remaining,
        usedPercentage,
        isOverBudget,
        isNearLimit,
      };
    });

    res.json({
      success: true,
      month,
      year,
      totalBudget,
      totalSpentInBudgets,
      totalRemaining: totalBudget - totalSpentInBudgets,
      overallUsedPercentage:
        totalBudget > 0
          ? Number(((totalSpentInBudgets / totalBudget) * 100).toFixed(1))
          : 0,
      data: budgetStatus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update budget
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = async (req, res, next) => {
  try {
    let budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget record not found' });
    }

    const { category, monthlyLimit, month, year } = req.body;

    if (category) budget.category = category.trim();
    if (monthlyLimit !== undefined) budget.monthlyLimit = Number(monthlyLimit);
    if (month) budget.month = parseInt(month);
    if (year) budget.year = parseInt(year);
    budget.isCustomized = true;

    await budget.save();

    res.json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget record not found' });
    }

    res.json({ success: true, message: 'Budget deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setBudget,
  getBudgets,
  getMonthlyBudgets,
  updateBudget,
  deleteBudget,
  DEFAULT_BUDGET_TEMPLATE,
  ensureMonthlyBudgetExists,
};

const Saving = require('../models/Saving');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const { ensureMonthlyBudgetExists } = require('./budgetController');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// @desc    Get complete savings dashboard (Salary - Spending calculation, monthly & yearly trends)
// @route   GET /api/savings/dashboard
// @access  Private
const getSavingsDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    const userId = req.user.id;

    // Ensure budget is initialized for current/future months
    await ensureMonthlyBudgetExists(userId, month, year);

    // Query all records for user in parallel to ensure complete timezone-agnostic aggregation
    const [allUserIncomes, allUserExpenses, allUserBudgets] = await Promise.all([
      Income.find({ userId }).sort({ incomeDate: -1 }),
      Expense.find({ userId }).sort({ expenseDate: -1 }),
      Budget.find({ userId }),
    ]);

    // Filter for selected month & year (matching both local and UTC boundaries)
    const monthIncomes = allUserIncomes.filter((inc) => {
      const d = new Date(inc.incomeDate);
      const incYear = d.getFullYear();
      const incMonth = d.getMonth() + 1;
      const utcYear = d.getUTCFullYear();
      const utcMonth = d.getUTCMonth() + 1;
      return (incYear === year && incMonth === month) || (utcYear === year && utcMonth === month);
    });

    const monthExpenses = allUserExpenses.filter((exp) => {
      const d = new Date(exp.expenseDate);
      const expYear = d.getFullYear();
      const expMonth = d.getMonth() + 1;
      const utcYear = d.getUTCFullYear();
      const utcMonth = d.getUTCMonth() + 1;
      return (expYear === year && expMonth === month) || (utcYear === year && utcMonth === month);
    });

    const monthBudgets = allUserBudgets.filter((b) => b.month === month && b.year === year);

    // 1. Current Month Calculations
    const salary = monthIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);
    const actualSpending = monthExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalBudget = monthBudgets.reduce((sum, item) => sum + (item.monthlyLimit || 0), 0);

    // Core rule: Savings = Salary - Actual Spending
    const totalSavings = salary - actualSpending;
    const savingsRate = salary > 0 ? Number(((totalSavings / salary) * 100).toFixed(1)) : 0;

    // Budget Remaining: Budget - Actual Spending (0 if overspent)
    const isOverBudget = actualSpending > totalBudget;
    const budgetRemaining = Math.max(0, totalBudget - actualSpending);
    const budgetOverspent = Math.max(0, actualSpending - totalBudget);

    // 2. Monthly Trend (Months 1..12 for the requested year)
    const monthlyTrend = [];
    let yearlyTotalSalary = 0;
    let yearlyTotalSpending = 0;
    let yearlyTotalSavings = 0;

    for (let m = 1; m <= 12; m++) {
      const mIncomes = allUserIncomes.filter((inc) => {
        const d = new Date(inc.incomeDate);
        return (d.getFullYear() === year || d.getUTCFullYear() === year) &&
               (d.getMonth() + 1 === m || d.getUTCMonth() + 1 === m);
      });
      const mExpenses = allUserExpenses.filter((exp) => {
        const d = new Date(exp.expenseDate);
        return (d.getFullYear() === year || d.getUTCFullYear() === year) &&
               (d.getMonth() + 1 === m || d.getUTCMonth() + 1 === m);
      });
      const mBudgets = allUserBudgets.filter((b) => b.month === m && b.year === year);

      const mSalary = mIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);
      const mSpending = mExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
      const mBudget = mBudgets.reduce((sum, item) => sum + (item.monthlyLimit || 0), 0);
      const mSavings = mSalary - mSpending;
      const mRate = mSalary > 0 ? Number(((mSavings / mSalary) * 100).toFixed(1)) : 0;

      yearlyTotalSalary += mSalary;
      yearlyTotalSpending += mSpending;
      yearlyTotalSavings += mSavings;

      monthlyTrend.push({
        month: m,
        monthName: MONTH_NAMES[m - 1],
        shortName: SHORT_MONTH_NAMES[m - 1],
        salary: mSalary,
        spending: mSpending,
        budget: mBudget,
        savings: mSavings,
        savingsRate: mRate,
        isOverBudget: mSpending > mBudget && mBudget > 0,
      });
    }

    // 3. Multi-Year Historical Trend
    const yearSet = new Set([year, year - 1, year - 2]);
    allUserIncomes.forEach((inc) => {
      yearSet.add(new Date(inc.incomeDate).getFullYear());
      yearSet.add(new Date(inc.incomeDate).getUTCFullYear());
    });
    allUserExpenses.forEach((exp) => {
      yearSet.add(new Date(exp.expenseDate).getFullYear());
      yearSet.add(new Date(exp.expenseDate).getUTCFullYear());
    });

    const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
    const yearlyTrend = sortedYears.map((yr) => {
      const yrIncomes = allUserIncomes.filter((inc) => {
        const d = new Date(inc.incomeDate);
        return d.getFullYear() === yr || d.getUTCFullYear() === yr;
      });
      const yrExpenses = allUserExpenses.filter((exp) => {
        const d = new Date(exp.expenseDate);
        return d.getFullYear() === yr || d.getUTCFullYear() === yr;
      });

      const yrSalary = yrIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);
      const yrSpending = yrExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
      const yrSavings = yrSalary - yrSpending;
      const yrRate = yrSalary > 0 ? Number(((yrSavings / yrSalary) * 100).toFixed(1)) : 0;

      return {
        year: yr,
        totalSalary: yrSalary,
        totalSpending: yrSpending,
        totalSavings: yrSavings,
        savingsRate: yrRate,
      };
    });

    // 4. Return itemized incomes and expenses for the selected month
    const itemizedIncomes = monthIncomes.map((inc) => ({
      id: inc._id,
      amount: inc.amount,
      source: inc.source,
      description: inc.description,
      date: inc.incomeDate,
    }));

    const itemizedExpenses = monthExpenses.map((exp) => ({
      id: exp._id,
      amount: exp.amount,
      category: exp.category,
      description: exp.description,
      paymentMethod: exp.paymentMethod,
      date: exp.expenseDate,
    }));

    res.json({
      success: true,
      month,
      year,
      data: {
        salary,
        actualSpending,
        totalBudget,
        budgetRemaining,
        isOverBudget,
        budgetOverspent,
        totalSavings,
        savingsRate,
        monthlyTrend,
        yearlyTotalSalary,
        yearlyTotalSpending,
        yearlyTotalSavings,
        yearlyTrend,
        incomes: itemizedIncomes,
        expenses: itemizedExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add savings entry (manual goal deposit)
// @route   POST /api/savings
// @access  Private
const addSaving = async (req, res, next) => {
  try {
    const { amount, goal, targetAmount, description, savingsDate } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid savings amount greater than 0',
      });
    }

    const saving = await Saving.create({
      userId: req.user.id,
      amount: Number(amount),
      goal: goal || 'General Savings',
      targetAmount: targetAmount ? Number(targetAmount) : 0,
      description: description || '',
      savingsDate: savingsDate ? new Date(savingsDate) : new Date(),
    });

    res.status(201).json({
      success: true,
      data: saving,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all savings
// @route   GET /api/savings
// @access  Private
const getSavings = async (req, res, next) => {
  try {
    const { goal, startDate, endDate } = req.query;
    const query = { userId: req.user.id };

    if (goal) query.goal = goal;
    if (startDate || endDate) {
      query.savingsDate = {};
      if (startDate) query.savingsDate.$gte = new Date(startDate);
      if (endDate) query.savingsDate.$lte = new Date(endDate);
    }

    const savings = await Saving.find(query).sort({ savingsDate: -1 });
    const totalAmount = savings.reduce((sum, item) => sum + item.amount, 0);

    // Group by goal
    const goalMap = {};
    savings.forEach((item) => {
      if (!goalMap[item.goal]) {
        goalMap[item.goal] = {
          goal: item.goal,
          savedAmount: 0,
          targetAmount: item.targetAmount || 0,
          count: 0,
        };
      }
      goalMap[item.goal].savedAmount += item.amount;
      if (item.targetAmount && item.targetAmount > goalMap[item.goal].targetAmount) {
        goalMap[item.goal].targetAmount = item.targetAmount;
      }
      goalMap[item.goal].count += 1;
    });

    const goalsSummary = Object.values(goalMap).map((g) => ({
      ...g,
      progressPercentage:
        g.targetAmount > 0
          ? Number(Math.min((g.savedAmount / g.targetAmount) * 100, 100).toFixed(1))
          : 100,
    }));

    res.json({
      success: true,
      count: savings.length,
      totalAmount,
      goalsSummary,
      data: savings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly savings
// @route   GET /api/savings/monthly
// @access  Private
const getMonthlySavings = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const savings = await Saving.find({
      userId: req.user.id,
      savingsDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ savingsDate: -1 });

    const totalAmount = savings.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      month,
      year,
      totalAmount,
      count: savings.length,
      data: savings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update savings entry
// @route   PUT /api/savings/:id
// @access  Private
const updateSaving = async (req, res, next) => {
  try {
    let saving = await Saving.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!saving) {
      return res.status(404).json({ success: false, message: 'Savings entry not found' });
    }

    const { amount, goal, targetAmount, description, savingsDate } = req.body;

    if (amount !== undefined) saving.amount = Number(amount);
    if (goal) saving.goal = goal;
    if (targetAmount !== undefined) saving.targetAmount = Number(targetAmount);
    if (description !== undefined) saving.description = description;
    if (savingsDate) saving.savingsDate = new Date(savingsDate);

    await saving.save();

    res.json({ success: true, data: saving });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete savings entry
// @route   DELETE /api/savings/:id
// @access  Private
const deleteSaving = async (req, res, next) => {
  try {
    const saving = await Saving.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!saving) {
      return res.status(404).json({ success: false, message: 'Savings entry not found' });
    }

    res.json({ success: true, message: 'Savings entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSavingsDashboard,
  addSaving,
  getSavings,
  getMonthlySavings,
  updateSaving,
  deleteSaving,
};

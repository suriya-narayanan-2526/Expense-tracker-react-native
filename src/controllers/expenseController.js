const Expense = require('../models/Expense');

// @desc    Add new expense
// @route   POST /api/expenses
// @access  Private
const addExpense = async (req, res, next) => {
  try {
    const {
      amount,
      category,
      description,
      paymentMethod,
      expenseDate,
      isRecurring,
      recurringRule,
    } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid expense amount greater than 0',
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Please specify an expense category',
      });
    }

    const expense = await Expense.create({
      userId: req.user.id,
      amount: Number(amount),
      category,
      description: description || '',
      paymentMethod: paymentMethod || 'UPI',
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      isRecurring: !!isRecurring,
      recurringRule: recurringRule || '',
    });

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all expenses with filter/pagination
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res, next) => {
  try {
    const {
      category,
      paymentMethod,
      startDate,
      endDate,
      search,
      limit = 50,
      page = 1,
      sortBy = 'expenseDate',
      order = 'desc',
    } = req.query;

    const query = { userId: req.user.id };

    if (category) {
      query.category = category;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = {};
    sortObj[sortBy] = order === 'asc' ? 1 : -1;

    const [expenses, total] = await Promise.all([
      Expense.find(query).sort(sortObj).skip(skip).limit(Number(limit)),
      Expense.countDocuments(query),
    ]);

    const totalAmount = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      count: expenses.length,
      total,
      totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's expenses
// @route   GET /api/expenses/today
// @access  Private
const getTodayExpenses = async (req, res, next) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const expenses = await Expense.find({
      userId: req.user.id,
      expenseDate: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ expenseDate: -1 });

    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    // Group by category
    const categoryBreakdown = {};
    expenses.forEach((item) => {
      categoryBreakdown[item.category] =
        (categoryBreakdown[item.category] || 0) + item.amount;
    });

    res.json({
      success: true,
      date: startOfDay.toISOString().split('T')[0],
      count: expenses.length,
      totalAmount,
      categoryBreakdown,
      hasRecordedExpenseToday: expenses.length > 0,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly expenses summary & breakdown
// @route   GET /api/expenses/monthly
// @access  Private
const getMonthlyExpenses = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1; // 1-12
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Calculate previous month start and end for comparison
    const prevMonthDate = new Date(year, month - 2, 1);
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevYear = prevMonthDate.getFullYear();
    const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0);
    const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    const [currentExpenses, prevExpenses] = await Promise.all([
      Expense.find({
        userId: req.user.id,
        expenseDate: { $gte: startOfMonth, $lte: endOfMonth },
      }).sort({ expenseDate: -1 }),
      Expense.find({
        userId: req.user.id,
        expenseDate: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
      }),
    ]);

    const totalAmount = currentExpenses.reduce((sum, item) => sum + item.amount, 0);
    const prevMonthTotal = prevExpenses.reduce((sum, item) => sum + item.amount, 0);

    // Category breakdown
    const categoryMap = {};
    currentExpenses.forEach((item) => {
      categoryMap[item.category] = (categoryMap[item.category] || 0) + item.amount;
    });

    const categoryBreakdown = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      amount: categoryMap[cat],
      percentage: totalAmount > 0 ? Number(((categoryMap[cat] / totalAmount) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.amount - a.amount);

    const highestCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // Days in month & average daily
    const daysInMonth = endOfMonth.getDate();
    const daysPassed = (now.getFullYear() === year && now.getMonth() + 1 === month)
      ? now.getDate()
      : daysInMonth;
    const averageDaily = daysPassed > 0 ? Number((totalAmount / daysPassed).toFixed(2)) : 0;

    // Difference with previous month
    const percentageChange = prevMonthTotal > 0
      ? Number((((totalAmount - prevMonthTotal) / prevMonthTotal) * 100).toFixed(1))
      : 0;

    res.json({
      success: true,
      month,
      year,
      totalAmount,
      expenseCount: currentExpenses.length,
      averageDaily,
      highestCategory,
      previousMonthTotal: prevMonthTotal,
      percentageChange,
      categoryBreakdown,
      data: currentExpenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense by ID
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const {
      amount,
      category,
      description,
      paymentMethod,
      expenseDate,
      isRecurring,
      recurringRule,
    } = req.body;

    if (amount !== undefined) expense.amount = Number(amount);
    if (category) expense.category = category;
    if (description !== undefined) expense.description = description;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (expenseDate) expense.expenseDate = new Date(expenseDate);
    if (isRecurring !== undefined) expense.isRecurring = !!isRecurring;
    if (recurringRule !== undefined) expense.recurringRule = recurringRule;

    await expense.save();

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addExpense,
  getExpenses,
  getTodayExpenses,
  getMonthlyExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};

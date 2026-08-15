const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Saving = require('../models/Saving');
const Investment = require('../models/Investment');
const Budget = require('../models/Budget');

// @desc    Get complete unified dashboard summary
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    // Start & End of Month
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Start & End of Today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const userId = req.user.id;

    // Fetch monthly records in parallel
    const [
      monthlyExpenses,
      todayExpenses,
      monthlyIncomes,
      monthlySavings,
      allInvestments,
      monthlyBudgets,
      recentExpenses,
      recentIncomes,
    ] = await Promise.all([
      Expense.find({ userId, expenseDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Expense.find({ userId, expenseDate: { $gte: startOfToday, $lte: endOfToday } }),
      Income.find({ userId, incomeDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Saving.find({ userId, savingsDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Investment.find({ userId }),
      Budget.find({ userId, month, year }),
      Expense.find({ userId }).sort({ expenseDate: -1 }).limit(5),
      Income.find({ userId }).sort({ incomeDate: -1 }).limit(5),
    ]);

    // Sum totals
    const totalExpenses = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
    const todayTotalExpense = todayExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = monthlyIncomes.reduce((sum, item) => sum + item.amount, 0);
    const totalSavings = monthlySavings.reduce((sum, item) => sum + item.amount, 0);

    // Investment calculations
    const totalInvestedPortfolio = allInvestments.reduce((sum, item) => sum + item.investedAmount, 0);
    const currentPortfolioValue = allInvestments.reduce((sum, item) => sum + item.currentValue, 0);
    const monthlyInvestmentAmount = allInvestments.reduce((sum, item) => sum + (item.monthlyAmount || 0), 0);
    const totalProfitLoss = currentPortfolioValue - totalInvestedPortfolio;

    // Net Available Balance
    const availableBalance = totalIncome - totalExpenses - totalSavings;

    // Ratios
    const savingsPercentage =
      totalIncome > 0 ? Number(((totalSavings / totalIncome) * 100).toFixed(1)) : 0;
    const investmentPercentage =
      totalIncome > 0 ? Number(((monthlyInvestmentAmount / totalIncome) * 100).toFixed(1)) : 0;
    const expensePercentage =
      totalIncome > 0 ? Number(((totalExpenses / totalIncome) * 100).toFixed(1)) : 0;

    // Category breakdown
    const categoryMap = {};
    monthlyExpenses.forEach((item) => {
      categoryMap[item.category] = (categoryMap[item.category] || 0) + item.amount;
    });

    const categoryBreakdown = Object.keys(categoryMap)
      .map((cat) => ({
        category: cat,
        amount: categoryMap[cat],
        percentage:
          totalExpenses > 0
            ? Number(((categoryMap[cat] / totalExpenses) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'None';

    // Combine recent transactions
    const combinedRecent = [
      ...recentExpenses.map((e) => ({
        id: e._id,
        type: 'expense',
        title: e.description || e.category,
        category: e.category,
        amount: e.amount,
        paymentMethod: e.paymentMethod,
        date: e.expenseDate,
      })),
      ...recentIncomes.map((i) => ({
        id: i._id,
        type: 'income',
        title: i.description || i.source,
        category: i.source,
        amount: i.amount,
        paymentMethod: 'Direct',
        date: i.incomeDate,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7);

    res.json({
      success: true,
      month,
      year,
      summary: {
        income: totalIncome,
        expenses: totalExpenses,
        todayExpense: todayTotalExpense,
        todayExpenseCount: todayExpenses.length,
        hasRecordedExpenseToday: todayExpenses.length > 0,
        savings: totalSavings,
        investments: currentPortfolioValue,
        monthlyInvestments: monthlyInvestmentAmount,
        portfolioProfitLoss: totalProfitLoss,
        balance: availableBalance,
        expenseCount: monthlyExpenses.length,
        topCategory,
        savingsPercentage,
        investmentPercentage,
        expensePercentage,
      },
      categoryBreakdown,
      recentTransactions: combinedRecent,
      budgetsCount: monthlyBudgets.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
};

const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Saving = require('../models/Saving');
const Investment = require('../models/Investment');

// Helper to get start and end dates of a month
const getMonthRange = (year, month) => {
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

// @desc    Get daily spending trend for a given month
// @route   GET /api/analytics/daily
// @access  Private
const getDailyAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const { start: startOfMonth, end: endOfMonth } = getMonthRange(year, month);

    const expenses = await Expense.find({
      userId: req.user.id,
      expenseDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ expenseDate: 1 });

    const daysInMonth = endOfMonth.getDate();
    const dailyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyData.push({
        day,
        date: dayStr,
        amount: 0,
        count: 0,
      });
    }

    expenses.forEach((e) => {
      const expDay = new Date(e.expenseDate).getDate();
      if (expDay >= 1 && expDay <= daysInMonth) {
        dailyData[expDay - 1].amount += e.amount;
        dailyData[expDay - 1].count += 1;
      }
    });

    const totalSpending = dailyData.reduce((sum, d) => sum + d.amount, 0);
    const activeDays = dailyData.filter((d) => d.amount > 0).length || 1;
    const averageDaily = Math.round(totalSpending / activeDays);

    const maxSpendingDay = dailyData.reduce(
      (max, d) => (d.amount > max.amount ? d : max),
      dailyData[0] || { day: 1, amount: 0 }
    );

    res.json({
      success: true,
      month,
      year,
      totalSpending,
      averageDaily,
      maxSpendingDay,
      dailyData,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly spending & income comparison for past N months
// @route   GET /api/analytics/monthly
// @access  Private
const getMonthlyTrendAnalytics = async (req, res, next) => {
  try {
    const monthsCount = req.query.months ? parseInt(req.query.months) : 6;
    const now = new Date();
    const result = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = date.getMonth() + 1;
      const y = date.getFullYear();

      const { start, end } = getMonthRange(y, m);

      const [monthlyExp, monthlyInc] = await Promise.all([
        Expense.find({ userId: req.user.id, expenseDate: { $gte: start, $lte: end } }),
        Income.find({ userId: req.user.id, incomeDate: { $gte: start, $lte: end } }),
      ]);

      const expenses = monthlyExp.reduce((sum, item) => sum + item.amount, 0);
      const income = monthlyInc.reduce((sum, item) => sum + item.amount, 0);
      const savings = Math.max(0, income - expenses);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      result.push({
        month: m,
        year: y,
        label: `${monthNames[m - 1]} ${y === now.getFullYear() ? '' : y}`.trim(),
        expenses,
        income,
        savings,
        savingsRate: income > 0 ? Number(((savings / income) * 100).toFixed(1)) : 0,
      });
    }

    res.json({
      success: true,
      history: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category analytics and payment methods breakdown
// @route   GET /api/analytics/categories
// @access  Private
const getCategoryAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const { start: startOfMonth, end: endOfMonth } = getMonthRange(year, month);

    const expenses = await Expense.find({
      userId: req.user.id,
      expenseDate: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const catMap = {};
    const methodMap = {};

    expenses.forEach((item) => {
      catMap[item.category] = (catMap[item.category] || 0) + item.amount;
      const method = item.paymentMethod || 'Other';
      methodMap[method] = (methodMap[method] || 0) + item.amount;
    });

    const categoryColorMap = {
      Food: '#1A73E8', // Blue
      Shopping: '#FBBC04', // Amber
      Transport: '#1E8E3E', // Green
      Bills: '#EA4335', // Red
      Entertainment: '#9334E6', // Purple
      Health: '#00ACC1', // Cyan
      Education: '#FF6D00', // Deep Orange
      Travel: '#E91E63', // Pink
      Other: '#78909C', // Slate
    };

    const defaultColors = [
      '#1A73E8', '#FBBC04', '#1E8E3E', '#EA4335', '#9334E6',
      '#00ACC1', '#FF6D00', '#E91E63', '#4CAF50', '#78909C'
    ];

    const categories = Object.keys(catMap).map((cat, idx) => ({
      category: cat,
      amount: catMap[cat],
      percentage: total > 0 ? Number(((catMap[cat] / total) * 100).toFixed(1)) : 0,
      color: categoryColorMap[cat] || defaultColors[idx % defaultColors.length],
    })).sort((a, b) => b.amount - a.amount);

    const paymentMethods = Object.keys(methodMap).map((pm) => ({
      method: pm,
      amount: methodMap[pm],
      percentage: total > 0 ? Number(((methodMap[pm] / total) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      month,
      year,
      total,
      categories,
      paymentMethods,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overall income vs expense summary, 50/30/20 rule, & smart insights
// @route   GET /api/analytics/income-vs-expense
// @access  Private
const getIncomeVsExpense = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

    const { start: startOfMonth, end: endOfMonth } = getMonthRange(year, month);

    const [exp, inc, sav, inv] = await Promise.all([
      Expense.find({ userId: req.user.id, expenseDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Income.find({ userId: req.user.id, incomeDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Saving.find({ userId: req.user.id, savingsDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Investment.find({ userId: req.user.id }),
    ]);

    const totalExpense = exp.reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = inc.reduce((sum, item) => sum + item.amount, 0);
    const totalSavings = sav.reduce((sum, item) => sum + item.amount, 0);
    const totalInvestments = inv.reduce((sum, item) => sum + (item.monthlyAmount || 0), 0);

    const netCashflow = totalIncome - totalExpense;
    const expenseRatio = totalIncome > 0 ? Number(((totalExpense / totalIncome) * 100).toFixed(1)) : 0;
    const savingsRatio = totalIncome > 0 ? Number(((totalSavings / totalIncome) * 100).toFixed(1)) : 0;
    const investmentRatio = totalIncome > 0 ? Number(((totalInvestments / totalIncome) * 100).toFixed(1)) : 0;

    // Itemized buckets for 50/30/20 breakdown
    const needsCategories = ['Bills', 'Food', 'Health', 'Transport', 'Education', 'Rent', 'Utilities', 'Groceries'];
    const needsMap = {};
    const wantsMap = {};

    let needsTotal = 0;
    let wantsTotal = 0;

    exp.forEach((e) => {
      if (needsCategories.includes(e.category)) {
        needsTotal += e.amount;
        needsMap[e.category] = (needsMap[e.category] || 0) + e.amount;
      } else {
        wantsTotal += e.amount;
        wantsMap[e.category] = (wantsMap[e.category] || 0) + e.amount;
      }
    });

    const needsItems = Object.keys(needsMap).map(c => ({ category: c, amount: needsMap[c] })).sort((a,b) => b.amount - a.amount);
    const wantsItems = Object.keys(wantsMap).map(c => ({ category: c, amount: wantsMap[c] })).sort((a,b) => b.amount - a.amount);

    const savingsInvestmentsTotal = totalSavings + totalInvestments;
    const budgetTotal = totalIncome > 0 ? totalIncome : (needsTotal + wantsTotal + savingsInvestmentsTotal || 1);

    // Target allowances based on income (50% / 30% / 20%)
    const targetNeedsAmount = Math.round(budgetTotal * 0.5);
    const targetWantsAmount = Math.round(budgetTotal * 0.3);
    const targetSavingsAmount = Math.round(budgetTotal * 0.2);

    const rule503020 = {
      budgetTotal,
      needs: {
        amount: needsTotal,
        targetAmount: targetNeedsAmount,
        remainingBudget: targetNeedsAmount - needsTotal,
        percentage: Number(((needsTotal / budgetTotal) * 100).toFixed(1)),
        targetPercentage: 50,
        status: needsTotal <= targetNeedsAmount ? 'within-limit' : 'exceeded',
        items: needsItems,
      },
      wants: {
        amount: wantsTotal,
        targetAmount: targetWantsAmount,
        remainingBudget: targetWantsAmount - wantsTotal,
        percentage: Number(((wantsTotal / budgetTotal) * 100).toFixed(1)),
        targetPercentage: 30,
        status: wantsTotal <= targetWantsAmount ? 'within-limit' : 'exceeded',
        items: wantsItems,
      },
      savings: {
        amount: savingsInvestmentsTotal,
        targetAmount: targetSavingsAmount,
        gapOrSurplus: savingsInvestmentsTotal - targetSavingsAmount,
        percentage: Number(((savingsInvestmentsTotal / budgetTotal) * 100).toFixed(1)),
        targetPercentage: 20,
        status: savingsInvestmentsTotal >= targetSavingsAmount ? 'optimal' : 'below-target',
        savingsAmount: totalSavings,
        investmentsAmount: totalInvestments,
      },
    };

    // Generate Dynamic Smart Financial Insights
    const insights = [];

    // 1. Savings Rate Insight
    const effectiveSavingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    if (effectiveSavingsRate >= 30) {
      insights.push({
        id: 'savings-high',
        type: 'success',
        title: 'Super Saver Status',
        description: `You are saving ${effectiveSavingsRate.toFixed(0)}% of your income this month! Well above the recommended 20% benchmark.`,
      });
    } else if (effectiveSavingsRate >= 15) {
      insights.push({
        id: 'savings-healthy',
        type: 'info',
        title: 'Solid Financial Discipline',
        description: `You have a healthy savings margin of ${effectiveSavingsRate.toFixed(0)}%. Consider channeling surplus to mutual funds or emergency funds.`,
      });
    } else if (effectiveSavingsRate > 0) {
      insights.push({
        id: 'savings-tight',
        type: 'warning',
        title: 'Tight Cashflow Margin',
        description: `You are spending ${(100 - effectiveSavingsRate).toFixed(0)}% of earnings. Try trimming discretionary expenses to boost your safety buffer.`,
      });
    } else if (totalExpense > totalIncome && totalIncome > 0) {
      insights.push({
        id: 'deficit-alert',
        type: 'danger',
        title: 'Monthly Deficit Alert',
        description: `Expenses exceed this month's recorded income by ${(totalExpense - totalIncome).toLocaleString()}. Watch out for unnecessary outlays.`,
      });
    }

    // 2. Needs vs Wants Insight
    if (rule503020.wants.percentage > 35) {
      insights.push({
        id: 'wants-high',
        type: 'warning',
        title: 'Discretionary Spending Alert',
        description: `Wants and entertainment make up ${rule503020.wants.percentage}% of your budget (target ≤ 30%).`,
      });
    } else {
      insights.push({
        id: 'needs-balanced',
        type: 'success',
        title: 'Budget Allocation Balanced',
        description: `Essential needs are controlled at ${rule503020.needs.percentage}% of total inflow.`,
      });
    }

    // 3. Investment Habit Insight
    if (totalInvestments > 0) {
      insights.push({
        id: 'investment-active',
        type: 'info',
        title: 'Wealth Compounding Active',
        description: `Monthly SIPs and investments of ${totalInvestments.toLocaleString()} are building long-term wealth.`,
      });
    }

    res.json({
      success: true,
      month,
      year,
      totalIncome,
      totalExpense,
      totalSavings,
      totalInvestments,
      netCashflow,
      expenseRatio,
      savingsRatio,
      investmentRatio,
      rule503020,
      insights,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyAnalytics,
  getMonthlyTrendAnalytics,
  getCategoryAnalytics,
  getIncomeVsExpense,
};

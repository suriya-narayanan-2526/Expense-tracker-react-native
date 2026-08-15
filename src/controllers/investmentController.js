const Investment = require('../models/Investment');

// @desc    Add new investment
// @route   POST /api/investments
// @access  Private
const addInvestment = async (req, res, next) => {
  try {
    const {
      type,
      name,
      investedAmount,
      currentValue,
      monthlyAmount,
      investmentDate,
      description,
    } = req.body;

    if (!name || investedAmount === undefined || currentValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide investment name, invested amount, and current value',
      });
    }

    const investment = await Investment.create({
      userId: req.user.id,
      type: type || 'Mutual Fund',
      name,
      investedAmount: Number(investedAmount),
      currentValue: Number(currentValue),
      monthlyAmount: monthlyAmount ? Number(monthlyAmount) : 0,
      investmentDate: investmentDate ? new Date(investmentDate) : new Date(),
      description: description || '',
    });

    res.status(201).json({
      success: true,
      data: investment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all investments
// @route   GET /api/investments
// @access  Private
const getInvestments = async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = { userId: req.user.id };

    if (type) query.type = type;

    if (req.query.month && req.query.year) {
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);
      const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
      query.investmentDate = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const investments = await Investment.find(query).sort({ investmentDate: -1 });

    const enrichedInvestments = investments.map((inv) => {
      const profitLoss = inv.currentValue - inv.investedAmount;
      const profitLossPercentage =
        inv.investedAmount > 0
          ? Number(((profitLoss / inv.investedAmount) * 100).toFixed(2))
          : 0;
      return {
        ...inv.toObject(),
        profitLoss,
        profitLossPercentage,
      };
    });

    res.json({
      success: true,
      count: enrichedInvestments.length,
      data: enrichedInvestments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get investment portfolio summary
// @route   GET /api/investments/summary
// @access  Private
const getInvestmentSummary = async (req, res, next) => {
  try {
    const investments = await Investment.find({ userId: req.user.id });

    const totalInvested = investments.reduce((sum, item) => sum + item.investedAmount, 0);
    const totalCurrentValue = investments.reduce((sum, item) => sum + item.currentValue, 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercentage =
      totalInvested > 0
        ? Number(((totalProfitLoss / totalInvested) * 100).toFixed(2))
        : 0;

    // Breakdown by type
    const typeMap = {};
    investments.forEach((item) => {
      if (!typeMap[item.type]) {
        typeMap[item.type] = {
          type: item.type,
          investedAmount: 0,
          currentValue: 0,
          count: 0,
        };
      }
      typeMap[item.type].investedAmount += item.investedAmount;
      typeMap[item.type].currentValue += item.currentValue;
      typeMap[item.type].count += 1;
    });

    const typeBreakdown = Object.values(typeMap).map((t) => {
      const pnl = t.currentValue - t.investedAmount;
      return {
        ...t,
        profitLoss: pnl,
        profitLossPercentage:
          t.investedAmount > 0 ? Number(((pnl / t.investedAmount) * 100).toFixed(2)) : 0,
        percentageOfPortfolio:
          totalCurrentValue > 0
            ? Number(((t.currentValue / totalCurrentValue) * 100).toFixed(1))
            : 0,
      };
    });

    res.json({
      success: true,
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage,
      investmentCount: investments.length,
      typeBreakdown,
      data: investments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update investment
// @route   PUT /api/investments/:id
// @access  Private
const updateInvestment = async (req, res, next) => {
  try {
    let investment = await Investment.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }

    const {
      type,
      name,
      investedAmount,
      currentValue,
      monthlyAmount,
      investmentDate,
      description,
    } = req.body;

    if (type) investment.type = type;
    if (name) investment.name = name;
    if (investedAmount !== undefined) investment.investedAmount = Number(investedAmount);
    if (currentValue !== undefined) investment.currentValue = Number(currentValue);
    if (monthlyAmount !== undefined) investment.monthlyAmount = Number(monthlyAmount);
    if (investmentDate) investment.investmentDate = new Date(investmentDate);
    if (description !== undefined) investment.description = description;

    await investment.save();

    const pnl = investment.currentValue - investment.investedAmount;
    const pnlPercent =
      investment.investedAmount > 0
        ? Number(((pnl / investment.investedAmount) * 100).toFixed(2))
        : 0;

    res.json({
      success: true,
      data: {
        ...investment.toObject(),
        profitLoss: pnl,
        profitLossPercentage: pnlPercent,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete investment
// @route   DELETE /api/investments/:id
// @access  Private
const deleteInvestment = async (req, res, next) => {
  try {
    const investment = await Investment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }

    res.json({ success: true, message: 'Investment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addInvestment,
  getInvestments,
  getInvestmentSummary,
  updateInvestment,
  deleteInvestment,
};

const Saving = require('../models/Saving');

// @desc    Add savings entry
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
  addSaving,
  getSavings,
  getMonthlySavings,
  updateSaving,
  deleteSaving,
};

const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Please specify investment type'],
      enum: [
        'Mutual Fund',
        'Stock',
        'Stocks',
        'FD',
        'Fixed Deposit',
        'RD',
        'Gold',
        'Real Estate',
        'Crypto',
        'Bonds',
        'Other',
      ],
      default: 'Mutual Fund',
    },
    name: {
      type: String,
      required: [true, 'Please provide investment asset/fund name'],
      trim: true,
    },
    investedAmount: {
      type: Number,
      required: [true, 'Please provide total invested amount'],
      min: [0, 'Invested amount cannot be negative'],
    },
    currentValue: {
      type: Number,
      required: [true, 'Please provide current asset value'],
      min: [0, 'Current value cannot be negative'],
    },
    monthlyAmount: {
      type: Number,
      default: 0,
    },
    investmentDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

InvestmentSchema.index({ userId: 1, investmentDate: -1 });
InvestmentSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Investment', InvestmentSchema);

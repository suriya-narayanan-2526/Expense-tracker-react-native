const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true,
      default: 'Food',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Credit card', 'Debit card', 'Bank transfer', 'Other'],
      default: 'UPI',
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringRule: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

ExpenseSchema.index({ userId: 1, expenseDate: -1 });
ExpenseSchema.index({ userId: 1, category: 1, expenseDate: -1 });

module.exports = mongoose.model('Expense', ExpenseSchema);

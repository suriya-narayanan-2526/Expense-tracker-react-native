const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Saving = require('../models/Saving');
const Investment = require('../models/Investment');
const Budget = require('../models/Budget');

dotenv.config();

const seedData = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense_tracker'
    );
    console.log(` MongoDB Connected: ${conn.connection.host}`);

    // Clear existing data
    await User.deleteMany();
    await Expense.deleteMany();
    await Income.deleteMany();
    await Saving.deleteMany();
    await Investment.deleteMany();
    await Budget.deleteMany();

    console.log(' Cleared previous data...');

    // Create demo user
    const demoUser = await User.create({
      name: 'Suriya Demo',
      email: 'demo@example.com',
      passwordHash: 'password123', // Will be hashed by pre-save hook
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      reminderEnabled: true,
      reminderTime: '21:00',
    });

    console.log(` Demo User created: ${demoUser.email} (Password: password123)`);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 1. Create Incomes
    await Income.create([
      {
        userId: demoUser._id,
        amount: 65000,
        source: 'Salary',
        description: 'Monthly Tech Lead Salary',
        incomeDate: new Date(currentYear, currentMonth - 1, 1, 10, 0),
        isRecurring: true,
      },
      {
        userId: demoUser._id,
        amount: 12000,
        source: 'Freelancing',
        description: 'React Native Mobile App Consulting',
        incomeDate: new Date(currentYear, currentMonth - 1, 10, 15, 30),
        isRecurring: false,
      },
    ]);

    // 2. Create Expenses across this month
    const sampleExpenses = [
      { amount: 450, category: 'Food', description: 'Grocery shopping', paymentMethod: 'UPI', day: 2 },
      { amount: 1200, category: 'Transport', description: 'Monthly Metro & Cab', paymentMethod: 'Credit card', day: 3 },
      { amount: 3200, category: 'Bills', description: 'Electricity & High-speed Fiber', paymentMethod: 'UPI', day: 5 },
      { amount: 850, category: 'Food', description: 'Team Lunch Buffet', paymentMethod: 'Debit card', day: 7 },
      { amount: 2499, category: 'Shopping', description: 'Noise Cancelling Headphones', paymentMethod: 'Credit card', day: 8 },
      { amount: 650, category: 'Entertainment', description: 'Movie IMAX & Popcorn', paymentMethod: 'UPI', day: 11 },
      { amount: 1500, category: 'Health', description: 'Annual Health Checkup & Vitamins', paymentMethod: 'UPI', day: 12 },
      { amount: 350, category: 'Food', description: 'Artisan Coffee & Croissant', paymentMethod: 'UPI', day: 14 },
      { amount: 250, category: 'Food', description: 'Delicious Healthy Dinner', paymentMethod: 'UPI', day: now.getDate() },
    ];

    for (const exp of sampleExpenses) {
      await Expense.create({
        userId: demoUser._id,
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        paymentMethod: exp.paymentMethod,
        expenseDate: new Date(currentYear, currentMonth - 1, exp.day, 13, 0),
      });
    }

    // 3. Create Savings
    await Saving.create([
      {
        userId: demoUser._id,
        amount: 10000,
        goal: 'Emergency Fund',
        targetAmount: 100000,
        description: '6 Months Safety Net Reserve',
        savingsDate: new Date(currentYear, currentMonth - 1, 2),
      },
      {
        userId: demoUser._id,
        amount: 5000,
        goal: 'Japan Vacation',
        targetAmount: 150000,
        description: 'Autumn Trip Savings',
        savingsDate: new Date(currentYear, currentMonth - 1, 5),
      },
    ]);

    // 4. Create Investments
    await Investment.create([
      {
        userId: demoUser._id,
        type: 'Mutual Fund',
        name: 'Parag Parikh Flexi Cap Fund',
        investedAmount: 50000,
        currentValue: 62500,
        monthlyAmount: 5000,
        investmentDate: new Date(currentYear, currentMonth - 2, 1),
        description: 'SIP active every 5th',
      },
      {
        userId: demoUser._id,
        type: 'Stock',
        name: 'Tata Consultancy Services (TCS)',
        investedAmount: 30000,
        currentValue: 34800,
        investmentDate: new Date(currentYear, currentMonth - 3, 15),
        description: 'Bluechip IT investment',
      },
      {
        userId: demoUser._id,
        type: 'Gold',
        name: 'Sovereign Gold Bonds (SGB)',
        investedAmount: 25000,
        currentValue: 28900,
        investmentDate: new Date(currentYear, currentMonth - 5, 10),
        description: '2.5% Annual Interest + Capital Gains',
      },
      {
        userId: demoUser._id,
        type: 'FD',
        name: 'HDFC High-Yield Fixed Deposit',
        investedAmount: 40000,
        currentValue: 42100,
        investmentDate: new Date(currentYear, currentMonth - 6, 1),
        description: '7.4% p.a. compounded quarterly',
      },
    ]);

    // 5. Create Monthly Budgets
    await Budget.create([
      {
        userId: demoUser._id,
        category: 'Food',
        monthlyLimit: 8000,
        month: currentMonth,
        year: currentYear,
      },
      {
        userId: demoUser._id,
        category: 'Shopping',
        monthlyLimit: 5000,
        month: currentMonth,
        year: currentYear,
      },
      {
        userId: demoUser._id,
        category: 'Transport',
        monthlyLimit: 4000,
        month: currentMonth,
        year: currentYear,
      },
      {
        userId: demoUser._id,
        category: 'Bills',
        monthlyLimit: 6000,
        month: currentMonth,
        year: currentYear,
      },
      {
        userId: demoUser._id,
        category: 'Entertainment',
        monthlyLimit: 3000,
        month: currentMonth,
        year: currentYear,
      },
    ]);

    console.log(' Demo Data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedData();

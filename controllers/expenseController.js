const Expense = require("../models/Expense");
const multer = require("multer");
const path = require("path");

// Configure Multer Storage (No actual file storage)
const storage = multer.memoryStorage(); // Store files in memory (not the filesystem)

const upload = multer({ storage }); // Use in-memory storage for file uploads

// Create Expense
exports.createExpense = async (req, res) => {
  try {
    const { description, category, amount, expenseDate, paymentMethod, notes } =
      req.body;

    // If there's no file, just set the receipt field as null
    const receipt = req.file ? `/uploads/${req.file.originalname}` : null;

    const newExpense = new Expense({
      description,
      category,
      amount,
      expenseDate,
      paymentMethod,
      receipt,
      notes,
    });

    await newExpense.save();
    res.status(201).json(newExpense);
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({ error: "Failed to create expense" });
  }
};

// Get All Expenses with Filters
exports.getExpenses = async (req, res) => {
  try {
    const { category, search, timeframe, sortBy } = req.query;
    let filter = {};

    // Filter by Category
    if (category && category !== "all") {
      filter.category = category;
    }

    // Filter by Timeframe
    if (timeframe) {
      const now = new Date();
      let startDate, endDate;

      switch (timeframe) {
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "lastMonth":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case "thisQuarter":
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          break;
        case "thisYear":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case "lastYear":
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31);
          break;
        default:
          startDate = null;
          endDate = null;
      }

      if (startDate && endDate) {
        filter.expenseDate = { $gte: startDate, $lte: endDate };
      }
    }

    // Search Query (Matches description)
    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    // Sorting
    let sortOptions = {};
    if (sortBy) {
      switch (sortBy) {
        case "date":
          sortOptions.expenseDate = -1; // Newest first
          break;
        case "dateAsc":
          sortOptions.expenseDate = 1; // Oldest first
          break;
        case "amountDesc":
          sortOptions.amount = -1; // Highest amount first
          break;
        case "amountAsc":
          sortOptions.amount = 1; // Lowest amount first
          break;
        default:
          sortOptions.expenseDate = -1; // Default: Newest first
      }
    }

    // Fetch expenses with filters
    const expenses = await Expense.find(filter).sort(sortOptions);
    res.json(expenses);
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

// Get Expense by ID
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    res.json(expense);
  } catch (err) {
    console.error("Error retrieving expense:", err);
    res.status(500).json({ error: "Error retrieving expense" });
  }
};

// Update Expense
exports.updateExpense = async (req, res) => {
  try {
    let updateData = { ...req.body };

    // Check if a new file is uploaded
    if (req.file) {
      updateData.receipt = `/uploads/${req.file.originalname}`;
    }

    // Find existing expense
    const existingExpense = await Expense.findById(req.params.id);
    if (!existingExpense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // If no new file is uploaded, keep the old receipt
    if (!req.file && existingExpense.receipt) {
      updateData.receipt = existingExpense.receipt;
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updatedExpense);
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({ error: "Error updating expense" });
  }
};

// Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // No file deletion as no file is stored on disk

    await Expense.findByIdAndDelete(req.params.id);

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ error: "Error deleting expense" });
  }
};

// Export the Multer Upload Middleware (Still necessary to handle file data)
exports.upload = upload;

const Expense = require("../models/Expense");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// For local development, use a relative path to store uploaded files
// If you're using AWS Lambda or a similar environment, use `/tmp/uploads`
const uploadDir = path.resolve(__dirname, "../uploads"); // For local environment
// const uploadDir = path.resolve(__dirname, "/tmp/uploads"); // Uncomment this line for AWS Lambda or similar environments

console.log("Upload directory path:", uploadDir); // For debugging

// Ensure the uploads directory exists
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Created uploads directory:", uploadDir);
  } else {
    console.log("Uploads directory already exists");
  }
} catch (error) {
  console.error("Error creating uploads directory:", error);
}

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("Uploading file to:", uploadDir); // Debugging
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    console.log("File saved as:", filename); // Debugging
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Create Expense
exports.createExpense = async (req, res) => {
  try {
    const { description, category, amount, expenseDate, paymentMethod, notes } =
      req.body;
    const receipt = req.file ? `/uploads/${req.file.filename}` : null;

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

    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    let sortOptions = {};
    if (sortBy) {
      switch (sortBy) {
        case "date":
          sortOptions.expenseDate = -1;
          break;
        case "dateAsc":
          sortOptions.expenseDate = 1;
          break;
        case "amountDesc":
          sortOptions.amount = -1;
          break;
        case "amountAsc":
          sortOptions.amount = 1;
          break;
        default:
          sortOptions.expenseDate = -1;
      }
    }

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

    if (req.file) {
      updateData.receipt = `/uploads/${req.file.filename}`;
    }

    const existingExpense = await Expense.findById(req.params.id);
    if (!existingExpense) {
      return res.status(404).json({ error: "Expense not found" });
    }

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

    if (expense.receipt) {
      const filePath = path.resolve(__dirname, "../public", expense.receipt);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ error: "Error deleting expense" });
  }
};

exports.upload = upload;

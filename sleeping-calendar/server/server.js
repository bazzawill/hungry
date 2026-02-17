const express = require('express');
const cors = require('cors'); // Import cors middleware
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // To parse JSON request bodies

// Database setup
const dbPath = path.resolve(__dirname, 'calendar.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS calendar_data (
      date TEXT PRIMARY KEY,
      tom_count INTEGER DEFAULT 0,
      charlie_count INTEGER DEFAULT 0
    )`, (err) => {
      if (err) {
        console.error('Error creating table', err.message);
      } else {
        console.log('Table calendar_data created or already exists.');
      }
    });
  }
});

// Helper function to get date string in YYYY-MM-DD format
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// API Routes

// GET /api/calendar-data
// Fetches data for a given date range
app.get('/api/calendar-data', (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required query parameters' });
  }

  const sql = `
    SELECT date, tom_count, charlie_count
    FROM calendar_data
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC
  `;

  db.all(sql, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Ensure all dates in the range are present, even if they have no data
    const dateMap = new Map(rows.map(row => [row.date, row]));
    const generatedDates = [];
    let currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      const formattedDate = formatDate(currentDate);
      const data = dateMap.get(formattedDate) || { date: formattedDate, tom_count: 0, charlie_count: 0 };
      generatedDates.push(data);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json(generatedDates);
  });
});

// POST /api/calendar-data
// Saves or updates data for a specific date
app.post('/api/calendar-data', (req, res) => {
  const { date, tom_count, charlie_count } = req.body;

  if (!date || tom_count === undefined || charlie_count === undefined) {
    return res.status(400).json({ error: 'date, tom_count, and charlie_count are required in the request body' });
  }

  const sql = `
    INSERT INTO calendar_data (date, tom_count, charlie_count)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      tom_count = excluded.tom_count,
      charlie_count = excluded.charlie_count
  `;

  db.run(sql, [date, tom_count, charlie_count], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Data saved successfully',
      changes: this.changes,
      date: date,
      tom_count: tom_count,
      charlie_count: charlie_count
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0);
  });
});

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

// Middleware to check admin token
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'] || req.query.token;
  if (!token || token !== 'admin-auth-token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Serve static files, excluding admin.html
app.use(express.static('public', { index: false })); // Removed setHeaders
app.use(express.json());

// Serve admin.html only with valid token
app.get('/admin.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Handle other API routes
const db = new sqlite3.Database('./inventory.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      user TEXT,
      assignedDate TEXT
    )`, (err) => {
      if (err) console.error('Items table creation error:', err.message);
    });

    db.run(`CREATE TABLE IF NOT EXISTS users (
      name TEXT PRIMARY KEY
    )`, (err) => {
      if (err) console.error('Users table creation error:', err.message);
    });
  }
});

// Remaining routes (unchanged)
app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/items', (req, res) => {
  const { id, name, description } = req.body;
  if (!id || !name) {
    res.status(400).json({ error: 'ID and name are required' });
    return;
  }
  db.run(
    `INSERT INTO items (id, name, description, user, assignedDate) VALUES (?, ?, ?, NULL, NULL)`,
    [id, name, description],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Item added successfully' });
    }
  );
});

app.get('/api/users', (req, res) => {
  db.all('SELECT name FROM users', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  db.run(
    `INSERT INTO users (name) VALUES (?)`,
    [name],
    function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          res.status(400).json({ error: 'User already exists' });
        } else {
          res.status(400).json({ error: err.message });
        }
        return;
      }
      res.json({ message: 'User added successfully' });
    }
  );
});

app.delete('/api/users/:name', (req, res) => {
  const name = req.params.name;
  db.run(
    `DELETE FROM users WHERE name = ?`,
    [name],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'User not found' });
      } else {
        db.run(
          `UPDATE items SET user = NULL, assignedDate = NULL WHERE user = ?`,
          [name],
          (err) => {
            if (err) {
              res.status(400).json({ error: err.message });
              return;
            }
            res.json({ message: 'User deleted successfully' });
          }
        );
      }
    }
  );
});

app.delete('/api/items/:id', (req, res) => {
  const id = req.params.id;
  db.run(
    `DELETE FROM items WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Item not found' });
      } else {
        res.json({ message: 'Item deleted successfully' });
      }
    }
  );
});

app.post('/api/assign', (req, res) => {
  const { itemId, user, assignedDate } = req.body;
  db.run(
    `UPDATE items SET user = ?, assignedDate = ? WHERE id = ?`,
    [user, assignedDate, itemId],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        db.run(
          `INSERT INTO items (id, user, assignedDate) VALUES (?, ?, ?)`,
          [itemId, user, assignedDate],
          (err) => {
            if (err) {
              res.status(400).json({ error: err.message });
              return;
            }
            db.run(
              `INSERT OR IGNORE INTO users (name) VALUES (?)`,
              [user],
              (err) => {
                if (err) {
                  res.status(400).json({ error: err.message });
                  return;
                }
                res.json({ message: 'Item assigned' });
              }
            );
          }
        );
      } else {
        db.run(
          `INSERT OR IGNORE INTO users (name) VALUES (?)`,
          [user],
          (err) => {
            if (err) {
              res.status(400).json({ error: err.message });
              return;
            }
            res.json({ message: 'Item assigned' });
          }
        );
      }
    }
  );
});

app.post('/api/return/:id', (req, res) => {
  const id = req.params.id;
  db.run(
    `UPDATE items SET user = NULL, assignedDate = NULL WHERE id = ?`,
    [id],
    (err) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: 'Item returned' });
    }
  );
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === 'admingm') { //no hackers please
    const token = 'admin-auth-token';
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});


app.listen(port, '192.168.168.174', () => {
  console.log(`Server running at http://192.168.168.174:${port}`);
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB (replace with your MongoDB URI)
mongoose.connect('mongodb://localhost:27017/birthdaybuddy', { useNewUrlParser: true, useUnifiedTopology: true });

// Define a Birthday schema
const birthdaySchema = new mongoose.Schema({
  name: String,
  date: String,
  relationship: String,
  notes: String,
  userId: String // for multi-user support
});
const Birthday = mongoose.model('Birthday', birthdaySchema);

// API endpoints
app.get('/api/birthdays', async (req, res) => {
  const birthdays = await Birthday.find();
  res.json(birthdays);
});

app.post('/api/birthdays', async (req, res) => {
  const birthday = new Birthday(req.body);
  await birthday.save();
  res.json(birthday);
});

app.delete('/api/birthdays/:id', async (req, res) => {
  await Birthday.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
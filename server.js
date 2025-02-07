// server.js
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

// Store created organisms and ecosystem state
let organisms = [];
let ecosystemState = {
  temperature: 25,
  humidity: 60,
  pH: 7,
  resources: {
    nutrients: 1000,
    water: 1000,
    light: 1000
  }
};

app.get('/api/ecosystem', (req, res) => {
  res.json(ecosystemState);
});

app.post('/api/organisms', (req, res) => {
  const organism = req.body;
  organisms.push(organism);
  res.json(organism);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:5500`);
});

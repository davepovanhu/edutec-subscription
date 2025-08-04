const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configure CORS to allow specific origins
const allowedOrigins = [
  'http://127.0.0.1:5501', // Local development server
  'https://edutec-subscription-static.onrender.com' // Your static site URL (update if different)
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'], // Allow OPTIONS for preflight
  allowedHeaders: ['Content-Type'], // Allow necessary headers
}));

app.use(express.json());

// Add root route to confirm API is live
app.get('/', (req, res) => {
  res.send('API is live');
});

app.post('/generate-token', (req, res) => {
  const { amount, plan } = req.body;

  if (!amount || !plan) {
    return res.status(400).json({ error: 'Missing amount or plan' });
  }

  const payload = {
    iss: "EDUTEC",
    cuid: "9BA5008C-08EE-4286-A349-54AF91A621B0", // Merchant ID
    auid: "23ADADC0-DA2D-4DAC-A128-4845A5D71293", // App ID
    amount: amount.toFixed(2),
    mref: `SUB_${plan}_${Date.now()}`,
    jti: Math.random().toString(36).substring(2),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600
  };

  const token = jwt.sign(payload, process.env.ADUMO_SECRET_KEY);
  res.json({ token, merchantReference: payload.mref });
});

// Listen on the port provided by Render or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

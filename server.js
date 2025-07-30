const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.ADUMO_SECRET_KEY;

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

  const token = jwt.sign(payload, SECRET_KEY);
  res.json({ token, merchantReference: payload.mref });
});

// Listen on the port provided by Render or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
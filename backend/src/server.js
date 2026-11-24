const express = require('express');
const cors = require('cors');
require('dotenv').config();

const integratedRoutes = require('./routes/integratedRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1', integratedRoutes);
app.use('/api/v1', reportsRoutes);
app.use('/api', integratedRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Accounting Engine Server Running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// backend/index.js
const cors = require('cors');

app.use(cors({
  origin: 'https://trainify-frontend.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
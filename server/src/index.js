import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';

const port = Number(process.env.PORT || 5000);
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not configured. Copy .env.example to .env and set the database URI.');
  process.exit(1);
}

try {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');
  app.listen(port, () => console.log(`AttendSync API listening at http://localhost:${port}`));
} catch (error) {
  console.error(`Could not connect to MongoDB: ${error.message}`);
  console.error('Install/start MongoDB or update MONGODB_URI in the server .env file.');
  process.exit(1);
}


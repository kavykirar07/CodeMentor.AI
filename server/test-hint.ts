import { generateHintStream } from './src/services/aiService';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  try {
    console.log('Testing generateHintStream 1');
    await generateHintStream('console.log(1)', 'javascript', 1, 'dummy_user_2', 'dummy_sub_2', false, () => {}, undefined, []);
    console.log('Success 1');
    console.log('Testing generateHintStream 2');
    await generateHintStream('console.log(1)', 'javascript', 2, 'dummy_user_2', 'dummy_sub_2', false, () => {}, undefined, []);
    console.log('Success 2');
  } catch (err) {
    console.error('FAILED:', err);
  }
  mongoose.disconnect();
});
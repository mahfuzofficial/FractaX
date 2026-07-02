import Razorpay from 'razorpay';

// This initializes the connection to Razorpay using your credentials from the .env file
export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});
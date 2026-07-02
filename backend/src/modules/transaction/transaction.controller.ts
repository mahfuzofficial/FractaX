import { Request, Response } from 'express';
import { razorpayInstance } from '../../config/razorpay'; 
import crypto from 'crypto';
import { prisma } from '../../config/db';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';

export const initiateAddFunds = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid investment amount.' 
      });
    }

    if (process.env.USE_EXTERNAL_PAYMENT_GATEWAY === 'false') {
      console.log('=== BYPASS MODE ACTIVE ===');
      return res.status(200).json({
        success: true,
        bypassed: true,
        message: `Simulated top-up of ₹${amount} successful (Gateway Bypassed).`
      });
    }

    console.log('=== RAZORPAY SANDBOX MODE ACTIVE ===');
    const amountInPaise = Math.round(amount * 100);

    const paymentOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_tx_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(paymentOptions);

    return res.status(200).json({
      success: true,
      bypassed: false,
      orderData: order
    });

  } catch (error: any) {
    console.error('Order creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate sandbox payment order.',
      error: error.message
    });
  }
};

export const verifyAndCreditWallet = async (req: any, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const userId = req.user?.id; 

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: parseFloat(amount) } }
    });

    return res.status(200).json({ success: true, message: 'Wallet credited successfully.' });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Verification error.', error: error.message });
  }
};

export const withdrawController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { amount, paymentMethodId } = req.body; // 1. Extract the ID sent from frontend
  const userId = req.user!.id;
  const withdrawAmount = parseFloat(amount);

  // 2. Fetch the specific payment method selected by the user
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: { 
      id: paymentMethodId, 
      userId: userId 
    }
  });

  if (!paymentMethod) {
    throw new ApiError(404, "Selected payment method not found.");
  }

  // 3. Check wallet balance
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || Number(user.walletBalance) < withdrawAmount) {
    throw new ApiError(400, "Insufficient wallet balance.");
  }

  // 4. Perform the atomic transaction
  await prisma.$transaction(async (tx) => {
    // Record the withdrawal request using the specific method details
    await tx.withdrawalRequest.create({
      data: {
        userId,
        amount: withdrawAmount,
        status: "PENDING",
        destinationType: paymentMethod.type,
        destinationDetails: paymentMethod.type === 'UPI' 
          ? (paymentMethod.upiId || "") 
          : (paymentMethod.accountNumber || ""),
      },
    });

    // Deduct from wallet
    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: withdrawAmount } },
    });
  });

  res.json({ success: true, message: "Withdrawal request submitted successfully!" });
});
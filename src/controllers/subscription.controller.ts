import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.model';
import Payment from '../models/Payment.model';


export const createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
        const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
    try {
    
        const amount = 9900; // ₹99.00 in paise
        const currency = 'INR';
        const options = { amount, currency, receipt: `receipt_order_${Date.now()}` };

        const order = await razorpayInstance.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
};

export const verifyRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            res.status(400).json({ message: 'Payment verification failed: Invalid signature' });
            return;
        }

        const user = await User.findById(req.user!._id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const now = new Date();
        let startDate = now;

        if (user.subscription.status === 'active' && user.subscription.endDate && user.subscription.endDate > now) {
            startDate = user.subscription.endDate;
        }

        const newEndDate = new Date(startDate);
        newEndDate.setDate(startDate.getDate() + 30);

        user.subscription.status = 'active';
        user.subscription.endDate = newEndDate;
        await user.save();

        await Payment.create({
            userId: user._id,
            paymentType: 'subscription',
            amount: 99, 
            currency: 'INR',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: 'completed'
        });


        res.status(200).json({ message: 'Subscription activated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error during payment verification' });
    }
};
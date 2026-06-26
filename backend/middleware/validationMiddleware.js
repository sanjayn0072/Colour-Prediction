import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    const issues = error.issues || error.errors || [];
    return res.status(400).json({
      error: 'Validation failed',
      details: issues.map((e) => ({
        field: e.path.join('.').replace(/^(body|query|params)\./, ''),
        message: e.message,
      })),
    });
  }
};

export const sendOtpSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: z.string().trim().regex(/^\+?\d{10,15}$/, 'Phone number must be a valid format'),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export const verifyRegisterSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: z.string().trim().regex(/^\+?\d{10,15}$/, 'Phone number must be a valid format'),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    idToken: z.string().trim().min(1, 'Firebase ID Token is required')
  })
});

export const loginSchema = z.object({
  body: z.object({
    phoneOrEmail: z.string().trim().min(1, 'Phone number or email is required'),
    password: z.string().min(1, 'Password is required')
  })
});

export const firebaseLoginSchema = z.object({
  body: z.object({
    idToken: z.string().trim().min(1, 'Firebase ID Token is required')
  })
});

export const placeBetSchema = z.object({
  body: z.object({
    gameType: z.enum(['colour', 'dice'], { invalid_type_error: 'gameType must be colour or dice' }),
    betType: z.string().trim().min(1, 'betType is required'),
    betValue: z.union([z.string(), z.number()]),
    amount: z.number().positive('Bet amount must be a positive number'),
    session: z.string().optional()
  })
});

export const withdrawalSchema = z.object({
  body: z.object({
    amount: z.number().min(100, 'Minimum withdrawal is ₹100').max(5000, 'Maximum withdrawal is ₹5,000')
  })
});

export const depositSchema = z.object({
  body: z.object({
    amount: z.number().positive('Deposit amount must be a positive number'),
    transactionId: z.string().trim().min(1, 'transactionId is required'),
    signature: z.string().trim().min(1, 'signature is required'),
    voucher: z.union([z.string(), z.record(z.any())]).optional().nullable(),
    utr: z.string().trim().optional().nullable()
  })
});

export const createDepositOrderSchema = z.object({
  body: z.object({
    amount: z.number().positive('Deposit amount must be a positive number')
  })
});

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
    console.error('[Zod Validation Failure]:', error);
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
    name: z.string()
      .min(2, "Name must be at least 2 characters long")
      .max(50, "Name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s]+$/, "Name can only contain alphabetic characters and spaces"),
    phone: z.string().trim().regex(/^\+?\d{10,15}$/, 'Phone number must be a valid format'),
    email: z.union([z.string().trim().email('Invalid email address'), z.literal('')]).optional().nullable(),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export const verifyRegisterSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters long")
      .max(50, "Name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s]+$/, "Name can only contain alphabetic characters and spaces"),
    phone: z.string().trim().regex(/^\+?\d{10,15}$/, 'Phone number must be a valid format'),
    email: z.union([z.string().trim().email('Invalid email address'), z.literal('')]).optional().nullable(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    idToken: z.string().trim().min(1, 'Firebase ID Token is required')
  })
});

export const verifyEmailSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters long")
      .max(50, "Name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s]+$/, "Name can only contain alphabetic characters and spaces"),
    phone: z.string().trim().regex(/^\+?\d{10,15}$/, 'Phone number must be a valid format'),
    email: z.union([z.string().trim().email('Invalid email address'), z.literal('')]).optional().nullable(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    otp: z.string().trim().length(6, 'OTP must be exactly 6 digits'),
    inviteCode: z.string().trim().regex(/^[a-zA-Z0-9]*$/, 'Invalid invite code format').max(20).optional().nullable()
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
    amount: z.union([z.string(), z.number()])
      .transform((val) => parseFloat(val))
      .refine((val) => !isNaN(val) && val >= 100, {
        message: 'Minimum withdrawal is ₹100.00'
      }),
    paymentMethod: z.enum(['UPI', 'BANK'], {
      errorMap: () => ({ message: 'Valid payment method (UPI or BANK) is required.' })
    }),
    upiId: z.string().trim().nullable().optional(),
    accountHolderName: z.string().trim().nullable().optional(),
    accountNumber: z.string().trim().nullable().optional(),
    ifscCode: z.string().trim().nullable().optional()
  }).refine((data) => {
    if (data.paymentMethod === 'UPI') {
      return !!data.upiId && data.upiId.trim() !== '';
    }
    return true;
  }, {
    message: 'UPI ID is required for UPI withdrawals.',
    path: ['upiId']
  }).refine((data) => {
    if (data.paymentMethod === 'BANK') {
      return (
        !!data.accountHolderName && data.accountHolderName.trim() !== '' &&
        !!data.accountNumber && data.accountNumber.trim() !== '' &&
        !!data.ifscCode && data.ifscCode.trim() !== ''
      );
    }
    return true;
  }, {
    message: 'Account holder name, account number, and IFSC code are required for bank withdrawals.',
    path: ['accountNumber']
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

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address')
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1, 'Token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export const adminLoginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
  })
});

export const adminVerify2faSchema = z.object({
  body: z.object({
    code: z.string().trim().length(6, 'TOTP code must be exactly 6 digits').regex(/^\d{6}$/, 'TOTP code must contain digits only')
  })
});

export const updateConfigTrafficSchema = z.object({
  body: z.object({
    trafficThresholdAmount: z.union([z.number().int().positive(), z.string().trim().regex(/^\d+$/, 'Threshold must be a positive integer')])
  })
});

export const updateStoreConfigSchema = z.object({
  body: z.object({
    trafficThresholdAmount: z.union([z.number().int().positive(), z.string().trim().regex(/^\d+$/, 'Threshold must be a positive integer')]).optional(),
    gameSettings: z.string().trim().max(100).optional(),
    systemMaintenance: z.string().trim().max(100).optional(),
    pay0UserToken: z.string().trim().max(500).optional(),
    pay0_user_token: z.string().trim().max(500).optional()
  })
});

export const verifyPay0DepositStatusSchema = z.object({
  body: z.object({
    depositId: z.union([z.number(), z.string()]).optional(),
    transactionId: z.string().trim().optional()
  })
});

export const updateSuperAdminConfigSchema = z.object({
  body: z.object({
    totpCode: z.string().trim().length(6, 'TOTP code must be exactly 6 digits').regex(/^\d{6}$/, 'TOTP code must contain digits only'),
    RESEND_API_KEY: z.string().trim().max(500).optional(),
    SMTP_FROM_EMAIL: z.string().trim().email('Invalid sender email').max(200).optional(),
    GEMINI_AI_API_KEY: z.string().trim().max(500).optional(),
    TELEGRAM_BOT_TOKEN: z.string().trim().max(500).optional(),
    TELEGRAM_CHAT_ID: z.string().trim().max(100).optional(),
    PAY0_USER_TOKEN: z.string().trim().max(500).optional(),
    PAY0_WEBHOOK_URL: z.string().trim().max(500).optional(),
    PAY0_REDIRECT_URL: z.string().trim().max(500).optional(),
    RENFLAIR_SMS_API_KEY: z.string().trim().max(500).optional()
  })
});

export const updateUserRoleSchema = z.object({
  body: z.object({
    targetUserId: z.union([z.number().int().positive(), z.string().trim().regex(/^\d+$/, 'User ID must be positive integer')]),
    role: z.enum(['user', 'admin', 'super_admin'], {
      errorMap: () => ({ message: 'Valid role is required (user, admin, or super_admin).' })
    })
  })
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'User ID must be numeric')
  }),
  body: z.object({
    status: z.enum(['active', 'locked', 'suspended'], {
      errorMap: () => ({ message: 'Valid status is required (active, locked, suspended).' })
    })
  })
});

export const adjustUserBalanceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'User ID must be numeric')
  }),
  body: z.object({
    amount: z.union([z.number(), z.string()]).transform((val) => parseFloat(val)).refine((val) => !isNaN(val), {
      message: 'Valid amount is required'
    })
  })
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Order ID must be numeric')
  }),
  body: z.object({
    status: z.string().trim().min(1, 'Status is required').max(50)
  })
});

export const updateComplaintStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Complaint ID must be numeric')
  }),
  body: z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed'], {
      errorMap: () => ({ message: 'Valid status is required (open, in_progress, resolved, or closed).' })
    }),
    assignedAdmin: z.number().int().positive().nullable().optional(),
    resolutionNotes: z.string().trim().max(2000).nullable().optional()
  })
});

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(3, 'Coupon code must be at least 3 characters').max(30, 'Coupon code is too long'),
    reward_amount: z.number().positive('Reward amount must be a positive number'),
    max_uses: z.number().int().positive('Max uses must be a positive integer')
  })
});

export const updateSpinConfigSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Config ID must be numeric')
  }),
  body: z.object({
    reward_item: z.string().trim().min(1, 'Reward item name is required').max(100),
    probability: z.number().min(0, 'Probability must be at least 0').max(1, 'Probability cannot exceed 1'),
    is_active: z.union([z.boolean(), z.number().int().min(0).max(1)]).transform((val) => !!val)
  })
});

export const updateGameStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Game ID must be numeric')
  }),
  body: z.object({
    isActive: z.boolean()
  })
});

export const checkoutProductSchema = z.object({
  body: z.object({
    productId: z.number().int().positive('Product ID must be a positive integer')
  })
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Product name is required').max(100),
    price: z.union([z.number(), z.string()]).transform((val) => parseFloat(val)).refine((val) => !isNaN(val) && val >= 0, {
      message: 'Product price must be a non-negative number'
    }),
    description: z.string().trim().max(1000).optional().nullable(),
    stock: z.union([z.number(), z.string()]).transform((val) => parseInt(val, 10)).refine((val) => !isNaN(val) && val >= 0, {
      message: 'Product stock must be a non-negative integer'
    })
  })
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Product ID must be numeric')
  }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    price: z.union([z.number(), z.string()]).transform((val) => parseFloat(val)).refine((val) => isNaN(val) || val >= 0, {
      message: 'Product price must be a non-negative number'
    }).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    stock: z.union([z.number(), z.string()]).transform((val) => parseInt(val, 10)).refine((val) => isNaN(val) || val >= 0, {
      message: 'Product stock must be a non-negative integer'
    }).optional()
  })
});

export const createBannerSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Banner title is required').max(100),
    imageUrl: z.string().trim().url('Invalid image URL').max(300),
    linkUrl: z.string().trim().max(300).optional().nullable()
  })
});

export const createComplaintSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(1, 'Subject is required').max(200).refine(
      (val) => val.trim().split(/\s+/).filter(Boolean).length <= 20,
      { message: 'Subject must not exceed 20 words' }
    ),
    description: z.string().trim().min(1, 'Description is required').max(3000).refine(
      (val) => val.trim().split(/\s+/).filter(Boolean).length <= 100,
      { message: 'Description must not exceed 100 words' }
    ),
    refId: z.string().trim().max(30, 'Order number must not exceed 30 characters').regex(
      /^[a-zA-Z0-9\-_#\s]*$/,
      'Order number must be alphanumeric (hyphens/underscores/hashes allowed)'
    ).optional().nullable()
  })
});

export const chatWithSupportSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1, 'Message is required').max(1000)
  })
});

export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Notification ID must be numeric')
  })
});

export const arcadeBetSchema = z.object({
  body: z.object({
    gameId: z.string().trim().min(1, 'Game ID is required'),
    betAmount: z.number().positive('Bet amount must be greater than zero'),
    payoutAmount: z.number().nonnegative('Payout amount cannot be negative').default(0),
    status: z.enum(['pending', 'win', 'lose', 'cancelled'], {
      errorMap: () => ({ message: 'Status must be pending, win, lose, or cancelled' })
    }).default('pending'),
    gameMetadata: z.record(z.any()).optional().nullable()
  })
});

export const profileUpdateSchema = z.object({
  body: z.object({
    name: z.undefined({
      invalid_type_error: "Full Name is immutable and cannot be updated."
    }),
    avatar: z.string().trim().optional(),
    email: z.string().trim().email('Invalid email address format').optional().nullable().or(z.literal(''))
  })
});

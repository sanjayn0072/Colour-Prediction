# ColourPlay Project Overview

Welcome to the **ColourPlay** technical documentation overview. This document provides a comprehensive guide to the technology stack, application architecture, folder structure, database schema, and key feature mechanics of the platform.

---

## 🛠️ Technology Stack

The project is split into a mobile-first Progressive Web App (PWA) client and a highly secure, zero-trust backend service.

### 📱 Frontend Client
- **Core Library**: React (v18+) with Vite as the build tool for fast hot-module replacement and optimized asset compiling.
- **Styling**: Tailwind CSS for utility styling, coupled with custom HSL-tailored premium themes, radial glows, and micro-animations.
- **UI Component System**: Shadcn/ui (React primitives powered by Radix UI) for components like modal drawers and sheet dialogs.
- **State Management**: React Context API:
  - [UserContext.jsx](file:///C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/context/UserContext.jsx) manages global authentication states, user roles, current real/bonus wallet balances, active deposit/withdrawal orders, and referral metrics.
  - `GameContext.jsx` manages WebSocket handshakes, state synchronization, timer clicks, lock-freeze overlays, and win animations.
- **Network Communications**: 
  - **REST API client**: Axios for secure server actions (e.g., auth, wallet management, shop checkouts, complaints).
  - **Real-Time WebSockets**: `socket.io-client` for central game loop state broadcasts (e.g., tick updates, bet freezes, and round results).
- **Progressive Web App (PWA)**: Powered by `vite-plugin-pwa` to auto-compile a custom service worker, enabling cache busting, offline/standalone app mounting, and viewport-fit native framing.

### ⚙️ Backend API Service
- **Runtime Environment**: Node.js
- **Web Framework**: Express (ES6 Modules)
- **Primary Database**: MySQL (via `mysql2/promise` pool connection) for high-performance ACID transactions. A custom mapper bridges rows to mongoose-compatible Javascript object keys.
- **WebSocket Engine**: Socket.io server managing game rooms and centralized state broadcasts.
- **Security & Integrity Utilities**:
  - **TOTP / 2FA**: Speakeasy for configuring Google Authenticator seeds and verifying admin logins.
  - **Input Validation**: Zod schemas validating every incoming payload before endpoint execution.
  - **Cryptography**: Node's native `crypto` module for generating Server/Client seeds and hashes.
  - **Rate Limiting**: `express-rate-limit` to prevent brute force and resource starvation.
  - **HTTP Headers Security**: Helmet.js for configuring secure headers (CORS, CSP, XSS).
  - **Auth Tokens**: JSON Web Tokens (JWT) stored in HTTP-only, secure cookies.
- **Notifications & Utilities**:
  - **Emails**: Resend integration for transactional and OTP emails.
  - **SMS**: SMS API service integrations.
  - **Telegram Bot**: `telegram.js` utility notifying admins of critical security alarms and risk engine alerts.
  - **Logs**: Pino and `pino-pretty` for structured JSON-based console logging.

---

## 📂 Project Directory Structure

```
colour-prediction-website/
├── .agents/                    # Workspace agent configurations/rules
├── backend/                    # Node.js + Express backend service
│   ├── config/                 # DB connections, schema definition, and migrations
│   │   ├── db.js               # MySQL pool setup & Mongoose-like mapping helper
│   │   ├── schema.sql          # Primary MySQL DB schema DDL
│   │   └── firebase-service-account.json.json # Firebase credentials configuration
│   ├── controllers/            # Request handlers / Controller layer
│   │   ├── adminAuthController.js # Admin 2FA & auth processes
│   │   ├── adminController.js     # Super-admin operations & user adjustments
│   │   ├── authController.js      # Register, Login, Reset password endpoints
│   │   ├── catalogController.js   # Shop products and banners management
│   │   ├── depositController.js   # Manual and automatic payment deposits
│   │   ├── gameController.js      # Game rooms loop, bet placements, and settling wagers
│   │   ├── notificationController.js # Read/unread message status logs
│   │   ├── supportController.js   # Customer tickets/complaints sub-system
│   │   ├── walletController.js    # Direct wallet queries, linking banks & UPI details
│   │   └── withdrawalController.js # Piecewise fees calculation & withdrawal approval
│   ├── middleware/             # Express middlewares (auth, validation, rate limiting)
│   │   ├── authMiddleware.js      # Verifies JWT validation in cookies
│   │   ├── rateLimitMiddleware.js # Restricts spamming on sensitive endpoints
│   │   ├── roleMiddleware.js      # Restricts admin/super_admin actions
│   │   └── validationMiddleware.js # Sanitizes input bodies using Zod schemas
│   ├── routes/                 # Express routing
│   │   └── depositRoutes.js       # External payment webhook handlers
│   ├── scripts/                # Database seeders or system scripts
│   │   ├── seed2fa.js             # Generates default developer 2FA profile QR codes
│   │   └── seedAdmin.js           # Seeds default administrator accounts
│   ├── utils/                  # Helper modules (logger, provablyFair, riskEngine, telegram)
│   │   ├── configEncryption.js    # Encrypts gateway credentials
│   │   ├── emailService.js        # Formats and sends OTP/verification emails
│   │   ├── logger.js              # Central Pino logging engine
│   │   ├── notifier.js            # Dispatcher for system notifications
│   │   ├── provablyFair.js        # Seed hashing and game outcome validation
│   │   ├── riskEngine.js          # Flags accounts based on suspicious withdrawal/betting patterns
│   │   ├── smsService.js          # SMS sending integration
│   │   ├── telegram.js            # Sends administrative alerts to a Telegram chat
│   │   └── uploadService.js       # Multer middleware configuration for files/images
│   ├── uploads/                # Directory for user uploads (KYC, support files)
│   ├── server.js               # Application entrypoint & HTTP/Socket routing definition
│   └── package.json            # Backend package dependencies
├── frontend/                   # React + Vite mobile-first PWA frontend
│   ├── public/                 # Static assets (favicons, manifests)
│   ├── src/                    # App source code
│   │   ├── assets/             # Global visual assets (banners, icons)
│   │   ├── components/         # Shared React components
│   │   │   └── GameLobbyModal.jsx # Navigational drawer for game hopping
│   │   ├── context/            # Global React contexts
│   │   │   └── UserContext.jsx    # Authentication & balance state management
│   │   ├── lib/                # Libraries and configuration scripts (utils.js class-merger)
│   │   ├── pages/              # Individual game screens, auth, and profile views
│   │   │   ├── ColourPrediction.jsx # Colour prediction board and history grids
│   │   │   ├── DepositGateway.jsx   # Payments QR gateway page
│   │   │   ├── DiceGame.jsx         # Interactive Dice slider game
│   │   │   ├── ForgotPassword.jsx   # Recovery view
│   │   │   ├── Home.jsx             # Dynamic Home feed with sliding banners
│   │   │   ├── Login.jsx            # Account login screen
│   │   │   ├── Notifications.jsx    # System communications tray
│   │   │   ├── Profile.jsx          # Settings, Avatar picker, VIP progression
│   │   │   ├── Register.jsx         # Verification code registration page
│   │   │   ├── SpinWheel.jsx        # Lucky wheel reward game page
│   │   │   ├── Support.jsx          # Chat and complaint logger
│   │   │   ├── TransactionRecords.jsx # Deposit/withdrawal lists
│   │   │   └── Wallet.jsx           # Funds operations and methods binding
│   │   └── utils/              # Calculation helpers
│   │       ├── vipTiers.js          # VIP milestones rules config
│   │       └── withdrawalFee.js     # Piecewise processing fee scale
│   ├── App.jsx                 # Client router controller
│   ├── index.css               # CSS base styles
│   ├── main.jsx                # Application mounting file
│   ├── vite.config.js          # Vite configuration including PWA service worker compiler
│   └── package.json            # Frontend package dependencies
└── docs/                       # Project documentation & PDFs
```

---

## 🗄️ Database Architecture (`backend/config/schema.sql`)

The database consists of a normalized relational schema built on InnoDB tables to ensure strong ACID guarantees. Core tables include:

1. **`users`**: Details account authentication, role (`user`, `admin`, `super_admin`), registered phone, VIP level, and current referral parent associations.
2. **`wallets`**: Stores `wallet_balance` (withdrawable cash) and `bonus_balance` (wagering locked credits), along with the running `required_wager` threshold.
3. **`wallet_transactions`**: The immutable system ledger. Records all debits/credits for wagers, deposits, payouts, and conversions.
4. **`game_rounds`**: Stores general game details, start/end timestamps, server seeds, hashes, and rolled outcome results.
5. **`bets`**: Records user bet placements, exact predictions, bet amounts, multiplier configurations, and status (win/lose/settled).
6. **`payment_methods`**: Stores bank/UPI linking information, strictly bound to the user's registered name.
7. **`color_prediction_history` & `dice_game_history`**: Holds game-specific statistics (colors rolled, dice pins hit) for history grids.

---

## 💡 Key Architectural & Feature Mechanics

### 1. Provably Fair Outcomes
The game results are generated using a provably fair system:
- **Server Seed**: A cryptographically random seed generated before the round starts, hashed via SHA-256, and displayed to users as the active round hash.
- **Client Seed**: A seed set by the player or generated randomly.
- **Nonce**: An incrementing counter for the number of wagers made using that seed pair.
- **Result Calculation**: The outcome is determined by combining the Server Seed, Client Seed, and Nonce, hashing the result, and converting the hash into a game outcome (e.g., a roll from `0.00` to `100.00` in Dice, or a number `0-9` in Colour Prediction).

### 2. Transaction Integrity & Concurrency
- To prevent balance race conditions (double-spend/balance exploits), the backend runs financial mutations inside **InnoDB Transaction Blocks** and locks rows using:
  ```sql
  SELECT wallet_balance, bonus_balance FROM wallets WHERE user_id = ? FOR UPDATE;
  ```
- Balance subtractions and additions check database response counters (`affectedRows === 1`) before executing callbacks, assuring that wagers are never processed twice.

### 3. Concurrently Decoupled Clocks
- In [ColourPrediction.jsx](file:///C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx), 4 distinct lobby rooms (30s, 1m, 2m, 5m clocks) run concurrently. 
- Using React refs to store the active session state, switching tabs doesn't destroy or reset the background timers, preventing clock desynchronization.
- In the final 5 seconds of any round, a **Lock & Freeze Overlay** blocks users from placing bets.

### 4. Locked Cardholder Name & Fraud Prevention
- To prevent withdrawal hijacking, users cannot type a custom bank account holder or UPI name. The field inherits the read-only registered profile name (`user.name`), ensuring withdrawals always route to the verified account holder.

### 5. Piecewise Withdrawal Fees
The processing fee $f(x)$ for a gross requested payout $x$ dynamically scales based on three tiers:
- **Low-Tier** ($x \le 100$): $f(x) = 0.09 \cdot x$ (Flat 9% fee)
- **Mid-Tier** ($100 < x \le 1000$): $f(x) = 9 + 0.03 \cdot (x - 100)$ (₹9 + 3% of excess)
- **High-Tier** ($x > 1000$): $f(x) = 0.03 \cdot x$ (Flat 3% fee)
- Total wallet deduction is $x + f(x)$, allowing users to receive the exact requested amount $x$ in their bank/UPI accounts while paying the fee directly from their wallet.

### 6. Security Risk Engine
- Every user action (like bet placement, login IP change, withdrawal rate, and password change) passes through [riskEngine.js](file:///C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/backend/utils/riskEngine.js).
- High-risk scores automatically flag the account, dispatch alerts to the Telegram admin bot, and require administrative or 2FA overrides.

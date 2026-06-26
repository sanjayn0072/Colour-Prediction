# Colour Prediction & Dice Game Platform

A premium, highly interactive, and responsive gaming web application built with **React**, **Vite**, **Tailwind CSS**, and **Shadcn/ui**. The platform is designed from the ground up using a **mobile-first Progressive Web App (PWA)** approach, delivering smooth, app-like micro-interactions, custom animations, and a rich, modern layout that feels premium on any device.

---

## 📱 Architecture Overview (Mobile-First PWA)
The platform is designed specifically with mobile usability as the primary priority, matching the standard dimensions and gestures of native applications:
- **Responsive Layout**: Designed in a clean mobile frame layout with standard width limits, centered navigation, and scrollable containers.
- **Micro-interactions**: Pulse transitions, loading spinners, gold-highlighted active bets, and radial glows that respond to user actions.
- **Concurrently Decoupled Timers**: Standard Web API `setInterval` timers managed atomically using React refs (`activeSessionRef`), allowing game clocks (30s, 1m, 2m, 5m) to run concurrently in the background without resets, skips, or freezes when changing views.
- **Offline & Mobile-Ready Hooks**: Prepared directory structures for service workers and manifest assets to support standalone PWA installations on iOS and Android devices.

---

## 🌟 Key Features

### 1. Dynamic Home Feed
- **Promo Banners & Carousels**: Beautiful, automatically sliding banners displaying promotional offers and hot alerts.
- **Category Lists & Lobby Drawer**: Interactive filters for game types (Lotto, Slot, Sports, Board) with the **GameLobbyModal** to allow seamless game hopping.
- **Live Winnings Feed**: A real-time updating list of mock player payouts to create high engagement.

### 2. Concurrently Decoupled Color Prediction Game
- **Concurrency**: Independent sessions (30s, 1m, 2m, 5m) running concurrently in the background.
- **Number-to-Color Remapping**:
  - **Green**: Even numbers `2, 4, 6, 8` (2.0x payout)
  - **Red**: Odd numbers `1, 3, 7, 9` (2.0x payout)
  - **Violet (Yallet)**: Numbers `5` and `10` (4.5x payout)
  - *Note: Number 5 is a split Red-Violet number, enabling wins for both Red and Violet bet targets.*
- **Custom Payouts**: Massive `8.0x` payout for predicting exact numbers.
- **Lock & Freeze Overlay**: Last 5 seconds of every round display a large pulsing digital clock card (`00:05` down to `00:01`) that freezes betting buttons.

### 3. Interactive Dice Slider Game (Dice Pro)
- **Interactive Betting Slider**: Drag-to-select range thresholds with instant probability, multiplier, and profit-on-win updates.
- **Safety Multiplier Logic**: Capped maximum win probability at 95% and minimum multiplier at 1.03x so that riskless 1x bets cannot be placed.
- **Digital Screen & Roller**: Smooth scrambled ticker simulation when the dice rolls, followed by indicator pins showing the exact outcome.

### 4. Wallet, Withdrawals & Bonus Conversions
- **Real vs. Bonus Cash**:
  - `realBalance` can be withdrawn at any time, even with pending bonus wagering requirements.
  - `bonusBalance` requires meeting `requiredWager` thresholds before converting.
- **Bonus Routing**: Winnings from games played using bonus credits are routed directly to the locked bonus balance.
- **Auto-Conversion**: When `requiredWager` reaches 0, the entire bonus balance converts into withdrawable real money immediately.
- **Bank/UPI Destination Restrictions**: Double-validation rules enforcing linked payment destination requirements (UPI or Bank account) and automatic fee additions (deducting fee + amount from balance, so users receive the exact requested payout).

### 5. Profile & Referral Commission Dashboard
- **Avatar Chooser**: Premium vector character avatars (`adventurer` illustration packs) framed inside glowing HSL-tailored gradient rings.
- **Referral Loop**: Direct referral bonuses (₹10 on new deposits of ₹100+) and referee play commissions calculated dynamically.
- **VIP Progression Commission**: Commission rates only unlock at VIP-5 (0.5% rate) up to VIP-20 (2.0% rate) and are hidden for levels below VIP-5.

---

## 📂 Folder Directory Tree

Here is the structured folder overview of the `frontend/` workspace:

```bash
frontend/
├── dist/                  # Compiles and serves production builds
├── public/                # Static assets (favicons, manifest files)
└── src/
    ├── assets/            # Local images, banners, and default placeholders
    ├── components/        # Shared presentation UI elements
    │   └── GameLobbyModal.jsx   # Center-popup navigation drawer for games
    ├── context/           # Global React Context providers for state
    │   └── UserContext.jsx      # Global wallet balances, referral logic, wagers, and transactions
    ├── lib/               # Custom system configuration utilities
    │   └── utils.js       # cn utility for Tailwind CSS class name merges
    ├── pages/             # Individual game views and screens
    │   ├── ColourPrediction.jsx # Concurrently decoupled Color Prediction game
    │   ├── DepositGateway.jsx   # QR code and UPI bank details transfer gateway
    │   ├── DiceGame.jsx         # Interactive Dice slider game (Dice Pro)
    │   ├── ForgotPassword.jsx   # Account password reset process
    │   ├── Home.jsx             # Dynamic Home feed banners, hot lists, and sliders
    │   ├── Login.jsx            # Account authentication screen
    │   ├── Notifications.jsx    # System notifications log
    │   ├── Profile.jsx          # Settings, Avatar picker, VIP club, and Referral panel
    │   ├── Register.jsx         # Account registration page
    │   ├── SpinWheel.jsx        # Premium Lucky Wheel game
    │   ├── Support.jsx          # Live chat customer support helper
    │   ├── TransactionRecords.jsx# Logs of deposit/withdrawal histories
    │   └── Wallet.jsx           # Wallet tabs (Deposit, Withdraw, Methods manager)
    ├── services/          # Socket connections and third-party APIs
    │   ├── gemini.js      # Mock API services
    │   └── socket.js      # Event dispatchers and listeners
    ├── utils/             # Helper libraries
    │   ├── vipTiers.js    # VIP requirement and benefit progression scaling config
    │   └── withdrawalFee.js# Processing fee scales for withdrawals
    ├── App.jsx            # Core page routing controller
    ├── index.css          # Main Tailwind styles
    └── main.jsx           # App entry point
```

---

## 🛠️ Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone or Navigate to the Directory
Open your terminal and make sure you are inside this folder:
```bash
npm install
```

### 2. Run the Development Server
Start Vite locally:
```bash
npm run dev
```
The server will start, typically serving the page at:
[http://localhost:5173](http://localhost:5173)

### 3. Build for Production
To build the compiled, optimized bundle:
```bash
npm run build
```
The built pages will output to the `/dist` folder. Use `npm run preview` to locally test the production build.

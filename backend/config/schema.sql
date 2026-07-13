-- Production-Ready MySQL Database Schema for ColourPlay
-- Designed by Senior Database Architect & Backend Engineer
-- Optimized for high concurrent traffic, transactional consistency, and administrative tracking.

CREATE DATABASE IF NOT EXISTS colourplay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE colourplay;

-- ────────────────────────────────────────────────────────
-- 1. USERS TABLE
-- ────────────────────────────────────────────────────────
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(6) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user',
    status ENUM('active', 'suspended', 'inactive') NOT NULL DEFAULT 'active',
    profile_pic TEXT NULL,
    registration_ip VARCHAR(45) NULL,
    last_login_ip VARCHAR(45) NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 2. USER ADDRESSES
-- ────────────────────────────────────────────────────────
CREATE TABLE user_addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(100) NULL,
    phone VARCHAR(15) NULL,
    address_type VARCHAR(20) NOT NULL DEFAULT 'Home',
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 3. USER STATISTICS (1:1 with users - for Admin Dashboard)
-- ────────────────────────────────────────────────────────
CREATE TABLE user_stats (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    total_deposits DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_withdrawals DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_bets_placed DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_winnings_won DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_bonus_claimed DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_referral_commissions DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    spins_count INT UNSIGNED NOT NULL DEFAULT 0,
    orders_count INT UNSIGNED NOT NULL DEFAULT 0,
    games_played INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_stats_user UNIQUE (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 4. WALLETS (1:1 with users)
-- ────────────────────────────────────────────────────────
CREATE TABLE wallets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    balance DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    locked_balance DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    bonus_balance DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    required_wager DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    status ENUM('active', 'frozen') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_wallets_user UNIQUE (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 5. PAYMENT METHODS
-- ────────────────────────────────────────────────────────
CREATE TABLE payment_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('bank', 'upi') NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(30) NULL,
    ifsc_code VARCHAR(15) NULL,
    upi_id VARCHAR(100) NULL,
    qr_code_url TEXT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 6. ADMINISTRATIVE ADMINS
-- ────────────────────────────────────────────────────────
CREATE TABLE admins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('moderator', 'admin', 'super_admin') NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_admin_name UNIQUE (username)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 7. DEPOSITS
-- ────────────────────────────────────────────────────────
CREATE TABLE deposits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NULL,
    amount DECIMAL(15, 4) NOT NULL,
    fee DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    transaction_id VARCHAR(100) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'rejected') NOT NULL DEFAULT 'pending',
    processed_by BIGINT UNSIGNED NULL,
    processed_at TIMESTAMP NULL,
    coupon_code VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_deposits_txn UNIQUE (transaction_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 8. WITHDRAWALS
-- ────────────────────────────────────────────────────────
CREATE TABLE withdrawals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 4) NOT NULL,
    fee DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    net_amount DECIMAL(15, 4) GENERATED ALWAYS AS (amount - fee) STORED,
    status ENUM('pending', 'approved', 'rejected', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    processed_by BIGINT UNSIGNED NULL,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 9. GAMES REGISTRY
-- ────────────────────────────────────────────────────────
CREATE TABLE games (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_games_name UNIQUE (name)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 10. GAME ROUNDS
-- ────────────────────────────────────────────────────────
CREATE TABLE game_rounds (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    game_id BIGINT UNSIGNED NOT NULL,
    round_id VARCHAR(50) NOT NULL,
    server_seed VARCHAR(128) NOT NULL,
    client_seed VARCHAR(128) NULL,
    nonce INT NULL,
    outcome VARCHAR(255) NULL,
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_round_id UNIQUE (round_id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 11. COLOR PREDICTION HISTORY
-- ────────────────────────────────────────────────────────
CREATE TABLE color_prediction_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    game_round_id BIGINT UNSIGNED NOT NULL,
    winning_color VARCHAR(20) NOT NULL,
    winning_number INT NOT NULL,
    total_bet_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_winning_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_loss_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cph_round UNIQUE (game_round_id),
    FOREIGN KEY (game_round_id) REFERENCES game_rounds(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 12. DICE GAME HISTORY
-- ────────────────────────────────────────────────────────
CREATE TABLE dice_game_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    game_round_id BIGINT UNSIGNED NOT NULL,
    roll_number INT NOT NULL,
    outcome_type ENUM('high', 'low') NOT NULL,
    total_bet_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_winning_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_loss_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dgh_round UNIQUE (game_round_id),
    FOREIGN KEY (game_round_id) REFERENCES game_rounds(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 13. BETS
-- ────────────────────────────────────────────────────────
CREATE TABLE bets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    game_round_id BIGINT UNSIGNED NOT NULL,
    game_id BIGINT UNSIGNED NULL,
    bet_type VARCHAR(20) NOT NULL,
    bet_value VARCHAR(50) NOT NULL,
    bet_amount DECIMAL(15, 4) NOT NULL,
    real_used DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    bonus_used DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    payout_multiplier DECIMAL(6, 2) NOT NULL DEFAULT 1.00,
    payout_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    status ENUM('pending', 'won', 'lost', 'cancelled') NOT NULL DEFAULT 'pending',
    outcome VARCHAR(50) NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    settled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (game_round_id) REFERENCES game_rounds(id) ON DELETE RESTRICT,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 14. BONUSES
-- ────────────────────────────────────────────────────────
CREATE TABLE bonuses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('sign_up', 'referral', 'vip', 'coupon', 'spin') NOT NULL,
    amount DECIMAL(15, 4) NOT NULL,
    status ENUM('pending', 'claimed', 'expired') NOT NULL DEFAULT 'claimed',
    source_type VARCHAR(50) NULL,
    bonus_type VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 15. VIP BONUS DETAILS
-- ────────────────────────────────────────────────────────
CREATE TABLE vip_bonus_details (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bonus_id BIGINT UNSIGNED NOT NULL,
    vip_level INT NOT NULL,
    reward_type VARCHAR(20) NOT NULL,
    monthly_reward DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    weekly_reward DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    level_up_reward DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    CONSTRAINT uq_vip_bonus UNIQUE (bonus_id),
    FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 16. REFERRALS
-- ────────────────────────────────────────────────────────
CREATE TABLE referrals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    referrer_id BIGINT UNSIGNED NOT NULL,
    referred_id BIGINT UNSIGNED NOT NULL,
    status ENUM('registered', 'active', 'rewarded') NOT NULL DEFAULT 'registered',
    total_deposit_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_bonus_generated DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_referred UNIQUE (referred_id),
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 17. REFERRAL BONUS DETAILS
-- ────────────────────────────────────────────────────────
CREATE TABLE referral_bonus_details (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bonus_id BIGINT UNSIGNED NOT NULL,
    referral_id BIGINT UNSIGNED NOT NULL,
    commission_level INT NOT NULL DEFAULT 1,
    FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE CASCADE,
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 18. COUPONS
-- ────────────────────────────────────────────────────────
CREATE TABLE coupons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    discount_type ENUM('flat', 'percentage') NOT NULL DEFAULT 'flat',
    value DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    min_deposit DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    max_uses INT NOT NULL DEFAULT 1,
    used_count INT UNSIGNED NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NULL,
    type ENUM('FIRST_DEPOSIT', 'RETENTION_REWARD', 'GAMEPLAY_FREEBIE', 'FEE_WAIVER', 'REACTIVATION', 'LOYALTY') NOT NULL DEFAULT 'RETENTION_REWARD',
    reward_amount DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    min_deposit_required DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    validity_days INT NOT NULL DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_coupons_code UNIQUE (code)
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 19. COUPON USAGE
-- ────────────────────────────────────────────────────────
CREATE TABLE coupon_usage (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coupon_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    bonus_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 19a. USER COUPONS (Tracks User-specific Coupons)
-- ────────────────────────────────────────────────────────
CREATE TABLE user_coupons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    coupon_id BIGINT UNSIGNED NOT NULL,
    status ENUM('AVAILABLE', 'USED', 'EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_user_coupons_user_status ON user_coupons(user_id, status);

-- ────────────────────────────────────────────────────────
-- 20. SPIN CONFIGS
-- ────────────────────────────────────────────────────────
CREATE TABLE spin_configs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    prize_name VARCHAR(50) NOT NULL,
    type ENUM('cash', 'bonus', 'empty') NOT NULL,
    value DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    weight INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 21. SPIN REWARDS
-- ────────────────────────────────────────────────────────
CREATE TABLE spin_rewards (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    spin_config_id BIGINT UNSIGNED NOT NULL,
    bonus_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (spin_config_id) REFERENCES spin_configs(id) ON DELETE RESTRICT,
    FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 22. COMPLAINTS (SUPPORT)
-- ────────────────────────────────────────────────────────
CREATE TABLE complaints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    subject VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    assigned_admin BIGINT UNSIGNED NULL,
    resolution_notes TEXT NULL,
    image_url TEXT NULL,
    complaint_type VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_admin) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 23. NOTIFICATIONS
-- ────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    notifications_type VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 24. IMMUTABLE WALLET TRANSACTION LEDGER
-- ────────────────────────────────────────────────────────
CREATE TABLE wallet_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    wallet_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(15, 4) NOT NULL,
    type ENUM('deposit', 'withdrawal', 'bet_placement', 'bet_payout', 'bonus_claim', 'commission', 'product_purchase') NOT NULL,
    reference_table VARCHAR(50) NOT NULL,
    reference_id BIGINT UNSIGNED NOT NULL,
    balance_before DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    balance_after DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 25. E-COMMERCE PRODUCTS
-- ────────────────────────────────────────────────────────
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    price DECIMAL(15, 4) NOT NULL,
    original_price DECIMAL(15, 4) NULL,
    description TEXT NULL,
    rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    reviews_count INT NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 26. PRODUCT IMAGES
-- ────────────────────────────────────────────────────────
CREATE TABLE product_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 27. PRODUCT ORDERS
-- ────────────────────────────────────────────────────────
CREATE TABLE product_orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    user_address_id BIGINT UNSIGNED NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price_each DECIMAL(15, 4) NOT NULL,
    total_price DECIMAL(15, 4) NOT NULL,
    order_status ENUM('pending', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_address_id) REFERENCES user_addresses(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 28. HOMEPAGE BANNERS
-- ────────────────────────────────────────────────────────
CREATE TABLE banners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(255) NULL,
    image_url VARCHAR(255) NULL,
    gradient VARCHAR(100) NULL,
    action VARCHAR(50) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- 29. ADMIN AUDIT LOGS
-- ────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ────────────────────────────────────────────────────────
-- INDEX TUNING FOR CONCURRENT PERFORMANCE
-- ────────────────────────────────────────────────────────
CREATE INDEX idx_bets_user_created ON bets(user_id, created_at);
CREATE INDEX idx_bets_round ON bets(game_round_id);
CREATE INDEX idx_transactions_user_created ON wallet_transactions(user_id, created_at);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_orders_user_created ON product_orders(user_id, created_at);
CREATE INDEX idx_users_ips ON users(registration_ip, last_login_ip);

-- ────────────────────────────────────────────────────────
-- 30. USER GAME STATISTICS (Split by game type/interval)
-- ────────────────────────────────────────────────────────
CREATE TABLE user_game_stats (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    game_type VARCHAR(20) NOT NULL,
    games_played INT UNSIGNED NOT NULL DEFAULT 0,
    games_won INT UNSIGNED NOT NULL DEFAULT 0,
    total_wagered DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    total_won DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_game_type UNIQUE (user_id, game_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_user_game_stats_user ON user_game_stats(user_id);

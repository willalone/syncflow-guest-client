CREATE DATABASE IF NOT EXISTS syncflow_restaurant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE syncflow_restaurant;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NULL,
  login VARCHAR(100) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin', 'manager', 'staff') NOT NULL DEFAULT 'customer',
  status ENUM('active', 'blocked', 'deleted') NOT NULL DEFAULT 'active',
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  phone_verified TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_login (login),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB;

CREATE TABLE user_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NULL,
  middle_name VARCHAR(100) NULL,
  birth_date DATE NULL,
  avatar_url VARCHAR(500) NULL,
  gender ENUM('female', 'male', 'other', 'unknown') DEFAULT 'unknown',
  city VARCHAR(120) NULL,
  preferred_language VARCHAR(10) NOT NULL DEFAULT 'ru',
  marketing_consent TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(80) NOT NULL DEFAULT 'Основной',
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(120) NULL,
  postal_code VARCHAR(20) NULL,
  comment VARCHAR(255) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_addresses_user (user_id),
  CONSTRAINT fk_addresses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_id VARCHAR(120) NULL,
  device_name VARCHAR(120) NULL,
  platform ENUM('ios', 'android', 'web', 'unknown') NOT NULL DEFAULT 'unknown',
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_hash (refresh_token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE restaurants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(120) NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Moscow',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_restaurants_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE dining_tables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  table_code VARCHAR(30) NOT NULL, -- e.g. T1 / WINDOW-2
  zone_name VARCHAR(80) NULL,      -- e.g. "У окна"
  capacity INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_table_code_per_restaurant (restaurant_id, table_code),
  KEY idx_tables_restaurant_active (restaurant_id, is_active),
  CONSTRAINT fk_tables_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE menu_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_menu_categories_restaurant (restaurant_id),
  CONSTRAINT fk_menu_categories_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE menu_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(60) NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  ingredients TEXT NULL,
  weight_grams INT UNSIGNED NULL,
  calories_kcal INT UNSIGNED NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500) NULL,
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count INT UNSIGNED NOT NULL DEFAULT 0,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_menu_items_restaurant_available (restaurant_id, is_available),
  KEY idx_menu_items_category (category_id),
  KEY idx_menu_items_name (name),
  CONSTRAINT fk_menu_items_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_menu_items_category
    FOREIGN KEY (category_id) REFERENCES menu_categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE menu_item_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  menu_item_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  rating TINYINT UNSIGNED NOT NULL, -- 1..5
  comment TEXT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_item (menu_item_id),
  KEY idx_reviews_user (user_id),
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_reviews_item
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_favorites (
  user_id BIGINT UNSIGNED NOT NULL,
  menu_item_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, menu_item_id),
  KEY idx_favorites_item (menu_item_id),
  CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favorites_item
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_number VARCHAR(30) NOT NULL,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  dining_table_id BIGINT UNSIGNED NULL,
  guest_count INT UNSIGNED NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INT UNSIGNED NOT NULL DEFAULT 90,
  status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') NOT NULL DEFAULT 'pending',
  address_snapshot VARCHAR(255) NULL,
  comment VARCHAR(255) NULL,
  preorder_snapshot JSON NULL COMMENT 'Предзаказ: { items, servingTime, bookingTime }',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_number (booking_number),
  KEY idx_bookings_user (user_id, booking_date),
  KEY idx_bookings_restaurant_date (restaurant_id, booking_date, booking_time),
  KEY idx_bookings_status (status),
  CONSTRAINT fk_bookings_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_table
    FOREIGN KEY (dining_table_id) REFERENCES dining_tables(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number VARCHAR(30) NOT NULL,
  restaurant_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  status ENUM('draft', 'created', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'created',
  subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  bonus_earned INT NOT NULL DEFAULT 0,
  bonus_spent INT NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'RUB',
  address_snapshot VARCHAR(255) NULL,
  comment VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_number (order_number),
  KEY idx_orders_user (user_id, created_at),
  KEY idx_orders_restaurant (restaurant_id, created_at),
  KEY idx_orders_status (status),
  CONSTRAINT fk_orders_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_orders_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  menu_item_id BIGINT UNSIGNED NOT NULL,
  item_name_snapshot VARCHAR(180) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_menu_item (menu_item_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_menu_item
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE loyalty_accounts (
  user_id BIGINT UNSIGNED NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  total_earned INT NOT NULL DEFAULT 0,
  total_spent INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_loyalty_accounts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE loyalty_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  transaction_type ENUM('welcome', 'earn', 'spend', 'expire', 'manual_adjust') NOT NULL,
  points_delta INT NOT NULL, -- + / -
  reason VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_loyalty_tx_user_created (user_id, created_at),
  KEY idx_loyalty_tx_order (order_id),
  CONSTRAINT fk_loyalty_tx_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_loyalty_tx_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('welcome_bonus', 'bonus_earned', 'booking_confirmed', 'booking_cancelled', 'order_status', 'promo', 'system', 'push', 'payment', 'review') NOT NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  payload_json JSON NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read_created (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE push_devices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  platform ENUM('ios', 'android') NOT NULL,
  device_token VARCHAR(255) NOT NULL,
  device_name VARCHAR(120) NULL,
  app_version VARCHAR(40) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_token (device_token),
  KEY idx_push_user_active (user_id, is_active),
  CONSTRAINT fk_push_devices_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(60) NOT NULL,   -- e.g. "order", "booking", "profile"
  entity_id BIGINT UNSIGNED NULL,
  action VARCHAR(60) NOT NULL,        -- e.g. "create", "update", "status_change"
  meta_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_actor (actor_user_id, created_at),
  CONSTRAINT fk_audit_actor_user
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
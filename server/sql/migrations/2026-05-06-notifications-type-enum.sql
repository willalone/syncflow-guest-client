-- Expands notifications.type enum with domain-specific values for client push/payment/review events.
ALTER TABLE notifications
  MODIFY COLUMN type ENUM(
    'welcome_bonus',
    'bonus_earned',
    'booking_confirmed',
    'booking_cancelled',
    'order_status',
    'promo',
    'system',
    'push',
    'payment',
    'review'
  ) NOT NULL;

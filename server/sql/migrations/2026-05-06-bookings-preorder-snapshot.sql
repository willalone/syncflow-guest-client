-- Предзаказ к бронированию: снимок позиций и время подачи (актуальная схема — см. db.sql).
ALTER TABLE bookings
  ADD COLUMN preorder_snapshot JSON NULL
  COMMENT 'Предзаказ: { items, servingTime, bookingTime }'
  AFTER comment;

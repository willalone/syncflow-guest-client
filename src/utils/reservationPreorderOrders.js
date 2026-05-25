/**
 * Предзаказы к брони, для которых нет отдельного заказа в GET /orders/my.
 */

function normalizeTitle(title) {
  return String(title || '')
    .trim()
    .toLowerCase();
}

export function orderMatchesBookingPreorder(order, booking) {
  const bookingId = String(booking?.id ?? '').trim();
  if (bookingId) {
    if (String(order?.reservationId ?? '') === bookingId) return true;
    if (String(order?.bookingId ?? '') === bookingId) return true;
  }

  const preorderItems = booking?.preorder?.items;
  if (!Array.isArray(preorderItems) || !preorderItems.length) return false;
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  if (!orderItems.length || orderItems.length !== preorderItems.length) return false;
  const titles = new Set(orderItems.map((row) => normalizeTitle(row.title)));
  return preorderItems.every((row) => titles.has(normalizeTitle(row.title)));
}

export function bookingWithPreorderToClientOrder(booking) {
  const preorder = booking?.preorder;
  const items = Array.isArray(preorder?.items) ? preorder.items : [];
  if (!items.length) return null;

  const total = items.reduce(
    (sum, row) => sum + Number(row.unitPrice || 0) * Math.max(1, Number(row.quantity || 1)),
    0
  );
  const scheduledAt = [booking?.date, preorder?.servingTime || booking?.time].filter(Boolean).join(' ').trim();

  return {
    id: `reservation-preorder-${booking.id}`,
    reservationId: String(booking.id),
    isReservationPreorder: true,
    createdAt: booking?.createdAt || new Date().toISOString(),
    status: 'created',
    paymentStatus: 'pending',
    orderType: 'booking',
    total: Number(total.toFixed(2)),
    subtotal: Number(total.toFixed(2)),
    discount: 0,
    bonusSpent: 0,
    bonusEarned: 0,
    xpEarned: 0,
    scheduledAt: scheduledAt || null,
    items: items.map((row) => ({
      id: String(row.id || row.title || ''),
      title: row.title,
      quantity: Math.max(1, Number(row.quantity || 1)),
    })),
  };
}

export function mergeOrdersWithReservationPreorders(orders, bookings) {
  const base = Array.isArray(orders) ? [...orders] : [];
  const list = Array.isArray(bookings) ? bookings : [];
  const synthetics = [];

  for (const booking of list) {
    const synthetic = bookingWithPreorderToClientOrder(booking);
    if (!synthetic) continue;
    if (base.some((order) => orderMatchesBookingPreorder(order, booking))) continue;
    if (base.some((order) => String(order.id) === synthetic.id)) continue;
    synthetics.push(synthetic);
  }

  return [...base, ...synthetics].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

import React from 'react';
import { calculateCartTotal } from '../utils/cart';
import { runtimeConfig } from '../config/runtimeConfig';
import * as clientApi from '../services/api/clientApi';

function preorderNoteFromDetailedItem(row) {
  const modifiers = Array.isArray(row?.modifiers) ? row.modifiers : [];
  if (!modifiers.length) return undefined;
  return modifiers
    .map((m) => `${m.name || ''}${m.price ? ` (+${m.price} руб.)` : ''}`)
    .filter(Boolean)
    .join(', ');
}

const OFFLINE_CHECKOUT_MSG = 'Нет соединения с интернетом. Дождитесь восстановления сети и повторите.';

async function applySyncflowOrderExtras({
  createdOrder,
  checkoutOptions,
  showToast,
  spendGuestBonus,
}) {
  if (
    runtimeConfig.integratedBackend !== 'syncflow' ||
    runtimeConfig.useMockApi ||
    createdOrder?.id == null ||
    !Number.isFinite(Number(createdOrder.id))
  ) {
    return null;
  }
  const orderId = Number(createdOrder.id);
  if (checkoutOptions?.appliedPromo?.code) {
    try {
      await clientApi.applyPromoToOrder(orderId, checkoutOptions.appliedPromo.code);
    } catch (e) {
      showToast(
        'error',
        e?.message || 'Заказ создан, но промокод не удалось применить. Можно попробовать в истории заказов.'
      );
    }
  }
  try {
    await clientApi.tryApplyGuestPersonalDiscount(orderId);
  } catch {
    // гость может не иметь права на /discounts
  }
  if (checkoutOptions?.useLoyaltyPoints && Number(checkoutOptions.pointsToSpend || 0) > 0) {
    try {
      await spendGuestBonus({
        amount: Number(checkoutOptions.pointsToSpend),
        orderId,
      });
    } catch (e) {
      showToast(
        'error',
        e?.message || 'Заказ создан, но бонусы не удалось списать. Попробуйте позже или обратитесь в ресторан.'
      );
    }
  }
  try {
    return await clientApi.fetchOrderSummary(orderId);
  } catch {
    return null;
  }
}

export function useCheckoutFlow({
  cartItems,
  menuDishes,
  createOrder,
  createBooking,
  clearCart,
  spendGuestBonus,
  payOrder,
  showToast,
  navigateToScreen,
  isOffline = false,
}) {
  const [checkoutOptions, setCheckoutOptions] = React.useState(null);
  const [paymentPrompt, setPaymentPrompt] = React.useState({ visible: false, orderId: null, summary: null });

  const buildDetailedItems = React.useCallback(
    () =>
      cartItems.map((item) => {
        const dish = menuDishes.find((value) => value.id === item.id);
        const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
        const modifiersTotal = modifiers.reduce((sum, modifier) => sum + Number(modifier?.price || 0), 0);
        const titleWithModifiers = modifiers.length
          ? `${dish?.title || item.id} (+ ${modifiers.map((modifier) => modifier?.name).filter(Boolean).join(', ')})`
          : dish?.title || item.id;
        const dishInCategoryIdRaw =
          item.dishInCategoryId != null
            ? Number(item.dishInCategoryId)
            : dish?.menuRowId != null
              ? Number(dish.menuRowId)
              : NaN;
        return {
          id: item.id,
          dishInCategoryId: Number.isFinite(dishInCategoryIdRaw) ? dishInCategoryIdRaw : null,
          title: titleWithModifiers,
          unitPrice: Number(dish?.price || 0) + modifiersTotal,
          quantity: item.quantity,
          modifiers,
        };
      }),
    [cartItems, menuDishes]
  );

  const onCheckout = React.useCallback(
    async (options = {}) => {
      setCheckoutOptions(options);
      if (options.orderType === 'booking') {
        navigateToScreen('Booking');
        return;
      }

      if (isOffline) {
        showToast('error', OFFLINE_CHECKOUT_MSG);
        return;
      }

      const total = calculateCartTotal(cartItems, menuDishes);
      const detailedItems = buildDetailedItems();
      try {
        const createdOrder = await createOrder({
          items: detailedItems,
          total,
          orderType: options.orderType,
          useLoyaltyPoints: Boolean(options.useLoyaltyPoints),
          pointsToSpend: Number(options.pointsToSpend || 0),
          deliveryDetails: null,
          bookingDraft: {
            address: options.pickupAddress || '',
          },
          appliedPromo: options.appliedPromo || null,
          promoDiscountRub: options.promoDiscountRub ?? 0,
        });
        const orderSummary = await applySyncflowOrderExtras({
          createdOrder,
          checkoutOptions: options,
          showToast,
          spendGuestBonus,
        });
        await clearCart();
        navigateToScreen('Profile');
        if (createdOrder?.paymentStatus === 'pending' || createdOrder?.status === 'created') {
          setPaymentPrompt({ visible: true, orderId: createdOrder.id, summary: orderSummary });
        } else {
          showToast('success', 'Заказ успешно оформлен.');
        }
      } catch (error) {
        showToast('error', error?.message || 'Не удалось оформить заказ. Проверьте данные и повторите попытку.');
      }
    },
    [buildDetailedItems, cartItems, menuDishes, createOrder, spendGuestBonus, showToast, clearCart, navigateToScreen, isOffline]
  );

  const onBookingSubmit = React.useCallback(
    async (payload) => {
      if (isOffline) {
        showToast('error', OFFLINE_CHECKOUT_MSG);
        return { ok: false, message: OFFLINE_CHECKOUT_MSG };
      }
      try {
        const total = calculateCartTotal(cartItems, menuDishes);
        const detailedItems = buildDetailedItems();
        const booking = await createBooking({
          ...payload,
          preorderItems: detailedItems.length ? detailedItems : undefined,
        });
        if (!detailedItems.length) {
          navigateToScreen('Profile');
          showToast('success', 'Бронирование успешно оформлено.');
          return { ok: true };
        }
        const serveAt = `${payload?.date || ''} ${payload?.servingTime || payload?.time || ''}`.trim();

        if (runtimeConfig.integratedBackend === 'syncflow' && !runtimeConfig.useMockApi) {
          try {
            const lines = detailedItems
              .filter((row) => row.dishInCategoryId != null && Number.isFinite(Number(row.dishInCategoryId)))
              .map((row) => ({
                dishInCategoryId: Number(row.dishInCategoryId),
                quantity: row.quantity,
                note: preorderNoteFromDetailedItem(row),
              }));
            if (!lines.length) {
              throw new Error(
                'В корзине нет позиций с id из меню. Обновите меню и добавьте блюда снова.'
              );
            }
            await clientApi.syncReservationPreorder(String(booking.id), lines);
          } catch (preorderError) {
            navigateToScreen('Profile');
            const preorderMessage =
              preorderError?.message ||
              'Бронь создана, но предзаказ не удалось отправить. Попробуйте связаться с рестораном.';
            showToast('error', preorderMessage);
            return { ok: false, message: preorderMessage };
          }
        }

        let createdOrder = null;
        try {
          createdOrder = await createOrder({
            items: detailedItems,
            total,
            orderType: 'booking',
            useLoyaltyPoints: Boolean(checkoutOptions?.useLoyaltyPoints),
            pointsToSpend: Number(checkoutOptions?.pointsToSpend || 0),
            bookingId: booking?.id || null,
            reservationId: booking?.id || null,
            scheduledAt: serveAt,
            bookingDraft: payload,
          });
        } catch (orderError) {
          navigateToScreen('Profile');
          const orderMessage =
            orderError?.message ||
            'Бронь создана, но заказ по предзаказу не удалось оформить. Проверьте раздел «Заказы» и повторите попытку.';
          showToast('error', orderMessage);
          return { ok: false, message: orderMessage };
        }

        const orderSummary = await applySyncflowOrderExtras({
          createdOrder,
          checkoutOptions,
          showToast,
          spendGuestBonus,
        });

        await clearCart();
        navigateToScreen('Profile');
        if (createdOrder?.paymentStatus === 'pending' || createdOrder?.status === 'created') {
          setPaymentPrompt({ visible: true, orderId: createdOrder.id, summary: orderSummary });
        } else {
          showToast('success', 'Бронирование и заказ с предзаказом оформлены.');
        }
        return { ok: true };
      } catch (error) {
        const message = error?.message || 'Не удалось завершить оформление. Попробуйте снова.';
        showToast('error', message);
        return { ok: false, message };
      }
    },
    [buildDetailedItems, cartItems, menuDishes, createBooking, navigateToScreen, showToast, clearCart, createOrder, checkoutOptions, isOffline]
  );

  const handlePayNow = React.useCallback(async () => {
    if (!paymentPrompt.orderId) return;
    if (isOffline) {
      showToast('error', OFFLINE_CHECKOUT_MSG);
      return;
    }
    try {
      await payOrder(paymentPrompt.orderId);
      setPaymentPrompt({ visible: false, orderId: null, summary: null });
      navigateToScreen('Orders');
      showToast('success', 'Оплата прошла успешно.');
    } catch (error) {
      showToast('error', error?.message || 'Не удалось провести оплату. Повторите попытку.');
    }
  }, [paymentPrompt.orderId, payOrder, navigateToScreen, showToast, isOffline]);

  const handlePayLater = React.useCallback(() => {
    setPaymentPrompt({ visible: false, orderId: null, summary: null });
    navigateToScreen('Orders');
    showToast('success', 'Статус заказа: ожидание оплаты. Оплатить можно в истории заказов.');
  }, [navigateToScreen, showToast]);

  return {
    paymentPrompt,
    onCheckout,
    onBookingSubmit,
    handlePayNow,
    handlePayLater,
  };
}

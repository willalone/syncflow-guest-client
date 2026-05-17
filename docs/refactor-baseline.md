# Refactor Baseline

## Critical Flows
- Guest mode: menu-only browsing, auth CTA, dish details without ordering.
- Auth mode: menu/cart/booking/profile tabs, overlays (dish/details/history).
- Checkout: cart totals, promo, loyalty spending, order + payment prompt.
- Booking: booking create + optional preorder syncflow path.
- Profile: update profile, phone required for booking, server error handling.

## High-Risk Modules
- `src/contexts/ClientDataContext.js` (bootstrap + caching + mutations + pagination in one file).
- `src/services/api/clientApi.syncflow.http.js` (large mixed transport/mapper/business logic).
- `src/navigation/AppNavigator.js` (guest/auth/tab/overlay orchestration).
- `src/screens/AuthScreen.js` and `src/screens/ProfileScreen.js` (complex UI + async workflows).

## Known Stability Risks
- Mixed responsibilities increase chance of cross-feature regressions.
- Network error shape differences (JSON formats) can hide actionable backend diagnostics.
- Partial optimistic updates in client state can diverge from backend on flaky networks.
- Guest/auth transitions can desync visual tab state and route state.

## Baseline Safety Net
- Existing tests: `src/utils/cart.test.js`, `src/services/mockApi.test.js`.
- Added smoke tests: `src/services/syncflowHttp.test.js` to lock error-message behavior and API base normalization.

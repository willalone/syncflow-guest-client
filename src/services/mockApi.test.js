import { getMenu, signIn } from './mockApi';

describe('mock api', () => {
  test('returns token and user after sign in', async () => {
    const session = await signIn({ phone: '+7 999 000-00-00', password: '1234' });
    expect(session.token).toBeTruthy();
    expect(session.user.name).toBeTruthy();
  });

  test('returns menu dishes list', async () => {
    const menu = await getMenu();
    expect(menu.dishes.length).toBeGreaterThan(0);
    expect(menu.categories.length).toBeGreaterThan(1);
  });
});

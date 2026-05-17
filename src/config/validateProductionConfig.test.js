import { getProductionConfigIssues, isProductionConfigValid, shouldBlockAppForConfig } from './validateProductionConfig';

describe('validateProductionConfig', () => {
  const validProd = {
    apiBaseUrl: 'https://api.example.com/api',
    useMockApi: false,
    integratedBackend: 'syncflow',
    restaurantId: 'restaurant1',
    enableProductionChecks: true,
    allowInsecureApi: false,
  };

  test('accepts valid production config', () => {
    expect(getProductionConfigIssues(validProd)).toEqual([]);
    expect(isProductionConfigValid(validProd)).toBe(true);
  });

  test('rejects mock api in production', () => {
    const issues = getProductionConfigIssues({ ...validProd, useMockApi: true });
    expect(issues.some((i) => /mock/i.test(i))).toBe(true);
  });

  test('rejects http without allowInsecureApi', () => {
    const issues = getProductionConfigIssues({
      ...validProd,
      apiBaseUrl: 'http://186.246.5.94/api',
    });
    expect(issues.some((i) => /https/i.test(i))).toBe(true);
  });

  test('allows http when allowInsecureApi', () => {
    const issues = getProductionConfigIssues({
      ...validProd,
      apiBaseUrl: 'http://186.246.5.94/api',
      allowInsecureApi: true,
    });
    expect(issues.filter((i) => /https/i.test(i))).toHaveLength(0);
  });

  test('shouldBlockAppForConfig respects __DEV__ and enableProductionChecks', () => {
    const bad = { ...validProd, apiBaseUrl: 'http://x/api' };
    expect(shouldBlockAppForConfig(bad)).toBe(__DEV__ ? false : true);
    expect(shouldBlockAppForConfig({ ...bad, enableProductionChecks: false })).toBe(false);
  });
});

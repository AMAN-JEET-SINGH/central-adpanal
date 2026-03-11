export type AdsenseAccountConfig = {
  key: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountId: string;
};

export function getAdsenseAccounts(): AdsenseAccountConfig[] {
  const keys = (process.env.ADSENSE_ACCOUNT_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  return keys.map(key => {
    const rawAccountId = process.env[`ADSENSE_${key}_GOOGLE_ADSENSE_ACCOUNT_ID`] || '';
    // Google Adsense API v2 requires 'accounts/pub-XXXXX' format
    const accountId = rawAccountId.startsWith('accounts/')
      ? rawAccountId
      : `accounts/${rawAccountId}`;

    return {
      key,
      clientId: process.env[`ADSENSE_${key}_GOOGLE_ADSENSE_CLIENT_ID`] || '',
      clientSecret: process.env[`ADSENSE_${key}_GOOGLE_ADSENSE_CLIENT_SECRET`] || '',
      refreshToken: process.env[`ADSENSE_${key}_GOOGLE_ADSENSE_REFRESH_TOKEN`] || '',
      accountId,
    };
  });
}


export const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', INR: '₹', GBP: '£' };

export const CURRENCY_LOCALES = {
  USD: 'en-US',
  EUR: 'de-DE',
  INR: 'en-IN',
  GBP: 'en-GB',
};

/**
 * Formats a numeric amount into a localized currency string with the correct symbol.
 * @param {number|string} amount
 * @param {string} currency
 * @returns {string}
 */
export function fmtMoney(amount, currency = 'INR') {
  const sym = CURRENCY_SYMBOLS[currency] || '₹';
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  const num = Number(amount);
  return `${sym}${(isNaN(num) ? 0 : num).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

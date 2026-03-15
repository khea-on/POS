const USD_TO_KHR_RATE = 4000;

const getNumericValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getLocale = (language) => (language === "km" ? "km-KH" : "en-US");

export const convertUsdToKhr = (usdAmount) =>
  Math.round(getNumericValue(usdAmount) * USD_TO_KHR_RATE);

export const convertKhrToUsd = (khrAmount) =>
  Number((getNumericValue(khrAmount) / USD_TO_KHR_RATE).toFixed(2));

export const formatUsdAsKhr = (usdAmount, language = "en") =>
  `${new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits: 0,
  }).format(convertUsdToKhr(usdAmount))} KHR`;

export const formatUsdAsKhrInputValue = (usdAmount) =>
  String(convertUsdToKhr(usdAmount));

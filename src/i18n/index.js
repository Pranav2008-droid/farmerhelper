import ReactNative from 'react-native';
import I18n from 'react-native-i18n';

import locales from './locales';

I18n.fallbacks = true;

I18n.translations = locales;

I18n.defaultLocale = 'en-US';
const currentLocale = I18n.currentLocale();

export const isRTL =
        currentLocale.indexOf('he') === 0 || currentLocale.indexOf('ar') === 0;

// Allow RTL ( Right to Left) alignment in RTL languages
ReactNative.I18nManager.allowRTL(isRTL);

// The method we'll use instead of a regular string
export function strings(name, params = {}, defaultStr) {
  let result = '';
  let strName = name;
  if (!strName) {
    if (defaultStr) {
      return defaultStr;
    }
    strName = 'internalError';
  }
  result = I18n.t(strName, params);
  let patternStr = '\\[missing .*';
  patternStr += name;
  patternStr += '.* translation\\]';
  const pattern = new RegExp(patternStr);
  if (pattern.test(result)) {
    result = defaultStr || strName;
  }
  return result;
}
export default I18n;

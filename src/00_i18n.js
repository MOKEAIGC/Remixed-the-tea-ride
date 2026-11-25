'use strict';

const I18n = (() => {
  const storageKey = 'the-tea-ride.language';
  const listeners = new Set();
  let lang = 'zh';
  try {
    if (localStorage.getItem(storageKey) === 'en') lang = 'en';
  } catch { /* The single HTML file can also run with storage disabled. */ }

  function refreshDocument() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t('鹈鹕茶旅 · The Tea Ride', 'The Tea Ride');
  }

  function t(zh, en) { return lang === 'zh' ? zh : en; }
  function text(value) { return Array.isArray(value) ? t(...value) : value; }

  function set(language) {
    if (language === lang || (language !== 'zh' && language !== 'en')) return;
    lang = language;
    try { localStorage.setItem(storageKey, lang); } catch { /* Keep the choice for this session. */ }
    refreshDocument();
    for (const listener of listeners) listener(lang);
  }

  refreshDocument();
  return {
    t, text, set,
    toggle: () => set(t('en', 'zh')),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    get lang() { return lang; },
  };
})();

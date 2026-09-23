// Copy is selected by the page language; both pages share the calculations.
export const t = (ja, en) => document.documentElement.lang === 'en' ? en : ja;
export const labels = [t('味', 'Taste'), t('接客', 'Service'), t('静かさ', 'Quietness'), t('席の快適さ', 'Seating'), t('内装', 'Décor'), t('価格の納得感', 'Value for money')];

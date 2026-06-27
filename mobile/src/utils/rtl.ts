const RTL_LANGUAGES = new Set(['ps', 'bsk', 'scl', 'hno', 'mvy']);

export const isRTL = (langCode: string): boolean => RTL_LANGUAGES.has(langCode);

export const getTextStyle = (langCode: string) =>
  isRTL(langCode)
    ? ({ writingDirection: 'rtl', textAlign: 'right' } as const)
    : ({ writingDirection: 'ltr', textAlign: 'left' } as const);

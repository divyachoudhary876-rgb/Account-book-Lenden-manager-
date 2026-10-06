// frontend/src/utils/bilingualEngine.js

// सामान्य अकाउंटिंग एवं व्यापारिक शीर्षकों का मानक द्विभाषी शब्दकोश
export const DICTIONARY_PAIRS = {
  // Primary & Standard Heads
  'assets': 'संपत्तियां',
  'liabilities': 'देनदारियां',
  'equity': 'पूंजी / स्वामित्व',
  'capital': 'पूंजी',
  'capital account': 'पूंजी खाता',
  'proprietor capital account': 'स्वामी पूंजी खाता',
  'drawings': 'आहरण',
  'expenses': 'खर्च',
  'income': 'आय',
  'revenue': 'राजस्व',
  'cash in hand': 'रोकड़',
  'bank accounts': 'बैंक खाते',
  'sundry debtors': 'देनदार (ग्राहक)',
  'sundry creditors': 'लेनदार (सप्लायर)',
  'discount': 'छूट',
  'discount received': 'छूट मिली',
  'discount allowed': 'छूट दी',
  'interest': 'ब्याज',
  'bank interest': 'बैंक ब्याज',
  'security deposit': 'धरोहर / सिक्योरिटी',
  'mining security': 'माइनिंग सिक्योरिटी',

  // Bhatta & Manufacturing Specifics
  'coal': 'कोयला',
  'koyla': 'कोयला',
  'soil': 'मिट्टी',
  'mitti': 'मिट्टी',
  'turi': 'तूड़ी',
  'husk': 'तूड़ी / भूसा',
  'diesel': 'डीजल',
  'pathai': 'पथाई',
  'bharai': 'भराई',
  'pakai': 'पकाई',
  'nikasi': 'निकासी',
  'tractor': 'ट्रैक्टर',
  'jhughi': 'झोपड़ी',
  'chimney': 'चिमनी',
  'labor': 'मजदूरी',
  'wages': 'मजदूरी',
  'worker': 'वर्कर',
  'thekedar': 'ठेकेदार',
  'driver': 'ड्राइवर',
  'munim': 'मुनीम',
  'cement': 'सीमेंट',
  'steel': 'सरिया / स्टील',
  'freight': 'भाड़ा',
  'bhada': 'भाड़ा',
  'rent': 'किराया'
};

const DEV_TO_ROMAN = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'े': 'e', 'ै': 'ai',
  'ो': 'o', 'ौ': 'au', 'ं': 'n', '्': ''
};

const ROMAN_CONSONANTS = {
  'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ',
  'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ',
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'ध', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 's': 'स', 'h': 'ह'
};

export const isDevanagari = (str) => /[\u0900-\u097F]/.test(str);

/**
 * अंग्रेजी अथवा हिंग्लिश शब्द को देवनागरी में लिप्यंतरित करता है
 */
export const transliterateEnglishToHindi = (text = '') => {
  if (!text) return '';
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // प्रत्यक्ष शब्दकोश परीक्षण
  if (DICTIONARY_PAIRS[lower]) {
    return DICTIONARY_PAIRS[lower];
  }

  // शब्दों के आधार पर आंशिक प्रतिस्थापन
  const words = clean.split(/\s+/);
  const convertedWords = words.map(w => {
    const lw = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (DICTIONARY_PAIRS[lw]) return DICTIONARY_PAIRS[lw];

    // फोनेटिक मिलान
    let res = '';
    let i = 0;
    while (i < lw.length) {
      if (i + 2 <= lw.length && ROMAN_CONSONANTS[lw.substring(i, i + 2)]) {
        res += ROMAN_CONSONANTS[lw.substring(i, i + 2)];
        i += 2;
      } else if (ROMAN_CONSONANTS[lw[i]]) {
        res += ROMAN_CONSONANTS[lw[i]];
        i += 1;
      } else if (lw[i] === 'a') {
        if (res.length > 0) res += 'ा';
        i += 1;
      } else if (lw[i] === 'i') {
        res += 'ि';
        i += 1;
      } else if (lw[i] === 'e') {
        res += 'े';
        i += 1;
      } else if (lw[i] === 'o') {
        res += 'ो';
        i += 1;
      } else if (lw[i] === 'u') {
        res += 'ु';
        i += 1;
      } else {
        res += lw[i];
        i += 1;
      }
    }
    return res || w;
  });

  return convertedWords.join(' ');
};

/**
 * देवनागरी को रोमन/अंग्रेजी में लिप्यंतरित करता है
 */
export const transliterateHindiToEnglish = (text = '') => {
  if (!text) return '';
  const clean = text.trim();

  // विपरीत शब्दकोश मिलान
  for (const [en, hi] of Object.entries(DICTIONARY_PAIRS)) {
    if (clean === hi) {
      return en.charAt(0).toUpperCase() + en.slice(1);
    }
  }

  let res = '';
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    res += DEV_TO_ROMAN[char] || char;
  }

  return res.charAt(0).toUpperCase() + res.slice(1);
};

/**
 * मुख्य बाइलिंगुअल फ़ॉर्मेटर: किसी भी इनपुट से "English (हिन्दी)" फ़ॉर्मेट बनाता है
 */
export const makeBilingualName = (rawInput = '', existingHi = '') => {
  if (!rawInput) return { primary: '', secondary: '', display: '' };
  const str = rawInput.trim();

  // यदि पहले से ही "Name (नाम)" प्रारूप में मौजूद है
  const bracketMatch = str.match(/^(.+?)\s*\(([\u0900-\u097F\s]+)\)$/);
  if (bracketMatch) {
    const en = bracketMatch[1].trim();
    const hi = bracketMatch[2].trim();
    return {
      primary: en,
      secondary: hi,
      display: `${en} (${hi})`
    };
  }

  let enName = '';
  let hiName = existingHi ? existingHi.trim() : '';

  if (isDevanagari(str)) {
    hiName = str;
    enName = transliterateHindiToEnglish(str);
  } else {
    enName = str;
    if (!hiName) {
      hiName = transliterateEnglishToHindi(str);
    }
  }

  const display = hiName ? `${enName} (${hiName})` : enName;
  return {
    primary: enName,
    secondary: hiName,
    display: display
  };
};

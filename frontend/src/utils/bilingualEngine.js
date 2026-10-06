// frontend/src/utils/bilingualEngine.js

export const DICTIONARY_PAIRS = {
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
  't': 'त', 'th': 'थ', 'd': 'द', 'dh': 'dh', 'n': 'न',
  'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
  'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
  'sh': 'श', 's': 'स', 'h': 'ह'
};

export const isDevanagari = (str) => /[\u0900-\u097F]/.test(str);

export const transliterateEnglishToHindi = (text = '') => {
  if (!text) return '';
  const clean = text.trim();
  const lower = clean.toLowerCase();

  if (DICTIONARY_PAIRS[lower]) {
    return DICTIONARY_PAIRS[lower];
  }

  const words = clean.split(/\s+/);
  const convertedWords = words.map(w => {
    const lw = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (DICTIONARY_PAIRS[lw]) return DICTIONARY_PAIRS[lw];

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

export const transliterateHindiToEnglish = (text = '') => {
  if (!text) return '';
  const clean = text.trim();

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
 * किसी भी नेस्टेड, करप्टेड अथवा लूप हुए ब्रैकेट को साफ़ कर ओरिजिनल नाम निकालता है
 */
export const stripNestedBrackets = (raw = '') => {
  if (!raw) return '';
  let str = String(raw).trim();
  
  // सभी प्रकार के नेस्टेड और लूप हुए ब्रैकेट्स को पूरी तरह साफ़ करें
  while (/\([^()]*\)/.test(str)) {
    str = str.replace(/\([^()]*\)/g, '').trim();
  }
  // बचे हुए खुले ब्रैकेट्स को हटाएं
  str = str.replace(/[()[\]{}]/g, '').replace(/\s{2,}/g, ' ').trim();
  return str;
};

/**
 * 100% Idempotent बाइलिंगुअल फ़ॉर्मेटर (कभी भी नाम को बार-बार रिपीट नहीं करेगा)
 */
export const makeBilingualName = (rawInput = '', existingHi = '') => {
  if (!rawInput) return { primary: '', secondary: '', display: '' };
  
  // 1. सबसे पहले अगर स्ट्रिंग में पहले से कोई ब्रैकेट या नेस्टेड ब्रैकेट है, तो क्लीन नाम निकालें
  const cleanBase = stripNestedBrackets(rawInput);
  const targetStr = cleanBase || String(rawInput).trim();

  let enName = '';
  let hiName = existingHi ? stripNestedBrackets(existingHi) : '';

  if (isDevanagari(targetStr)) {
    hiName = targetStr;
    enName = transliterateHindiToEnglish(targetStr);
  } else {
    enName = targetStr;
    if (!hiName) {
      hiName = transliterateEnglishToHindi(targetStr);
    }
  }

  // यदि दोनों नाम समान बन रहे हों तो ब्रैकेट न जोड़ें
  const display = (hiName && hiName.toLowerCase() !== enName.toLowerCase())
    ? `${enName} (${hiName})`
    : enName;

  return {
    primary: enName,
    secondary: hiName,
    display: display
  };
};

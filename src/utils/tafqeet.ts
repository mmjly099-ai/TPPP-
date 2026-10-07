/**
 * TOP STORE - Tafqeet Utility (Number to Arabic Words)
 * تحويل الأرقام إلى كلمات عربية بالريال اليمني للمستندات والفواتير وسندات القبض
 */

const ones = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر'
];

const tens = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون'
];

const hundreds = [
  '',
  'مائة',
  'مئتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة'
];

function convertGroup(num: number): string {
  let res = '';
  const h = Math.floor(num / 100);
  const rem = num % 100;

  if (h > 0) {
    res += hundreds[h];
  }

  if (rem > 0) {
    if (res !== '') res += ' و';
    if (rem < 20) {
      res += ones[rem];
    } else {
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      if (o > 0) {
        res += ones[o] + ' و' + tens[t];
      } else {
        res += tens[t];
      }
    }
  }

  return res;
}

export function tafqeet(amount: number | string, currency: string = 'ريال يمني'): string {
  const num = Math.floor(Math.abs(parseFloat(String(amount || 0))));
  if (isNaN(num) || num === 0) {
    return `صفر ${currency} فقط لا غير`;
  }

  const parts: string[] = [];

  // Billions
  const billions = Math.floor(num / 1000000000);
  let remainder = num % 1000000000;

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(`${convertGroup(billions)} مليارات`);
    else parts.push(`${convertGroup(billions)} مليار`);
  }

  // Millions
  const millions = Math.floor(remainder / 1000000);
  remainder = remainder % 1000000;

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
    else parts.push(`${convertGroup(millions)} مليون`);
  }

  // Thousands
  const thousands = Math.floor(remainder / 1000);
  const onesTens = remainder % 1000;

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
    else parts.push(`${convertGroup(thousands)} ألف`);
  }

  if (onesTens > 0) {
    parts.push(convertGroup(onesTens));
  }

  const result = parts.join(' و');
  return `فقط ${result} ${currency} لا غير`;
}

export const numberToArabicWords = tafqeet;

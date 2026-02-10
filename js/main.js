const SAFE_DELAY_MS = 50;
const MAX_BILL = 9999999.99;
const MAX_PERCENT = 100.00;
const MAX_PEOPLE = 999;
const LOCALE = 'en-US';
const CUSTOM_TIP_RADIO_VALUE = 'custom';

/* Tip selector logic */

const customTipBtn = document.querySelector('.tip-selector__custom');
const customTipRadio = customTipBtn.querySelector('.tip-selector__radio');
const customTipField = document.getElementById('custom-tip');
const fixedTipRadios = document.querySelectorAll('.tip-selector__grid > .tip-selector__radio');

function clearTipSelection() {
  customTipRadio.querySelector('input').checked = false;
  fixedTipRadios.forEach(r => r.querySelector('input').checked = false);
}

customTipRadio.addEventListener('change', (e) => {
  if (e.target.checked) {
    setTimeout(() => {
      customTipField.focus();
      updateTip();
    }, SAFE_DELAY_MS);
  }
});

fixedTipRadios.forEach(el => {
  el.addEventListener('change', (e) => {
    if (e.target.checked) {
      updateTip();
    }
  });
});

setupDecimalInput(customTipField, {
  locale: LOCALE,
  min: 0,
  max: MAX_PERCENT,
  decimals: 2,
  suffix: '%',
  trimTrailingZeros: true,
  onChange: updateTip,
  onBlur: (value) => {
    if (!value) clearTipSelection();
  }
});

/* Field input logic */

const billInput = document.getElementById('bill');
const peopleInput = document.getElementById('people');

setupDecimalInput(billInput, {
  locale: LOCALE,
  min: 0,
  max: MAX_BILL,
  decimals: 2,
  onChange: updateTip
});

setupDecimalInput(peopleInput, {
  locale: LOCALE,
  min: 0,
  max: MAX_PEOPLE,
  decimals: 0,
  trimTrailingZeros: true,
  onChange: updateTip
});

/* Tip calculation logic */

function calculateTip() {
  const bill = getNumericValue(billInput.value);
  const tipPercent = getTipPercent();
  const people = getNumericValue(peopleInput.value);

  if (!bill || !tipPercent || !people) {
    return { tipPerPerson: 0, totalPerPerson: 0 };
  }

  const billCents = Math.round(bill * 100);

  const tipCents = Math.round(billCents * tipPercent / 100);
  const totalCents = billCents + tipCents;

  const tipPerPerson = Math.round(tipCents / people) / 100;
  const totalPerPerson = Math.round(totalCents / people) / 100;

  return { tipPerPerson, totalPerPerson };
}

const tipPerPerson = document.getElementById('tip-per-person');
const totalPerPerson = document.getElementById('total-per-person');
const moneyFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function updateTip() {
  const { tipPerPerson: tipPP, totalPerPerson: totalPP } = calculateTip();
  tipPerPerson.value = `$${moneyFormat.format(tipPP)}`;
  totalPerPerson.value = `$${moneyFormat.format(totalPP)}`;
}


function getTipPercent() {
  const value = document.querySelector('input[name="tip"]:checked')?.value;
  if (value === CUSTOM_TIP_RADIO_VALUE) {
    return getNumericValue(customTipField.value, '%');
  }
  return Number(value);
}

/* Utility function */

function setupDecimalInput(input, {
  locale = navigator.language,
  min = -Infinity,
  max = Infinity,
  decimals = 2,
  trimTrailingZeros = false,
  suffix = '',
  onChange = null,
  onBlur = null
} = {}) {
  const decimalSep = getNumberSeparators(locale).decimalSep;

  function clamp(num) {
    if (num < min) return min;
    if (num > max) return max;
    return num;
  }

  function normalize(value) {
    value = value.replace(suffix, '');
    value = value.replace(/[.,]/g, decimalSep);

    const regex = new RegExp(`[^0-9${decimalSep}]`, 'g');
    value = value.replace(regex, '');

    const parts = value.split(decimalSep);
    if (parts.length > 2) {
      value = parts[0] + decimalSep + parts.slice(1).join('');
    }

    const [intPart, decPart] = value.split(decimalSep);
    if (decPart !== undefined) {
      value = intPart + decimalSep + decPart.slice(0, decimals);
    }

    const hasDecimal = value.includes(decimalSep);
    if (!hasDecimal) {
      const numeric = parseFloat(value);
      if (!isNaN(numeric)) {
        const clamped = clamp(numeric);
        if (clamped !== numeric) {
          value = String(clamped);
        }
      }
    }

    return value;
  }

  function format() {
    num = getNumericValue(input.value, suffix, locale)
    if (num == null) return;
    num = clamp(num);

    let formatted;

    if (trimTrailingZeros) {
      formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
      }).format(num);
    } else {
      formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num);
    }

    input.value = formatted + suffix;
  }

  function removeFormat() {
    input.value = input.value
      .replace(suffix, '')
      .replace(decimalSep, '.')
      .replace(/[^\d.]/g, '');
  }


  function trigger(fn) {
    if (typeof fn === 'function') {
      fn(input.value, input);
    }
  }

  input.addEventListener('input', () => {
    input.value = normalize(input.value);
    trigger(onChange);
  });

  input.addEventListener('blur', () => {
    format();
    trigger(onBlur);
  });

  input.addEventListener('focus', removeFormat);
}

function getNumericValue(value, suffix, locale = LOCALE) {
  if (!value) return null;

  value = value.replace(suffix, '');
  value = value.trim();

  const { groupSep, decimalSep } = getNumberSeparators(locale);

  const groupRegex = new RegExp(`\\${groupSep}`, 'g');
  value = value.replace(groupRegex, '');

  const decimalRegex = new RegExp(`\\${decimalSep}`, 'g');
  value = value.replace(decimalRegex, '.');

  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function getNumberSeparators(locale = LOCALE) {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5);

  const groupSep = parts.find(p => p.type === 'group')?.value || '';
  const decimalSep = parts.find(p => p.type === 'decimal')?.value || '.';

  return { groupSep, decimalSep };
}
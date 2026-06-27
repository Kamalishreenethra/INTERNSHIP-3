/**
 * GAMING RGB CALCULATOR — script.js
 * Pure Vanilla JavaScript calculator logic
 * Supports: +, −, ×, ÷, %, decimal, clear, delete, keyboard
 */

/* ── DOM References ─────────────────────────────────────── */
const expressionEl = document.getElementById('expression');
const resultEl     = document.getElementById('result');

/* ── Calculator State ───────────────────────────────────── */
const state = {
  current:    '0',   // number currently being entered / displayed
  expression: '',    // full expression string shown at top
  operator:   null,  // pending operator ('+', '−', '×', '÷')
  previous:   null,  // left-hand operand (stored as string)
  waitingForNext: false, // true right after an operator is pressed
  justEvaluated:  false, // true after '=' so next digit starts fresh
};

/* ── Helpers ─────────────────────────────────────────────── */

/** Update both display elements */
function updateDisplay(result, expression) {
  resultEl.textContent     = result     !== undefined ? result     : state.current;
  expressionEl.textContent = expression !== undefined ? expression : state.expression;
}

/** Trigger the flash animation on the result display */
function flashResult() {
  resultEl.classList.remove('flash', 'error');
  // Force reflow so the class is removed before re-adding
  void resultEl.offsetWidth;
  resultEl.classList.add('flash');
}

/** Show an error state */
function showError(msg = 'Error') {
  state.current = msg;
  state.expression = '';
  state.operator = null;
  state.previous = null;
  state.waitingForNext = false;
  state.justEvaluated = false;

  resultEl.classList.remove('flash', 'error');
  void resultEl.offsetWidth;
  resultEl.classList.add('error');
  updateDisplay(msg, '');
}

/**
 * Format a number for display — limits length, removes unnecessary
 * trailing zeros after a decimal, and handles exponential.
 */
function formatNumber(num) {
  if (isNaN(num) || !isFinite(num)) return 'Error';

  // If the number needs exponential form
  if (Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-7 && num !== 0)) {
    return parseFloat(num.toPrecision(8)).toExponential();
  }

  // Otherwise format to max 10 significant digits
  let str = parseFloat(num.toPrecision(10)).toString();
  return str;
}

/** Convert display operator symbol to JS operator */
function toJsOp(op) {
  if (op === '×') return '*';
  if (op === '÷') return '/';
  if (op === '−') return '-';
  return op; // '+' stays as-is
}

/** Evaluate left OP right and return the numeric result */
function calculate(left, op, right) {
  const l = parseFloat(left);
  const r = parseFloat(right);

  if (isNaN(l) || isNaN(r)) return NaN;

  switch (op) {
    case '+': return l + r;
    case '−': return l - r;
    case '×': return l * r;
    case '÷':
      if (r === 0) return null; // divide-by-zero sentinel
      return l / r;
    default:  return NaN;
  }
}

/* ── Action Handlers ─────────────────────────────────────── */

/** Digit or zero pressed */
function handleDigit(value) {
  // After '=' a new digit starts a fresh entry
  if (state.justEvaluated) {
    state.expression   = '';
    state.previous     = null;
    state.operator     = null;
    state.justEvaluated = false;
    state.current      = value === '0' ? '0' : value;
    updateDisplay();
    return;
  }

  if (state.waitingForNext) {
    // Start a new operand after an operator was pressed
    state.current       = value === '0' ? '0' : value;
    state.waitingForNext = false;
  } else {
    // Append to current number, prevent leading zeros
    if (state.current === '0' && value !== '.') {
      state.current = value;
    } else {
      // Limit input length
      if (state.current.replace('-', '').replace('.', '').length >= 12) return;
      state.current += value;
    }
  }

  updateDisplay();
}

/** Decimal point pressed */
function handleDecimal() {
  if (state.justEvaluated) {
    state.expression   = '';
    state.previous     = null;
    state.operator     = null;
    state.justEvaluated = false;
    state.current      = '0.';
    updateDisplay();
    return;
  }

  if (state.waitingForNext) {
    state.current       = '0.';
    state.waitingForNext = false;
    updateDisplay();
    return;
  }

  // Only add a decimal point if there isn't one already
  if (!state.current.includes('.')) {
    state.current += '.';
    updateDisplay();
  }
}

/** Operator (+, −, ×, ÷) pressed */
function handleOperator(op) {
  // If we already have an operator pending and user pressed another
  // operator (chaining), evaluate current chain first
  if (state.operator && !state.waitingForNext) {
    const result = calculate(state.previous, state.operator, state.current);
    if (result === null) { showError('÷ by 0'); return; }
    if (isNaN(result))   { showError('Error');  return; }

    const formatted = formatNumber(result);
    state.previous  = formatted;
    state.current   = formatted;
    state.expression = `${formatted} ${op}`;
    flashResult();
  } else {
    state.previous   = state.current;
    state.expression = `${state.current} ${op}`;
  }

  state.operator      = op;
  state.waitingForNext = true;
  state.justEvaluated  = false;
  updateDisplay(state.current, state.expression);
}

/** Equals pressed */
function handleEquals() {
  if (!state.operator || !state.previous) return;

  const left   = state.previous;
  const right  = state.current;
  const fullExpr = `${left} ${state.operator} ${right} =`;

  const result = calculate(left, state.operator, right);

  if (result === null) { showError('÷ by 0'); return; }
  if (isNaN(result))   { showError('Error');  return; }

  const formatted = formatNumber(result);

  state.expression    = fullExpr;
  state.current       = formatted;
  state.previous      = null;
  state.operator      = null;
  state.waitingForNext = false;
  state.justEvaluated  = true;

  flashResult();
  updateDisplay(formatted, fullExpr);
}

/** All Clear */
function handleClear() {
  state.current       = '0';
  state.expression    = '';
  state.operator      = null;
  state.previous      = null;
  state.waitingForNext = false;
  state.justEvaluated  = false;

  resultEl.classList.remove('flash', 'error');
  updateDisplay('0', '');
}

/** Delete last character */
function handleDelete() {
  if (state.justEvaluated || state.waitingForNext) {
    handleClear();
    return;
  }

  if (state.current.length <= 1 || state.current === '0') {
    state.current = '0';
  } else {
    state.current = state.current.slice(0, -1);
    // Avoid leaving just a minus sign
    if (state.current === '-') state.current = '0';
  }

  updateDisplay();
}

/** Percentage — convert current value to percentage of previous if available */
function handlePercent() {
  const val = parseFloat(state.current);
  if (isNaN(val)) return;

  let result;
  if (state.operator && state.previous !== null) {
    // e.g. 200 + 15% → 200 + 30
    result = (parseFloat(state.previous) * val) / 100;
  } else {
    result = val / 100;
  }

  state.current = formatNumber(result);
  state.justEvaluated = false;
  updateDisplay();
}

/* ── Ripple Effect ───────────────────────────────────────── */
function createRipple(btn, event) {
  const rect   = btn.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height);
  const x      = (event.clientX || rect.left + rect.width  / 2) - rect.left - size / 2;
  const y      = (event.clientY || rect.top  + rect.height / 2) - rect.top  - size / 2;

  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;

  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

/* ── Button Click Handler ────────────────────────────────── */
function handleButtonClick(btn, event) {
  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  // Press animation
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 150);

  // Ripple
  createRipple(btn, event);

  switch (action) {
    case 'digit':    handleDigit(value);    break;
    case 'decimal':  handleDecimal();       break;
    case 'operator': handleOperator(value); break;
    case 'equals':   handleEquals();        break;
    case 'clear':    handleClear();         break;
    case 'delete':   handleDelete();        break;
    case 'percent':  handlePercent();       break;
  }
}

/* ── Keyboard Support ────────────────────────────────────── */
function handleKeyDown(e) {
  const key = e.key;

  // Map keys to button data-action & data-value
  const keyMap = {
    '0': () => handleDigit('0'),
    '1': () => handleDigit('1'),
    '2': () => handleDigit('2'),
    '3': () => handleDigit('3'),
    '4': () => handleDigit('4'),
    '5': () => handleDigit('5'),
    '6': () => handleDigit('6'),
    '7': () => handleDigit('7'),
    '8': () => handleDigit('8'),
    '9': () => handleDigit('9'),
    '.': () => handleDecimal(),
    ',': () => handleDecimal(),
    '+': () => handleOperator('+'),
    '-': () => handleOperator('−'),
    '*': () => handleOperator('×'),
    '/': () => { e.preventDefault(); handleOperator('÷'); },
    'Enter': () => handleEquals(),
    '=': () => handleEquals(),
    'Escape': () => handleClear(),
    'Backspace': () => handleDelete(),
    '%': () => handlePercent(),
  };

  const fn = keyMap[key];
  if (fn) {
    fn();
    // Visually flash the matching button
    highlightKeyButton(key);
  }
}

/** Briefly highlight the button matching a keyboard key */
function highlightKeyButton(key) {
  const opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const sym   = opMap[key] || key;

  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    const action = btn.dataset.action;
    const value  = btn.dataset.value;

    let match = false;
    if ('0123456789'.includes(sym) && action === 'digit'    && value === sym)  match = true;
    if (sym === '.'    && action === 'decimal')  match = true;
    if (['÷','×','−','+'].includes(sym) && action === 'operator' && value === sym) match = true;
    if ((key === 'Enter' || key === '=') && action === 'equals')  match = true;
    if (key === 'Escape'     && action === 'clear')   match = true;
    if (key === 'Backspace'  && action === 'delete')  match = true;
    if (key === '%'          && action === 'percent') match = true;

    if (match) {
      btn.classList.add('pressed');
      createRipple(btn, {});
      setTimeout(() => btn.classList.remove('pressed'), 150);
    }
  });
}

/* ── Event Listeners ─────────────────────────────────────── */

// Delegate all button clicks to the grid
document.querySelector('.btn-grid').addEventListener('click', function(e) {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  handleButtonClick(btn, e);
});

// Keyboard input
document.addEventListener('keydown', handleKeyDown);

/* ── Init ────────────────────────────────────────────────── */
updateDisplay('0', '');
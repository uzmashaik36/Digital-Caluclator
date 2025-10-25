// DOM
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const keys = document.querySelectorAll('.btn');
const openHistoryBtn = document.getElementById('openHistory');
const historyModal = document.getElementById('historyModal');
const closeHistory = document.getElementById('closeHistory');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const toggleScientificBtn = document.getElementById('toggleScientific');
const scientificPanel = document.getElementById('scientificPanel');

let expression = '';
let result = null;
let history = [];

// Utilities
const isOperator = (ch) => ['+','-','×','÷','%','*','/','^'].includes(ch);

// Render
function updateDisplay(){
  expressionEl.textContent = expression === '' ? '0' : expression;
  resultEl.textContent = result === null ? '0' : result;
}

// Append value (works for numbers, symbols, functions like sin(, √(, etc.)
function appendValue(val){
  const last = expression.slice(-1);

  // If val starts with letter or function token (e.g., 'sin(') just append
  if(/^[a-zπ√]/i.test(val) || val.includes('(')) {
    // prevent invalid operator collision like "5sin(" -> add * implicitly
    if( /\d$/.test(last) ) expression += '*';
    expression += val;
    updateDisplay();
    return;
  }

  // handle decimal
  if(val === '.'){
    // find last operator to detect current number
    const lastOp = Math.max(
      expression.lastIndexOf('+'),
      expression.lastIndexOf('-'),
      expression.lastIndexOf('×'),
      expression.lastIndexOf('÷'),
      expression.lastIndexOf('*'),
      expression.lastIndexOf('/')
    );
    const currentNumber = expression.slice(lastOp + 1);
    if(currentNumber.includes('.')) return;
    if(currentNumber === '' || isOperator(last)) expression += '0';
  }

  // operators handling
  if(isOperator(val)){
    if(expression === '' && val !== '-') return; // only allow negative start
    if(isOperator(last)) {
      // replace last operator (except allow: ... * - for negative)
      if(!(val === '-' && last !== '-')){
        expression = expression.slice(0, -1) + val;
        updateDisplay();
        return;
      }
    }
  }

  expression += val;
  updateDisplay();
}

function allClear(){
  expression = '';
  result = null;
  updateDisplay();
}

function backspace(){
  if(expression.length === 0) return;
  expression = expression.slice(0, -1);
  updateDisplay();
}

// Prepare expression for evaluation by converting tokens to JS Math
function prepareForEval(expr){
  // Replace symbols
  let s = expr.replace(/×/g, '*').replace(/÷/g, '/');

  // Percent -> divide by 100
  s = s.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  // Replace pi and e
  s = s.replace(/π/g, 'Math.PI');
  s = s.replace(/\be\b/g, 'Math.E');

  // Replace sqrt symbol
  s = s.replace(/√\(/g, 'Math.sqrt(');

  // Replace trigonometric and inverse trigonometric functions
  s = s.replace(/\bsin\(/gi, 'Math.sin(');
  s = s.replace(/\bcos\(/gi, 'Math.cos(');
  s = s.replace(/\btan\(/gi, 'Math.tan(');
  s = s.replace(/\basin\(/gi, 'Math.asin(');
  s = s.replace(/\bacos\(/gi, 'Math.acos(');
  s = s.replace(/\batan\(/gi, 'Math.atan(');

  // ✅ Replace log( with Math.log10(
  s = s.replace(/\blog\(/gi, 'Math.log10(');

  // Replace '^' with power operator
  s = s.replace(/\^/g, '**');

  return s;
}



// Compute
function compute(){
  if(expression.trim() === '') return;
  try {
    let prepared = prepareForEval(expression);

    // Provide Math.log10 polyfill fallback if needed:
    if(!Math.log10){
      // create a wrapper function name to use: replace Math.log10( with (Math.log($1)/Math.LN10)
      prepared = prepared.replace(/Math\.log10\(/g, '(Math.log(').replace(/\)/g, ')/Math.LN10)'); // careful: rough but works for common uses
      // Correction: simpler: add a small helper at eval time
    }

    // Evaluate using Function constructor
    // We also create helper definitions to support Math.log10 if not present
    const wrapper = `
      "use strict";
      const MathLog10 = (x) => (Math.log10 ? Math.log10(x) : Math.log(x)/Math.LN10);
      return (${prepared});
    `;
    // replace any Math.log10( with MathLog10(
    const finalCode = wrapper.replace(/Math\.log10\(/g, 'MathLog10(');

    const value = Function(finalCode)();
    const rounded = (Math.round((value + Number.EPSILON) * 1e12) / 1e12);
    result = String(rounded);
    updateDisplay();

    // push to history
    history.unshift({ expr: expression, res: result, ts: Date.now() });
    renderHistory();

    // set expression to result for chaining
    expression = result;
  } catch (e){
    result = 'Error';
    updateDisplay();
  }
}

// History modal functions
function renderHistory(){
  historyList.innerHTML = '';
  if(history.length === 0){
    historyList.innerHTML = '<div class="empty">No history yet.</div>';
    return;
  }
  history.forEach((h, idx) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `<div class="expr">${h.expr}</div><div class="res">${h.res}</div>`;
    // clicking a history item re-loads the expression
    div.addEventListener('click', () => {
      expression = h.expr;
      result = h.res;
      updateDisplay();
      closeHistoryModal();
    });
    historyList.appendChild(div);
  });
}
function openHistoryModal(){
  historyModal.classList.remove('hidden');
  historyModal.setAttribute('aria-hidden','false');
}
function closeHistoryModal(){
  historyModal.classList.add('hidden');
  historyModal.setAttribute('aria-hidden','true');
}
function clearHistory(){
  history = [];
  renderHistory();
}

// Button clicks
keys.forEach(k => {
  k.addEventListener('click', () => {
    const v = k.getAttribute('data-value');
    const action = k.getAttribute('data-action');

    if(action === 'ac') return allClear();
    if(action === 'del') return backspace();
    if(action === 'equals') return compute();

    if(v) appendValue(v);
  });
});

// Toggle scientific panel
let scientificOn = false;
toggleScientificBtn.addEventListener('click', () => {
  scientificOn = !scientificOn;
  if(scientificOn){
    scientificPanel.classList.remove('hidden');
    toggleScientificBtn.classList.add('active');
  } else {
    scientificPanel.classList.add('hidden');
    toggleScientificBtn.classList.remove('active');
  }
});

// History modal events
openHistoryBtn.addEventListener('click', openHistoryModal);
closeHistory.addEventListener('click', closeHistoryModal);
clearHistoryBtn.addEventListener('click', clearHistory);
historyModal.querySelector('.modal-backdrop').addEventListener('click', closeHistoryModal);

// Keyboard support
window.addEventListener('keydown', (e) => {
  const key = e.key;

  // numbers
  if(/\d/.test(key)) { appendValue(key); e.preventDefault(); return; }
  if(key === '.') { appendValue('.'); e.preventDefault(); return; }
  if(key === 'Enter' || key === '='){ compute(); e.preventDefault(); return; }
  if(key === 'Backspace'){ backspace(); e.preventDefault(); return; }
  if(key === 'Escape'){ allClear(); e.preventDefault(); return; }

  // basic operators
  if(key === '+') { appendValue('+'); e.preventDefault(); return; }
  if(key === '-') { appendValue('-'); e.preventDefault(); return; }
  if(key === '*') { appendValue('×'); e.preventDefault(); return; }
  if(key === '/') { appendValue('÷'); e.preventDefault(); return; }
  if(key === '%') { appendValue('%'); e.preventDefault(); return; }
  if(key === '^') { appendValue('^'); e.preventDefault(); return; }
  if(key === '(') { appendValue('('); e.preventDefault(); return; }
  if(key === ')') { appendValue(')'); e.preventDefault(); return; }

  // quick function shortcuts (lowercase)
  if(key.toLowerCase() === 's' && e.shiftKey){ /* ignore shift+s */ }
  // allow typing function names naturally: user can type sin( etc.
});

// Initial render
updateDisplay();
renderHistory();

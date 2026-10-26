'use strict';
const CODE_LENGTH = 4;    
const MAX_ATTEMPTS = 8;  
const DIGIT_MIN = 0;     
const DIGIT_MAX = 9;    

//  Page elements 
const rulesText = document.getElementById('rules');
const secretBox = document.getElementById('secret');
const dotsBox = document.getElementById('dots');
const attemptsText = document.getElementById('attempts-text');
const form = document.getElementById('guess-form');
const guessInput = document.getElementById('guess');
const guessBtn = document.getElementById('guess-btn');
const restartBtn = document.getElementById('restart-btn');
const messageBox = document.getElementById('message');
const historyList = document.getElementById('history');
const bestBox = document.getElementById('best');
const gamePanel = document.getElementById('game');

let secret = [];        
let history = [];       
let gameOver = false;
let won = false;
let message = { text: '', type: '' };  
let bestAttempts = null;               

//  Random numbers 
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function generateSecret() {
  const pool = [];
  for (let d = DIGIT_MIN; d <= DIGIT_MAX; d++) {
    pool.push(d);
  }
  const code = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = randomInt(0, pool.length - 1);
    code.push(pool.splice(index, 1)[0]);
  }
  return code;
}

//  Checking the input 
function validateGuess(text) {
  for (const ch of text) {
    const isDigit = ch >= '0' && ch <= '9';
    if (!isDigit || Number(ch) < DIGIT_MIN || Number(ch) > DIGIT_MAX) {
      return `Use only digits from ${DIGIT_MIN} to ${DIGIT_MAX}.`;
    }
  }
  if (text.length !== CODE_LENGTH) {
    return `Enter exactly ${CODE_LENGTH} digits.`;
  }
  if (new Set(text).size !== text.length) {
    return 'The digits must not repeat.';
  }
  return '';
}

// Compares a guess with the secret.
function evaluate(guess) {
  let rightPlace = 0;
  let wrongPlace = 0;
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i] === secret[i]) {
      rightPlace++;
    } else if (secret.includes(guess[i])) {
      wrongPlace++;
    }
  }
  return { rightPlace, wrongPlace };
}

//  One move 
function makeGuess(text) {
  if (gameOver) {
    return;
  }

  const error = validateGuess(text);
  if (error !== '') {
    message = { text: error, type: 'error' };
    render(true);
    return;
  }

  if (history.some((item) => item.text === text)) {
    message = { text: 'You already tried this code. Try another one.', type: 'error' };
    render(true);
    return;
  }

  const digits = text.split('').map(Number);
  const result = evaluate(digits);
  history.push({ text, rightPlace: result.rightPlace, wrongPlace: result.wrongPlace });

  const attemptsLeft = MAX_ATTEMPTS - history.length;
  if (result.rightPlace === CODE_LENGTH) {
    won = true;
    gameOver = true;
    message = { text: `You cracked the code in ${history.length} attempt(s)!`, type: 'success' };
    if (bestAttempts === null || history.length < bestAttempts) {
      bestAttempts = history.length;
    }
  } else if (attemptsLeft === 0 && !won) {
    gameOver = true;
    message = { text: 'No attempts left. You lost this time.', type: 'fail' };
  } else if (result.rightPlace === 0 && result.wrongPlace === 0) {
    message = { text: 'None of these digits is in the code.', type: 'info' };
  } else if (attemptsLeft === 1 || result.rightPlace === CODE_LENGTH - 1) {
    message = { text: attemptsLeft === 1 ? 'Last attempt!' : 'So close! Only one digit is not in place.', type: 'info' };
  } else {
    message = { text: `${attemptsLeft} attempts left.`, type: 'info' };
  }

  render(false);
}

//  New game 
function newGame() {
  secret = generateSecret();
  history = [];
  gameOver = false;
  won = false;
  message = { text: 'Good luck! Type your first guess.', type: 'info' };
  guessInput.value = '';
  render(false);
  guessInput.focus();
}

//  Drawing the page 
function render(invalidInput) {
  rulesText.textContent =
    `Guess the secret code: ${CODE_LENGTH} different digits from ${DIGIT_MIN} to ${DIGIT_MAX}. ` +
    `You have ${MAX_ATTEMPTS} attempts.`;

  secretBox.replaceChildren();
  for (let i = 0; i < CODE_LENGTH; i++) {
    const tile = document.createElement('span');
    tile.classList.add('tile');
    tile.textContent = gameOver ? String(secret[i]) : '?';
    tile.classList.toggle('is-open', gameOver);
    secretBox.append(tile);
  }

  // Attempt dots
  dotsBox.replaceChildren();
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const dot = document.createElement('span');
    dot.classList.add('dot');
    dot.classList.toggle('is-used', i < history.length);
    dotsBox.append(dot);
  }
  attemptsText.textContent = `${MAX_ATTEMPTS - history.length} of ${MAX_ATTEMPTS} left`;

  // Message under the form
  messageBox.textContent = message.text;
  messageBox.className = `message ${message.type}`;

  // History list, or an empty-state text
  historyList.replaceChildren();
  if (history.length === 0) {
    const empty = document.createElement('li');
    empty.classList.add('empty');
    empty.textContent = 'No guesses yet.';
    historyList.append(empty);
  }
  for (const item of history) {
    const row = document.createElement('li');
    row.classList.add('history-item');

    const code = document.createElement('span');
    code.classList.add('history-code');
    code.textContent = item.text;

    const right = document.createElement('span');
    right.classList.add('chip', 'chip-right');
    right.textContent = `${item.rightPlace} right place`;

    const wrong = document.createElement('span');
    wrong.classList.add('chip', 'chip-wrong');
    wrong.textContent = `${item.wrongPlace} wrong place`;

    row.append(code, right, wrong);
    historyList.append(row);
  }

  // States: win / loss on the panel, disabled controls, error on the input
  gamePanel.classList.toggle('is-won', won);
  gamePanel.classList.toggle('is-lost', gameOver && !won);
  guessInput.disabled = gameOver;
  guessBtn.disabled = gameOver;
  if (invalidInput) {
    guessInput.setAttribute('aria-invalid', 'true');
  } else {
    guessInput.removeAttribute('aria-invalid');
  }

  // Best result
  bestBox.textContent = bestAttempts === null
    ? ''
    : `Best result: ${bestAttempts} attempt(s).`;
}

//  Events 
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = guessInput.value.trim();
  makeGuess(text);
  if (message.type !== 'error') {
    guessInput.value = '';
  }
  if (!gameOver) {
    guessInput.focus();
  }
});

restartBtn.addEventListener('click', newGame);

//  Start 
if (CODE_LENGTH > DIGIT_MAX - DIGIT_MIN + 1) {
  messageBox.textContent = 'Wrong settings: the code is longer than the number of different digits.';
  messageBox.className = 'message error';
  guessInput.disabled = true;
  guessBtn.disabled = true;
} else {
  newGame();
}
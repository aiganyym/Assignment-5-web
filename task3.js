'use strict';

const TOTAL_POINTS = 20;
const SKILL_MIN = 1;
const SKILL_MAX = 10;
const BASE_HP = 50;

const SKILLS = [
  { id: 'strength', label: 'Strength' },
  { id: 'agility', label: 'Agility' },
  { id: 'magic', label: 'Magic' },
  { id: 'luck', label: 'Luck' },
];

const CLASSES = [
  { id: 'warrior', label: 'Warrior', needs: { skill: 'strength', min: 5 }, limit: { skill: 'magic', max: 3 } },
  { id: 'mage', label: 'Mage', needs: { skill: 'magic', min: 5 }, limit: { skill: 'strength', max: 3 } },
  { id: 'archer', label: 'Archer', needs: { skill: 'agility', min: 5 }, limit: { skill: 'strength', max: 4 } },
  { id: 'rogue', label: 'Rogue', needs: { skill: 'luck', min: 5 }, limit: { skill: 'magic', max: 4 } },
];

const COLORS = ['red', 'blue', 'green', 'purple'];

const takenNames = ['Arthur', 'Merlin', 'Legolas', 'Shadow', 'Luna'];

const form = document.getElementById('hero-form');
const introBox = document.getElementById('intro');
const summaryBox = document.getElementById('error-summary');
const nameInput = document.getElementById('hero-name');
const classSelect = document.getElementById('hero-class');
const classHint = document.getElementById('class-hint');
const colorRadios = Array.from(form.querySelectorAll('input[name="heroColor"]'));
const pointsBox = document.getElementById('points-left');
const previewBox = document.getElementById('preview');
const resultBox = document.getElementById('result');

const skillInputs = {};
for (const skill of SKILLS) {
  skillInputs[skill.id] = document.getElementById(`skill-${skill.id}`);
}

form.noValidate = true;

const fields = [
  { key: 'name', label: 'Name', elements: [nameInput], errorEl: document.getElementById('err-name') },
  { key: 'class', label: 'Class', elements: [classSelect], errorEl: document.getElementById('err-class') },
  { key: 'color', label: 'Color', elements: colorRadios, errorEl: document.getElementById('err-color') },
  ...SKILLS.map((skill) => ({
    key: skill.id,
    label: skill.label,
    elements: [skillInputs[skill.id]],
    errorEl: document.getElementById(`err-${skill.id}`),
  })),

  { key: 'points', label: 'Skill points', elements: [], errorEl: document.getElementById('err-points') },
];

const keyOfElement = new Map();
for (const field of fields) {
  for (const element of field.elements) {
    keyOfElement.set(element, field.key);
  }
}

let errors = {};
const touched = new Set();
let submitTried = false;

function readValues() {
  const skills = {};
  for (const skill of SKILLS) {
    const raw = skillInputs[skill.id].value;
    skills[skill.id] = raw === '' ? NaN : Number(raw);
  }
  const checked = colorRadios.find((radio) => radio.checked);
  return {
    name: nameInput.value.trim(),
    classId: classSelect.value,
    color: checked === undefined ? '' : checked.value,
    skills,
  };
}

function findClass(id) {
  return CLASSES.find((item) => item.id === id);
}

function sumOfSkills(skills) {
  let sum = 0;
  for (const skill of SKILLS) {
    if (!Number.isNaN(skills[skill.id])) {
      sum += skills[skill.id];
    }
  }
  return sum;
}

function builtInMessage(element, label) {
  const v = element.validity;
  if (v.valueMissing) {
    return `${label} is required.`;
  }
  if (v.tooShort) {
    return `${label} must have at least ${element.minLength} characters.`;
  }
  if (v.tooLong) {
    return `${label} must have at most ${element.maxLength} characters.`;
  }
  if (v.badInput) {
    return `${label} must be a number.`;
  }
  if (v.rangeUnderflow) {
    return `${label} must be at least ${element.min}.`;
  }
  if (v.rangeOverflow) {
    return `${label} must be at most ${element.max}.`;
  }
  if (v.stepMismatch) {
    return `${label} must be a whole number.`;
  }
  return '';
}

function checkName(values) {
  if (values.name === '') {
    return 'Name is required.';
  }
  const built = builtInMessage(nameInput, 'Name');
  if (built !== '') {
    return built;
  }

  if (!/^[\p{L}][\p{L} '-]*$/u.test(values.name)) {
    return 'Use letters only (spaces and hyphens are allowed).';
  }

  const isTaken = takenNames.some((name) => name.toLowerCase() === values.name.toLowerCase());
  if (isTaken) {
    return `The name "${values.name}" is already taken. Try another.`;
  }
  return '';
}

function checkClass(values) {
  if (values.classId === '' || findClass(values.classId) === undefined) {
    return 'Choose a class.';
  }
  return '';
}

function checkColor(values) {
  if (values.color === '' || !COLORS.includes(values.color)) {
    return 'Choose a color.';
  }
  return '';
}

function checkSkill(skill, values) {
  const element = skillInputs[skill.id];
  const built = builtInMessage(element, skill.label);
  if (built !== '') {
    return built;
  }
  const value = values.skills[skill.id];
  const hero = findClass(values.classId);
  if (hero !== undefined) {

    if (hero.needs.skill === skill.id && value < hero.needs.min) {
      return `A ${hero.label} needs ${skill.label} ${hero.needs.min} or more.`;
    }

    if (hero.limit.skill === skill.id && value > hero.limit.max) {
      return `A ${hero.label} can have ${skill.label} ${hero.limit.max} at most.`;
    }
  }
  return '';
}

function checkPoints(values) {
  const sum = sumOfSkills(values.skills);
  const left = TOTAL_POINTS - sum;
  if (left > 0) {
    return `${left} point(s) left. Use all ${TOTAL_POINTS} points.`;
  }
  if (left < 0) {
    return `You used ${-left} point(s) too many. The total must be ${TOTAL_POINTS}.`;
  }
  return '';
}

function validateAll() {
  const values = readValues();
  const result = {
    name: checkName(values),
    class: checkClass(values),
    color: checkColor(values),
    points: checkPoints(values),
  };
  for (const skill of SKILLS) {
    result[skill.id] = checkSkill(skill, values);
  }
  return result;
}

function showErrors() {
  for (const field of fields) {
    const isTouched = touched.has(field.key);
    const message = isTouched ? errors[field.key] : '';
    field.errorEl.textContent = message;

    const isSkill = SKILLS.some((skill) => skill.id === field.key);
    const pointsBroken = isSkill && touched.has('points') && errors.points !== '';
    const invalid = message !== '' || pointsBroken;

    const wrapper = field.elements.length > 0 ? field.elements[0].closest('.field, .skill-field') : null;
    for (const element of field.elements) {
      if (!isTouched && !pointsBroken) {
        element.removeAttribute('aria-invalid');
      } else {
        element.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      }
    }
    if (wrapper !== null) {
      wrapper.classList.toggle('has-error', invalid);
      wrapper.classList.toggle('is-valid', isTouched && !invalid);
    }
  }

  const skillsField = document.getElementById('skills-field');
  skillsField.classList.toggle('has-error', touched.has('points') && errors.points !== '');

  updateSummary();
}

function updateSummary() {
  const count = fields.filter((field) => errors[field.key] !== '').length;
  if (submitTried && count > 0) {
    summaryBox.textContent = `${count} error(s) found. Please fix the marked fields.`;
    summaryBox.hidden = false;
  } else {
    summaryBox.hidden = true;
    summaryBox.textContent = '';
  }
}

function buildCard(hero, isFinal) {
  const card = document.createElement('article');
  card.classList.add('hero-card');
  card.classList.add(hero.color === '' ? 'color-none' : `color-${hero.color}`);
  card.classList.toggle('is-final', isFinal);

  const title = document.createElement('h3');
  title.classList.add('hero-name');
  title.textContent = hero.name === '' ? 'Unnamed hero' : hero.name;

  const role = document.createElement('p');
  role.classList.add('hero-class');
  const hasClass = findClass(hero.classId);
  role.textContent = hasClass === undefined ? 'No class yet' : hasClass.label;

  card.append(title, role);

  for (const skill of SKILLS) {
    const value = hero.skills[skill.id];
    const row = document.createElement('div');
    row.classList.add('skill-line');

    const name = document.createElement('span');
    name.classList.add('skill-name');
    name.textContent = skill.label;

    const pips = document.createElement('span');
    pips.classList.add('pips');
    for (let i = 1; i <= SKILL_MAX; i++) {
      const pip = document.createElement('span');
      pip.classList.add('pip');
      pip.classList.toggle('is-filled', i <= value);
      pips.append(pip);
    }

    const number = document.createElement('span');
    number.classList.add('skill-value');
    number.textContent = Number.isNaN(value) ? '–' : String(value);

    row.append(name, pips, number);
    card.append(row);
  }

  const strength = Number.isNaN(hero.skills.strength) ? 0 : hero.skills.strength;
  const magic = Number.isNaN(hero.skills.magic) ? 0 : hero.skills.magic;
  const luck = Number.isNaN(hero.skills.luck) ? 0 : hero.skills.luck;
  const stats = document.createElement('p');
  stats.classList.add('hero-stats');
  stats.textContent =
    `HP ${BASE_HP + strength * 10} · Mana ${magic * 10} · Crit ${luck * 3}%`;
  card.append(stats);

  return card;
}

function renderPreview() {
  previewBox.replaceChildren(buildCard(readValues(), false));
}

function renderPoints() {
  const values = readValues();
  const left = TOTAL_POINTS - sumOfSkills(values.skills);
  pointsBox.textContent = `Points left: ${left} of ${TOTAL_POINTS}`;
  pointsBox.classList.toggle('is-done', left === 0);
  pointsBox.classList.toggle('is-over', left < 0);

  const hero = findClass(values.classId);
  if (hero === undefined) {
    classHint.textContent = '';
  } else {
    const needSkill = SKILLS.find((skill) => skill.id === hero.needs.skill).label;
    const limitSkill = SKILLS.find((skill) => skill.id === hero.limit.skill).label;
    classHint.textContent =
      `${hero.label}: ${needSkill} ${hero.needs.min} or more, ${limitSkill} ${hero.limit.max} or less.`;
  }
}

function refresh() {
  errors = validateAll();
  renderPoints();
  renderPreview();
  showErrors();
}

form.addEventListener('focusout', (event) => {
  const key = keyOfElement.get(event.target);
  if (key === undefined) {
    return;
  }
  touched.add(key);
  if (SKILLS.some((skill) => skill.id === key)) {
    touched.add('points');
  }
  refresh();
});

form.addEventListener('input', (event) => {
  if (event.target.type === 'radio') {
    touched.add('color');
  }
  refresh();
});

form.addEventListener('change', (event) => {
  const key = keyOfElement.get(event.target);
  if (key === 'class' || key === 'color') {
    touched.add(key);
  }
  refresh();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitTried = true;
  for (const field of fields) {
    touched.add(field.key);
  }
  refresh();

  const firstWrong = fields.find((field) => errors[field.key] !== '');
  if (firstWrong !== undefined) {

    const target = firstWrong.elements.length > 0 ? firstWrong.elements[0] : skillInputs[SKILLS[0].id];
    target.focus();
    return;
  }

  const hero = readValues();
  resultBox.replaceChildren(buildCard(hero, true));
  const note = document.createElement('p');
  note.classList.add('message', 'success');
  note.textContent = `Hero "${hero.name}" is created.`;
  resultBox.append(note);
  takenNames.push(hero.name);

  form.reset();
  resetState();
  resultBox.focus();
});

form.addEventListener('reset', () => {

  window.setTimeout(resetState, 0);
});

function resetState() {
  touched.clear();
  submitTried = false;
  refresh();
}

introBox.textContent =
  `Spend exactly ${TOTAL_POINTS} points on four skills (each from ${SKILL_MIN} to ${SKILL_MAX}). ` +
  'Every class has one skill it needs and one skill it cannot have too high.';

for (const hero of CLASSES) {
  const option = document.createElement('option');
  option.value = hero.id;
  option.textContent = hero.label;
  classSelect.append(option);
}

refresh();
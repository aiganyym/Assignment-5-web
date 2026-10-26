'use strict';

const ROWS = 8;
const COLS = 10;
const MAX_SEATS = 6;
const CURRENCY = '₸';

const ZONES = [
  { id: 'standard', name: 'Standard', fromRow: 1, toRow: 2, price: 2000 },
  { id: 'comfort', name: 'Comfort', fromRow: 3, toRow: 6, price: 3500 },
  { id: 'vip', name: 'VIP', fromRow: 7, toRow: 8, price: 5000 },
];

const TAKEN_IDS = [
  'R1-4', 'R1-5', 'R2-6', 'R3-2', 'R3-3', 'R4-5', 'R4-6', 'R4-7',
  'R5-4', 'R5-5', 'R5-6', 'R6-5', 'R6-6', 'R7-1', 'R7-2', 'R8-9', 'R8-10',
];

const introBox = document.getElementById('intro');
const hallBox = document.getElementById('hall');
const zoneFilter = document.getElementById('zone-filter');
const seatSearch = document.getElementById('seat-search');
const freeOnly = document.getElementById('free-only');
const filterInfo = document.getElementById('filter-info');
const legendBox = document.getElementById('legend');
const selCount = document.getElementById('sel-count');
const selectedList = document.getElementById('selected-list');
const totalBox = document.getElementById('total');
const messageBox = document.getElementById('message');
const bestCount = document.getElementById('best-count');
const bestBtn = document.getElementById('best-btn');
const bookBtn = document.getElementById('book-btn');
const clearBtn = document.getElementById('clear-btn');
const resetBtn = document.getElementById('reset-btn');

let hall = [];
let seatIndex = new Map();
let selected = [];
let message = { text: '', type: '' };
const filters = { zone: 'all', freeOnly: false, query: '' };

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function zoneOfRow(row) {
  for (const zone of ZONES) {
    if (row >= zone.fromRow && row <= zone.toRow) {
      return zone;
    }
  }
  return ZONES[ZONES.length - 1];
}

function zoneById(id) {
  return ZONES.find((zone) => zone.id === id);
}

function money(value) {
  return `${value} ${CURRENCY}`;
}

function seatLabel(seat) {
  return `Row ${seat.row}, seat ${seat.number}`;
}

function buildHall() {
  const rows = [];
  seatIndex = new Map();
  for (let row = 1; row <= ROWS; row++) {
    const line = [];
    const zone = zoneOfRow(row);
    for (let number = 1; number <= COLS; number++) {
      const seat = {
        id: `R${row}-${number}`,
        row,
        number,
        zone: zone.id,
        price: zone.price,
        taken: TAKEN_IDS.includes(`R${row}-${number}`),
      };
      line.push(seat);
      seatIndex.set(seat.id, seat);
    }
    rows.push(line);
  }
  return rows;
}

function parseQuery(text) {
  const match = text.trim().toLowerCase().match(/^r?(\d+)(?:\s*[-\s]\s*s?(\d+))?$/);
  if (match === null) {
    return null;
  }
  return { row: Number(match[1]), number: match[2] === undefined ? null : Number(match[2]) };
}

function passesFilters(seat, query) {
  if (filters.zone !== 'all' && seat.zone !== filters.zone) {
    return false;
  }
  if (filters.freeOnly && seat.taken) {
    return false;
  }
  if (query !== null && filters.query !== '') {
    if (seat.row !== query.row) {
      return false;
    }
    if (query.number !== null && seat.number !== query.number) {
      return false;
    }
  }
  return true;
}

function findBestSeats(count) {
  const centerRow = (ROWS - 1) / 2;
  const centerCol = (COLS - 1) / 2;
  let bestIds = [];
  let bestDistance = Infinity;

  for (let r = 0; r < ROWS; r++) {
    for (let start = 0; start + count <= COLS; start++) {

      let allFree = true;
      for (let i = start; i < start + count; i++) {
        if (hall[r][i].taken) {
          allFree = false;
          break;
        }
      }
      if (!allFree) {
        continue;
      }

      const blockCenter = start + (count - 1) / 2;
      const distance = Math.hypot(r - centerRow, blockCenter - centerCol);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIds = [];
        for (let i = start; i < start + count; i++) {
          bestIds.push(hall[r][i].id);
        }
      }
    }
  }
  return bestIds;
}

function toggleSeat(id) {
  const seat = seatIndex.get(id);
  if (seat === undefined) {
    return;
  }

  if (seat.taken) {
    message = { text: `${seatLabel(seat)} is already taken.`, type: 'error' };
    render();
    return;
  }
  const position = selected.indexOf(id);
  if (position !== -1) {
    selected.splice(position, 1);
    message = { text: `${seatLabel(seat)} removed.`, type: 'info' };
  } else if (selected.length >= MAX_SEATS) {

    message = { text: `You can select up to ${MAX_SEATS} seats. Remove one first.`, type: 'error' };
  } else {
    selected.push(id);
    message = { text: `${seatLabel(seat)} selected (${money(seat.price)}).`, type: 'info' };
  }
  render();
}

function chooseBestSeats() {
  const count = Number(bestCount.value);
  if (!(count >= 1 && count <= MAX_SEATS)) {
    message = { text: `Choose from 1 to ${MAX_SEATS} seats.`, type: 'error' };
    render();
    return;
  }
  const ids = findBestSeats(count);
  if (ids.length === 0) {

    message = { text: `There are no ${count} free seats together in one row.`, type: 'error' };
  } else {
    selected = ids;
    const first = seatIndex.get(ids[0]);
    const last = seatIndex.get(ids[ids.length - 1]);
    message = {
      text: `Best seats: row ${first.row}, seats ${first.number}–${last.number}.`,
      type: 'success',
    };
  }
  render();
}

function bookSeats() {
  if (selected.length === 0) {
    message = { text: 'Select at least one seat first.', type: 'error' };
    render();
    return;
  }
  const count = selected.length;
  const total = calculateTotal();
  for (const id of selected) {
    seatIndex.get(id).taken = true;
  }
  selected = [];
  const code = `CN-${randomInt(1000, 9999)}`;
  message = { text: `Booked ${count} seat(s) for ${money(total)}. Booking code: ${code}.`, type: 'success' };
  render();
}

function clearSelection() {
  selected = [];
  message = { text: 'Selection cleared.', type: 'info' };
  render();
}

function resetHall() {
  hall = buildHall();
  selected = [];
  message = { text: 'The hall is back to its first state.', type: 'info' };
  render();
}

function calculateTotal() {
  let total = 0;
  for (const id of selected) {
    total += seatIndex.get(id).price;
  }
  return total;
}

function renderHall() {
  hallBox.replaceChildren();
  const query = parseQuery(filters.query);
  let shown = 0;

  for (const line of hall) {
    const rowBox = document.createElement('div');
    rowBox.classList.add('hall-row');

    const label = document.createElement('span');
    label.classList.add('row-label');
    label.textContent = String(line[0].row);
    rowBox.append(label);

    for (const seat of line) {
      const match = passesFilters(seat, query) && !(filters.query !== '' && query === null);
      if (match) {
        shown++;
      }
      const isSelected = selected.includes(seat.id);

      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('seat', `zone-${seat.zone}`);
      button.dataset.id = seat.id;
      button.textContent = String(seat.number);
      button.classList.toggle('is-taken', seat.taken);
      button.classList.toggle('is-selected', isSelected);
      button.classList.toggle('is-dim', !match);
      button.classList.toggle('is-found', match && filters.query !== '' && query !== null);
      button.classList.toggle('aisle-after', seat.number === Math.floor(COLS / 2));
      button.setAttribute('aria-pressed', String(isSelected));
      if (seat.taken) {
        button.setAttribute('aria-disabled', 'true');
      }
      const zone = zoneById(seat.zone);
      button.setAttribute(
        'aria-label',
        `${seatLabel(seat)}, ${zone.name}, ${money(seat.price)}, ${seat.taken ? 'taken' : 'free'}`
      );
      rowBox.append(button);
    }
    hallBox.append(rowBox);
  }

  filterInfo.className = 'filter-info';
  if (filters.query !== '' && query === null) {
    filterInfo.textContent = 'Type a seat like 3-5, or a row like 3.';
    filterInfo.classList.add('error');
  } else if (shown === 0) {
    filterInfo.textContent = 'No seats found. Change the zone, the search or the free-only filter.';
    filterInfo.classList.add('error');
  } else {
    filterInfo.textContent = `Showing ${shown} of ${ROWS * COLS} seats.`;
  }
}

function renderSummary() {
  selCount.textContent = `${selected.length} of ${MAX_SEATS} seats selected`;

  selectedList.replaceChildren();
  if (selected.length === 0) {
    const empty = document.createElement('li');
    empty.classList.add('empty');
    empty.textContent = 'No seats selected yet.';
    selectedList.append(empty);
  }
  for (const id of selected) {
    const seat = seatIndex.get(id);
    const item = document.createElement('li');
    item.classList.add('selected-item');

    const text = document.createElement('span');
    text.textContent = `${seatLabel(seat)} · ${zoneById(seat.zone).name} · ${money(seat.price)}`;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.classList.add('remove-btn');
    remove.dataset.id = id;
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${seatLabel(seat)}`);

    item.append(text, remove);
    selectedList.append(item);
  }

  totalBox.textContent = money(calculateTotal());
  messageBox.textContent = message.text;
  messageBox.className = `message ${message.type}`;

  bookBtn.disabled = selected.length === 0;
  clearBtn.disabled = selected.length === 0;
}

function render() {
  renderHall();
  renderSummary();
}

function fillControls() {
  introBox.textContent =
    `Pick up to ${MAX_SEATS} seats. Prices depend on the zone. ` +
    'Click a seat, or let the Best seats button choose for you.';

  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = 'All zones';
  zoneFilter.append(all);
  for (const zone of ZONES) {
    const option = document.createElement('option');
    option.value = zone.id;
    option.textContent = `${zone.name} — ${money(zone.price)}`;
    zoneFilter.append(option);
  }

  for (let n = 1; n <= MAX_SEATS; n++) {
    const option = document.createElement('option');
    option.value = String(n);
    option.textContent = String(n);
    bestCount.append(option);
  }
  bestCount.value = '2';

  const items = [
    { cls: 'seat-free', text: 'Free' },
    { cls: 'is-selected', text: 'Selected' },
    { cls: 'is-taken', text: 'Taken' },
  ];
  for (const item of items) {
    const li = document.createElement('li');
    const sample = document.createElement('span');
    sample.classList.add('legend-box', item.cls);
    li.append(sample, document.createTextNode(` ${item.text}`));
    legendBox.append(li);
  }
  for (const zone of ZONES) {
    const li = document.createElement('li');
    const sample = document.createElement('span');
    sample.classList.add('legend-box', `zone-${zone.id}`);
    li.append(sample, document.createTextNode(` ${zone.name}`));
    legendBox.append(li);
  }
}

hallBox.addEventListener('click', (event) => {
  const button = event.target.closest('button.seat');
  if (button === null) {
    return;
  }
  toggleSeat(button.dataset.id);
});

selectedList.addEventListener('click', (event) => {
  const button = event.target.closest('button.remove-btn');
  if (button === null) {
    return;
  }
  toggleSeat(button.dataset.id);
});

zoneFilter.addEventListener('change', () => {
  filters.zone = zoneFilter.value;
  render();
});
freeOnly.addEventListener('change', () => {
  filters.freeOnly = freeOnly.checked;
  render();
});
seatSearch.addEventListener('input', () => {
  filters.query = seatSearch.value.trim();
  render();
});

bestBtn.addEventListener('click', chooseBestSeats);
bookBtn.addEventListener('click', bookSeats);
clearBtn.addEventListener('click', clearSelection);
resetBtn.addEventListener('click', resetHall);

hall = buildHall();
fillControls();
message = { text: 'Choose your seats.', type: 'info' };
render();
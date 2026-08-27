const cardType = document.querySelector("#card-type");
const cardCount = document.querySelector("#card-count");
const generateButton = document.querySelector("#generate");
const results = document.querySelector("#results");
const feedback = document.querySelector("#feedback");

function randomDigit() { return Math.floor(Math.random() * 10); }

const cardProfiles = {
  visa: { label: "Visa", length: 16, cvvLength: 3, prefix: () => [4] },
  mastercard: { label: "Mastercard", length: 16, cvvLength: 3, prefix: () => [5, 1 + Math.floor(Math.random() * 5)] },
  "american-express": { label: "American Express", length: 15, cvvLength: 4, prefix: () => (Math.random() < 0.5 ? [3, 4] : [3, 7]) },
  discover: { label: "Discover", length: 16, cvvLength: 3, prefix: () => [6, 0, 1, 1] },
  jcb: { label: "JCB", length: 16, cvvLength: 3, prefix: () => String(3528 + Math.floor(Math.random() * 62)).split("").map(Number) },
  unionpay: { label: "UnionPay", length: 16, cvvLength: 3, prefix: () => [6, 2] },
  "diners-club": { label: "Diners Club", length: 14, cvvLength: 3, prefix: () => [3, 6] },
};

function createCardNumber(type) {
  const profile = cardProfiles[type];
  const digits = profile.prefix();
  while (digits.length < profile.length - 1) digits.push(randomDigit());
  const checkDigit = digits.slice().reverse().reduce((sum, digit, index) => {
    const value = index % 2 === 0 ? digit * 2 : digit;
    return sum + (value > 9 ? value - 9 : value);
  }, 0);
  digits.push((10 - (checkDigit % 10)) % 10);
  return digits.join("");
}

function formatCardNumber(number) { return number.replace(/(.{4})/g, "$1 ").trim(); }
function createCvv(length) { return String(Math.floor(Math.random() * 10 ** length)).padStart(length, "0"); }
function createValidDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1 + Math.floor(Math.random() * 60));
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

function createCard(type) {
  const profile = cardProfiles[type];
  return { brand: profile.label, number: createCardNumber(type), cvv: createCvv(profile.cvvLength), validDate: createValidDate() };
}

function copyNumber(number, button) {
  if (!navigator.clipboard) {
    feedback.textContent = "Copy was unavailable. Select the number and copy it manually.";
    return;
  }
  navigator.clipboard.writeText(number).then(() => {
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = "Copy number"; }, 1400);
  }).catch(() => {
    feedback.textContent = "Copy was unavailable. Select the number and copy it manually.";
  });
}

function renderCards(cards) {
  results.replaceChildren();
  cards.forEach((card) => {
    const element = document.createElement("article");
    element.className = "card";
    element.innerHTML = `<div class="card-top"><span>${card.brand}</span><span>SYNTHETIC TEST DATA</span></div><p class="number">${formatCardNumber(card.number)}</p><div class="card-details"><p><span>CVV</span><strong>${card.cvv}</strong></p><p><span>Valid thru</span><strong>${card.validDate}</strong></p></div>`;
    const button = document.createElement("button");
    button.className = "copy";
    button.type = "button";
    button.textContent = "Copy number";
    button.addEventListener("click", () => copyNumber(card.number, button));
    element.append(button);
    results.append(element);
  });
}

function generate() {
  const count = Number(cardCount.value);
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    feedback.textContent = "Choose a whole number from 1 to 10.";
    cardCount.focus();
    return;
  }
  const cards = Array.from({ length: count }, () => createCard(cardType.value));
  renderCards(cards);
  feedback.textContent = `${count} synthetic ${cardProfiles[cardType.value].label} ${count === 1 ? "card" : "cards"} generated.`;
}

generateButton.addEventListener("click", generate);

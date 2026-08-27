const cardType = document.querySelector("#card-type");
const cardCount = document.querySelector("#card-count");
const generateButton = document.querySelector("#generate");
const results = document.querySelector("#results");
const feedback = document.querySelector("#feedback");
const batchActions = document.querySelector("#batch-actions");
const copyJsonButton = document.querySelector("#copy-json");
const downloadCsvButton = document.querySelector("#download-csv");
const tallyFeedbackLink = document.querySelector("#feedback-link");
let currentCards = [];

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

function formatCardNumber(number, type) {
  if (type === "american-express") return `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`;
  if (type === "diners-club") return `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`;
  return number.replace(/(.{4})/g, "$1 ").trim();
}
function createCvv(length) { return String(Math.floor(Math.random() * 10 ** length)).padStart(length, "0"); }
function createValidDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1 + Math.floor(Math.random() * 60));
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Cameron", "Quinn"];
const lastNames = ["Morgan", "Chen", "Patel", "Garcia", "Kim", "Brown", "Wilson", "Martin", "Lee", "Davis"];

function createCardholderName() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

function createCard(type) {
  const profile = cardProfiles[type];
  return {
    type,
    brand: profile.label,
    cardholderName: createCardholderName(),
    number: createCardNumber(type),
    cvv: createCvv(profile.cvvLength),
    validDate: createValidDate(),
  };
}

function fallbackCopy(number) {
  const textarea = document.createElement("textarea");
  textarea.value = number;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

async function copyText(text) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browsers expose the Clipboard API but block it for this page.
    }
  }
  if (!fallbackCopy(text)) throw new Error("Copy failed");
}

async function copyNumber(number, button) {
  try {
    await copyText(number);
    button.textContent = "Copied";
    feedback.textContent = `Card number ending in ${number.slice(-4)} copied.`;
    setTimeout(() => { button.textContent = "Copy"; }, 1400);
  } catch {
    feedback.textContent = "Copy was unavailable. Select the number and copy it manually.";
  }
}

function exportRecords(cards) {
  return cards.map(({ brand, cardholderName, number, cvv, validDate }) => ({
    brand,
    cardholder_name: cardholderName,
    card_number: number,
    cvv,
    expiry: validDate,
  }));
}

function cardsToJson(cards) {
  return JSON.stringify(exportRecords(cards), null, 2);
}

function cardsToCsv(cards) {
  const rows = exportRecords(cards);
  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
  return ["brand,cardholder_name,card_number,cvv,expiry", ...rows.map((row) =>
    [row.brand, row.cardholder_name, row.card_number, row.cvv, row.expiry].map(escape).join(",")
  )].join("\n");
}

function renderCards(cards) {
  results.replaceChildren();
  cards.forEach((card) => {
    const element = document.createElement("article");
    element.className = "card";
    element.innerHTML = `<div class="card-top"><span>${card.brand}</span><span>SYNTHETIC TEST DATA</span></div><div class="number-row"><p class="number">${formatCardNumber(card.number, card.type)}</p></div><div class="card-details"><p class="cardholder"><span>Cardholder name</span><strong>${card.cardholderName}</strong></p><p><span>CVV</span><strong>${card.cvv}</strong></p><p><span>Valid thru</span><strong>${card.validDate}</strong></p></div>`;
    const button = document.createElement("button");
    button.className = "copy";
    button.type = "button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", `Copy ${card.brand} card number ending in ${card.number.slice(-4)}`);
    button.addEventListener("click", () => copyNumber(card.number, button));
    element.querySelector(".number-row").append(button);
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
  currentCards = Array.from({ length: count }, () => createCard(cardType.value));
  renderCards(currentCards);
  batchActions.hidden = false;
  feedback.textContent = `${count} synthetic ${cardProfiles[cardType.value].label} ${count === 1 ? "card" : "cards"} generated.`;
}

generateButton.addEventListener("click", generate);

copyJsonButton.addEventListener("click", async () => {
  try {
    await copyText(cardsToJson(currentCards));
    copyJsonButton.textContent = "JSON copied";
    setTimeout(() => { copyJsonButton.textContent = "Copy JSON"; }, 1400);
  } catch {
    feedback.textContent = "JSON copy was unavailable.";
  }
});

downloadCsvButton.addEventListener("click", () => {
  const blob = new Blob([cardsToCsv(currentCards)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "credit-card-test-data.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

if (tallyFeedbackLink) {
  tallyFeedbackLink.addEventListener("click", (event) => {
    if (!window.Tally?.openPopup) return;
    event.preventDefault();
    window.Tally.openPopup("44Vd1o", {
      layout: "modal",
      width: 520,
      overlay: true,
    });
  });
}

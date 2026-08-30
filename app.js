const cardType = document.querySelector("#card-type");
const cardCount = document.querySelector("#card-count");
const generateButton = document.querySelector("#generate");
const results = document.querySelector("#results");
const feedback = document.querySelector("#feedback");
const batchActions = document.querySelector("#batch-actions");
const copyJsonButton = document.querySelector("#copy-json");
const downloadCsvButton = document.querySelector("#download-csv");
const copyQaPlanButton = document.querySelector("#copy-qa-plan");
const downloadQaJsonButton = document.querySelector("#download-qa-json");
const qaPackStatus = document.querySelector("#qa-pack-status");
const tallyFeedbackLink = document.querySelector("#feedback-link");
let currentCards = [];

function randomDigit() { return Math.floor(Math.random() * 10); }

function trackSiteEvent(eventName, parameters = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, parameters);
}

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

async function copyCardField(value, button, field, type = "unknown") {
  const labels = {
    number: "Card number",
    cardholder: "Cardholder name",
    cvv: "CVV",
  };
  const label = labels[field] || "Value";
  const originalAriaLabel = button.getAttribute("aria-label");
  try {
    await copyText(value);
    button.classList.add("is-copied");
    button.setAttribute("aria-label", `${label} copied`);
    feedback.textContent = field === "number"
      ? `Card number ending in ${value.slice(-4)} copied.`
      : `${label} copied.`;
    if (field === "number") trackSiteEvent("copy_number", { card_type: type });
    setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", originalAriaLabel);
    }, 1400);
  } catch {
    feedback.textContent = `Copy was unavailable. Select the ${label.toLowerCase()} and copy it manually.`;
  }
}

function copyNumber(number, button, type = "unknown") {
  return copyCardField(number, button, "number", type);
}

function copyButtonMarkup(value, className, ariaLabel) {
  return `<button class="copy-value ${className}" type="button" aria-label="${ariaLabel}"><span>${value}</span><span class="copy-symbol" aria-hidden="true"><svg class="copy-glyph" viewBox="0 0 24 24" focusable="false"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg><svg class="check-glyph" viewBox="0 0 24 24" focusable="false"><path d="m5 12 4 4L19 6"></path></svg></span></button>`;
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

function createExpiredDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

function breakLuhn(number) {
  const lastDigit = Number(number.slice(-1));
  return `${number.slice(0, -1)}${(lastDigit + 1) % 10}`;
}

function createQaTestPack(cards) {
  if (!cards.length) return null;
  const card = cards[0];
  const baseInput = {
    card_type: card.brand,
    cardholder_name: card.cardholderName,
    card_number: card.number,
    expiry: card.validDate,
    cvv: card.cvv,
  };
  return {
    version: 1,
    purpose: "client_side_payment_form_validation",
    generated_at: new Date().toISOString(),
    source: "https://creditcardgenerator.online/",
    scope_note: "Synthetic data for client-side formatting and validation tests only. Customize selectors and expected messages. Use the payment provider's official sandbox for transaction behavior.",
    cases: [
      {
        id: "TC-001",
        scenario: `Valid ${card.brand}`,
        purpose: "Confirm that a structurally valid supported card record passes client-side format checks.",
        input: { ...baseInput },
        expected_result: [`${card.brand} is detected`, "No client-side card-format error is shown"],
      },
      {
        id: "TC-002",
        scenario: "Invalid Luhn checksum",
        purpose: "Confirm that the form rejects a card number with an incorrect check digit.",
        input: { ...baseInput, card_number: breakLuhn(card.number) },
        expected_result: ["A card-number validation error is shown"],
      },
      {
        id: "TC-003",
        scenario: "Expired date",
        purpose: "Confirm that the form rejects an expiry date in the past.",
        input: { ...baseInput, expiry: createExpiredDate() },
        expected_result: ["An expiry-date validation error is shown"],
      },
      {
        id: "TC-004",
        scenario: "Invalid security-code length",
        purpose: "Confirm that the form rejects a CVV or CID with the wrong length.",
        input: { ...baseInput, cvv: card.cvv.slice(0, -1) },
        expected_result: ["A CVV or CID length error is shown"],
      },
    ],
  };
}

function qaPackToMarkdown(pack) {
  const cases = pack.cases.map((testCase) => `## ${testCase.id} — ${testCase.scenario}\n\nPurpose: ${testCase.purpose}\n\nInput:\n- Card type: ${testCase.input.card_type}\n- Cardholder name: ${testCase.input.cardholder_name}\n- Card number: ${testCase.input.card_number}\n- Expiry: ${testCase.input.expiry}\n- CVV/CID: ${testCase.input.cvv}\n\nExpected result:\n${testCase.expected_result.map((result) => `- ${result}`).join("\n")}`).join("\n\n");
  return `# Payment Form QA Test Pack\n\nUse this pack with an AI assistant that can access your codebase or test environment, or follow it as a manual QA checklist. Map the field selectors and error messages to your own form, run only in a local, staging, or authorized test environment, and record the actual result for each case.\n\n${pack.scope_note}\n\n${cases}`;
}

function renderCards(cards) {
  results.replaceChildren();
  cards.forEach((card) => {
    const element = document.createElement("article");
    element.className = "card";
    element.innerHTML = `<div class="card-top"><span>${card.brand}</span></div><div class="number-row">${copyButtonMarkup(formatCardNumber(card.number, card.type), "number copy-number", `Copy ${card.brand} card number ending in ${card.number.slice(-4)}`)}</div><div class="card-details"><p class="cardholder"><span>Cardholder name</span>${copyButtonMarkup(card.cardholderName, "copy-cardholder", "Copy cardholder name")}</p><p><span>CVV</span>${copyButtonMarkup(card.cvv, "copy-cvv", "Copy CVV")}</p><p><span>Valid thru</span><strong>${card.validDate}</strong></p></div>`;
    const numberButton = element.querySelector(".copy-number");
    const cardholderButton = element.querySelector(".copy-cardholder");
    const cvvButton = element.querySelector(".copy-cvv");
    numberButton.addEventListener("click", () => copyCardField(card.number, numberButton, "number", card.type));
    cardholderButton.addEventListener("click", () => copyCardField(card.cardholderName, cardholderButton, "cardholder", card.type));
    cvvButton.addEventListener("click", () => copyCardField(card.cvv, cvvButton, "cvv", card.type));
    results.append(element);
  });
}

function generate() {
  const count = Number(cardCount.value);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    feedback.textContent = "Choose a whole number from 1 to 20.";
    cardCount.focus();
    return;
  }
  currentCards = Array.from({ length: count }, () => createCard(cardType.value));
  renderCards(currentCards);
  batchActions.hidden = false;
  copyQaPlanButton.disabled = false;
  downloadQaJsonButton.disabled = false;
  qaPackStatus.textContent = `Ready: four ${cardProfiles[cardType.value].label} validation scenarios.`;
  feedback.textContent = `${count} synthetic ${cardProfiles[cardType.value].label} ${count === 1 ? "card" : "cards"} generated.`;
  trackSiteEvent("generate_cards", { card_type: cardType.value, card_count: count });
}

generateButton.addEventListener("click", generate);

copyJsonButton.addEventListener("click", async () => {
  try {
    await copyText(cardsToJson(currentCards));
    copyJsonButton.textContent = "JSON copied";
    trackSiteEvent("copy_json", { card_count: currentCards.length });
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
  trackSiteEvent("download_csv", { card_count: currentCards.length });
});

copyQaPlanButton.addEventListener("click", async () => {
  const pack = createQaTestPack(currentCards);
  if (!pack) return;
  try {
    await copyText(qaPackToMarkdown(pack));
    copyQaPlanButton.textContent = "AI Test Plan copied";
    qaPackStatus.textContent = "Paste the plan into an AI assistant that can access your project, or use it as a manual checklist.";
    setTimeout(() => { copyQaPlanButton.textContent = "Copy AI Test Plan"; }, 1400);
  } catch {
    qaPackStatus.textContent = "Copy was unavailable. Try the JSON download instead.";
  }
});

downloadQaJsonButton.addEventListener("click", () => {
  const pack = createQaTestPack(currentCards);
  if (!pack) return;
  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "payment-form-qa-test-pack.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  qaPackStatus.textContent = "JSON pack downloaded. Adapt its cases to your test runner and form selectors.";
});

if (tallyFeedbackLink) {
  tallyFeedbackLink.addEventListener("click", (event) => {
    trackSiteEvent("open_feedback");
    if (!window.Tally?.openPopup) return;
    event.preventDefault();
    window.Tally.openPopup("44Vd1o", {
      layout: "modal",
      width: 520,
      overlay: true,
    });
  });
}

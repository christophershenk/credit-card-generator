import fs from "node:fs";
import vm from "node:vm";

const handlers = {};
const elements = {
  "#card-type": { value: "visa" },
  "#card-count": { value: "1", focused: false, focus() { this.focused = true; } },
  "#generate": { addEventListener(type, handler) { handlers[type] = handler; } },
  "#results": {
    children: [],
    replaceChildren() { this.children = []; },
    append(element) { this.children.push(element); },
  },
  "#feedback": { textContent: "" },
  "#batch-actions": { hidden: true },
  "#copy-json": { textContent: "Copy JSON", addEventListener(type, handler) { handlers.copyJson = handler; } },
  "#download-csv": { addEventListener(type, handler) { handlers.downloadCsv = handler; } },
  "#feedback-link": { addEventListener(type, handler) { handlers.tallyFeedback = handler; } },
};

let copiedNumber = "";
let fallbackCommand = "";
let downloadedFile = {};
let openedTallyForm = {};
const context = {
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Promise,
  Blob,
  URL: {
    createObjectURL(blob) { downloadedFile.blob = blob; return "blob:test-download"; },
    revokeObjectURL() {},
  },
  setTimeout() {},
  navigator: { clipboard: { writeText(value) { copiedNumber = value; return Promise.resolve(); } } },
  window: {
    Tally: {
      openPopup(formId, options) { openedTallyForm = { formId, options }; },
    },
  },
  document: {
    body: { append() {} },
    execCommand(command) { fallbackCommand = command; return true; },
    querySelector(selector) { return elements[selector]; },
    createElement(tag) {
      return {
        tag,
        className: "",
        innerHTML: "",
        children: [],
        style: {},
        append(child) { this.children.push(child); },
        addEventListener(type, handler) { this[`on${type}`] = handler; },
        querySelector() { return { append() {} }; },
        setAttribute() {},
        select() {},
        click() { if (tag === "a") downloadedFile = { ...downloadedFile, href: this.href, download: this.download }; },
        remove() {},
      };
    },
  },
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("./app.js", import.meta.url), "utf8"), context);

function luhn(number) {
  return number.split("").reverse().reduce((sum, character, index) => {
    let value = Number(character);
    if (index % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    return sum + value;
  }, 0) % 10 === 0;
}

const rules = {
  visa: { length: 16, cvv: 3, prefix: (number) => number.startsWith("4") },
  mastercard: { length: 16, cvv: 3, prefix: (number) => /^5[1-5]/.test(number) },
  "american-express": { length: 15, cvv: 4, prefix: (number) => /^(34|37)/.test(number) },
  discover: { length: 16, cvv: 3, prefix: (number) => number.startsWith("6011") },
  jcb: { length: 16, cvv: 3, prefix: (number) => Number(number.slice(0, 4)) >= 3528 && Number(number.slice(0, 4)) <= 3589 },
  unionpay: { length: 16, cvv: 3, prefix: (number) => number.startsWith("62") },
  "diners-club": { length: 14, cvv: 3, prefix: (number) => number.startsWith("36") },
};

function validFutureDate(value) {
  const [month, year] = value.split("/").map(Number);
  const now = new Date();
  const currentMonth = now.getFullYear() * 12 + now.getMonth();
  const expiryMonth = (2000 + year) * 12 + month - 1;
  const difference = expiryMonth - currentMonth;
  return difference >= 1 && difference <= 60;
}

const profileResults = {};
for (const [type, rule] of Object.entries(rules)) {
  const cards = Array.from({ length: 1000 }, () => context.createCard(type));
  profileResults[type] = cards.every((card) =>
    card.number.length === rule.length &&
    rule.prefix(card.number) &&
    luhn(card.number) &&
    card.cvv.length === rule.cvv &&
    /^[0-9]+$/.test(card.cvv) &&
    /^[A-Za-z]+ [A-Za-z]+$/.test(card.cardholderName) &&
    /^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(card.validDate) &&
    validFutureDate(card.validDate)
  );
}

elements["#card-type"].value = "mastercard";
elements["#card-count"].value = "10";
context.generate();
const batchTen = elements["#results"].children.length === 10;
const batchActionsVisible = elements["#batch-actions"].hidden === false;

const invalidResults = {};
for (const value of ["0", "11", "1.5", ""]) {
  elements["#card-count"].value = value;
  elements["#card-count"].focused = false;
  context.generate();
  invalidResults[value === "" ? "empty" : value] =
    elements["#feedback"].textContent === "Choose a whole number from 1 to 10." &&
    elements["#card-count"].focused;
}

const copyButton = { textContent: "Copy number" };
await context.copyNumber("4111111111111111", copyButton);
const copyWorks = copiedNumber === "4111111111111111" && copyButton.textContent === "Copied";
context.navigator.clipboard.writeText = () => Promise.reject(new Error("Clipboard permission denied"));
await context.copyText("fallback copy test");
const fallbackCopyWorks = fallbackCommand === "copy";
const sampleCards = [context.createCard("visa"), context.createCard("american-express")];
const jsonRecords = JSON.parse(context.cardsToJson(sampleCards));
const jsonWorks = jsonRecords.length === 2 && Object.keys(jsonRecords[0]).join(",") === "brand,cardholder_name,card_number,cvv,expiry";
const csv = context.cardsToCsv(sampleCards);
const csvWorks = csv.startsWith("brand,cardholder_name,card_number,cvv,expiry\n") && csv.split("\n").length === 3;
handlers.downloadCsv();
const downloadedCsv = await downloadedFile.blob.text();
const csvDownloadWorks = downloadedFile.download === "credit-card-test-data.csv" && downloadedCsv.startsWith("brand,cardholder_name,card_number,cvv,expiry\n");
let feedbackNavigationPrevented = false;
handlers.tallyFeedback({ preventDefault() { feedbackNavigationPrevented = true; } });
const tallyFeedbackWorks =
  feedbackNavigationPrevented &&
  openedTallyForm.formId === "44Vd1o" &&
  openedTallyForm.options.layout === "modal";

const results = {
  profiles: profileResults,
  batchTen,
  batchActionsVisible,
  invalidInputs: invalidResults,
  copyWorks,
  fallbackCopyWorks,
  jsonWorks,
  csvWorks,
  csvDownloadWorks,
  tallyFeedbackWorks,
  generateHandlerRegistered: typeof handlers.click === "function",
  batchHandlersRegistered: typeof handlers.copyJson === "function" && typeof handlers.downloadCsv === "function",
  feedbackHandlerRegistered: typeof handlers.tallyFeedback === "function",
};

console.log(JSON.stringify(results, null, 2));
if (JSON.stringify(results).includes("false")) process.exitCode = 1;

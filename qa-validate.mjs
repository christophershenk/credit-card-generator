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
  "#copy-qa-plan": { textContent: "Copy AI Test Plan", disabled: true, addEventListener(type, handler) { handlers.copyQaPlan = handler; } },
  "#download-qa-json": { disabled: true, addEventListener(type, handler) { handlers.downloadQaJson = handler; } },
  "#qa-pack-status": { textContent: "Generate a card to enable both options." },
  "#feedback-link": { addEventListener(type, handler) { handlers.tallyFeedback = handler; } },
};

let copiedNumber = "";
let fallbackCommand = "";
let downloadedFile = {};
let openedTallyForm = {};
const trackingEvents = [];
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
    gtag(...args) { trackingEvents.push(args); },
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
        querySelector() { return { addEventListener() {} }; },
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
elements["#card-count"].value = "20";
context.generate();
const batchTwenty = elements["#results"].children.length === 20;
const batchActionsVisible = elements["#batch-actions"].hidden === false;
const qaButtonsEnabled =
  elements["#copy-qa-plan"].disabled === false &&
  elements["#download-qa-json"].disabled === false;
const firstRenderedCard = elements["#results"].children[0]?.innerHTML || "";
const clickToCopyControlsRendered =
  firstRenderedCard.includes("copy-number") &&
  firstRenderedCard.includes("copy-cardholder") &&
  firstRenderedCard.includes("copy-cvv") &&
  !firstRenderedCard.includes("copy-expiry");

const invalidResults = {};
for (const value of ["0", "21", "1.5", ""]) {
  elements["#card-count"].value = value;
  elements["#card-count"].focused = false;
  context.generate();
  invalidResults[value === "" ? "empty" : value] =
    elements["#feedback"].textContent === "Choose a whole number from 1 to 20." &&
    elements["#card-count"].focused;
}

function mockCopyButton(label) {
  const classes = new Set();
  const attributes = new Map([["aria-label", label]]);
  return {
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); },
    },
    getAttribute(name) { return attributes.get(name) || null; },
    setAttribute(name, value) { attributes.set(name, value); },
  };
}

const copyButton = mockCopyButton("Copy Visa card number");
await context.copyNumber("4111111111111111", copyButton, "visa");
const copyWorks = copiedNumber === "4111111111111111" && copyButton.classList.contains("is-copied");
const nameCopyButton = mockCopyButton("Copy cardholder name");
await context.copyCardField("Alex Morgan", nameCopyButton, "cardholder", "visa");
const nameCopyWorks = copiedNumber === "Alex Morgan" && nameCopyButton.classList.contains("is-copied");
const cvvCopyButton = mockCopyButton("Copy CVV");
await context.copyCardField("123", cvvCopyButton, "cvv", "visa");
const cvvCopyWorks = copiedNumber === "123" && cvvCopyButton.classList.contains("is-copied");
context.navigator.clipboard.writeText = () => Promise.reject(new Error("Clipboard permission denied"));
await context.copyText("fallback copy test");
const fallbackCopyWorks = fallbackCommand === "copy";
const sampleCards = [context.createCard("visa"), context.createCard("american-express")];
const qaPack = context.createQaTestPack([sampleCards[0]]);
const qaPackWorks =
  qaPack.cases.length === 4 &&
  luhn(qaPack.cases[0].input.card_number) &&
  !luhn(qaPack.cases[1].input.card_number) &&
  !validFutureDate(qaPack.cases[2].input.expiry) &&
  qaPack.cases[3].input.cvv.length === sampleCards[0].cvv.length - 1;
const qaMarkdown = context.qaPackToMarkdown(qaPack);
const qaMarkdownWorks =
  qaMarkdown.includes("# Payment Form QA Test Pack") &&
  qaMarkdown.includes("TC-001") &&
  qaMarkdown.includes("TC-004") &&
  qaMarkdown.includes("AI tool that can access your codebase or test environment");
const jsonRecords = JSON.parse(context.cardsToJson(sampleCards));
const jsonWorks = jsonRecords.length === 2 && Object.keys(jsonRecords[0]).join(",") === "brand,cardholder_name,card_number,cvv,expiry";
const csv = context.cardsToCsv(sampleCards);
const csvWorks = csv.startsWith("brand,cardholder_name,card_number,cvv,expiry\n") && csv.split("\n").length === 3;
await handlers.copyJson();
handlers.downloadCsv();
const downloadedCsv = await downloadedFile.blob.text();
const csvDownloadWorks = downloadedFile.download === "credit-card-test-data.csv" && downloadedCsv.startsWith("brand,cardholder_name,card_number,cvv,expiry\n");
context.navigator.clipboard.writeText = (value) => { copiedNumber = value; return Promise.resolve(); };
await handlers.copyQaPlan();
const qaPlanCopyWorks = copiedNumber.includes("# Payment Form QA Test Pack") && elements["#copy-qa-plan"].textContent === "AI Test Plan copied";
handlers.downloadQaJson();
const downloadedQaJson = JSON.parse(await downloadedFile.blob.text());
const qaJsonDownloadWorks =
  downloadedFile.download === "payment-form-qa-test-pack.json" &&
  downloadedQaJson.cases.length === 4 &&
  downloadedQaJson.purpose === "client_side_payment_form_validation";
let feedbackNavigationPrevented = false;
handlers.tallyFeedback({ preventDefault() { feedbackNavigationPrevented = true; } });
const tallyFeedbackWorks =
  feedbackNavigationPrevented &&
  openedTallyForm.formId === "44Vd1o" &&
  openedTallyForm.options.layout === "modal";
const expectedTrackingEvents = ["generate_cards", "copy_number", "copy_json", "download_csv", "open_feedback"];
const trackingEventNames = trackingEvents.map(([, eventName]) => eventName);
const trackingEventsWork = expectedTrackingEvents.every((eventName) => trackingEventNames.includes(eventName));
const trackingPayloadIsSafe = trackingEvents.every(([, , parameters = {}]) =>
  Object.keys(parameters).every((key) => ["card_type", "card_count"].includes(key)) &&
  !/4111111111111111|card_number|cvv|cardholder|expiry|validDate/i.test(JSON.stringify(parameters))
);

const results = {
  profiles: profileResults,
  batchTwenty,
  batchActionsVisible,
  qaButtonsEnabled,
  clickToCopyControlsRendered,
  invalidInputs: invalidResults,
  copyWorks,
  nameCopyWorks,
  cvvCopyWorks,
  fallbackCopyWorks,
  jsonWorks,
  csvWorks,
  csvDownloadWorks,
  qaPackWorks,
  qaMarkdownWorks,
  qaPlanCopyWorks,
  qaJsonDownloadWorks,
  tallyFeedbackWorks,
  trackingEventsWork,
  trackingPayloadIsSafe,
  generateHandlerRegistered: typeof handlers.click === "function",
  batchHandlersRegistered: typeof handlers.copyJson === "function" && typeof handlers.downloadCsv === "function",
  qaHandlersRegistered: typeof handlers.copyQaPlan === "function" && typeof handlers.downloadQaJson === "function",
  feedbackHandlerRegistered: typeof handlers.tallyFeedback === "function",
};

console.log(JSON.stringify(results, null, 2));
if (JSON.stringify(results).includes("false")) process.exitCode = 1;

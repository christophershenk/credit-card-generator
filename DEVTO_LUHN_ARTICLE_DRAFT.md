---
title: What I Learned Building a Browser-Only Credit Card Test Data Generator
published: false
description: A practical look at Luhn-valid test data, card-format differences, browser-only generation, and the limits of synthetic card numbers.
tags: testing, webdev, javascript, qa
---

# What I Learned Building a Browser-Only Credit Card Test Data Generator

Payment-form testing often begins with a surprisingly small problem: a random string of digits usually fails before the form can test anything else. The field may expect a known card-network prefix, a particular length, and a valid Luhn check digit. A tester may also need an expiry date and a three- or four-digit security code just to exercise the interface.

I built a small browser-only generator to make that test data available without an account, a database, or a server-side API. The project also clarified an important boundary: a structurally valid card number is not the same thing as a card that can complete a payment.

## What “Luhn valid” actually means

The Luhn algorithm is a checksum. It helps software catch common input mistakes, but it does not prove that an account exists or that a transaction will be authorised.

To calculate the final check digit, the generator:

1. Starts with a card-network prefix.
2. Adds random digits until the number is one digit short of the required length.
3. Processes the digits from right to left, doubling every second digit and subtracting nine when the result is greater than nine.
4. Chooses a final digit that makes the total divisible by ten.

The resulting number can pass a basic Luhn validator. It still has no bank account, balance, issuer relationship, or payment capability behind it.

## Card networks are not all formatted the same way

The generator uses a deliberately small set of common test profiles:

| Card type | Test prefix used | Number length | Security-code length |
| --- | --- | ---: | ---: |
| Visa | 4 | 16 | 3 |
| Mastercard | 51–55 | 16 | 3 |
| American Express | 34 or 37 | 15 | 4 |
| Discover | 6011 | 16 | 3 |
| JCB | 3528–3589 | 16 | 3 |
| UnionPay | 62 | 16 | 3 |
| Diners Club | 36 | 14 | 3 |

These profiles are useful for front-end and validation tests, but they are not an exhaustive representation of every range used by each network. A production payment integration should be tested with the official sandbox data supplied by its payment provider.

## Why generate the data in the browser?

The most useful privacy decision was also the simplest architectural decision: generate everything locally.

The tool does not need to send generated card numbers, names, security codes, or expiry dates to a server. That removes the need for a storage layer and reduces the chance of test data appearing in logs. It also keeps the core workflow fast: select a card type, choose a quantity, and generate.

The same rule applies to analytics. It is useful to know whether someone generated a batch, copied a number, exported JSON, or downloaded CSV. It is not useful—or appropriate—to send the generated values themselves. The analytics events therefore contain only an action name plus a non-sensitive card type or batch count.

## Batch output matters more than a decorative card

A visual card can be helpful for demos, but repeated form testing needs compact output. I prioritised:

- One to twenty records per batch.
- A copy button beside each card number.
- JSON copying for test fixtures and API examples.
- CSV download for spreadsheets and data-driven test runs.
- Responsive output that remains usable on both desktop and mobile.

This is still a small tool, but those choices make it more useful than returning a single unformatted number.

## What this kind of generator cannot test

Synthetic Luhn-valid data can help with:

- Field formatting and masking.
- Card-type detection.
- Required-field and length validation.
- Responsive checkout layouts.
- Demo data, documentation, and QA fixtures.

It cannot test issuer approval, balances, 3-D Secure, address verification, fraud decisions, payment-provider responses, or a live transaction. Those behaviours require the official sandbox or test mode of the payment service being integrated.

## Try the tool

The finished MVP is available at [Random Credit Card Generator](https://creditcardgenerator.online/). It is free, requires no sign-in, and generates the card-shaped test data locally in the browser.

I am still treating it as an experiment. If you test payment forms or build QA fixtures, I would be interested in which output format or validation case would save you the most time.


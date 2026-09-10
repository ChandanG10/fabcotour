import assert from 'node:assert/strict';
import { corporateEmailSchema, corporateEmailText } from '../server/src/modules/enquiries/corporate-email';
const data = { companyName: 'Example Ltd', contactPerson: 'Test Person', workEmail: 'person@example.com', phoneNumber: '1234567890', requiredProducts: 'Mugs and totes', estimatedQuantity: '100', budgetRange: '25000', eventDate: '2026-12-12', deliveryCity: 'Bengaluru', customisationRequirements: 'Print company logo', message: 'Please send a quote.', consent: true };
const parsed = corporateEmailSchema.parse(data);
const body = corporateEmailText(parsed);
for (const [key, value] of Object.entries(data)) if (key !== 'consent') assert.ok(body.includes(String(value)), `Missing ${key}`);
for (const invalid of [{ consent: false }, { workEmail: 'not-email' }, { workEmail: 'a@example.com\r\nBcc: b@example.com' }, { eventDate: '2026-02-31' }, { message: 'x'.repeat(5001) }, { companyName: ' ' }]) assert.equal(corporateEmailSchema.safeParse({ ...data, ...invalid }).success, false);
console.log('Corporate email: all form fields included; invalid input, header injection, missing consent and oversized content rejected.');

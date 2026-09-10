import { z } from 'zod';

export const corporateEmailSchema = z.object({
  companyName: z.string().trim().min(2).max(255),
  contactPerson: z.string().trim().min(2).max(160),
  workEmail: z.string().trim().email().max(255),
  phoneNumber: z.string().trim().min(10).max(32),
  requiredProducts: z.string().trim().min(2).max(2000),
  estimatedQuantity: z.string().trim().min(1).max(80),
  budgetRange: z.string().trim().min(1).max(80),
  eventDate: z.string().date(),
  deliveryCity: z.string().trim().min(2).max(120),
  customisationRequirements: z.string().trim().min(10).max(5000),
  message: z.string().trim().min(10).max(5000),
  consent: z.literal(true)
});

export function corporateEmailText(data: z.infer<typeof corporateEmailSchema>) {
  return [
    'New FabPodd corporate gifting enquiry',
    `Company: ${data.companyName}`, `Contact person: ${data.contactPerson}`,
    `Work email: ${data.workEmail}`, `Phone: ${data.phoneNumber}`,
    `Products: ${data.requiredProducts}`, `Estimated quantity: ${data.estimatedQuantity}`,
    `Budget: ${data.budgetRange}`, `Event / delivery date: ${data.eventDate}`,
    `Delivery city: ${data.deliveryCity}`,
    `Customisation requirements:\n${data.customisationRequirements}`,
    `Message:\n${data.message}`, 'Consent to contact: Yes'
  ].join('\n\n');
}

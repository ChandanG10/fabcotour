import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { asyncHandler, HttpError } from '../../utils/http.js';
import { corporateEmailSchema, corporateEmailText } from './corporate-email.js';

export const publicEnquiriesRouter = Router();
publicEnquiriesRouter.post('/corporate', rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { message: 'Too many enquiries. Please try again in 15 minutes.' }
}), asyncHandler(async (request, response) => {
  const data = corporateEmailSchema.parse(request.body);
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM || !env.CORPORATE_ENQUIRY_EMAIL) {
    throw new HttpError(503, 'Email enquiries are temporarily unavailable. Please contact us directly.');
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  try {
    const result = await transport.sendMail({
      from: { name: 'FabPodd Corporate Gifting', address: env.SMTP_FROM },
      to: env.CORPORATE_ENQUIRY_EMAIL, replyTo: data.workEmail,
      subject: 'New corporate gifting enquiry — FabPodd', text: corporateEmailText(data)
    });
    if (!result.accepted.length) throw new Error('Mail not accepted');
  } catch {
    throw new HttpError(502, 'Your enquiry could not be emailed. Please try again. Your form details have been kept.');
  } finally { transport.close(); }
  response.status(200).json({ success: true });
}));

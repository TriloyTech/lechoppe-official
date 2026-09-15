import { renderOrderConfirmation } from "./templates/OrderConfirmationEmail.ts";
import { providerConfigured, createSmtpTransporter, mapSmtpError } from "./reservation.ts";
import type { Lang } from "@/context/LangContext";
import type { PaymentMethod } from "@/lib/takeaway/types";
import type { SendMailOptions } from "nodemailer";

interface ConfirmationInput { to: string; lang: Lang; reference: string; pickup: string; total: number; trackingUrl: string; acceptedPaymentMethods: PaymentMethod[]; items: { quantity: number; name: string; options?: string[] }[] }

export async function sendOrderConfirmation(
  input: ConfirmationInput,
  transport?: { sendMail: (options: SendMailOptions) => Promise<any> } | ((options: SendMailOptions) => Promise<any>)
) {
  const rendered = renderOrderConfirmation(input);
  if (!providerConfigured() || !process.env.EMAIL_FROM) {
    console.info(`Email provider not configured; confirmation email ${input.reference} not sent`);
    return;
  }

  const mailOptions: SendMailOptions = {
    from: process.env.EMAIL_FROM,
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: {
      'X-Entity-Ref-ID': `takeaway/${input.reference}`,
      'X-Idempotency-Key': `takeaway/${input.reference}`,
    },
  };

  try {
    if (transport && typeof (transport as any).sendMail === 'function') {
      await (transport as any).sendMail(mailOptions);
    } else if (typeof transport === 'function') {
      await (transport as any)(mailOptions);
    } else {
      const client = createSmtpTransporter();
      await client.sendMail(mailOptions);
    }
  } catch (err) {
    throw mapSmtpError(err);
  }
}

export { sendReservationEmail, renderReservation, renderReservationTest, providerConfigured } from './reservation.ts';

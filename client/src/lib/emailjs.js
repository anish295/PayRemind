import { db } from './firebase';
import { addDoc, collection } from 'firebase/firestore';

/**
 * Send an invoice email via Firebase Trigger Email Extension.
 * Adds a document to the `mail` collection — the extension picks it up
 * and sends it automatically via SendGrid SMTP.
 */
export async function sendInvoiceEmail(invoice, pdfBase64 = null) {
  const mailDoc = {
    to: invoice.client_email,
    message: {
      subject: `Invoice #${invoice.invoice_number} from ${invoice.business_name || 'PayRemind'}`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #1a2035; padding: 28px 32px;">
    <h1 style="color: #f59e0b; margin: 0; font-size: 22px; font-weight: 700;">PayRemind</h1>
    <p style="color: #8b92a5; margin: 4px 0 0; font-size: 13px;">Payment Invoice</p>
  </div>
  <div style="padding: 32px;">
    <p style="font-size: 15px; color: #1a2035; margin: 0 0 8px;">Dear <strong>${invoice.client_name}</strong>,</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">Please find your invoice details below.</p>
    <div style="background: #f8f9fc; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #9ca3af;">Invoice #</td><td style="text-align:right; font-weight: 600; color: #1a2035;">${invoice.invoice_number}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af; border-top: 1px solid #e8eaf0;">Amount Due</td><td style="text-align:right; font-weight: 700; font-size: 18px; color: #f59e0b; border-top: 1px solid #e8eaf0;">${invoice.currency} ${invoice.grand_total}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af; border-top: 1px solid #e8eaf0;">Due Date</td><td style="text-align:right; font-weight: 600; color: #1a2035; border-top: 1px solid #e8eaf0;">${invoice.due_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af; border-top: 1px solid #e8eaf0;">Payment Terms</td><td style="text-align:right; color: #1a2035; border-top: 1px solid #e8eaf0;">${invoice.payment_terms || 'N/A'}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af; border-top: 1px solid #e8eaf0;">Payment Method</td><td style="text-align:right; color: #1a2035; border-top: 1px solid #e8eaf0;">${invoice.payment_method || 'N/A'}</td></tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #6b7280; margin: 0 0 24px;">Please make payment by the due date. Contact us if you have any questions.</p>
    <div style="background: #f59e0b; border-radius: 8px; padding: 14px 24px; text-align: center;">
      <p style="color: white; font-weight: 700; font-size: 15px; margin: 0;">Thank you for your business!</p>
    </div>
  </div>
  <div style="background: #f8f9fc; padding: 16px 32px; text-align: center; border-top: 1px solid #e8eaf0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Sent via PayRemind · ${invoice.business_name || 'PayRemind'}</p>
  </div>
</div>`,
    }
  };

  // Attach the PDF if provided
  if (pdfBase64) {
    mailDoc.message.attachments = [
      {
        filename: `Invoice-${invoice.invoice_number || 'draft'}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
      }
    ];
  }

  await addDoc(collection(db, 'mail'), mailDoc);
}

/**
 * Send a payment reminder email via Firebase Trigger Email Extension.
 * Adds a document to the `mail` collection — the extension picks it up
 * and sends it automatically via SendGrid SMTP.
 */
export async function sendReminderEmail(invoice) {
  const daysOverdue = Math.max(0, Math.floor((new Date() - new Date(invoice.due_date)) / 86400000));

  await addDoc(collection(db, 'mail'), {
    to: invoice.client_email,
    message: {
      subject: `Payment Reminder: Invoice #${invoice.invoice_number} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due soon'}`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: #1a2035; padding: 28px 32px;">
    <h1 style="color: #f59e0b; margin: 0; font-size: 22px; font-weight: 700;">PayRemind</h1>
    <p style="color: #8b92a5; margin: 4px 0 0; font-size: 13px;">Payment Reminder</p>
  </div>
  <div style="padding: 32px;">
    <div style="background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px;">
      <p style="color: #92400e; font-weight: 600; font-size: 14px; margin: 0;">⚠ Payment Reminder</p>
      <p style="color: #b45309; font-size: 13px; margin: 6px 0 0;">Invoice #${invoice.invoice_number} requires your attention.</p>
    </div>
    <p style="font-size: 15px; color: #1a2035; margin: 0 0 8px;">Dear <strong>${invoice.client_name}</strong>,</p>
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">This is a friendly reminder that the following invoice is ${daysOverdue > 0 ? `<strong style="color:#dc2626">${daysOverdue} days overdue</strong>` : 'due soon'}.</p>
    <div style="background: #f8f9fc; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #9ca3af;">Invoice #</td><td style="text-align:right; font-weight: 600; color: #1a2035;">${invoice.invoice_number}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af; border-top: 1px solid #e8eaf0;">Amount Due</td><td style="text-align:right; font-weight: 700; font-size: 18px; color: #dc2626; border-top: 1px solid #e8eaf0;">${invoice.currency} ${invoice.grand_total}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af; border-top: 1px solid #e8eaf0;">Due Date</td><td style="text-align:right; font-weight: 600; color: #dc2626; border-top: 1px solid #e8eaf0;">${invoice.due_date}</td></tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #6b7280; margin: 0 0 24px;">If you have already made payment, please disregard this reminder. Otherwise, please arrange payment at your earliest convenience.</p>
    <div style="background: #1a2035; border-radius: 8px; padding: 14px 24px; text-align: center;">
      <p style="color: white; font-weight: 700; font-size: 15px; margin: 0;">Please arrange payment promptly.</p>
    </div>
  </div>
  <div style="background: #f8f9fc; padding: 16px 32px; text-align: center; border-top: 1px solid #e8eaf0;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">Sent via PayRemind · ${invoice.business_name || 'PayRemind'}</p>
  </div>
</div>`
    }
  });
}

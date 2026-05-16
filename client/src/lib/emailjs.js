import { db } from './firebase';
import { addDoc, collection } from 'firebase/firestore';

/**
 * Send an invoice email via Firebase Trigger Email Extension.
 * Adds a document to the `mail` collection — the extension picks it up
 * and sends it automatically via SendGrid SMTP.
 */
export async function sendInvoiceEmail(invoice) {
  await addDoc(collection(db, 'mail'), {
    to: invoice.client_email,
    message: {
      subject: `Invoice #${invoice.invoice_number} from ${invoice.business_name}`,
      html: `<p>Dear ${invoice.client_name},</p>
             <p>Please find your invoice details below:</p>
             <p><strong>Invoice #:</strong> ${invoice.invoice_number}<br>
             <strong>Amount Due:</strong> ${invoice.currency} ${invoice.grand_total}<br>
             <strong>Due Date:</strong> ${invoice.due_date}<br>
             <strong>Payment Terms:</strong> ${invoice.payment_terms || 'N/A'}<br>
             <strong>Payment Method:</strong> ${invoice.payment_method || 'N/A'}</p>
             <p>Please make payment by the due date. Contact us if you have any questions.</p>
             <p>Thank you,<br>${invoice.business_name}</p>`
    }
  });
}

/**
 * Send a payment reminder email via Firebase Trigger Email Extension.
 * Adds a document to the `mail` collection — the extension picks it up
 * and sends it automatically via SendGrid SMTP.
 */
export async function sendReminderEmail(invoice) {
  const daysOverdue = Math.max(0, Math.floor(
    (new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24)
  ));

  await addDoc(collection(db, 'mail'), {
    to: invoice.client_email,
    message: {
      subject: `Payment Reminder: Invoice #${invoice.invoice_number} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due soon'}`,
      html: `<p>Dear ${invoice.client_name},</p>
             <p>This is a friendly reminder that payment for Invoice #${invoice.invoice_number} is ${daysOverdue > 0 ? `<strong>${daysOverdue} days overdue</strong>` : 'due soon'}.</p>
             <p><strong>Amount Due:</strong> ${invoice.currency} ${invoice.grand_total}<br>
             <strong>Due Date:</strong> ${invoice.due_date}</p>
             <p>If you have already made payment, please disregard this reminder. Otherwise, please arrange payment at your earliest convenience.</p>
             <p>Thank you,<br>${invoice.business_name}</p>`
    }
  });
}

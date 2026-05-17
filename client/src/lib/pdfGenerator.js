import { jsPDF } from 'jspdf';

// Use PDF-safe symbols only (₹ and € are NOT in Helvetica's WinAnsiEncoding)
const CURRENCY_SYMBOLS = { USD: '$', EUR: 'EUR ', INR: 'Rs.', GBP: 'GBP ' };

function getSymbol(currency) {
  return CURRENCY_SYMBOLS[currency] || 'Rs.';
}

function fmtMoney(amount, currency) {
  const sym = getSymbol(currency);
  const num = Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sym + num;
}

/**
 * Internal helper — builds the jsPDF document for an invoice.
 * Returns the jsPDF doc instance so callers can save or export it.
 */
function _buildInvoiceDoc(invoice) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const FOOTER_ZONE = 80;
  
  let y = MARGIN + 15; // Starting Y line

  function checkPageOverflow(neededSpace = 30) {
    if (y + neededSpace > PAGE_HEIGHT - FOOTER_ZONE) {
      doc.addPage();
      y = MARGIN + 20;
    }
  }

  // ---- HEADER SECTION ----
  // Left side
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 53); // #1a2035
  doc.text('PayRemind', MARGIN, y);
  
  doc.setFontSize(11);
  doc.setTextColor(245, 158, 11); // #f59e0b
  doc.setCharSpace(1.65);
  doc.text('INVOICE', MARGIN, y + 18);
  doc.setCharSpace(0);

  // Right side
  let rightY = y - 4; // Adjust right align
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 53); // dark navy
  doc.text(`Invoice #: ${invoice.invoice_number || invoice.id.substring(0, 8)}`, PAGE_WIDTH - MARGIN, rightY, { align: 'right' });
  
  rightY += 16;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175); // muted #9ca3af
  doc.text(`Issue Date: ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : 'N/A'}`, PAGE_WIDTH - MARGIN, rightY, { align: 'right' });
  
  rightY += 16;
  doc.text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`, PAGE_WIDTH - MARGIN, rightY, { align: 'right' });
  
  // Status Badge
  rightY += 10;
  const statusColors = {
    pending: [245, 158, 11], // amber
    paid: [16, 185, 129], // green
    overdue: [239, 68, 68], // red
    reminder_sent: [59, 130, 246] // blue (fallback if needed)
  };
  const rawStatus = invoice.status || 'pending';
  const sc = statusColors[rawStatus] || statusColors.pending;
  const statusLabel = rawStatus.replace('_', ' ').toUpperCase();
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const badgeWidth = doc.getTextWidth(statusLabel) + 16;
  const badgeHeight = 16;
  
  doc.setFillColor(sc[0], sc[1], sc[2]);
  doc.roundedRect(PAGE_WIDTH - MARGIN - badgeWidth, rightY, badgeWidth, badgeHeight, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, PAGE_WIDTH - MARGIN - (badgeWidth / 2), rightY + 11.5, { align: 'center' });

  // Thin amber horizontal line
  y = Math.max(y + 36, rightY + badgeHeight + 16);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(2);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  
  // ---- BILL TO SECTION ----
  y += 28; // margin-top 28px
  let billToY = y;
  
  // Left side: BILL TO
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175); // #9ca3af
  doc.setCharSpace(1.08); // 0.12em of 9px
  doc.text('BILL TO', MARGIN, y);
  doc.setCharSpace(0);
  
  y += 18;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 53); // #1a2035
  doc.text(invoice.client_name || 'Client Name', MARGIN, y);

  // Recipient business name
  if (invoice.business_name) {
    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // #6b7280
    doc.text(invoice.business_name, MARGIN, y);
  }
  
  y += 16;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // #6b7280
  
  const lineH = 14; // Using 14 pt line height for 11px text
  if (invoice.client_email) { doc.text(invoice.client_email, MARGIN, y); y += lineH; }
  if (invoice.client_phone) { doc.text(invoice.client_phone, MARGIN, y); y += lineH; }
  if (invoice.client_address) {
    const addrLines = doc.splitTextToSize(invoice.client_address, CONTENT_WIDTH * 0.45);
    doc.text(addrLines, MARGIN, y);
    y += addrLines.length * lineH;
  }
  
  // Right side: Invoice meta (Currency, Payment Terms, Payment Method)
  // same vertical position as Bill To
  let metaY = billToY;
  const metaLabelX = PAGE_WIDTH - MARGIN - 120; // 120pt for the value width
  const metaValueX = PAGE_WIDTH - MARGIN;
  
  const renderMetaRow = (label, value) => {
    if (!value) return;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175); // muted
    doc.text(label.toUpperCase(), metaLabelX, metaY, { align: 'right' });
    
    doc.setFontSize(11);
    doc.setTextColor(26, 32, 53); // dark
    doc.text(value, metaValueX, metaY, { align: 'right' });
    metaY += 18;
  };
  
  renderMetaRow('Currency', invoice.currency || 'INR');
  renderMetaRow('Payment Terms', invoice.payment_terms);
  renderMetaRow('Payment Method', invoice.payment_method);
  
  y = Math.max(y, metaY) + 24; // margin 24px 0
  
  // Divider before table
  doc.setDrawColor(232, 234, 240); // #e8eaf0
  doc.setLineWidth(1);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  
  // ---- LINE ITEMS TABLE ----
  y += 16;
  
  // Header row
  const tableHeaderY = y;
  doc.setFillColor(248, 249, 252); // #f8f9fc
  doc.rect(MARGIN, tableHeaderY, CONTENT_WIDTH, 24, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 114, 128); // #6b7280
  doc.setCharSpace(0.72); // 0.08em of 9px
  
  const colX = {
    desc: MARGIN + 10,
    qty: MARGIN + (CONTENT_WIDTH * 0.50), // center of 10%
    price: MARGIN + (CONTENT_WIDTH * 0.75) - 10, // right aligned in 20%
    total: PAGE_WIDTH - MARGIN - 10 // right aligned in 20%
  };
  
  doc.text('DESCRIPTION', colX.desc, tableHeaderY + 16);
  doc.text('QTY', colX.qty, tableHeaderY + 16, { align: 'center' });
  doc.text('UNIT PRICE', colX.price, tableHeaderY + 16, { align: 'right' });
  doc.text('TOTAL', colX.total, tableHeaderY + 16, { align: 'right' });
  doc.setCharSpace(0);
  
  y += 24;
  
  // Rows
  const items = invoice.line_items || [];
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  items.forEach((item, index) => {
    // padding 10px 0, bottom border 1px #f1f3f9
    // alternating row bg: white and #fafafa
    const rowHeight = 32;
    checkPageOverflow(rowHeight + 10);
    
    if (index % 2 !== 0) {
      doc.setFillColor(250, 250, 250); // #fafafa
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, 'F');
    }
    
    doc.setTextColor(26, 32, 53); // #1a2035
    
    // Desc (45%)
    const descWidth = CONTENT_WIDTH * 0.45;
    const descText = doc.splitTextToSize(item.description || '', descWidth);
    doc.text(descText[0] || '', colX.desc, y + 20);
    
    doc.text(String(item.quantity || 1), colX.qty, y + 20, { align: 'center' });
    doc.text(fmtMoney(item.unit_price || 0, invoice.currency), colX.price, y + 20, { align: 'right' });
    doc.text(fmtMoney(item.line_total || ((item.quantity || 1) * (item.unit_price || 0)), invoice.currency), colX.total, y + 20, { align: 'right' });
    
    y += rowHeight;
    
    // Bottom border
    doc.setDrawColor(241, 243, 249); // #f1f3f9
    doc.setLineWidth(1);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  });
  
  // ---- TOTALS BLOCK ----
  y += 24;
  checkPageOverflow(100);
  
  // All values right-aligned, labels at 60% from right
  const totalLabelX = PAGE_WIDTH - MARGIN - 100;
  const totalValueX = PAGE_WIDTH - MARGIN;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const drawTotalRow = (label, value, isDiscount = false) => {
    doc.setTextColor(156, 163, 175); // muted label
    doc.text(label, totalLabelX, y, { align: 'right' });
    
    if (isDiscount) {
      doc.setTextColor(239, 68, 68); // red
    } else {
      doc.setTextColor(156, 163, 175); // muted value
    }
    doc.text(value, totalValueX, y, { align: 'right' });
    y += 18;
  };
  
  drawTotalRow('Subtotal', fmtMoney(invoice.subtotal || 0, invoice.currency));
  drawTotalRow(`Tax (${invoice.tax_percent || 0}%)`, fmtMoney((invoice.subtotal || 0) * ((invoice.tax_percent || 0)/100), invoice.currency));
  
  if (invoice.discount && invoice.discount > 0) {
    const discLabel = invoice.discount_type === 'percent' ? `Discount (${invoice.discount}%)` : 'Discount';
    const discAmount = invoice.discount_type === 'percent' ? (invoice.subtotal || 0) * (invoice.discount / 100) : invoice.discount;
    drawTotalRow(discLabel, `-${fmtMoney(discAmount, invoice.currency)}`, true);
  }
  
  // Divider before Grand Total
  y += 6;
  doc.setDrawColor(232, 234, 240); // #e8eaf0
  doc.setLineWidth(1);
  doc.line(PAGE_WIDTH - MARGIN - 200, y, PAGE_WIDTH - MARGIN, y); // Short line for totals
  y += 24;
  
  // Grand Total: 14px bold label + 16px bold amber value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(26, 32, 53);
  doc.text('Grand Total', totalLabelX, y, { align: 'right' });
  
  doc.setFontSize(16);
  doc.setTextColor(245, 158, 11); // amber
  doc.text(fmtMoney(invoice.grand_total || 0, invoice.currency), totalValueX, y, { align: 'right' });
  
  // ---- FOOTER ----
  // Footer is at the bottom of the page
  const footerY = PAGE_HEIGHT - 60;
  
  doc.setDrawColor(232, 234, 240); // #e8eaf0
  doc.setLineWidth(1);
  doc.line(MARGIN, footerY, PAGE_WIDTH - MARGIN, footerY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(156, 163, 175); // muted
  
  if (invoice.notes) {
    const footerNotes = doc.splitTextToSize(invoice.notes, CONTENT_WIDTH * 0.6);
    doc.text(footerNotes[0] || '', MARGIN, footerY + 16);
  }
  
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business.', PAGE_WIDTH - MARGIN, footerY + 16, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text('Generated by PayRemind', PAGE_WIDTH / 2, PAGE_HEIGHT - 30, { align: 'center' });
  
  return doc;
}

/**
 * Download the invoice PDF to the user's device.
 */
export function downloadInvoicePDF(invoice) {
  const doc = _buildInvoiceDoc(invoice);
  const filename = `Invoice-${invoice.invoice_number || invoice.id.substring(0, 8)}.pdf`;
  doc.save(filename);
}

/**
 * Generate the invoice PDF and return it as a base64-encoded string
 * (without the data-uri prefix). Used for email attachments.
 */
export function generateInvoicePDFBase64(invoice) {
  const doc = _buildInvoiceDoc(invoice);
  // output('datauristring') returns "data:application/pdf;base64,<base64>"
  // We only need the raw base64 portion for Nodemailer attachments.
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
}

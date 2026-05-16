/**
 * Firestore Data Access Layer
 * Replaces the old Express/SQLite API (lib/api.js).
 * Uses Firebase Web SDK v9 modular API.
 */
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calcTotals(lineItems, taxPercent, discountType, discountValue) {
  const subtotal = round2(
    lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0)
  );
  const taxAmount = round2(subtotal * (taxPercent / 100));
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = round2(subtotal * (discountValue / 100));
  } else {
    discountAmount = round2(discountValue);
  }
  const grandTotal = Math.max(0, round2(subtotal + taxAmount - discountAmount));
  return { subtotal, grandTotal };
}

function nowISO() {
  return new Date().toISOString();
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Determine if an invoice should be DISPLAYED as overdue (client-side only).
 * Does NOT write back to Firestore.
 */
function computeDisplayStatus(invoice) {
  if (
    invoice.due_date < todayStr() &&
    (invoice.status === 'pending' || invoice.status === 'reminder_sent')
  ) {
    return 'overdue';
  }
  return invoice.status;
}

// ─── Invoice Number Generation ────────────────────────────

/**
 * Generate a unique invoice number using an atomic counter.
 * Uses a Firestore document at meta/counters with a field `invoice_seq`.
 * Wrapped in a transaction to prevent race conditions.
 * Format: INV-YYYY-NNN (e.g. INV-2026-001)
 */
export async function generateInvoiceNumber() {
  const counterRef = doc(db, 'meta', 'counters');
  const year = new Date().getFullYear();

  const newSeq = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentSeq = 0;

    if (counterDoc.exists()) {
      currentSeq = counterDoc.data().invoice_seq || 0;
    }

    const nextSeq = currentSeq + 1;

    if (counterDoc.exists()) {
      transaction.update(counterRef, { invoice_seq: increment(1) });
    } else {
      transaction.set(counterRef, { invoice_seq: 1 });
    }

    return nextSeq;
  });

  return `INV-${year}-${String(newSeq).padStart(3, '0')}`;
}

// ─── Invoice CRUD ─────────────────────────────────────────

/**
 * Get all invoices, with optional search and status filters.
 * Overdue status is computed client-side for display purposes —
 * no writes back to Firestore on read.
 */
export async function getInvoices(params = {}) {
  const invoicesRef = collection(db, 'invoices');
  let q;

  if (params.status && params.status !== 'all') {
    // For 'overdue' filter, we need to find invoices that ARE overdue in Firestore
    // or would be displayed as overdue
    if (params.status === 'overdue') {
      // Fetch invoices with status 'overdue', OR pending/reminder_sent with past due date
      q = query(invoicesRef, orderBy('created_at', 'desc'));
    } else {
      q = query(invoicesRef, where('status', '==', params.status), orderBy('created_at', 'desc'));
    }
  } else {
    q = query(invoicesRef, orderBy('created_at', 'desc'));
  }

  const snapshot = await getDocs(q);
  let invoices = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    // Compute display status without writing back
    _displayStatus: computeDisplayStatus({ ...d.data(), status: d.data().status }),
  }));

  // Client-side search filter (Firestore doesn't support LIKE queries)
  if (params.search) {
    const s = params.search.toLowerCase();
    invoices = invoices.filter(
      (inv) =>
        (inv.client_name || '').toLowerCase().includes(s) ||
        (inv.client_email || '').toLowerCase().includes(s) ||
        (inv.invoice_number || '').toLowerCase().includes(s) ||
        (inv.business_name || '').toLowerCase().includes(s)
    );
  }

  // Apply overdue filter using display status
  if (params.status === 'overdue') {
    invoices = invoices.filter((inv) => inv._displayStatus === 'overdue');
  }

  return invoices;
}

/**
 * Get dashboard statistics.
 *
 * NOTE: This fetches the ENTIRE invoices collection to compute stats client-side.
 * At scale (hundreds/thousands of invoices), this should be replaced with:
 *   - Firestore aggregation queries (count(), sum()) — available in SDK v10+
 *   - Or a Cloud Function that maintains a stats document via triggers
 * For now, this approach is acceptable for small-to-medium datasets.
 */
export async function getInvoiceStats() {
  const snapshot = await getDocs(collection(db, 'invoices'));
  const invoices = snapshot.docs.map((d) => ({
    ...d.data(),
    _displayStatus: computeDisplayStatus(d.data()),
  }));

  const total = invoices.length;
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const overdueCount = invoices.filter((i) => i._displayStatus === 'overdue').length;
  const pendingCount = invoices.filter(
    (i) => i._displayStatus === 'pending'
  ).length;
  const reminderSentCount = invoices.filter(
    (i) => i._displayStatus === 'reminder_sent'
  ).length;
  const unpaidCount = invoices.filter((i) => i.status !== 'paid').length;

  // Group unpaid amounts by currency
  const currencyMap = {};
  invoices
    .filter((i) => i.status !== 'paid')
    .forEach((i) => {
      const cur = i.currency || 'INR';
      currencyMap[cur] = (currencyMap[cur] || 0) + (i.grand_total || 0);
    });
  const unpaidCurrencies = Object.entries(currencyMap).map(([currency, total]) => ({
    currency,
    total,
  }));

  return { total, unpaidCurrencies, overdueCount, paidCount, unpaidCount, pendingCount, reminderSentCount };
}

/**
 * Get a single invoice with its line_items subcollection.
 */
export async function getInvoice(invoiceId) {
  const invoiceRef = doc(db, 'invoices', invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);

  if (!invoiceSnap.exists()) {
    throw new Error('Invoice not found');
  }

  const data = { id: invoiceSnap.id, ...invoiceSnap.data() };
  data._displayStatus = computeDisplayStatus(data);

  // Fetch line items subcollection
  const lineItemsSnap = await getDocs(collection(db, 'invoices', invoiceId, 'line_items'));
  data.line_items = lineItemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return data;
}

/**
 * Create a new invoice.
 * Document ID = invoice_number.
 * Also creates line_items subcollection docs and logs an activity.
 */
export async function createInvoice(data) {
  const {
    invoice_number,
    business_name,
    client_name,
    client_email,
    client_phone,
    client_address,
    issue_date,
    due_date,
    currency,
    payment_terms,
    payment_method,
    tax_percent,
    discount_type,
    discount,
    status,
    reminder_enabled,
    notes,
    line_items,
  } = data;

  // Generate invoice number if not provided
  const finalInvoiceNumber =
    invoice_number && invoice_number.trim() ? invoice_number.trim() : await generateInvoiceNumber();

  const items = Array.isArray(line_items) ? line_items.filter((li) => li.description?.trim()) : [];
  const { subtotal, grandTotal } = calcTotals(
    items,
    Number(tax_percent) || 0,
    discount_type || 'flat',
    Number(discount) || 0
  );

  const now = nowISO();

  const invoiceData = {
    invoice_number: finalInvoiceNumber,
    business_name: business_name || '',
    client_name: client_name || '',
    client_email: client_email || '',
    client_phone: client_phone || '',
    client_address: client_address || '',
    issue_date: issue_date || '',
    due_date: due_date || '',
    currency: currency || 'INR',
    payment_terms: payment_terms || '',
    payment_method: payment_method || '',
    subtotal,
    tax_percent: Number(tax_percent) || 0,
    discount_type: discount_type || 'flat',
    discount: Number(discount) || 0,
    grand_total: grandTotal,
    status: status || 'pending',
    reminder_enabled: reminder_enabled !== undefined ? !!reminder_enabled : true,
    notes: notes || '',
    created_at: now,
    updated_at: now,
  };

  // Use invoice_number as the document ID
  const invoiceRef = doc(db, 'invoices', finalInvoiceNumber);
  await setDoc(invoiceRef, invoiceData);

  // Create line items in subcollection
  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    await addDoc(collection(db, 'invoices', finalInvoiceNumber, 'line_items'), {
      description: item.description || '',
      quantity: qty,
      unit_price: price,
      line_total: round2(qty * price),
    });
  }

  // Log activity
  await logActivity(finalInvoiceNumber, {
    type: 'invoice_created',
    description: `Invoice #${finalInvoiceNumber} created`,
    metadata: {},
  });

  return { id: finalInvoiceNumber, ...invoiceData, line_items: items };
}

/**
 * Update an existing invoice.
 * Recalculates totals if line_items or tax/discount changed.
 * Logs an activity.
 */
export async function updateInvoice(invoiceId, data) {
  const invoiceRef = doc(db, 'invoices', invoiceId);
  const existingSnap = await getDoc(invoiceRef);

  if (!existingSnap.exists()) {
    throw new Error('Invoice not found');
  }

  const existing = existingSnap.data();
  const { line_items, ...fields } = data;

  // Determine final values for totals calculation
  const finalTaxPercent = fields.tax_percent !== undefined ? Number(fields.tax_percent) : existing.tax_percent;
  const finalDiscountType = fields.discount_type !== undefined ? fields.discount_type : existing.discount_type;
  const finalDiscount = fields.discount !== undefined ? Number(fields.discount) : existing.discount;

  let subtotal = existing.subtotal;
  let grandTotal = existing.grand_total;

  if (Array.isArray(line_items)) {
    const items = line_items.filter((li) => li.description?.trim());
    const totals = calcTotals(items, finalTaxPercent, finalDiscountType, finalDiscount);
    subtotal = totals.subtotal;
    grandTotal = totals.grandTotal;

    // Delete old line items, add new ones
    const oldItems = await getDocs(collection(db, 'invoices', invoiceId, 'line_items'));
    for (const d of oldItems.docs) {
      await deleteDoc(d.ref);
    }

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price) || 0;
      await addDoc(collection(db, 'invoices', invoiceId, 'line_items'), {
        description: item.description || '',
        quantity: qty,
        unit_price: price,
        line_total: round2(qty * price),
      });
    }
  } else if (
    fields.tax_percent !== undefined ||
    fields.discount_type !== undefined ||
    fields.discount !== undefined
  ) {
    // Recalculate from existing line items
    const existingItemsSnap = await getDocs(collection(db, 'invoices', invoiceId, 'line_items'));
    const existingItems = existingItemsSnap.docs.map((d) => d.data());
    const totals = calcTotals(existingItems, finalTaxPercent, finalDiscountType, finalDiscount);
    subtotal = totals.subtotal;
    grandTotal = totals.grandTotal;
  }

  // Build update object
  const updateData = { ...fields };
  if (fields.tax_percent !== undefined) updateData.tax_percent = Number(fields.tax_percent);
  if (fields.discount !== undefined) updateData.discount = Number(fields.discount);
  if (fields.reminder_enabled !== undefined) updateData.reminder_enabled = !!fields.reminder_enabled;
  updateData.subtotal = subtotal;
  updateData.grand_total = grandTotal;
  updateData.updated_at = nowISO();

  await updateDoc(invoiceRef, updateData);

  // Log activity
  const oldStatus = existing.status;
  const newStatus = fields.status;
  if (newStatus && newStatus !== oldStatus) {
    const activityType = newStatus === 'paid' ? 'marked_paid' : 'status_changed';
    await logActivity(invoiceId, {
      type: activityType,
      description:
        newStatus === 'paid'
          ? `Invoice #${invoiceId} marked as paid`
          : `Status changed from ${oldStatus} to ${newStatus}`,
      metadata: { old_status: oldStatus, new_status: newStatus },
    });
  } else {
    await logActivity(invoiceId, {
      type: 'invoice_updated',
      description: `Invoice #${invoiceId} updated`,
      metadata: {},
    });
  }

  // Return updated invoice
  return getInvoice(invoiceId);
}

/**
 * Delete an invoice AND all its subcollection documents.
 * Firestore does not cascade deletes — we must manually delete
 * every doc in line_items and activities subcollections first.
 */
export async function deleteInvoice(invoiceId) {
  // 1. Delete all line_items subcollection docs
  const lineItemsSnap = await getDocs(collection(db, 'invoices', invoiceId, 'line_items'));
  for (const d of lineItemsSnap.docs) {
    await deleteDoc(d.ref);
  }

  // 2. Delete all activities subcollection docs
  const activitiesSnap = await getDocs(collection(db, 'invoices', invoiceId, 'activities'));
  for (const d of activitiesSnap.docs) {
    await deleteDoc(d.ref);
  }

  // 3. Delete the parent invoice document
  await deleteDoc(doc(db, 'invoices', invoiceId));

  return { message: 'Invoice deleted successfully' };
}

// ─── Activity Logging ─────────────────────────────────────

/**
 * Log an activity to the invoice's activities subcollection.
 */
export async function logActivity(invoiceId, activity) {
  await addDoc(collection(db, 'invoices', invoiceId, 'activities'), {
    type: activity.type,
    description: activity.description || '',
    metadata: activity.metadata || {},
    timestamp: nowISO(),
  });
}

/**
 * Get all activities for an invoice, ordered by timestamp descending.
 */
export async function getActivities(invoiceId) {
  const activitiesSnap = await getDocs(
    query(collection(db, 'invoices', invoiceId, 'activities'), orderBy('timestamp', 'desc'))
  );
  return activitiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Companies CRUD ───────────────────────────────────────

/**
 * Get all companies, with optional search filter.
 */
export async function getCompanies(search = '') {
  const snapshot = await getDocs(query(collection(db, 'companies'), orderBy('company_name', 'asc')));
  let companies = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (search) {
    const s = search.toLowerCase();
    companies = companies.filter(
      (c) =>
        (c.company_name || '').toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s)
    );
  }

  return companies;
}

/**
 * Get a single company.
 */
export async function getCompany(companyId) {
  const snap = await getDoc(doc(db, 'companies', companyId));
  if (!snap.exists()) throw new Error('Company not found');
  return { id: snap.id, ...snap.data() };
}

/**
 * Create a new company.
 */
export async function createCompany(data) {
  const companyData = {
    company_name: data.company_name || '',
    contact_name: data.contact_name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    created_at: nowISO(),
  };
  const docRef = await addDoc(collection(db, 'companies'), companyData);
  return { id: docRef.id, ...companyData };
}

/**
 * Update a company.
 */
export async function updateCompany(companyId, data) {
  const ref = doc(db, 'companies', companyId);
  const updateData = {};
  if (data.company_name !== undefined) updateData.company_name = data.company_name;
  if (data.contact_name !== undefined) updateData.contact_name = data.contact_name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;

  await updateDoc(ref, updateData);
  return getCompany(companyId);
}

/**
 * Delete a company.
 */
export async function deleteCompany(companyId) {
  await deleteDoc(doc(db, 'companies', companyId));
  return { message: 'Company deleted successfully' };
}

export function invoiceDocumentId(enrollmentId: string, periodLabel: string): string {
  return (String(enrollmentId) + "_" + String(periodLabel)).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

export function installmentAmountCents(enrollment: any, course: any): number {
  const explicit = Number(enrollment?.installmentAmountCents || course?.monthlyAmountCents || 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const totalCents = Math.round(Number(course?.priceCents || (Number(course?.price || 0) * 100)));
  const count = Math.max(0, Number(enrollment?.installmentsCount || course?.installmentsCount || 0));
  if (count > 0 && totalCents > 0) return Math.round(totalCents / count);
  const monthlyPrice = Number(course?.monthlyPrice || 0);
  return monthlyPrice > 0 ? Math.round(monthlyPrice * 100) : 0;
}

export function canSettleInvoice(invoice: any, paidMinor: number, currency: string, studentId: string): boolean {
  return !!invoice
    && invoice.studentId === studentId
    && ["open", "overdue"].includes(String(invoice.status))
    && !invoice.paymentId
    && Number(invoice.amountCents) === paidMinor
    && String(invoice.currency).toLowerCase() === String(currency).toLowerCase();
}

export function isValidPeriodLabel(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value));
}

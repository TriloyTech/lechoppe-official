import type { Lang } from "@/context/LangContext";

const COPY = {
  fr: { subject: "Confirmation de commande", hello: "Merci pour votre commande", pickup: "Retrait", total: "Total TTC à payer sur place", payment: "Paiement sur place lors du retrait.", track: "Suivre ma commande" },
  en: { subject: "Order confirmation", hello: "Thank you for your order", pickup: "Pickup", total: "Total incl. tax due onsite", payment: "Pay onsite when collecting your order.", track: "Track my order" },
  es: { subject: "Confirmación del pedido", hello: "Gracias por su pedido", pickup: "Recogida", total: "Total con impuestos a pagar en el local", payment: "Pago en el local al recoger el pedido.", track: "Seguir mi pedido" },
  it: { subject: "Conferma dell’ordine", hello: "Grazie per il tuo ordine", pickup: "Ritiro", total: "Totale IVA inclusa da pagare sul posto", payment: "Pagamento sul posto al ritiro.", track: "Segui il mio ordine" },
} satisfies Record<Lang, Record<string, string>>;

const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
export function renderOrderConfirmation(input: { lang: Lang; reference: string; pickup: string; total: number; trackingUrl: string; items: { quantity: number; name: string }[] }) { const copy = COPY[input.lang]; const itemText = input.items.map((item) => `${item.quantity}× ${item.name}`).join("\n"); const text = `${copy.hello} — #${input.reference}\n${copy.pickup}: ${input.pickup}\n${itemText}\n${copy.total}: ${input.total.toFixed(2)} €\n${copy.payment}\n${input.trackingUrl}`; const html = `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>${copy.hello}</h1><h2>#${escapeHtml(input.reference)}</h2><p><strong>${copy.pickup}:</strong> ${escapeHtml(input.pickup)}</p><ul>${input.items.map((item) => `<li>${item.quantity}× ${escapeHtml(item.name)}</li>`).join("")}</ul><p><strong>${copy.total}: ${input.total.toFixed(2)} €</strong></p><p>${copy.payment}</p><p><a href="${escapeHtml(input.trackingUrl)}">${copy.track}</a></p></main>`; return { subject: `${copy.subject} #${input.reference}`, text, html }; }

"use client";

import { useEffect, useRef } from "react";

type DocketOrder = { order_reference: string; customer_name: string; customer_phone: string; pickup_time: string; pickup_time_type?: string; payment_status: string; final_total_ttc: number; order_snapshot: { customer?: { notes?: string }; items?: { quantity: number; name: string; selected_options?: { group_name: Record<string, string> | string; choice_name: Record<string, string> | string }[] }[] } };
const label = (value: Record<string, string> | string) => typeof value === "string" ? value : value.fr ?? value.en;

export default function TakeawayKitchenDocket({ order }: { order: DocketOrder }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = () => { if (ref.current?.closest("article")?.contains(document.activeElement)) ref.current.classList.add("print-target"); };
    const after = () => ref.current?.classList.remove("print-target");
    window.addEventListener("beforeprint", before); window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);
  return <div ref={ref} id={`docket-${order.order_reference}`} className="takeaway-docket hidden"><h1>L’ÉCHOPPE DE PARIS</h1><h2>BON DE CUISINE</h2><hr /><p>COMMANDE : #{order.order_reference}<br />RETRAIT : {new Date(order.pickup_time).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}<br />CLIENT : {order.customer_name}<br />TÉL : {order.customer_phone}</p><hr />{order.order_snapshot.items?.map((item, index) => <div key={index}><strong>{item.quantity}× {item.name}</strong>{item.selected_options?.map((option, optionIndex) => <p key={optionIndex}>- {label(option.group_name)} : {label(option.choice_name)}</p>)}</div>)}{order.order_snapshot.customer?.notes ? <><hr /><p>NOTE CLIENT :<br />{order.order_snapshot.customer.notes}</p></> : null}<hr /><p><strong>TOTAL À ENCAISSER : {Number(order.final_total_ttc).toFixed(2)} €</strong><br />[{order.payment_status === "PAID" ? "PAYÉ" : "NON PAYÉ"}]</p></div>;
}

import type { OrderStatus } from "./types";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = { NEW: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["PREPARING", "CANCELLED"], PREPARING: ["READY", "CANCELLED"], READY: ["COMPLETED", "NO_SHOW"], COMPLETED: [], CANCELLED: [], NO_SHOW: [] };
export function canTransition(from: OrderStatus, to: OrderStatus) { return ORDER_TRANSITIONS[from].includes(to); }
export function canComplete(status: OrderStatus, paymentStatus: string) { return canTransition(status, "COMPLETED") && paymentStatus === "PAID"; }
export function canCustomerCancel(status: OrderStatus) { return status === "NEW"; }
export function canChangePayment(status: OrderStatus, nextPaymentStatus: string) { return status !== "COMPLETED" || nextPaymentStatus === "PAID"; }

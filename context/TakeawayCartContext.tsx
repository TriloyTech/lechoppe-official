"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { TECHNICAL_MAX_ITEM_QUANTITY, TECHNICAL_MAX_ORDER_QUANTITY, type CartLine, type TakeawayCatalogItem } from "@/lib/takeaway/types";
import type { Customization } from "@/components/takeaway/TakeawayItemCustomizer";

interface CartContextValue { lines: CartLine[]; count: number; total: number; add(item: TakeawayCatalogItem, customization: Customization): void; setQuantity(key: string, quantity: number): void; remove(key: string): void; clear(): void }
const Context = createContext<CartContextValue | null>(null);

export function TakeawayCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]); const [hydrated, setHydrated] = useState(false);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem("lechoppe_takeaway_cart_v1") ?? "[]"); if (Array.isArray(saved)) setLines(saved); } catch { /* ignore invalid stale cart */ } setHydrated(true); }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("lechoppe_takeaway_cart_v1", JSON.stringify(lines)); }, [hydrated, lines]);
  const add = useCallback((item: TakeawayCatalogItem, customization: Customization) => setLines((current) => { const key = `${item.id}:${customization.choiceIds.join(",")}:${customization.specialInstructions}`; const existing = current.find((line) => line.key === key); const totalForItem = current.filter((line) => line.item.id === item.id).reduce((sum, line) => sum + line.quantity, 0); const total = current.reduce((sum, line) => sum + line.quantity, 0); const max = item.max_quantity_per_order > 0 ? item.max_quantity_per_order : TECHNICAL_MAX_ITEM_QUANTITY; if (totalForItem >= max || total >= TECHNICAL_MAX_ORDER_QUANTITY) return current; return existing ? current.map((line) => line.key === key ? { ...line, quantity: Math.min(line.quantity + 1, max - totalForItem + line.quantity) } : line) : [...current, { key, item, choiceIds: customization.choiceIds, specialInstructions: customization.specialInstructions, quantity: 1, unitPrice: customization.unitPrice }]; }), []);
  const setQuantity = useCallback((key: string, quantity: number) => setLines((current) => { const target = current.find((line) => line.key === key); if (!target) return current; const otherItemQuantity = current.filter((line) => line.key !== key && line.item.id === target.item.id).reduce((sum, line) => sum + line.quantity, 0); const otherOrderQuantity = current.filter((line) => line.key !== key).reduce((sum, line) => sum + line.quantity, 0); const max = target.item.max_quantity_per_order > 0 ? target.item.max_quantity_per_order : TECHNICAL_MAX_ITEM_QUANTITY; const allowed = Math.min(Math.max(0, max - otherItemQuantity), Math.max(0, TECHNICAL_MAX_ORDER_QUANTITY - otherOrderQuantity)); return current.flatMap((line) => line.key === key ? quantity < 1 ? [] : [{ ...line, quantity: Math.min(quantity, allowed) }] : [line]); }), []);
  const remove = useCallback((key: string) => setLines((current) => current.filter((line) => line.key !== key)), []); const clear = useCallback(() => setLines([]), []);
  const value = useMemo(() => ({ lines, count: lines.reduce((sum, line) => sum + line.quantity, 0), total: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), add, setQuantity, remove, clear }), [lines, add, setQuantity, remove, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTakeawayCart() { const value = useContext(Context); if (!value) throw new Error("TakeawayCartProvider missing"); return value; }

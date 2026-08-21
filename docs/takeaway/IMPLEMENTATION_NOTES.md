# Takeaway MVP implementation notes

## Menu item localization

`REQUIREMENTS.md` describes multilingual menu-item names and descriptions, while the finalized Phase 1 schema and the existing shared menu application retain `menu_items.name` and `menu_items.description` as scalar text columns. The Takeaway implementation intentionally preserves that shared model rather than introducing a late, high-risk catalog migration.

All new static interface text, category names, option-group names, and option-choice names support `fr`, `en`, `es`, and `it`. Menu-item names and descriptions continue to use the restaurant's existing shared catalog language until a separately reviewed site-wide menu localization migration is approved.

## Quantity safety ceiling

`max_quantity_per_order = 0` means unlimited as a business rule. Public payloads still have a distinct technical ceiling of 1,000 units per line and 2,000 units per request to prevent pathological payload processing. These limits do not change the stored business configuration.

## Rate limiting

The dependency-free MVP limiter is bounded and expiring, and applies both network and normalized contact dimensions. Forwarded IP headers are used only when `TRUST_PROXY_HEADERS=true`. Multi-replica deployments should replace process-local counters with a shared store.

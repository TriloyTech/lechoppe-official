export function isTakeawayItemActionable(item: { available: boolean; takeaway_available?: boolean }) {
  return item.available && item.takeaway_available === true;
}

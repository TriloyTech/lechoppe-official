# L'Échoppe de Paris — Takeaway Design Specification

> **Purpose:** Define the UX, interaction model, screens, states, and functional design requirements for the Takeaway experience.
>
> **Visual source of truth:** `DESIGN.md`
>
> `DESIGN.md` defines the existing L'Échoppe visual language. This file defines what the Takeaway experience must contain and how the ordering journey should behave.

## 1. Product goal

Customers must be able to:

1. browse dishes available for takeaway
2. customize items
3. add and edit cart items
4. choose ASAP or a scheduled pickup time
5. enter customer details
6. apply a promo code when eligible
7. review the complete order
8. place the order
9. receive a clear confirmation
10. track the order

**There is no online payment. Payment is always completed onsite when the customer collects the order.**

---

## 2. UX principles

- Make the next action obvious.
- Group complex decisions into focused steps.
- Never silently disable the primary CTA.
- Always explain why the user cannot continue.
- Keep the cart, total, and selected pickup time easy to understand.
- Design mobile-first for transactional steps.
- Preserve the L'Échoppe visual identity from `DESIGN.md`.
- Do not imitate Deliveroo, Uber Eats, Shopify, or a generic SaaS checkout.

Recommended flow:

```text
Menu
→ Item customizer
→ Cart
→ Pickup
→ Customer details
→ Review
→ Place order
→ Confirmation
→ Tracking
```

---

## 3. Takeaway menu

### Header

Use a compact branded introduction:

- eyebrow: `À EMPORTER / TAKEAWAY`
- strong title
- short service explanation
- current availability
- earliest pickup when useful
- visible cart access

Do not use a huge hero that pushes the menu below the fold.

### Service states

Design:

- open
- temporarily paused
- closed
- no available pickup slots

Examples:

```text
Taking orders now
Earliest pickup: 20:15
```

```text
Takeaway orders are temporarily paused.
```

```text
Takeaway is closed right now.
Next pickup: Tomorrow from 12:00.
```

---

## 4. Category navigation

Reuse the existing menu category pattern from `DESIGN.md`.

Requirements:

- active category is unmistakable
- horizontally scrollable pills on mobile
- sticky when useful
- category navigation is derived from Takeaway-enabled items, so empty categories are hidden while every enabled item's category remains reachable
- labels support FR / EN / ES / IT

---

## 5. Product cards

Each item should show:

- image when available
- product name
- short description
- price
- availability
- relevant badges
- clear action

Possible badges:

- Chef's Pick
- Sold Out
- Allergens

Actions:

```text
Customize
```

when options exist, otherwise:

```text
Add
```

Sold-out products may remain visible but must be clearly disabled.

---

## 6. Item customizer

Use a focused modal, drawer, bottom sheet, or dedicated state.

Show:

- image
- product name
- description
- base price
- allergen information
- option groups
- quantity
- special instructions
- calculated line total

Support:

- required single choice
- optional single choice
- optional multiple choice
- required multiple choice when configured
- positive price modifiers
- negative price modifiers
- unavailable choices

Examples:

```text
Choose 1 · Required
```

```text
Cheese
+ €2.00
```

```text
No onions
- €0.50
```

Unavailable choices stay visible but disabled.

Optional single-choice groups should provide `None` when appropriate.

Required options must show inline validation if incomplete.

Quantity control:

```text
−   2   +
```

Primary CTA:

```text
Add to order — €24.50
```

When editing:

```text
Update item — €24.50
```

---

## 7. Cart

Each cart line must show:

- product name
- quantity
- selected options
- special instructions if present
- line total
- edit
- remove

Allow direct quantity changes where practical.

### Empty cart

Design a proper empty state:

```text
Your order is empty.
Explore the menu and add something delicious.
```

### Price summary

```text
Subtotal
Promo discount
──────────────
Total
```

If minimum or maximum order rules prevent checkout, explain the exact reason.

Example:

```text
Add €6.50 more to reach the €20 minimum.
```

CTA:

```text
Continue to checkout — €68.00
```

A mobile sticky CTA is acceptable if it does not cover content.

---

## 8. Checkout structure

Recommended sequence:

```text
1. Pickup
2. Your details
3. Review
4. Place order
```

Use a visible step indicator.

The existing reservation flow is the preferred interaction reference.

---

## 9. Pickup selection

This area must be redesigned carefully.

**Do not show every slot for every day in one giant grid.**

### Primary choice

Show two clear modes:

```text
ASAP
Schedule
```

The selected mode must be visually obvious.

### ASAP

When available:

```text
ASAP
Earliest pickup: 20:15
```

If unavailable:

```text
ASAP is currently unavailable.
Choose a scheduled pickup time.
```

### Scheduled

Use two stages.

**Stage 1 — choose a day**

```text
Today
Tomorrow
Tue 25
Wed 26
Thu 27
```

**Stage 2 — choose a time**

Only show slots for the selected day:

```text
19:00
19:15
19:30
19:45
20:00
```

### Selected pickup summary

Always show the current choice clearly:

```text
Pickup
Today · 20:15
```

or:

```text
Pickup
Tuesday 25 August · 12:30
```

### Slot lost / capacity full

If a slot becomes unavailable before submission:

```text
This pickup time has just become unavailable.
Please choose another time.
```

Do not clear the cart or customer details.

### No slots

```text
No pickup times are available for this day.
Choose another day.
```

---

## 10. Customer details

Required:

- full name
- email
- phone

Optional:

- order note
- promo code if not handled in cart

Use visible labels, not placeholder-only forms.

Validation must be inline and specific:

```text
Enter your name.
Enter a valid email address.
Enter a valid phone number.
```

Phone entry should accept realistic international formats.

---

## 11. Promo code

Recommended pattern:

```text
Promo code
[____________] [Apply]
```

Applied state:

```text
WELCOME10
10% discount applied
```

Invalid states should be specific where possible:

```text
This promo code is invalid.
This promo code has expired.
This promo code is not available for takeaway orders.
```

---

## 12. Review order

Before submission, show a complete summary.

### Order

- items
- quantities
- selected options
- item instructions

### Pickup

- ASAP or scheduled
- selected date/time

### Customer

- name
- email
- phone

### Price

```text
Subtotal
Discount
Total
```

### Payment

Prominently communicate:

```text
Pay when you collect
```

Show configured onsite methods such as:

- cash
- card
- meal vouchers
- other accepted onsite methods

There must be **no online payment UI**.

---

## 13. Anti-bot verification

Verification should feel like part of the checkout, not a separate product.

Design:

- verification required state
- verification in progress
- success
- failure / retry

Rules:

- never silently block Place Order
- retry must not clear the cart
- closing verification must not lose checkout data

---

## 14. Place Order CTA

Final CTA:

```text
Place order — €68.00
```

Loading state:

```text
Placing your order…
```

Prevent duplicate submission.

If disabled or blocked, display the exact reason:

```text
Choose a pickup time first.
Complete your contact details.
Complete verification.
The selected pickup time is no longer available.
```

---

## 15. Order confirmation

Show:

- success state
- customer-friendly confirmation
- order reference
- pickup date/time
- total
- onsite payment reminder
- tracking CTA

Example:

```text
ORDER RECEIVED

Thank you, Marie.

Order #EP-4821

Pickup
Today · 20:15

Total
€68.00

Pay when you collect.
```

Primary CTA:

```text
Track order
```

Secondary:

```text
Back to menu
```

---

## 16. Order tracking

Supported lifecycle:

```text
NEW
→ ACCEPTED
→ PREPARING
→ READY
→ COMPLETED
```

Terminal alternatives:

```text
CANCELLED
NO_SHOW
```

Use customer-friendly labels:

```text
Order received
Accepted
Preparing your order
Ready for pickup
Completed
Cancelled
No-show
```

Recommended timeline:

```text
✓ Order received
✓ Accepted
● Preparing your order
○ Ready for pickup
○ Completed
```

Also show:

- order reference
- pickup time
- restaurant address
- total
- onsite payment reminder

The `READY` state must be especially prominent.

If customer cancellation is still allowed, expose a secondary `Cancel order` action with confirmation.

---

## 17. Required system states

Design these explicitly.

### Menu

- loading
- open
- paused
- closed
- empty category
- sold-out item

### Product

- normal
- unavailable
- required option incomplete
- unavailable choice
- edit existing cart item

### Cart

- empty
- populated
- minimum not reached
- maximum exceeded
- promo applied
- promo invalid

### Pickup

- ASAP available
- ASAP unavailable
- scheduled
- no slots
- selected slot
- slot full
- slot lost during checkout

### Checkout

- incomplete details
- invalid email
- invalid phone
- verification required
- submitting
- submission failure
- success

### Tracking

- received
- accepted
- preparing
- ready
- completed
- cancelled
- no-show
- invalid tracking link

---

## 18. Error handling

Every error should explain the next action.

Examples:

```text
We couldn't place your order.
Your cart is still saved.
Please try again.
```

```text
This item is no longer available.
Remove it from your cart to continue.
```

```text
This pickup time is full.
Choose another time.
```

Never reduce known errors to a generic:

```text
Something went wrong.
```

unless no more specific information exists.

---

## 19. Responsive behavior

### Mobile

- single-column transactional flow
- large tap targets
- full-screen or bottom-sheet product customizer
- primary CTA easy to reach
- no content hidden behind fixed homepage controls
- no horizontal form overflow
- no giant pickup-slot wall

### Tablet

- 1–2 column catalog
- cart drawer or panel is acceptable
- checkout remains focused

### Desktop

Preferred structures:

```text
Main checkout step
+
Sticky order summary
```

or a two-column composition inspired by the reservation experience.

Do not use extra width simply to expose more controls.

---

## 20. Accessibility

Support:

- keyboard navigation
- visible focus states
- adequate contrast
- semantic labels
- screen-reader-friendly controls
- practical tap targets
- disabled states communicated with text, not color only

---

## 21. Localization

All customer-facing UI must support:

- French (`fr`)
- English (`en`)
- Spanish (`es`)
- Italian (`it`)

Design for text expansion.

Dates, times, and currency should be localized appropriately.

---

## 22. Payment rules

There is no online payment.

Do **not** design:

- card number fields
- CVC
- card expiry
- Apple Pay
- Google Pay
- PayPal
- Stripe Checkout
- payment gateway pages
- payment authorization screens

The customer pays onsite during pickup.

---

## 23. Admin Takeaway UX

The customer experience is the highest priority, but the operational admin UI also needs clear structure.

### Settings

Group settings into:

- service status
- operating hours
- preparation / cutoff rules
- slot interval
- capacity
- order amount limits
- accepted onsite payment methods

Validation must identify the specific invalid field or rule.

Do not rely on generic messages such as:

```text
Invalid settings. Check hours and limits.
```

when the precise failure is known.

### Menu availability

Show:

- product
- takeaway enabled/disabled
- VAT
- normal availability
- option configuration

VAT should display its numeric value, including the valid default `0%`; invalid out-of-range configuration should be obvious.

### Option groups

Show:

- required / optional
- single / multiple
- selection limits
- choices
- price modifiers
- availability

### Order list

Prioritize:

- order reference
- status
- pickup time
- customer
- total
- payment state

### Order detail

Show:

- items
- options
- special instructions
- pickup time
- customer contact
- payment state/method
- staff notes
- event/timeline history

---

## 24. Admin order workflow

Supported lifecycle:

```text
NEW
→ ACCEPTED
→ PREPARING
→ READY
→ COMPLETED
```

Alternative terminal states:

```text
CANCELLED
NO_SHOW
```

Completion requires payment to be recorded.

The UI should make invalid transitions unavailable or explain why they cannot occur.

Example operational sequence:

```text
Mark as paid
→ Complete order
```

---

## 25. Existing problems the redesign must solve

The new design must explicitly eliminate:

- long wall of pickup-time buttons
- unclear selected pickup time
- no clear ASAP vs Scheduled choice
- disabled `Place order` CTA without explanation
- checkout presented as an unstructured form dump
- unclear anti-bot state
- background bleed / overlapping visual layers
- weak hierarchy between form, summary, and CTA
- important functionality difficult to discover
- excessive scrolling for simple decisions
- generic validation
- poor mobile checkout ergonomics

These are design failures, not acceptable compromises.

---

## 26. Recommended design deliverables

Produce at least:

1. Takeaway menu — desktop
2. Takeaway menu — mobile
3. Item customizer
4. Cart — populated
5. Cart — empty
6. Pickup — ASAP
7. Pickup — scheduled day selection
8. Pickup — scheduled time selection
9. Customer details
10. Review order
11. Verification state
12. Submitting state
13. Order confirmation
14. Tracking — preparing
15. Tracking — ready
16. Tracking — cancelled
17. Important error states
18. Admin Takeaway settings
19. Admin order list
20. Admin order detail

Check key customer screens in both dark and light themes.

---

## 27. Design acceptance criteria

The design is ready for implementation when:

- starting an order is immediately understandable
- every ordering step exists
- item customization is clear
- cart contents and totals are understandable
- ASAP and scheduled pickup are clearly separated
- scheduled pickup is organized by day, then time
- selected pickup is always obvious
- primary CTAs have clear enabled/disabled behavior
- blocked actions explain why
- onsite payment is communicated correctly
- no online payment UI exists
- validation states are designed
- loading, empty, sold-out, and error states are designed
- confirmation is clear
- tracking states are clear
- mobile flow is complete
- FR / EN / ES / IT layouts are considered
- visual language follows `DESIGN.md`
- the experience feels native to L'Échoppe rather than a third-party delivery product

---

## 28. Design north star

The final design must pass both tests:

> **Brand test:** If the logo were hidden, would a returning L'Échoppe customer still recognize this as part of the same restaurant website?

> **Usability test:** Could a first-time customer select food, choose a pickup time, and place an order without needing anyone to explain the interface?

Both must be true.

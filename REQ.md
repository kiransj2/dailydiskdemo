# DailyDish product requirements

## Product and customer promise

DailyDish is a food preordering platform for onboarded locations such as apartment communities, schools, and offices. Preorders help the kitchen plan ingredient purchases and quantities for each meal service. The kitchen cooks in one batch per service and passes the resulting savings on to customers. The menu should make it easy to choose healthier meals by showing portions, protein, and fiber.

Suggested homepage copy:

> **Home-style meals at everyday prices**
>
> Your preorder helps us plan how much to buy and cook. We cook each meal service in one batch, keeping costs down so we can pass the savings on to you.

Show the applicable preorder deadlines near the menu entry point once the customer selects a delivery location. The kitchen can prepare extra portions for customers who miss the preorder cutoff.

## Delivery location and registration

- A delivery location must match an active site already onboarded by DailyDish. The selected site determines the serving hub.
- Let customers search onboarded sites by name or locality. Location detection can suggest nearby onboarded sites. Manual search should remain available while detection runs or when permission is denied.
- After site selection, collect the details needed for delivery there, such as tower and flat, building and floor, or a designated pickup point. Validate the selected site when saving the location and again when placing an order.
- If a site is unavailable, show **“DailyDish doesn’t serve this location yet”** and let the customer search again.
- Recommended signup flow: check coverage before sending an OTP. Once a site is confirmed, carry it through registration and show its hub’s menu and ordering schedule.

## Daily menus and ordering hours

- Kitchen admin requires sign-in before staff can see its editor or publish a menu. Demo sign-in accepts any nonempty password when no admin password is configured.
- Staff must be able to publish a different lunch and dinner menu each day. Configure menus by serving hub, delivery date, and meal. Reuse catalog entries for dish details, portion sizes, and nutrition.
- Ordering hours are configurable. Maintain separate preorder cutoffs and late-order closing times for each meal. Support different schedules by hub and weekday, including separate Saturday and Sunday hours. A date override for holidays or one-off closures is a proposed addition.
- The times below are the examples discussed. Customer-facing times and checkout enforcement must use the effective schedule for the selected hub, date, and meal in IST.

| Meal | Preorder | Late ordering from remaining portions |
|---|---|---|
| Lunch | Before 10:00 AM | 10:00 AM to noon |
| Dinner | Before 5:00 PM | 5:00 PM to 7:00 PM |

- Before the cutoff, show the preorder deadline and early-bird offer. At the cutoff, switch to the extra precooked portions allocated for late orders. Close ordering at the configured end time or when stock runs out, whichever comes first.
- Show the current state beside each meal tab. Example labels include **“Preorder by 10 AM”**, **“Limited portions · Order until noon”**, **“Sold out for today”**, and **“Lunch orders closed.”**
- Staff should be able to set late-order quantities per dish when publishing a menu. Check remaining stock for standalone items and every component of a combo.

## Pricing and checkout

- The early-bird discount is currently **10%** and is expected to increase to **15%**. Staff must be able to change the percentage through configuration. Use the same effective percentage and eligibility rules across the menu, cart, checkout, and order validation.
- Before the cutoff, show the offer and deadline on the menu. In checkout, show the savings in rupees on the meal card and itemize the applied discount in Billing Details. A ₹40 eligible item saves ₹4 at 10% or ₹6 at 15%, before delivery and tax.
- After the cutoff, sell remaining portions at their regular price. Tell customers what they could have saved on the eligible items currently in their cart. For example, **“You could have saved ₹30 by preordering”** applies to ₹200 of eligible items at a configured rate of 15%. Show the missed savings as a message alongside the actual payable total.
- Show the delivery location and arrival window, then itemize the charges and discounts that make up the payable total. Keep the items and prices confirmed on orders already placed.
- Recheck the applicable price, ordering window, and availability on the server before accepting an order. If a cutoff passes or stock changes while a cart is open, explain the change and let customers review the updated cart before payment.

The later pricing clarification identifies 15% as the planned early-bird discount. The initial discussion also mentioned a 15% increase for food cooked after the cutoff. If a separate cooking-based surcharge is still intended, its trigger, price base, and interaction with the discount need confirmation.

## Customizable combos

| Section | Selection rule | Suggested control |
|---|---|---|
| Main | Choose exactly one item | Radio buttons |
| Curry, Starter or Side | Choose exactly one item across the entire section | Radio buttons |
| Add-ons | Optional. Choose any number of distinct options | Checkboxes |

- Show the portion, protein, fiber, and price adjustment for each option. Label options with zero extra cost **“Included.”**
- Update the selected items, total protein and fiber, and total price in the sticky footer as choices change. Enable **Add to cart** when both required choices are valid.
- Allow staff to configure the base price, choices, add-ons, and price adjustments for each published combo. During late ordering, offer only selections that can be fulfilled from remaining stock.
- Example from the supplied combo screen. An ₹89 combo with a ₹5 Egg Chilli upgrade and ₹10 Raita add-on totals ₹104 before the early-bird discount.

## Protein and fiber

- Show protein and fiber for the portion actually offered on menu items, combo options, add-ons, and bulk packs. Store values against the corresponding portion or pack in the dish catalog.
- Sum the selected portions and quantities for each combo and show a **Cart nutrition** total in the cart and checkout. Recalculate it when quantities or selections change.
- If a nutrient value is missing, show that it is unavailable for the item and mark the affected total as partial.
- Example from the supplied combo screen. Jeera Dal lists 6 g protein for the 200 g combo portion and 3 g for the 100 g add-on.

## Bulk preorders

- Staff select which dishes offer sharing packs and enter the price per 500 g. Calculate the price by multiplying that amount by the number of 500 g increments. Customers use minus and plus buttons to choose from 500 g through 5 kg.
- Sharing packs are available only before the selected meal’s preorder cutoff. Show **“Sharing packs”** and the available sizes on each eligible dish, then show the deadline in the pack picker. After the cutoff, show **“Preorders closed”** on the dish’s sharing pack row.
- A sharing pack must cost less per 100 g than the same dish’s single portion at its preorder price. Explain the savings in the homepage banner. Show the selected pack’s total price in the picker.
- A dish may still be available in regular portions during the late-order window if those portions are on the menu and in stock.
- Put the pack size in the item name in both cart and checkout, such as **“1.5 KG Chicken Dum Biryani.”** Show the pack count when customers order more than one. Show the price and available pack-level nutrition in the cart. Flag bulk items if the cutoff passes before the order is placed. Confirm whether bulk packs qualify for the early-bird discount.

## Live-site observations

- On November 20, 2026, the signed-out Brigade Opus configuration reported a 10% early-bird offer with 10 AM and 5 PM cutoffs. It reported same-day ordering through 12:30 PM for lunch and 7:45 PM for dinner, with separate stock windows disabled. These findings apply to the hub observed. [DailyDish menu](https://dailydish.in/home)
- Around 2:10 PM IST, the Lunch tab displayed **“Serving soon”** while the timing response reported closed. Dinner showed **“10% off”** without the deadline beside it. Some dishes already displayed remaining serving counts. [DailyDish menu](https://dailydish.in/home)
- The public signup screen asks for a name and phone number before sending an OTP. The site code routes customers without a saved address to location selection after verification. The provided location screenshot showed GPS detection and a free-text home name. OTP verification and a live purchase were outside the review. [DailyDish signup](https://dailydish.in/login)
- The provided checkout screenshots show the applied 10% discount on both the meal card and Billing Details, with a ₹4 saving on a ₹40 item. The provided combo screenshots use circular controls in all three sections and show protein in the summary.
- The admin interface was outside the review. The controls described above specify the desired administrative workflow.

# Erayah admin guide

Everything about running the shop happens at **erayah.com/admin** (your web address followed by `/admin`). It works on a laptop and on your phone.

## Signing in

1. Go to `/admin`. You'll see the sign-in page.
2. Enter your email and password, or tap **Sign in with an email link instead** and we'll email you a link that signs you in.
3. Forgotten your password? Use the email link option to sign in.

Only people added as admins can get in (ask your developer, who runs `pnpm create-admin <email>`). Anyone else sees "No access".

- **Owner** can do everything.
- **Staff** can only see and update orders and products.

## The dashboard

The first screen shows:

- today's orders
- this week's revenue
- how many orders are **waiting for you to confirm**
- pieces running low (2 or fewer) or out of stock

Below that are your latest orders and the words shoppers searched for but didn't find.

When a new paid order comes in, a number appears next to **Orders** in the menu and you hear a soft chime. (The chime only plays after you've clicked somewhere on the page once; that's a browser rule.)

## Handling a new order

1. Open **Orders**. New paid orders are marked **New**. Tap the order number.
2. Check the order page:
   - **Gift orders** have a gold box at the top with the gift note. Packing slips for gifts never show prices.
   - **Customer:** tap the phone number to call, **WhatsApp** to message them, or the email to write.
   - **Ship to:** use **Copy address** to paste it into your courier's booking form.
3. Under **Status**, choose **Confirmed** and tap **Mark as confirmed**. You can add a note, e.g. "Spoke to customer".
4. When it's packed, tap **Packing slip**. It opens ready to print on A5 paper. Then mark it **Packed**.
5. When you hand it to the courier:
   - Fill in **Courier** and **Tracking number** under *Shipping records* and tap **Save**. These are for your records only; customers never see them on the website.
   - Mark the order **Shipped**.
6. When it arrives, mark it **Delivered**.

Other things you can do on an order:

- **WhatsApp the customer** with a ready-written message that fits the order's status. You can edit it before sending.
- **Invoice** downloads the customer's bill as a PDF, if they ask for it again.
- **Cancel** (before it ships) puts the pieces back in stock. If the customer paid, refund them from the **Razorpay dashboard**, then mark the order **Refunded**. The Razorpay links on the order page take you straight there.
- **Returned** also puts the pieces back in stock. Returns are not refunded: create a gift card for the order value in **Gift cards** (expiry 12 months from today) and send the code to the customer.
- If an order's timeline shows **REFUND NEEDED** in red, the payment arrived after the pieces had sold out. Refund it in Razorpay.

On **Orders** you can search by order number, name, phone or email, and filter by status, payment or dates. **Export CSV** downloads the orders you're looking at, for a spreadsheet.

Orders marked "Awaiting payment" are checkouts where the customer didn't finish paying. They're hidden unless you choose them in the Status filter, and they cancel themselves after an hour.

## Adding a product with its 4 photos

1. Open **Products → New product**.
2. Fill in:
   - **Name:** the web address fills itself in.
   - **Category**
   - **Price:** in rupees, including GST.
   - **Stock**
   - **Short description** and **Description**. In the description you can use simple formatting; **Preview** shows how it will look.
   - **Materials**, **Stones**, **Colours** and **Styles**. These power the filters and style pages.
3. Leave **Published** off for now and tap **Create product**.
4. The **Photos** panel appears. Drop a photo onto each slot, or tap a slot to choose a file:
   1. **Worn close-up**: on a model, close. This is the photo on product cards.
   2. **Lifestyle**: a styled scene. Shown when someone hovers over a card.
   3. **Product only**: the piece alone on a plain background.
   4. **Detail close-up**: stones, setting or clasp up close.

   You can also add a **Flat lay** and a short **Video**.

   Photos are resized and made web-friendly automatically. iPhone photos in HEIC format need exporting as JPEG first.
5. Check each photo's description (it's filled in for you; it helps people who use screen readers). Drag photos by the grip to change their order on the product page.
6. Optionally pick pieces for **Complete the Look** and **Cross-sell**, and switch on **New Arrival**, **Best Seller**, **Gifts for Her** or **Hero piece**.
7. Switch **Published** on and tap **Save product**. It's in the shop straight away.

A red message means a published piece is missing one of the four photos. Shoppers see a plain placeholder until you add it.

Other things you can do with products:

- In the **Products** list, tap a price or stock number to change it, then press Enter.
- **Duplicate** makes a draft copy, useful for a new colour of the same piece.
- **Archive** hides a piece from the shop.
- **Delete** only works for pieces nobody has ordered yet.

## Reordering a collection

1. Open **Merchandising** and choose a category, **New Arrivals** or **Most Loved**. The homepage shows the first four New Arrivals.
2. You see the pieces exactly as customers do, four to a row. Drag a piece by its grip (top-left corner) to a new place. On a phone, press and hold the grip first.
3. Tap **Save order**. The shop updates immediately.

Gold notes suggest improvements, such as "Two Gajā pieces are next to each other" or "The first 4 slots have no hero piece". They're only advice; you can always save.

**Lifestyle tiles** are photos placed between products. Add one under the grid (image, caption, link, one or two columns wide), then drag it into place with the products and save.

## Issuing a gift card

Erayah doesn't use coupons or discount codes. To give someone credit, issue a gift card:

1. Open **Gift cards**.
2. Tap **Generate** for a code (or type your own).
3. Enter the amount in rupees, an optional expiry date and a note (e.g. "Birthday gift for Priya").
4. Tap **Create gift card**, then **Copy** the code and send it to the customer.

At checkout they enter the code; the balance comes off their total and anything left stays on the card. The list shows each card's remaining balance and the orders it was used on. **Deactivate** stops a card from working.

## Analytics

**Analytics** shows how the shop is doing, worked out only from your orders (nothing tracks visitors).

- Pick a period at the top: Today, Last 7 days, Last 30 days, This month, Last month, or your own dates. Every figure shows how it changed against the period just before, for example ▲ +18%.
- **Total revenue**, **Orders** and **Average order value** come first. A sale is a paid order that wasn't cancelled, counted on the day it was paid. Refunded orders aren't counted; they're listed in small print under the revenue.
- **Sales over time** has one chart for revenue and one for orders. Hover or tap a point for that day's figures.
- **Sales by category**, **Best-selling products** (tap "Show versions" to see each colour) and **Sales by location** (switch to cities) show where the money comes from.
- **Low stock alerts** lists pieces at or below your chosen number, with a rough "runs out in about N days" from the last 30 days of sales. Change the number there and tap **Save**. This part always shows today's stock, whatever period is chosen.
- **Gift card usage** shows what you issued and what was redeemed in the period, and how much is still unspent.
- **Repeat customers** recognises customers by phone number. Numbers are partly hidden on screen. Tap a name to see that customer's orders.

Every section has **Download CSV** for a spreadsheet. The repeat-customers list, which has full phone numbers, can only be downloaded by the owner.

## Messages from the Contact page

Messages people send through the form on the Contact page appear under **Messages**, newest first. The number next to it in the menu is how many you haven't read. Reply by tapping their email, phone or **WhatsApp**, then **Mark read**. The site never sends emails itself.

## Editing the About page

Open **Content → Pages → About**. The text is split into sections by lines that start with `## `:

- The first three sections are the story blocks, each shown beside a photo.
- The section whose heading mentions **founder** is the founder section. Put the name in bold, like `**Your Name**`.
- The section whose heading mentions **craft** is the craft section.

Under **Photos**, upload a wide opening image, the story images (in the order of the story blocks) and your portrait. Then tap **Save page**.

Testimonials you add under **Content → Testimonials** appear on the About page as a slider, up to six.

## Everything else

- **Homepage:**
  - hero slides (desktop and mobile photo, label, link; drag to reorder)
  - a photo for each category
  - the brand story and its highlighted phrase
  - the announcement bar at the top of every page

  **Preview** opens the shop.
- **Shipping:** the default charge and any special rates by state or pincode, a free-shipping threshold and delivery times. **Test a delivery** shows what a pincode would pay.
- **Content:** FAQs (drag to reorder, group them), testimonials, and the About, Shipping & Returns, Privacy Policy and Terms pages. About also takes a founder photo and story photos.
- **Settings** (owner only):
  - business name, address and GSTIN for invoices
  - GST rate
  - order number prefix
  - WhatsApp number, Instagram link, support contacts and business hours (shown on the Contact page)

Every save shows a short confirmation at the top of the screen, and the shop updates straight away.

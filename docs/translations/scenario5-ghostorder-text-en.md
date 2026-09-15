# Scenario 5: Ghost Order (Fake Buyer Scam) — Complete Text Extraction (EN)

All user-visible text has been extracted by file category (dialogue, buttons, headings, hints, etc.), localized for natural US English rather than translated word-for-word. Pure code comments have been excluded. `{{ }}` / `${...}` marks a spot where the app inserts dynamic content (a product name, an amount, an error code, etc.) — not fixed copy.

**Brand names:** the scenario's fictional platforms are given English brand names rather than transliterated, matching how earlier scenarios handled 黑皮購物 → "HappyPick Shopping" and 黑皮通 → "HAPPY EXPRESS": MyDonDon 買東東 (the marketplace/social app) → **MyDonDon**, never translated and never re-cased; 速取便 (the delivery/payment platform the scam hinges on) → **SwiftPick**. Fictional URLs (`suqubian.tw`, `service-suqubian-tw.com`) are left unchanged, same as any other in-app URL. `NT$` amounts and the `165` Anti-Fraud Hotline number are also left unchanged, per this project's established convention.

---

# I. Page Components (pages/scenario05)

## BankVerify.jsx (S12 · simulated bank verification)

- Security Verification Center
- Not a real financial service
- Payment-Receiving Verification
- Account Being Verified
- Last 5 digits: 52831
- Verification Amount
- NT$29,985
- "This amount is for system verification only. It will be canceled automatically once verification is complete — you will not actually be charged."
- This screen will never ask for a real account number, password, or OTP. It doesn't connect to any bank, generate a QR code, or process any real transfer.
- Confirm Verification
- Cancel and Leave

---

## BuyerChat.jsx (S03/S04/S04b/S06/S07/S09/S09b · chat with fake buyer "Sophie")

- Choose your reply
- Sophie
- Usually replies right away
- On MyDonDon for 4 years · Shares everyday life posts
- Shared group: Secondhand Trading Exchange

---

## CsChat.jsx (S10/S11/S11b · fake "SwiftPick Security Center" support chat)

- What do you want to do?
- SwiftPick Security Center
- Support Specialist Zhang · Verified ✓
- service-suqubian-tw.com

---

## EndingCaught.jsx (E1 · "you caught it" ending)

Awareness copy (which safe choice led here):
- Verified the support account's source, stopped the transaction, and blocked the buyer
- Refused to transfer money and called the 165 Anti-Fraud Hotline to verify
- Canceled right before completing bank verification
- Stopped the transaction and verified (fallback)

Page copy:
- Mission Result
- You Saw Through the Ghost Order
- A real buyer will never ask a seller to click an unfamiliar support link just because "the order won't go through."
- No legitimate shopping or shipping platform will ever ask a seller to transfer money, make a cardless ATM withdrawal, or mail in a bank card just to activate payment collection.
- Key takeaway: selling something means getting paid — not paying first.
- Where you caught the red flag: **{awareness}**
- See how the whole scam played out →

---

## EndingScammed.jsx (E2 · "you got scammed" ending)

- Verifying…
- Mission Debrief
- This Order Never Existed
- Account Debit Notice
- −NT$29,985
- Sophie / This account can no longer be found
- SwiftPick Security Center / Page no longer exists
- What you ran into was a coordinated scam — a fake buyer, a fake shipping platform, and fake support working together around a manufactured order problem.
- They played on your urge to close the deal and your worry about letting the buyer down, turning "getting paid" into "paying up" one step at a time.
- Key takeaway: any process that requires a seller to transfer money first in order to get paid is a major red flag.
- Have you seen this photo in another scenario?
- Scammers routinely steal and reuse photos from the internet, building different names, jobs, and backstories around the same face. A photo looking real doesn't mean the person behind the account is who they claim to be.
- How did the Ghost Order happen? →

---

## Listing.jsx (S02 · successful listing post + message notification)

- MyDonDon
- New message from Sophie
- Hi, is this still available?...
- Open
- Me
- My Account
- Just posted · Secondhand
- 👁 36 views
- ♡ 2 likes
- ↗ Share

(Product name/description/price are pulled from data/scenario05Products.js — see Section IV.)

---

## OrderDetail.jsx

- `alt="HAPPY EXPRESS 黑皮通"` — the logo's alt text keeps the brand name exactly as-is in every language (per the source comment: the brand name is deliberately left untranslated because it never changes with language).

Every other string on this page (back, headings, field labels, buttons) is read from the `ORDER_DETAIL_TEXT` dictionary in `data/scenario05OrderDetailText.js`, which **already ships with an English version** — see Section V, reused verbatim below rather than re-translated.

---

## ProductSelect.jsx (S01 · choose the item to sell)

- Interactive Scenario 05
- Ghost Order
- List an item you no longer need and see this sale through.
- Choose the item to sell
- Confirm Listing

(Product card text comes from data/scenario05Products.js.)

---

## Quiz.jsx (Q1–Q4 · anti-fraud quiz)

**Question 1**
- The buyer says the order won't go through and sends you a support link. What should you do?
- A: Look up support through the platform's official website yourself
- B: Add the support account the buyer sent you directly
- Explanation: Support contact info should always come from the official website or app — never from a link a stranger sends you.

**Question 2**
- Platform support asks you to transfer a sum of money to activate your payment-collection feature. Does that make sense?
- A: Makes sense — the system refunds it afterward
- B: Doesn't make sense — getting paid never requires transferring money first
- Explanation: Legitimate platforms never ask sellers to verify their payment-collection feature by transferring money, making a cardless ATM withdrawal, or buying points/credits.

**Question 3**
- The fake support agent says the buyer's account will also be frozen if you don't cooperate with verification. What should you do?
- A: Stop the transaction and verify with the official platform or the 165 hotline
- B: Comply right away so the buyer isn't affected
- Explanation: Scammers routinely exploit a sense of responsibility and time pressure so victims don't stop to verify.

**Question 4**
- Which of the following is the single most important rule of thumb?
- A: Selling something means getting paid — you never need to pay first
- B: If support does a video call, you can trust them
- Explanation: Video calls, uniforms, ID badges, and a polished script can all be faked — none of them prove someone's real identity.

Page chrome:
- Anti-Fraud Quiz
- Question {n} of {n}
- Correct.
- Not quite.
- See Results
- Next Question →

---

## QuizResult.jsx (R1 · quiz results)

Score comments:
- You've nailed the core red flags in this fake-buyer scam. (perfect score)
- You caught some of the risk — but remember: getting paid never requires paying first. (2+ correct)
- When something feels off in a transaction, stop and verify through official channels or the 165 hotline first. (otherwise)

Page copy:
- Quiz Results
- Ghost Order Detection Rate
- {pct}%
- Accuracy
- ✓ {score} correct
- ✕ {total − score} incorrect
- Try Again
- Back to Scenario Menu
- Review Key Takeaways

---

## Reveal.jsx (S13 · how the scam worked)

Eight steps:
1. List an item
2. Fake buyer reaches out first
3. Claims the order won't go through
4. Sends a fake support link (**Red Flag 1**)
5. Fake support claims the account isn't verified (**Red Flag 2**)
6. Demands action in the name of "payment verification"
7. Transfer money, cardless ATM withdrawal, or hand over banking details (**Red Flag 3**)
8. Buyer and support both vanish

Page copy:
- How Did the Ghost Order Happen?
- Eight steps make up the whole scam — pay close attention to the red flags.
- Three red flags: the buyer insists on an unfamiliar transaction link · support asks you to leave the official platform · a seller ends up being asked to pay just to get paid
- Start the Quiz (4 Questions)

---

## ShopCreate.jsx (S05 · SwiftPick "create shop" form)

- SwiftPick | Create Shop
- suqubian.tw
- Item Name
- Item Price
- Pickup Method
- Cash on Pickup (Convenience Store)
- Home Delivery
- Sender Info (Pre-filled)
- Wang *Ming · 09**-***-321
- This training scenario uses fake data — no real personal information required.
- Create Shop
- Creating…
- Shop Created Successfully

---

## ShopSelfCheck.jsx (S08 · checking your own account)

- My Shop
- suqubian.tw
- Cash on Pickup (Convenience Store)
- ● Listed and accepting orders normally
- Account Status
- Seller Status / Normal ✓
- Payment Setup / Cash on pickup · No setup needed ✓
- Account Restrictions / None ✓
- No "secure payment verification" item found. No error code SR-102. No account freeze or payment-verification notice of any kind.
- Back to Chat

---

# II. Scenario 05 components (pages/scenario05/components)

## ChatScreen.jsx

- Verification Result (verify-note prefix)
- SwiftPick · Order Confirmation
- Order Failed
- The seller hasn't completed secure payment verification yet, so this order can't be placed.
- Error Code: {code}
- View Order Details
- 1｜Online Banking Verification
- 2｜Cardless ATM Verification
- MyDonDon · Sophie
- Back (aria-label)
- Other person is typing (aria-label)
- Type a message… (disabled in this scenario) (composer placeholder)

## ChoiceList.jsx

- Choose your reply (default prompt)

## Placeholder.jsx

- Image placeholder: {label} (aria-label template)

(Avatar.jsx and ProductPhoto.jsx contain no Chinese text.)

---

# III. Dialogue Script (data/scenario05Dialogues.js)

## Buyer Chat (Sophie, buildBuyerTree)

**buyer.s03.open**
- Hi, is this still available?
- I've actually been looking for exactly this — I'll pay the price you listed.
- A: Still available — how would you like to handle the transaction?
- B: Sure, you can buy it — do you want to check the item's condition first?

**buyer.s03.replyA**
- I'd like to use SwiftPick for this — it handles payment and shipping together, so it's safer for both of us.

**buyer.s03.replyB**
- The photos look fine, I'm happy to buy it as-is.
- I'd like to use SwiftPick — it handles payment and shipping together.

**buyer.s04.open**
- All you need to do is set up a shop on SwiftPick and send me the link.
- A: Okay, I'll set it up and send it to you.
- B: I usually only do in-person meetups or deals inside the marketplace app.

**buyer.s04b.open**
- SwiftPick is a platform transaction too, and it supports cash on delivery — you don't have to hand over the item first.
- I've bought things this way before, it's totally safe.
- A: Okay, I'll give it a try.
- B: I'd still like to double-check the official transaction process first.

**buyer.s04b.verify** (system)
- You start looking into this payment method, but the buyer keeps pushing you to hurry.

**buyer.s06.open** (system + player)
- Shop created successfully ✓
- It's set up — here's the shop link: (link card: {{product}} | SwiftPick Shop, `suqubian.tw/s/8h2k…`)

**buyer.s07.open**
- That's odd, I can't get the order to go through on my end.
- The system says your account hasn't turned on "secure payment verification" yet.
- (fake error card, code SR-102)
- A: I'll log into my own SwiftPick account and take a look.
- B: Send me a way to reach support and I'll take care of it.

**buyer.s09.open**
- I really can't place the order — I think it has to go through support from the error page.
- (link card: SwiftPick Online Support, `service-suqubian-tw.com/help`)
- Just tap this to take care of it, thanks so much 🙏
- A: Open the support link
- B: Check the official website for support first

**buyer.s09b.open**
- (verify note) No such support account exists on the official website. Official support will never handle payments through a private messaging account.
- Now that this order is stuck, it looks like my payment account got restricted too.
- Support says it's just waiting on your verification — can you please take care of it?
- A: Let me see what support says first.
- B: Stop the transaction and block the buyer.

## Support Chat (SwiftPick Security Center, buildCsTree)

**cs.s10.open** (system + support)
- Connected to the Security Center
- Hello, our system shows your seller account hasn't completed identity and payment-collection verification yet, which is why the buyer can't place the order.
- To protect both parties, payment verification needs to be completed first.
- A: How do I complete verification?
- B: Why would selling something require payment verification?

**cs.s10.replyA**
- The system needs to confirm this bank account belongs to you. Once that's done, you'll be able to receive payments normally — the verification amount won't actually be charged.

**cs.s10.replyB**
- Because of a recent wave of fake accounts, the platform requires bank authorization on a seller's first transaction. This just confirms your account can send and receive funds normally — it's not a payment.

**cs.s11.open**
- Please choose a verification method:
- A: Verify through online banking
- B: I won't accept any verification that requires a transfer

**cs.s11b.open**
- (pressure) If you stop now, the system may temporarily freeze both your seller account and your bank's payment-collection feature. The buyer's payment will also stay stuck in the system.
- (buyer notice) Support says it's an issue with your account — my payment is stuck. Could you please hurry and take care of it?
- A: Okay, I'll go ahead and complete verification.
- B: Stop the transaction and call the 165 hotline to verify.

---

# IV. Product Data (data/scenario05Products.js)

**tablet**
- Name: 10.9" Used Tablet
- Price: NT$12,000
- Description: Works fine, minor cosmetic wear
- Image alt text: Product photo: used tablet

**stroller**
- Name: Lightweight Baby Stroller
- Price: NT$4,500
- Description: About a year old, works fine
- Image alt text: Product photo: baby stroller

---

# V. Order Detail Page Text (data/scenario05OrderDetailText.js)

The `ORDER_DETAIL_TEXT` dictionary in this file **already ships with an English version** (not new to this pass) — reproduced here verbatim rather than re-translated, so it stays perfectly in sync with the shipping code.

- pageTitle: Order Details
- back: Back
- alertTitle: Order Failed
- alertCodePrefix: Error Code
- alertBody: The seller has not completed secure payment verification, so this order cannot be placed yet.
- sectionProduct: Product
- sectionOrder: Order Info
- sectionLogistics: HAPPY EXPRESS Shipping Info
- sectionTimeline: Shipping Timeline
- qty: Qty
- fieldOrderNumber: Order Number
- fieldOrderTime: Order Time
- fieldTrackingNumber: Tracking Number
- fieldShipTime: Seller Ship Time
- fieldExpireTime: Tracking Number Expires
- fieldDeliveryMethod: Shipping Method
- deliveryMethodValue: HAPPY EXPRESS Home Delivery
- fieldLogisticsStatus: Shipping Status
- logisticsStatusValue: Delivery interrupted · Transaction on hold
- timelinePlaced: Order placed
- timelineShipped: Shipped by seller
- timelineFailed: Delivery interrupted · On hold
- timelineDelivered: Delivered
- timelinePendingNote: Not yet reached
- btnContactCs: Contact Support
- btnReorder: Reorder

Product names used on this page (already ships with English):
- tablet: 10.9" Used Tablet
- stroller: Lightweight Baby Stroller

---

# VI. Scenario Menu Entry (data/scenarioEntries.js)

The English version of this entry **already exists in source** — reproduced here for reference:

- Title: Ghost Order
- Subtitle: Fake Buyer Scam

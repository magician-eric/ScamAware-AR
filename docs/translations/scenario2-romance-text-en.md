# Scenario 2: Love Script — Complete Text Extraction (EN)

All user-visible text has been extracted by file category (dialogue, buttons, headings, hints, etc.). This is a **localization pass, not a literal translation** — chat/dialogue text is written the way an actual American 20-something would text on a dating app: short bubbles, pauses, a little coy, not a novel. Same story beats, scam progression, manipulation pacing, and player choices as the Chinese source. Platform/UI text (BITION, buttons, warnings, safety alerts) stays clear and formal, matching a real app's tone. Pure code comments have been excluded. `${...}` marks a spot where the app inserts dynamic content (an amount, a name, etc.) — not fixed copy. Arrows (→) show a player's reply choice followed by Emily's response; `\n` marks a line break inside the same chat bubble — each `\n`-separated fragment is meant to land as its own short beat, not one dense paragraph.

---

# I. Page Components (pages/scenario02)

## Briefing.jsx

- Love Script | Romance Scam
- Back to Scenario Menu
- Swipe, Fall, Fooled
- From a dating app to a crypto investment trap
- You're about to experience how a match turns into real feelings — and how those feelings get used to pull you into a fake investment platform.
- Start the Experience

---

## DatingBrowse.jsx

- 2.5 mi
- Graphic Designer
- Loves traveling, coffee, and movies. Usually out taking photos on weekends.
- Coffee / Travel / Photography
- 5 mi
- Elementary School Teacher
- Likes hiking and browsing markets on weekends — currently learning to pour-over coffee.
- Hiking / Coffee / Desserts
- 2 mi
- Admin & Planning
- Just moved to Taipei. Into coffee, movies, and walks. Hoping to meet someone easy to talk to.
- Coffee / Movies / Walks

Sophie's mini-storyline:
- Hey, you're into photography too?\nWhat do you usually shoot?
- Mostly landscapes → Same!\nWe should swap spots sometime.
- Mostly portraits → Oh nice.\nGuess our styles are kinda different then.
- Whatever's in front of me → Ha.\nSame, honestly.
- Hey so...\nI don't think we're really a match.\nThanks for chatting though!
- Sophie has ended the match

Lina's mini-storyline:
- What do you usually do on your days off?
- Stay in and relax → Oh yeah?\nThought you'd be more the "out and about" type.
- Get out and explore → Nice!\nWe should hang out sometime.
- Depends on the day → Ha.\nThat's a hard one to read 😅
- Hey, so I've been thinking...\nMaybe it's best we don't keep talking.
- Lina has unmatched

- Keep Browsing
- Someone's Interested in You
- Someone just liked you.\nWant to see who?
- See Who It Is
- Not Right Now
- Emily liked you
- See Her Message
- Back
- You Passed on This Match
- On a real dating app, it's totally your call who you keep talking to.
- To finish this training scenario, we'll continue with Emily's chat as the teaching example.
- Enter the Case Study
- Back to Scenario Home
- Pass
- Like

---

## DatingChat.jsx (matched, pre-LINE chat)

- Hey~ how's your day going?
- Hey~\nsaw your profile.\nYou seem easy to talk to 😊

Round 1:
- Pretty good, just got off → Long day, huh~\nGo rest up.\nDon't bring work home again.
- Kinda tired today → Aw 🥺\nSleep tonight, okay?\nNo more late nights.
- Same as usual, you? → Been a little busy myself.\nFinally getting to relax now though.

- What do you usually do after work?

Round 2:
- Watch stuff, play games → Sounds relaxing~\nWhat are you watching lately?
- Work out → Wait.\nYou actually work out?\nSo disciplined.\nI just wanna lie down after work 😂
- Chill at home → Same here~\nSometimes I just wanna lie there scrolling my phone.

- I don't know why...\nbut talking to you is easy.

Round 3:
- Same here → Really?\nGood.\nWas scared it was just me.
- We literally just met though → I know, right?\nBut some people just click.\nYou know?
- Guess we're just on the same wavelength → Ha, same.\nDon't have to overthink it with some people.\nIt just flows.

- Wanna add me on LINE?
- Notifications don't always pop up on here.\nDon't wanna miss you.

LINE decision:
- Sure, let's add each other → Yay 😊\nSending it now.\nDon't miss it.
- This app not good enough for you? (no immediate reply — leads to Branch B)
- I'm good just chatting here (no immediate reply — leads to Branch C)

Branch B (pushes back on "this app isn't convenient"):
- Not really that.\nI just barely check this app.\nScared you'll message and I'll miss it.
- Plus LINE's way easier for photos.\nShowing you what I'm up to?\nThis thing takes forever.
- Fine, let's add each other (no immediate reply)
- So you just want my photos? (no immediate reply — leads to next line)
- Ha, that's not it 😂\nOkay, maybe a little.\nAnyway.\nJust add me.

Branch C (player says "I'm fine chatting here"):
- Fair enough~\nKinda like that you're careful about it, actually.
- I'm just scared of missing your messages.\nDon't meet people I click with like this often.
- Tell you what.\nI'll just leave you my LINE.\nNo pressure to add me now.
- Fine, let's add each other (no immediate reply)
- Wow, that scared of losing me? (no immediate reply — leads to next line)
- I mean...\nkinda yeah.\nYou're just hard to pin down.\nThat's why I keep bringing it up.
- Okay okay, I'll stop teasing.\nJust add me already 😊

Interface text:
- Online
- The following is an anti-fraud education case study
- Add Emily on LINE
- A stranger is steering the conversation to a private messaging app, which can move the conversation outside the platform's reporting and safety tools.
- Go to LINE

---

## DepositPage.jsx

- BITION
- Activate the AI Smart Arbitrage Strategy
- Deposit Amount
- 10,000 CIBDT
- Converted
- Approx. NT$10,000
- Confirm Deposit
- Processing deposit…
- Deposit Successful
- has been credited
- Running
- First settlement countdown: 23:59:42

---

## DepositWarning.jsx

- Fraud Risk Alert
- If someone you met online ties investing, depositing money, or a shared future together, they may be using your feelings to lower your guard. Lines like "let's save for our trip fund together," "for our future," or "we can finally meet once you invest" are classic emotional manipulation tactics.
- Real feelings don't need to be proven with a deposit.
- Stop the Deposit
- I understand the risk, continue anyway
- You chose to stop the deposit. A promise of feelings doesn't prove an investment platform is safe.

---

## EndingPage.jsx

- Him making your heart race doesn't mean he's worth investing in.
- Real feelings don't ask you to prove your trust with money.
- Stop paying immediately if you notice any of the following
- Someone you're dating recommends an investment platform
- You're asked to fund the account with crypto
- Your account balance grows suspiciously fast
- A withdrawal suddenly requires a "deposit," "verification fee," or "unfreezing fee"
- You're told the fees will be refunded along with your profits once you pay
- You're rushed to complete "just one last step"
- If you come across a suspicious investment pitch, stop paying immediately. Call the 165 Anti-Fraud Hotline, or check in with your local police station.
- Back to Scenario Menu
- Try Again

---

## GuaranteePage.jsx

- BITION
- Complete Funds Security Verification
- Verification Amount
- NT$30,000
- Projected balance after completion
- Complete Verification
- Verifying…
- Account Temporarily Frozen
- Our system flagged unusual activity on your account. Please contact online support to complete the unfreezing process.
- See What Happened

---

## PlatformHome.jsx

- Home / Market / Strategy / Assets / Me
- Global Trend Pool / +3.82%
- Cross-Market Arbitrage Pool / +2.46%
- Smart Grid Pool / +4.15%
- 20:31:12   Cross-market spread capture   +12.6 CIBDT
- 20:31:08   Smart grid settlement           +8.2 CIBDT
- 20:30:54   Global trend arbitrage          +16.4 CIBDT
- 20:30:41   Cross-market spread capture     +9.8 CIBDT
- 20:30:22   Smart grid settlement          +11.3 CIBDT
- BITION
- Notifications
- Account
- My Assets
- ≈ NT$
- Today's Earnings
- Deposit / Withdraw / Convert / History
- AI Smart Arbitrage Strategy
- Auto-tracks price gaps across global markets
- Running
- Waiting to Activate
- Est. Daily Return
- Strategy Type
- Steady
- Settlement Asset
- View Strategy
- Live Execution Feed
- Global Multi-Market Arbitrage
- Strategy Market
- Current Status
- Asset Overview
- CIBDT Balance
- Cumulative Earnings
- Me
- Referrer
- Terms of Service
- User Service Agreement

---

## PlatformLanding.jsx

- Active Global Nodes
- Strategies Executed Today / 24,856
- Total Platform Assets / 86,420,000 CIBDT
- BITION
- AI-Powered Digital Asset Trading
- Let AI capture global market spreads for you
- Smart strategies running around the clock
- Real-time tracking of arbitrage opportunities across global markets
- Get Started

---

## PlatformRegister.jsx

- BITION
- Quick Sign-Up
- Phone Number
- Password
- Confirm Password
- Referral Code
- ✓ I've read and agree to the User Service Agreement and Risk Disclosure Statement
- Create Account
- Creating account…
- Account Created Successfully

---

## PrivateChat.jsx (Full storyline after adding LINE)

Interface / system text:
- You've added Emily as a friend
- Video from Emily
- Loading video…
- Video failed to load
- Video load timed out
- Video couldn't load
- Retry
- Skip video and continue
- Photo from Emily
- Close
- ₡ (link-card icon badge)
- Back
- Search
- Call
- Menu
- BITION
- Opening "BITION"…
- Heading back to BITION…

**Day 1 (the day you added her) — light, a little playful, nothing heavy yet**
- Added you back~\nthis is really you, right? 😂
- You added me fast → Well, I did tell you to.\nHad to move fast.\nSomeone else might've swooped in.
- Yep, it's me → Good.\nGlad I didn't add the wrong person 😂\nThat'd be awkward.
- Scared I'd get away? → Kinda.\nWorked hard to find you.\nNot letting you off that easy.
- Still got stuff to do tonight?
- Little bit of work left → Go handle it then.\nBut message me the second you're done.\nDeal?
- Already off → Perfect timing, then.\nI'm stealing you for the rest of tonight.
- If you're calling, I've got nothing else to do → Ha.\nDon't say that.\nNow I'll feel bad pulling you away from stuff.
- You always up this late?\nWhat time do you usually crash?
- Around 11 → Same as me, pretty much.\nMaybe we start saying goodnight to each other.
- Pretty late a lot → Okay.\nI'm in charge of your bedtime tonight.\nNo more staying up forever.
- Depends if someone's talking to me → Oh?\nSo you want me keeping you company till you pass out?
- Guessing you're not sleeping early tonight then?
- Probably not → Good.\nDon't you dare fall asleep on me mid-convo.
- Depends how long you wanna talk → Might be a late one, then.\nNot ready to let you go yet.
- Was gonna sleep, not sure now → Wait...\nis that because of me?
- Anyway.\nNo disappearing on me out of nowhere.\nJust saying.
- (Player) I won't.
- You said it yourself.\nRemember that.

**Day 3 — starting to look forward to her replies**
- Did you fall asleep on me last night?
- And who promised not to just vanish 🙄
- Oops, fell asleep by accident → Knew it.\nI was sitting there holding my phone like an idiot.
- Wait, you were waiting for me? → Obviously.\nKept checking.
- Talking to you relaxes me too much → Okay that excuse actually worked.\nNext time?\nTell me you fell asleep thinking about me.
- Fine.\nI'll let it slide.\nJust this once.
- Had something I wanted to send you last night.\nBut someone passed out first. (sends a 15-second video)
- So you really were waiting for me? → Yeah.\nKept wondering if you were doing it on purpose.\nMaking me miss you.
- I'll give you a heads-up before I crash next time → Good.\nI'll remember that.\nVanish on me again and I'll actually be mad.
- You're gonna give me the wrong idea → Then get the wrong idea.\nNever said you couldn't.

**Day 5 — starting to check in on her daily life**
- Morning~\ngood luck at work today.
- Morning, you too → You too.\nAm I the first one to say good morning to you today?
- Thinking of me this early? → Maybe 😏
- With you rooting for me, today's gonna be good → Guess I should say good morning every day then?
- No disappearing mid-chat yesterday.\nProud of you.
- Eat breakfast yet?
- Yep, I was good → Good boy/girl.\nGuess you actually listen to me.
- Not yet → Nope.\nGo eat.\nI'll just sit here worrying if you don't.
- Waiting for you to remind me → Deal.\nThen you gotta come find me every morning from now on.
- Had lunch yet?
- Eating now → What'd you get?\nSend a pic.\nGotta make sure you're actually eating right.
- Not yet → You really don't take care of yourself, huh.\nSomeone's gotta start managing you.
- Waiting for you to ask me out → Then don't just talk about it.\nAsk me for real.\nAnd show up.

**Day 7 — the flirting picks up**
- Finally off work…
- Snuck a quick video for you before I left. (sends a 15-second video)
- Seeing you just made my whole mood better → Yeah?\nGuess I'll let you see more of me then.
- You look really tired → A little.\nBut you replying kinda helps.
- You filmed this just for me? → Who else would I be thinking about, clocking out? 😏
- We talk so easy now.\nWhen we actually meet...\nyou gonna just stare at me the whole time?
- Probably, yeah → Then I'll stare right back.\nGotta check.\nAm I in there? In your eyes?
- Might get a little nervous → Then I'll sit close.\nNo time to be nervous.
- Depends if you're brave enough to show up → Why wouldn't I be.\nHonestly?\nMore scared you won't wanna let me go, after.

**Day 10 — leaning on each other, small habits forming**
- Hit the worst restaurant ever at lunch today.
- First bite in...\nand you're seriously the first person I wanted to complain to 😂
- Lately, good news or bad, you're the first person I wanna tell.
- That means I matter → Only just realizing that now?
- So I'm your complaint hotline now? → Not just complaints.\nEven when I miss you?\nGuess who I go find 😊
- Same, I wanna tell you stuff now too → Good.\nGlad it's not just me.
- You check my messages before bed every night now, huh?
- Yeah, I do → So I'm part of your bedtime routine.\nInteresting.
- Depends if you message first → So if I didn't, you wouldn't reach out?
- Sometimes → Check tonight then.\nGot something for you.
- Not okay.\nI wanna be on your mind without having to ask.

**Day 12 — full romantic mode**
- You asleep yet?
- Not yet → Perfect.\nWas actually scared you'd already be out.
- About to sleep → Don't.\nNot yet.\nGot something for you first.
- Waiting for your goodnight → You already knew I couldn't let you sleep without one, huh.
- Just filmed this.\nWanted to send it before bed. (sends a 15-second video)
- Night, sweet dreams → You too.\nFirst thing you think of tomorrow?\nBetter be me.
- I'm used to talking to you every night now too → Don't stop.\nI mean it.
- You're actually gonna make me fall for you → Just saying that now?\nI already had a feeling 😊
- ⚠ Safety tip: Building emotional intimacy fast — constant check-ins, sweet talk, selfie videos, all in a short window — can push someone into an attachment before they've even noticed it happening.

**Day 13 — imagining the first meetup**
- Just thought of something.
- What is it? → We've been talking forever...\nand still haven't actually met.
- Thinking about me again? → Kinda.\nWondering when we stop only talking through phones, honestly.
- That sounds kinda mysterious → If we really met up...\nwhere would we even go first?
- Yilan or Hualien — which one?
- Yilan, it's closer → Could find a place with floor-to-ceiling windows.\nNo rushing at night.\nJust stay in and talk.
- Hualien, feels more like a real trip → Want Hualien too, honestly.\nOcean during the day.\nQuiet at night.\nNo one bothering us.
- Anywhere's fine, it's about who I'm with → Okay.\nThat's a dangerous thing to say.\nNow I'm gonna get excited.
- Real talk though.\nTrips cost money.\nDon't want our first one to just be me doing math the whole time.
- I got it → Knew you'd say that.\nBut I don't want you covering everything.\nWanna put in something too.
- Doesn't need to be fancy → Still want somewhere nice, though.\nLet me look forward to it 😂
- We could save up together → I like that.\n"Together."
- If we both save a little more...\nwe could go pretty soon, right?
- (Player) Probably, yeah.
- Okay.\nNo more "someday," then.

**Day 15 — the investment comes up naturally**
- Work was brutal today…
- Rough day? What happened? → Everything's a mess lately.\nNot finishing stuff is bad enough.\nThen they make me redo it.
- Been super busy lately? → Yeah.\nBasically working late every day.\nPay's not even better for it.
- Wanna take a break first? → After my shower.\nJust a lot going on.\nKinda drained.
- Good thing I've had some extra income lately.\nOr the stress would be way worse.
- That's actually why I've been putting time into that platform.
- The extra income you mentioned before? → Yeah, that one.
- Wait, the investment thing? → Mhm.\nSmart strategy a friend put me onto.
- So you're actually making money? → Yeah.\nNot huge each time.\nBut it adds up faster than just my paycheck.
- Was just gonna save it up myself.\nSlowly.
- But then I thought.\nWhat if we did it together?
- Wanna take a look?

**Investment platform link card**
- BITION
- AI-Powered Digital Asset Trading
- Smart arbitrage strategy across global markets, running 24/7
- Open Platform

**Back in LINE after tapping "View Strategy" on the platform**
- See it?
- What company is this? → My friend says it's a platform their analytics team partners with.\nI use it too.
- Is it actually safe? → Friend's used it a while.\nI've withdrawn from it myself.\nJust look for now.\nDon't put money in yet.
- Let me check out the interface first → Sure.\nScreenshot it if you're confused.\nAsk me.

**Before the deposit: the relationship promise**
- You really gonna start this with me?
- I'll put in $10k to try → $10k's plenty.\nDon't need to go big.\nCall it our first trip fund.\nTogether.
- Still kinda scared → I know.\nEveryone is, first time.\nThat's why I said just $10k.\nYou being willing already makes me happy.
- Do you actually want me in on this? → Course I do.\nNot just trying to make money for myself.\nWanna build something.\nWith you.
- Can we make a deal?
- (Player) What kind of deal?
- If you really put that first $10k in...
- I'll officially be your girlfriend.
- Not just chatting anymore.
- For real, this time.
- You serious? → Dead serious.\nWhy else would I keep talking about where we're going?
- So I deposit and you say yes? → It's not about the $10k.\nIt's you.\nBuilding this.\nWith me.
- Don't you dare be lying → Already planned our whole first trip.\nHonestly more scared you won't be brave enough now.
- Go finish it up first.
- When you're back...\nI'll tell you what you get to call me.

**After a successful deposit: upgraded to "boyfriend," then "husband"**
- Really done?
- Done → Boyfriend.
- The $10k's in → Saw it.\nSuch a good boyfriend.
- So what you said earlier, that's real? → Course it's real.\nYou're my boyfriend now.
- Boyfriend~
- Actually...\n"boyfriend" feels kinda formal now that I think about it.
- Husband.
- That feels more like we're actually together.
- Say it again → Husband~\nHow's that?
- You're really good at this → Only with you 😊
- So we're official now? → Obviously.\nThink I'd call just anyone "husband"?

**Profits climbing + the guesthouse room photo**
- Husband, see today's earnings?
- Looks like it's actually working → Yeah.\nEvery time I see it, I'm doing math.\nHow much more for the trip.
- Can we actually withdraw this? → Done it before.\nWouldn't have gotten my husband into this otherwise.
- So we're close to going? → You're more eager than me 😂\nBut yeah.\nAlready looking at places.
- Snuck in a booking yesterday.
- (image) A photo Emily sent of a double room at a Yilan guesthouse — glass walls, mountain view / Photo of the Yilan guesthouse double room
- What do you think?
- Perfect for two → Well yeah.\nThat's who I picked it for.
- You're already this far along? → Why wouldn't I be.\nAlready half-planning what to bring.
- Only one bed in there → Just now noticing? 😂\nOr did you want a separate room or something?
- Let's not pack the schedule too tight.
- Out during the day.\nBack in the room at night.
- Phones on silent.\nJust us.

**The withdrawal**
- Husband, think it's time to pull some out.
- Would cover the room and food.\nEasy.

**After the withdrawal fails**
- Husband, did it go through?
- No, says I need a security verification fee → Wait what 🥺\nWhat do we do...\nI already booked the place though.
- Wants another $30k → $30k, huh...\nBut if we stop now...\ndoesn't that mean everything we put in is just stuck?
- Something's seriously off with this platform → I've been through verification before too.\nGot my withdrawal after.\nMaybe it's just extra checks, first time?
- Was actually gonna surprise you.\nOnce it went through.

**The guesthouse booking payment screenshot**
- (image) A screenshot Emily sent showing the Yilan guesthouse booking payment went through / Screenshot of the successful guesthouse booking payment
- Look.\nI really booked it.
- Even picked the exact spot you said you wanted.
- Kept thinking...\nby now we'd finally stop just talking through phones.
- You actually booked everything? → Yeah.\nAlready planned my outfit.\nAnd you're only now asking if it's real?
- But it wants me to keep paying → I know.\nNot telling you to pay blindly.\nBut it says you get the original back too, once verified.
- Can't put in any more right now → Okay...\nwon't push you.
- Just a little sad, that's all.
- Really thought we were about to meet.

**Amplifying the future fantasy (a trip to Japan)**
- And it's not just this Yilan trip, either.
- If we both save a bit more...\nwe could do Japan after this.
- Hot spring ryokan.\nKyoto.
- Out during the day.\nOnsen and talking at night.
- Not just saying this stuff for fun.
- Have you actually put me in your future? → Why else would I keep saying "we"?
- Scared I'll never get the money back → I get it.\nYou're scared.\nBut we're one step away.\nOne last verification.\nStop now and... everything we built just stays stuck there?
- Are you actually gonna come? → Husband.\nWhy are you even asking this.\nAlready booked the room.\nHonestly more scared you're the one who won't show.

**Final pressure**
- Not trying to force you to keep investing.
- Just feel like we've come this far.\nTogether.
- Finish this one verification.
- Money's out, we go to Yilan.
- Phones on silent when we're there.
- Just me.\nThese next two days.\nOkay?
- Okay, one more try → Best husband ever.\nI'll be there.\nWaiting.
- Let me check the platform first → Okay.\nGo look.\nConfused?\nCome back.
- Something still feels off → I know you're worried.\nBut if you don't do anything...\nour money just sits there.\nForever.

---

## Quiz.jsx

- Someone on a dating app checks in every day and sends flirty selfies within just a few days. What does that most likely mean?
  - They're genuinely into you, no question
  - They may be building an emotional attachment fast (correct)
  - A video call proves they're a real person
  - Dating apps are always safe
  - Explanation: Videos and daily check-ins make things feel real, but they don't prove who someone actually is or what they want.
- Someone sends you a screenshot of their crypto earnings. Which of these is true?
  - The screenshot alone proves the platform is legit
  - Profits in the screenshot mean it's safe to deposit
  - It could be faked — you still need to verify the platform (correct)
  - They're a friend, so no need to check
  - Explanation: Earnings screenshots can be faked. They don't prove a platform is real — you still have to verify it yourself.
- A fake investment site shows your balance climbing fast. What's the most likely explanation?
  - The platform's running advanced AI
  - The number's probably just set on the back end (correct)
  - Your investment already turned a profit
  - Crypto goes up every single day
  - Explanation: The numbers on a platform's screen are usually just what a backend system chooses to display — not real trading results, and they can be set to anything.
- The platform demands NT$30,000 for a "security verification fee" and says you can withdraw everything once it's paid. What should you do?
  - Pay it and finish this "last step"
  - Borrow money to pay it, get it all back later
  - Ask Emily to cover it
  - Stop paying, save your records, check with 165 (correct)
  - Explanation: A real platform never makes you pay to get your own money back. Stop paying and call 165 to verify — that's the right move.
- Which of these is the single biggest red flag in this whole scenario?
  - The other person uses a private messaging app
  - The other person's into crypto
  - A relationship got used to steer an investment decision (correct)
  - The platform has a dark-mode interface
  - Explanation: Emotional manipulation is what made this whole scam work. Everything else was just supporting cast.

Interface text:
- Question {N} of {N}
- ✅ Correct!
- ❌ Not quite
- See Results
- Next Question

---

## QuizResult.jsx

- Strong Fraud Awareness / You can spot the key signs of emotional manipulation, fake platforms, and withdrawal scams.
- Basic Fraud Awareness / You caught some of the warning signs, but stay alert around intimate relationships and on-paper profits.
- High Risk / You may be especially vulnerable to emotional trust, fake profits, and sunk-cost thinking.
- Your Fraud Awareness Score
- See What You Got Wrong
- Hide Wrong Answers
- Correct answer:
- Try Again
- Continue to the 165 Closing Reminder

---

## RiskAnalysis.jsx

- Reveal 1: The relationship levels up the moment you deposit / The instant the player makes their first deposit, Emily switches to calling them "husband" — making a money transaction look like it bought a relationship commitment.
- Reveal 2: The investment gets repackaged as "our future" / Calling the deposit a "trip fund" makes the player feel like they're not investing — they're building a shared future.
- Reveal 3: What's left unsaid does the most damage / The guesthouse, the double room, being alone together, the trip — none of it is spelled out. The player fills in the intimate fantasy themselves.
- Reveal 4: The more you've put in, the harder it is to stop / After the withdrawal fails, the platform demands more using a "verification fee" as cover, while Emily leans on the money already spent and the trip already booked to keep the player from quitting.
- Reveal 5: Refusing to pay gets reframed as refusing her / "I already booked it," "I'll be waiting for you there," "we've come this far" — all of it turns "I won't pay" into "you're rejecting us."
- You didn't click "confirm" because you were greedy.
- What you trusted wasn't the platform. It was everything Emily painted for you — meeting in person, the trip, the intimacy, a future together.
- Be immediately suspicious of any relationship that ties feelings, meeting up, or a shared future to putting money into an investment. Someone who genuinely wants to meet you will never make you prove your feelings with money first.
- Take the Scenario Quiz
- Think you got scammed?
- Call 165 to verify

---

## TopupWarning.jsx

- Highly Likely a Fake Investment Scam
- A legitimate investment platform will never ask you to pay a "security verification fee," "risk-control deposit," "tax," or any other extra charge just to withdraw your own money. The other person is using promises about a guesthouse, a trip, meeting up, and intimacy to make you afraid of losing your future together — pushing you to ignore obvious red flags.
- Having to pay before you can withdraw is a textbook sign of a fake investment scam.
- Stop Paying
- I understand the risk, continue anyway
- You chose to stop paying. Being required to pay before you can withdraw is a clear sign of a fake investment scam.

---

## TradingPage.jsx

- BITION
- AI Smart Arbitrage Strategy
- The system automatically executes arbitrage trades based on price gaps across global markets.
- Strategy Market / Global Multi-Market Arbitrage
- Est. Daily Return / 2.8%–6.5%
- Strategy Cycle / Runs automatically, 24 hours a day
- Minimum to Activate / 10,000 CIBDT
- Settlement Asset / CIBDT
- Activate Now

---

## WithdrawalPage.jsx

- BITION
- Request a Withdrawal
- Total Asset Value
- Cumulative Earnings
- Available to Withdraw
- Estimated Arrival
- Confirm Withdrawal
- Withdrawal request under review…
- Withdrawal Temporarily Unavailable
- Your account hasn't completed funds security verification yet. Once verified, your full withdrawal access will be restored.
- Funds Security Verification Fee
- Complete Security Verification

---

# II. Shared Components (components / tanu)

## components/Hotline165.jsx

- 165 Anti-Fraud Hotline
- If you suspect a scam, or someone you met online is pushing you toward an investment or asking for more and more money, stop sending money right away and call 165 to verify.
- Back to the Experience
- I Choose to Stop Paying

---

## components/RedWarning.jsx

- You made the right call
- Keep Watching to See How the Scam Plays Out
- Call the 165 Anti-Fraud Hotline

---

## components/SafetyAlert.jsx

- Safety Tip
- Hide
- See Why
- Acknowledged
- Got It

---

## tanu/MatchOverlay.jsx

- It's a Match
- Emily sent you her first message
- You're both interested
- Start Chatting

---

## tanu/SuggestedReplies.jsx

- Pick a Reply

---

## tanu/TanuBottomNav.jsx

- Discover
- Messages
- Profile

---

## tanu/TanuHeader.jsx

- Messages (aria-label)
- Profile (aria-label)

---

# III. Shared Data & Cross-Scenario Components

## data/scenarioEntries.js (the Scenario 2 card on the scenario menu)

- Love Script
- Romance Scam

## components/ui/Chat.jsx (shared LINE-style chat component)

- Read

## lib/chatTime.js (date-divider labels, used in Scenario 2's chat)

- Sunday / Monday / Tuesday / Wednesday / Thursday / Friday / Saturday
- Date format: "{Month} {Day}, {Weekday}"

// English dictionary for scenario02 (Love Script / romance scam). Keyed
// directly off the Chinese source string exactly as it appears in the
// codebase - see ./i18n.js for how this is looked up. Chat/dialogue values
// are written the way an actual American 20-something would text on a
// dating app (short bubbles, contractions, pauses via extra \n breaks);
// platform/UI values (BITION, buttons, warnings, safety alerts) stay clear
// and formal. Text is taken from the reviewed docs/scenario2-romance-*.md
// passes, not re-translated from scratch.
//
// A few strings are intentionally mapped to '' - the dating-app's investment
// platform brand "幣勝客" is always paired with an already-Latin "BITION"
// wordmark right next to it in the JSX (e.g. `幣勝客 <span>BITION</span>`),
// so the English UI just drops the Chinese half and keeps "BITION" alone
// instead of showing it twice.
export const EN = {
  // ---------------------------------------------------------------------
  // Shared / repeated across multiple files
  // ---------------------------------------------------------------------
  '返回': 'Back',
  '幣勝客': '',
  '幣勝客 BITION': 'BITION',
  'AI 智慧數位資產交易': 'AI-Powered Digital Asset Trading',
  '在家休息': 'Stay home and relax',
  '還沒': 'Not yet',
  '好吧，那就加吧': "Fine, let's add each other",
  '我已了解，仍要繼續': 'I understand, continue anyway',
  '咖啡': 'Coffee',

  // ---------------------------------------------------------------------
  // pages/scenario02/Briefing.jsx
  // ---------------------------------------------------------------------
  '戀愛劇本｜假交友詐騙': 'Love Script | Romance Scam',
  '心動配對': 'Swipe, Fall, Fooled',
  '從交友軟體到虛擬貨幣投資陷阱': 'From a dating app to a crypto investment trap',
  '你將體驗一段從配對、培養感情，到被引導進入假投資平台的過程。':
    "You're about to experience how a match turns into real feelings — and how those feelings get used to pull you into a fake investment platform.",
  '開始體驗': 'Start the Experience',

  // ---------------------------------------------------------------------
  // pages/scenario02/DatingBrowse.jsx
  // ---------------------------------------------------------------------
  '4 公里': '2.5 mi',
  '平面設計師': 'Graphic Designer',
  '喜歡旅行、咖啡和看電影。假日常常到處走走拍照。':
    'Loves traveling, coffee, and movies. Usually out taking photos on weekends.',
  '旅行': 'Travel',
  '攝影': 'Photography',
  '8 公里': '5 mi',
  '國小老師': 'Elementary School Teacher',
  '週末喜歡爬山和逛市集，最近在學怎麼手沖咖啡。':
    'Likes hiking and browsing markets on weekends — currently learning to pour-over coffee.',
  '爬山': 'Hiking',
  '甜點': 'Desserts',
  '3 公里': '2 mi',
  '行政企劃': 'Admin & Planning',
  '喜歡咖啡、電影、散步。希望遇到可以好好聊天的人。':
    'Into coffee, movies, and walks. Hoping to meet someone easy to talk to.',
  '電影': 'Movies',
  '散步': 'Walks',

  '嗨，看你也喜歡拍照耶，平常都拍什麼？': "Hey, you're into photography too?\nWhat do you usually shoot?",
  '風景比較多': 'Mostly landscapes',
  '我也是！有機會可以交流一下拍照的地方。': "Same!\nWe should swap spots sometime.",
  '人像比較多': 'Mostly portraits',
  '喔喔這樣啊，那我們風格可能有點不一樣。': "Oh nice.\nGuess our styles are kinda different then.",
  '隨便亂拍': "Whatever's in front of me",
  '哈哈，我也常常這樣。': 'Ha.\nSame, honestly.',
  '我們可能還是先不要繼續聯絡好了。': "Maybe it's better if we don't keep in touch.",
  '{datingCandidate01} 已結束配對': '{datingCandidate01} has ended the match',
  '已結束配對': 'has ended the match',

  '你平常放假都在幹嘛啊？': 'What do you usually do on your days off?',
  '這樣喔，我還以為你也喜歡到處走走。': "Oh yeah?\nThought you'd be more the \"out and about\" type.",
  '到處走走': 'Get out and explore',
  '不錯耶，有機會可以約一次。': "Nice!\nWe should hang out sometime.",
  '看情況': 'Depends on the day',
  '這樣的回答有點難猜耶😅': "Ha.\nThat's a hard one to read 😅",
  '不好意思，我後來想了一下，我們可能還是先不要繼續聯絡好了。':
    "Hey, so I've been thinking...\nMaybe it's best we don't keep talking.",
  '{datingCandidate02} 已解除配對': '{datingCandidate02} has unmatched',
  '已解除配對': 'has unmatched',

  '繼續探索': 'Keep Browsing',
  '有人對你感興趣': "Someone's Interested in You",
  '剛剛有一位使用者對你按了喜歡，要看看是誰嗎？': "Someone just liked you.\nWant to see who?",
  '查看對方': 'See Who It Is',
  '先不用': 'Not Right Now',
  '{datingLead} 對你按了喜歡': '{datingLead} liked you',
  '看看她的訊息': 'See Her Message',
  '你已略過這位使用者': 'You Passed on This Match',
  '找到一位可能適合你的新對象': 'We found someone new who might be a good match for you.',
  '查看配對': 'View Match',

  // ---------------------------------------------------------------------
  // pages/scenario02/DatingChat.jsx
  // ---------------------------------------------------------------------
  '嗨～你今天過得怎麼樣？': "Hey~ how's your day going?",
  '嗨～剛剛看到你，覺得你好像滿好聊的😊': "Hey~ I saw your profile and you looked like you'd be fun to talk to 😊",
  '這麼快就看出來了？😂': 'You figured that out already? 😂',
  '第一印象啊～還是你其實很難聊？😂': "First impressions~ Unless you're actually terrible at conversation? 😂",
  '那妳眼光好像還不錯': "Then I guess you've got pretty good taste.",
  '才第一句就這麼有自信喔😂': 'Wow, confident from the very first message 😂',
  '所以妳是看到我才特別傳訊息的？': 'So you saw me and decided you had to message me?',
  '不然咧～總要有點興趣才會主動找你吧😊':
    "Well yeah~ I wouldn't message you first if I wasn't at least a little interested 😊",
  '還不錯，剛下班': 'Pretty good, just got off',
  '辛苦了～\n下班之後要好好休息，不要又把工作帶回家喔。': "Long day, huh~\nGo rest up.\nDon't bring work home again.",
  '今天有點累': 'Kinda tired today',
  '辛苦了🥺\n那你等等要早點休息，不可以又熬夜。': 'Aw 🥺\nSleep tonight, okay?\nNo more late nights.',
  '普通，妳呢？': 'Same as usual, you?',
  '我今天也有點忙，\n但現在終於可以放鬆一下了。': 'Been a little busy myself.\nFinally getting to relax now though.',
  '你平常下班之後都在做什麼？': 'What do you usually do after work?',
  '看影片、打遊戲': 'Watch stuff, play games',
  '聽起來很放鬆耶～\n你平常都看什麼？': 'Sounds relaxing~\nWhat are you watching lately?',
  '去運動': 'Work out',
  '你居然會運動，好自律喔。\n不像我下班只想躺著😂':
    "Wait.\nYou actually work out?\nSo disciplined.\nI just wanna lie down after work 😂",
  '我也是～\n有時候下班只想躺著滑手機。': "Same here~\nSometimes I just wanna lie there scrolling my phone.",
  '不知道為什麼，\n跟你聊天感覺滿舒服的。': "I don't know why...\nbut talking to you is easy.",
  '我也覺得': 'Same here',
  '真的嗎？\n那我就放心了，我還怕只有我這樣覺得。': 'Really?\nGood.\nWas scared it was just me.',
  '我們才剛認識耶': 'We literally just met though',
  '對啊，明明才剛認識。\n可是有些人就是很容易聊得來，不是嗎？':
    "I know, right?\nBut some people just click.\nYou know?",
  '可能是我們頻率比較像': "Guess we're just on the same wavelength",
  '哈哈，我也覺得。\n跟有些人就是不用想太多，很自然就聊下去了。':
    "Ha, same.\nDon't have to overthink it with some people.\nIt just flows.",
  '要不要加個 LINE？': 'Wanna add me on LINE?',
  '這邊有時候通知不太會跳，我怕漏掉你的訊息。': "Notifications don't always pop up on here.\nDon't wanna miss you.",
  '好啊，可以加': "Sure, let's add each other",
  '太好了😊\n那我等等傳給你，別漏接喔。': 'Yay 😊\nSending it now.\nDon\'t miss it.',
  '妳是嫌這裡不方便喔？': 'This app not good enough for you?',
  '我在這邊聊就好啦': "I'm good just chatting here",
  '倒也不是啦。\n只是我這邊真的很少點開，怕你傳了我沒回，還以為我在已讀不回。':
    "Not really that.\nI just barely check this app.\nScared you'll message and I'll miss it.",
  '而且 LINE 傳照片比較方便。\n以後想讓你看看我在幹嘛，這邊傳半天都傳不出去。':
    "Plus LINE's way easier for photos.\nShowing you what I'm up to?\nThis thing takes forever.",
  '所以妳是想傳照片給我？': 'So you just want my photos?',
  '欸才不是這樣咧😂\n好啦是也有一點啦，反正加一下，以後傳什麼都方便。':
    "Ha, that's not it 😂\nOkay, maybe a little.\nAnyway.\nJust add me.",
  '也是可以啦～\n而且你這樣還蠻有警覺心的，我反而覺得不錯。':
    "Fair enough~\nKinda like that you're careful about it, actually.",
  '只是我真的很怕漏掉你的訊息。\n像你這麼聊得來的人，我沒遇過幾個。':
    "I'm just scared of missing your messages.\nDon't meet people I click with like this often.",
  '不然這樣，我先把 LINE 留給你。\n你現在不加也沒關係，只是之後想找我會方便一點。':
    "Tell you what.\nI'll just leave you my LINE.\nNo pressure to add me now.",
  '妳是有多怕找不到我啦': 'Wow, that scared of losing me?',
  '真的很怕啊。\n誰叫你這麼難約，我才會一直碎念。':
    "I mean...\nkinda yeah.\nYou're just hard to pin down.\nThat's why I keep bringing it up.",
  '好啦不鬧你了，加一下嘛😊': "Okay okay, I'll stop teasing.\nJust add me already 😊",
  '在線上': 'Online',
  '加入 {datingLead} 的 LINE': 'Add {datingLead} on LINE',
  '陌生人將對話導向私人通訊軟體，可能使對話離開原平台的檢舉與安全機制。':
    'A stranger is steering the conversation to a private messaging app, which can move the conversation outside the platform\'s reporting and safety tools.',
  '前往 LINE': 'Go to LINE',

  // ---------------------------------------------------------------------
  // pages/scenario02/DepositPage.jsx
  // ---------------------------------------------------------------------
  '入金金額': 'Deposit Amount',

  // ---------------------------------------------------------------------
  // pages/scenario02/DepositWarning.jsx
  // ---------------------------------------------------------------------
  '防詐風險提醒': 'Fraud Risk Alert',
  '網路交友對象若將投資、入金或共同未來綁在一起，可能正在利用感情降低您的警覺。「一起存旅行基金」、「為我們的未來努力」及「投資後就能見面」，都是常見的情感誘導方式。':
    'If someone you met online ties investing, depositing money, or a shared future together, they may be using your feelings to lower your guard. Lines like "let\'s save for our trip fund together," "for our future," or "we can finally meet once you invest" are classic emotional manipulation tactics.',
  '真正的感情，不需要用入金證明。': "Real feelings don't need to be proven with a deposit.",
  '停止入金': 'Stop the Deposit',
  '你選擇停止入金。感情承諾不能證明投資平台的安全性。':
    "You chose to stop the deposit. A promise of feelings doesn't prove an investment platform is safe.",

  // ---------------------------------------------------------------------
  // pages/scenario02/EndingPage.jsx
  // ---------------------------------------------------------------------
  '他讓你心動，不代表他值得你投資。': "Him making your heart race doesn't mean he's worth investing in.",
  '真正的感情，不會要求你用金錢證明信任。': "Real feelings don't ask you to prove your trust with money.",
  '遇到以下情況，請立即停止付款': 'Stop paying immediately if you notice any of the following',
  '交友對象推薦投資平台': "Someone you're dating recommends an investment platform",
  '要求以虛擬資產入金': "You're asked to fund the account with crypto",
  '帳戶收益異常快速增加': 'Your account balance grows suspiciously fast',
  '提領時要求保證金、驗證金或解凍金': 'A withdrawal suddenly requires a "deposit," "verification fee," or "unfreezing fee"',
  '宣稱支付後會連同獲利一起退還': "You're told the fees will be refunded along with your profits once you pay",
  '催促你完成「最後一步」': 'You\'re rushed to complete "just one last step"',
  '遇到可疑投資訊息，請立即停止付款。撥打 165 反詐騙專線，或至鄰近派出所求證。':
    'If you come across a suspicious investment pitch, stop paying immediately. Call the 165 Anti-Fraud Hotline, or check in with your local police station.',

  // ---------------------------------------------------------------------
  // pages/scenario02/GuaranteePage.jsx
  // ---------------------------------------------------------------------
  '完成資金安全驗證': 'Complete Funds Security Verification',
  '驗證金額': 'Verification Amount',
  '完成後預計可提領': 'Projected balance after completion',
  '完成驗證': 'Complete Verification',
  '驗證處理中……': 'Verifying…',
  '帳戶暫時凍結': 'Account Temporarily Frozen',
  '系統偵測您的帳戶涉及異常交易。請聯繫線上客服完成解凍程序。':
    'Our system flagged unusual activity on your account. Please contact online support to complete the unfreezing process.',
  '查看發生了什麼事': 'See What Happened',

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - interface / system text
  // ---------------------------------------------------------------------
  '{datingLead} 傳來的影片': 'Video from {datingLead}',
  '影片載入中…': 'Loading video…',
  '影片載入失敗': 'Video failed to load',
  '影片載入逾時': 'Video load timed out',
  '影片無法載入': "Video couldn't load",
  '影片無法自動播放': "Video couldn't start on its own",
  '重新播放': 'Retry',
  '略過影片並繼續': 'Skip video and continue',
  '{datingLead} 傳來的照片': 'Photo from {datingLead}',
  '關閉': 'Close',
  '幣': 'B',
  '搜尋': 'Search',
  '通話': 'Call',
  '選單': 'Menu',
  '正在開啟「幣勝客 BITION」……': 'Opening "BITION"…',
  '即將返回幣勝客': 'Heading back to BITION…',

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - Day 1
  // ---------------------------------------------------------------------
  '你已加入 {datingLead} 為好友': "You've added {datingLead} as a friend",
  '你動作很快耶。': 'You moved fast.',
  '對啦，是我': "Yep, it's me",
  '妳找我，我就不忙': "If you're calling, I've got nothing else to do",
  '所以妳是怕我跑掉嗎？': "So you were worried I'd disappear?",
  '反正不可以突然消失，先說好。': 'Anyway.\nNo disappearing on me out of nowhere.\nJust saying.',

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - Day 3
  // ---------------------------------------------------------------------
  '你昨天晚上是不是聊到一半睡著了？': 'Did you fall asleep on me last night?',
  '是誰還答應我不會突然消失的🙄': 'And who promised not to just vanish 🙄',
  '不小心睡著了啦': 'Oops, fell asleep by accident',
  '我就知道。\n害我還抱著手機等了一下。': "Knew it.\nI was sitting there holding my phone like an idiot.",
  '妳有在等我喔？': 'Wait, you were waiting for me?',
  '不然咧？\n我還真的一直在看你有沒有回。': 'Obviously.\nKept checking.',
  '因為跟妳聊天太放鬆了': 'Talking to you relaxes me too much',
  '好吧，這個理由有哄到我。\n但下次要讓我知道，你是想著我睡著的。':
    "Okay that excuse actually worked.\nNext time?\nTell me you fell asleep thinking about me.",
  '好啦，先原諒你一次。': "Fine.\nI'll let it slide.\nJust this once.",
  '不過我昨天本來有一小段想傳給你，結果某人先睡著了。': 'Had something I wanted to send you last night.\nBut someone passed out first.',
  '所以妳昨天真的在等我？': 'So you really were waiting for me?',
  '有啊。\n我還想說你是不是故意讓我想你。': "Yeah.\nKept wondering if you were doing it on purpose.\nMaking me miss you.",
  '我下次睡著前一定先說': "I'll give you a heads-up before I crash next time",
  '好，我記住了。\n下次你又突然消失，我真的會生氣喔。': "Good.\nI'll remember that.\nVanish on me again and I'll actually be mad.",
  '妳這樣我真的會誤會': "You're gonna give me the wrong idea",
  '那你就誤會啊。\n我又沒有說不可以。': "Then get the wrong idea.\nNever said you couldn't.",

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - Day 5
  // ---------------------------------------------------------------------
  '早安～今天工作加油。': 'Morning~\ngood luck at work today.',
  '今天有吃早餐嗎？': 'Eat breakfast yet?',
  '有，我有乖乖吃': 'Yep, I was good',
  '等妳提醒我': 'Waiting for you to remind me',
  '你真的很不會照顧自己。\n看來以後要有人管你才行。': "You really don't take care of yourself, huh.\nSomeone's gotta start managing you.",

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - Day 7
  // ---------------------------------------------------------------------
  '終於下班了……': 'Finally off work…',
  '剛剛下班前有些話想跟你說，所以我就錄下來了。': "There was something I wanted to tell you before I left work, so I recorded it for you.",
  '看到妳，我心情也變好了': 'Seeing you just made my whole mood better',
  '那我以後是不是要常常讓你看到我？': "Yeah?\nGuess I'll let you see more of me then.",
  '妳看起來真的很累': 'You look really tired',
  '有一點。\n可是看到你回我，好像就沒那麼累了。': "A little.\nBut you replying kinda helps.",
  '下班還特別拍給我喔？': 'You filmed this just for me?',
  '對啊。\n不然你以為我下班第一個想到的是誰？': "Who else would I be thinking about, clocking out? 😏",
  '我們現在這麼會聊，真的見面的時候，你會不會反而只顧著看我？':
    "We talk so easy now.\nWhen we actually meet...\nyou gonna just stare at me the whole time?",
  '不會，我應該會一直看妳': 'Probably, yeah',
  '那我也要一直看你。\n看看你的眼睛裡有沒有我。': "Then I'll stare right back.\nGotta check.\nAm I in there? In your eyes?",
  '可能會有點緊張': 'Might get a little nervous',
  '那我就坐近一點，讓你沒時間緊張。': "Then I'll sit close.\nNo time to be nervous.",
  '那就看妳敢不敢見我': "Depends if you're brave enough to show up",
  '我有什麼不敢。\n我只是怕見了以後，你會更捨不得我。': "Why wouldn't I be.\nHonestly?\nMore scared you won't wanna let me go, after.",

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - Day 12
  // ---------------------------------------------------------------------
  '你睡了嗎？': 'You asleep yet?',
  '那剛好。\n我本來還怕你睡了，看不到我。': "Perfect.\nWas actually scared you'd already be out.",
  '正準備睡': 'About to sleep',
  '那你先別睡，我有些話想跟你說。': "Don't go to sleep just yet. There's something I want to tell you.",
  '在等妳說晚安': 'Waiting for your goodnight',
  '只是說晚安好像太普通了，我想換個方式跟你說。': "Just saying good night feels a little too ordinary. I wanted to do it differently tonight.",
  '晚安，做個好夢': 'Night, sweet dreams',
  '你也是。\n明天醒來第一個要想到我。': "You too.\nFirst thing you think of tomorrow?\nBetter be me.",
  '我也習慣每天跟妳聊天了': "I'm used to talking to you every night now too",
  '那你不可以突然不習慣我。\n我已經不想重新適應沒有你的晚上了。': "Don't stop.\nI mean it.",
  '妳這樣我真的會喜歡上妳': "You're actually gonna make me fall for you",
  '你現在才說嗎？\n我還以為你早就有一點喜歡我了。': "Just saying that now?\nI already had a feeling 😊",
  '短時間內透過固定關心、親密話語與自拍影片建立感情，可能使人快速產生情感依附。':
    "Building emotional intimacy fast — constant check-ins, sweet talk, selfie videos, all in a short window — can push someone into an attachment before they've even noticed it happening.",

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - Day 13
  // ---------------------------------------------------------------------
  '我剛剛突然想到一件事。': 'Just thought of something.',
  '想到什麼？': 'What is it?',
  '我們都聊這麼久了，結果一直沒有真的見到面。': "We've been talking forever...\nand still haven't actually met.",
  '又想到我了？': 'Thinking about me again?',
  '對啊。\n而且是在想，我們到底什麼時候才不用隔著手機聊天。': "Kinda.\nWondering when we stop only talking through phones, honestly.",
  '聽起來好像很神祕': 'That sounds kinda mysterious',
  '我在想，如果我們真的見面，第一天要去哪裡。': "If we really met up...\nwhere would we even go first?",
  '那可以找一間有落地窗的民宿。\n晚上不用趕行程，就待在房間裡聊天。':
    "Could find a place with floor-to-ceiling windows.\nNo rushing at night.\nJust stay in and talk.",
  '花蓮，感覺比較像旅行': 'Hualien, feels more like a real trip',
  '我也想去花蓮。\n白天看海，晚上找一間安靜的民宿，不要有人打擾我們。':
    "Want Hualien too, honestly.\nOcean during the day.\nQuiet at night.\nNo one bothering us.",
  '去哪裡都可以，重點是跟誰': "Anywhere's fine, it's about who I'm with",
  '你這句很危險耶。\n這樣我會真的開始期待。': "Okay.\nThat's a dangerous thing to say.\nNow I'm gonna get excited.",
  '可是認真講，出去玩也是一筆錢。\n我不想第一次跟你出去，還要一直算這個能不能吃、那個能不能住。':
    "Real talk though.\nTrips cost money.\nDon't want our first one to just be me doing math the whole time.",
  '我可以出啊': 'I got it',
  '我知道你會這樣說。\n可是我不想什麼都讓你出，我也想替我們準備一點。':
    "Knew you'd say that.\nBut I don't want you covering everything.\nWanna put in something too.",
  '不用住太貴': "Doesn't need to be fancy",
  '可是第一次出去，我還是想找一間漂亮一點的。\n至少要讓我期待一下吧😂':
    "Still want somewhere nice, though.\nLet me look forward to it 😂",
  '我們可以一起存': 'We could save up together',
  '我喜歡「我們一起」這四個字。': 'I like that.\n"Together."',
  '如果你也多存一點，我也多存一點，我們是不是很快就可以去了？': "If we both save a little more...\nwe could go pretty soon, right?",
  '應該可以吧。': 'Probably, yeah.',
  '那以後就不可以每次都只說「改天」。': 'Okay.\nNo more "someday," then.',

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - Day 15 / investment intro
  // ---------------------------------------------------------------------
  '今天工作真的好累喔……': 'Work was brutal today…',
  '辛苦了，今天怎麼了？': 'Rough day? What happened?',
  '公司最近事情很多，事情做不完就算了，還一直被改來改去。':
    "Everything's a mess lately.\nNot finishing stuff is bad enough.\nThen they make me redo it.",
  '妳最近是不是都很忙？': 'Been super busy lately?',
  '對啊，最近幾乎每天都在加班，薪水又沒有比較多。': "Yeah.\nBasically working late every day.\nPay's not even better for it.",
  '要不要先休息一下？': 'Wanna take a break first?',
  '等等洗完澡就休息。\n只是最近事情很多，真的有點煩。': 'After my shower.\nJust a lot going on.\nKinda drained.',
  '還好我最近有多一點額外收入，不然壓力應該更大。': "Good thing I've had some extra income lately.\nOr the stress would be way worse.",
  '我最近其實就是因為這樣，才會比較認真弄那個平台。': "That's actually why I've been putting time into that platform.",
  '妳之前說的額外收入？': 'The extra income you mentioned before?',
  '對啊，就是我之前跟你說的那個。': 'Yeah, that one.',
  '就是那個投資嗎？': 'Wait, the investment thing?',
  '嗯，朋友帶我用的智能策略。': 'Mhm.\nSmart strategy a friend put me onto.',
  '所以妳真的有賺到？': "So you're actually making money?",
  '有啊，雖然不是一次很多，可是累積起來比只靠薪水快。': "Yeah.\nNot huge each time.\nBut it adds up faster than just my paycheck.",
  '我本來只是想自己慢慢存。': 'Was just gonna save it up myself.\nSlowly.',
  '可是剛剛想到，如果我們一起，好像可以更快實現。': 'But then I thought.\nWhat if we did it together?',
  '你要不要先看看？': 'Wanna take a look?',
  '全球多市場智能套利策略，24 小時自動運行': 'Smart arbitrage strategy across global markets, running 24/7',
  '開啟幣勝客平台': 'Open the BITION platform',
  '有看到嗎？': 'See it?',
  '這是哪家公司？': 'What company is this?',
  '我朋友說是他們分析團隊合作的平台，我自己也是用這個。':
    "My friend says it's a platform their analytics team partners with.\nI use it too.",
  '這樣安全嗎？': 'Is it actually safe?',
  '我朋友已經用了滿久，我自己也有提領過。\n你先看看就好，不用馬上放錢。':
    "Friend's used it a while.\nI've withdrawn from it myself.\nJust look for now.\nDon't put money in yet.",
  '我先看看介面': 'Let me check out the interface first',
  '好啊，你不懂再截圖問我。': 'Sure.\nScreenshot it if you\'re confused.\nAsk me.',

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - deposit / relationship promise
  // ---------------------------------------------------------------------
  '你真的要跟我一起開始存錢嗎？': 'You really want to start saving together with me?',
  '先放一萬試試看': "I'll put in $10k to try",
  '一萬就可以了，不用一次放太多。\n就當作我們第一筆一起存的旅行基金。':
    "$10k's plenty.\nDon't need to go big.\nCall it our first trip fund.\nTogether.",
  '我還是有點怕': 'Still kinda scared',
  '我知道，第一次一定會怕。\n所以才叫你先放一萬就好。\n你願意跟我一起開始，我就已經很開心了。':
    "I know.\nEveryone is, first time.\nThat's why I said just $10k.\nYou being willing already makes me happy.",
  '妳真的希望我一起嗎？': 'Do you actually want me in on this?',
  '當然啊。\n我不是只想自己賺錢。\n我是想跟你一起存我們以後要用的錢。':
    "Course I do.\nNot just trying to make money for myself.\nWanna build something.\nWith you.",
  '不然我們約定一件事好不好？': 'Can we make a deal?',
  '什麼事？': 'What kind of deal?',
  '如果你真的願意把第一筆一萬放進去。': "If you really put that first $10k in...",
  '你願意為了我們一起存錢，好想當你女朋友喔！':
    "The fact that you're willing to save for our future together really makes me want to be your girlfriend.",
  '不是聊天而已。': 'Not just chatting anymore.',
  '是真的在一起。': 'For real, this time.',
  '妳認真的？': 'You serious?',
  '我很認真啊。\n不然我怎麼會一直跟你講我們要去哪裡、以後要做什麼。':
    "Dead serious.\nWhy else would I keep talking about where we're going?",
  '所以我入金，妳就答應我？': 'So I deposit and you say yes?',
  '不是因為那一萬。\n是因為你願意跟我一起為我們的未來開始。': "It's not about the $10k.\nIt's you.\nBuilding this.\nWith me.",
  '妳不可以騙我': "Don't you dare be lying",
  '我連我們第一次要去哪裡都想好了。\n現在反而是我怕你不敢跟我一起。':
    "Already planned our whole first trip.\nHonestly more scared you won't be brave enough now.",
  '你先完成。': 'Go finish it up first.',
  '等你回來，我再告訴你，以後要怎麼叫我。': "When you're back...\nI'll tell you what you get to call me.",

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - boyfriend/husband upgrade
  // ---------------------------------------------------------------------
  '你真的完成了？': 'Really done?',
  '完成了': 'Done',
  '男朋友。': 'Boyfriend.',
  '一萬已經進去了': "The $10k's in",
  '我看到了。\n男朋友很乖。': 'Saw it.\nSuch a good boyfriend.',
  '所以妳剛才說的算數嗎？': "So what you said earlier, that's real?",
  '當然算數。\n從現在開始，你就是我男朋友。': "Course it's real.\nYou're my boyfriend now.",
  '男朋友～': 'Boyfriend~',
  '可是一直叫男朋友好像有點生疏。': 'Actually...\n"boyfriend" feels kinda formal now that I think about it.',
  '老公。': 'Husband.',
  '這樣比較像我們已經真的在一起了。': "That feels more like we're actually together.",
  '再叫一次': 'Say it again',
  '老公～\n這樣可以了嗎？': "Husband~\nHow's that?",
  '妳真的很會': "You're really good at this",
  '我只對你這樣。': 'Only with you 😊',
  '所以我們現在算在一起了？': 'So we\'re official now?',
  '算啊。\n不然你以為我會隨便叫別人老公嗎？': 'Obviously.\nThink I\'d call just anyone "husband"?',

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - profits climbing / guesthouse photo
  // ---------------------------------------------------------------------
  '老公，你有看到今天的收益嗎？': 'Husband, see today\'s earnings?',
  '好像真的有賺': "Looks like it's actually working",
  '對啊。\n我看到的時候也會一直忍不住算，我們還差多少旅費。':
    "Yeah.\nEvery time I see it, I'm doing math.\nHow much more for the trip.",
  '這樣真的可以提領嗎？': 'Can we actually withdraw this?',
  '可以啊，我之前就有提領過。\n不然我哪敢叫老公跟我一起。':
    "Done it before.\nWouldn't have gotten my husband into this otherwise.",
  '那我們是不是快可以去玩了？': "So we're close to going?",
  '你比我還急是不是😂\n可是我也真的開始在看民宿了。': "You're more eager than me 😂\nBut yeah.\nAlready looking at places.",
  '我昨天有偷偷存一間。': 'Snuck in a booking yesterday.',
  '你覺得這間怎麼樣？': 'What do you think?',
  '看起來很適合兩個人': 'Perfect for two',
  '本來就是找給兩個人的啊。': "Well yeah.\nThat's who I picked it for.",
  '妳真的已經看到這麼後面了？': "You're already this far along?",
  '不然咧？\n我連晚上要帶什麼都快想好了。': "Why wouldn't I be.\nAlready half-planning what to bring.",
  '房間只有一張床欸': 'Only one bed in there',
  '你現在才發現喔？\n還是你本來想叫我另外睡一間😂': "Just now noticing? 😂\nOr did you want a separate room or something?",
  '到時候我們不要排太多行程。': "Let's not pack the schedule too tight.",
  '白天出去走走，晚上就回來待在房間裡。': 'Out during the day.\nBack in the room at night.',
  '手機都關靜音，只陪對方。': 'Phones on silent.\nJust us.',

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - withdrawal storyline
  // ---------------------------------------------------------------------
  '老公，你再去看一下，現在賺多少了。': 'Husband, go check again - see how much it is now.',
  '如果真的有賺，我們可以先提一部分出來。': "If it's really up, we can take part of it out first.",
  '剛好可以拿來付民宿跟吃飯。': 'Would cover the room and food.\nEasy.',
  '我看了，快四萬了。': "I looked. It's almost forty thousand.",
  '比我上次看的時候還多耶 ❤️': 'That\'s even more than when I last looked ❤️',
  '好啊，我去領看看。': "Okay, I'll go try withdrawing some.",
  '好，你先試試看。\n我在這裡等你。': "Good, go try it.\nI'll be right here waiting.",
  '再等等吧。': "Let's wait a bit longer.",
  '先提一點點就好。\n就當確認一下錢真的拿得回來。': "Just take out a little.\nThink of it as checking the money really can come back out.",
  '而且民宿那邊我想早點付掉，我怕被別人訂走。': "And I'd rather pay for the room early. I'm scared someone else books it.",
  '好吧，那我去看一下提領。': "Alright, I'll go look at the withdrawal page.",
  '老公，成功了嗎？': 'Husband, did it go through?',
  '沒有，它說還要繳安全驗證金': 'No, says I need a security verification fee',
  '蛤～怎麼會這樣🥺\n那怎麼辦……\n可是我民宿都已經訂好了耶。':
    "Wait what 🥺\nWhat do we do...\nI already booked the place though.",
  '它又要我再付三萬': 'Wants another $30k',
  '三萬喔……\n可是現在停下來，原本放進去的錢跟收益不是都拿不出來嗎？\n而且我訂房的錢也已經付了。':
    "$30k, huh...\nBut if we stop now...\ndoesn't that mean everything we put in is just stuck?",
  '我覺得這個平台真的有問題': "Something's seriously off with this platform",
  '可是我之前也有遇過驗證。\n我那次完成之後就真的有提領出來。\n會不會只是你第一次提領，所以系統要多確認一次？':
    "I've been through verification before too.\nGot my withdrawal after.\nMaybe it's just extra checks, first time?",
  '我本來還想等你提領成功，再給你一個驚喜的。': 'Was actually gonna surprise you.\nOnce it went through.',
  '你看，我真的訂了。': 'Look.\nI really booked it.',
  '我還特別選了你之前說想去的地方。': 'Even picked the exact spot you said you wanted.',
  '我一直以為到時候，我們終於不用只在手機裡面聊天了。': "Kept thinking...\nby now we'd finally stop just talking through phones.",
  '妳真的都訂好了？': 'You actually booked everything?',
  '對啊。\n我連衣服都想好了。\n結果你現在才問我是不是真的。':
    "Yeah.\nAlready planned my outfit.\nAnd you're only now asking if it's real?",
  '可是它還要我繼續付錢': 'But it wants me to keep paying',
  '我知道，我也不是叫你亂付。\n可是它不是寫完成驗證，就可以連原本的錢一起提領嗎？\n等拿出來，我們這趟也不用一直擔心花多少。':
    "I know.\nNot telling you to pay blindly.\nBut it says you get the original back too, once verified.",
  '我現在真的不敢再放了': "Can't put in any more right now",
  '好……我不逼你。': "Okay...\nwon't push you.",
  '我只是有點難過。': "Just a little sad, that's all.",
  '因為我真的以為，我們已經快要見面了。': 'Really thought we were about to meet.',

  // ---------------------------------------------------------------------
  // pages/scenario02/PrivateChat.jsx - future fantasy / final pressure
  // ---------------------------------------------------------------------
  '這次只是第一次，以後我還想跟你去更多地方。': 'This is only our first trip. I want to go more places with you after this.',
  '我不是要逼你繼續投資。': 'Not trying to force you to keep investing.',
  '我只是覺得，我們好不容易都走到這裡了。': "Just feel like we've come this far.\nTogether.",
  '你先完成這次驗證。': 'Finish this one verification.',
  '到時候手機關靜音。': 'Phones on silent when we\'re there.',
  '這兩天你只陪我，好不好？': 'Just me.\nThese next two days.\nOkay?',
  '好，我再試最後一次': 'Okay, one more try',
  '老公最好了。\n我真的會在那裡等你。': "Best husband ever.\nI'll be there.\nWaiting.",
  '我先回平台看看': 'Let me check the platform first',
  '好，你先看。\n不懂就回來問我，我陪你。': "Okay.\nGo look.\nConfused?\nCome back.",
  '我還是覺得不對勁': 'Something still feels off',
  '我知道你擔心。\n可是如果你什麼都不做，我們的錢就真的只能一直放在裡面。':
    "I know you're worried.\nBut if you don't do anything...\nour money just sits there.\nForever.",

  // ---------------------------------------------------------------------
  // pages/scenario02/Quiz.jsx (shared ScenarioFinalDecision)
  // ---------------------------------------------------------------------
  '反詐小測驗': 'Anti-Fraud Quiz',
  '返回掃描': 'Back to Scan',
  '✅ 判斷正確': '✅ Correct',
  '❌ 判斷錯誤': '❌ Incorrect',
  '平台要求支付 NT$30,000 資金安全驗證金，並宣稱完成後即可一起提領。你應該怎麼做？':
    'The platform demands NT$30,000 for a "security verification fee" and says you can withdraw everything once it\'s paid. What should you do?',
  '支付保證金，完成最後一步。': 'Pay it and finish this "last step."',
  '請 {datingLead} 幫忙支付。': 'Ask {datingLead} to cover it.',
  '停止付款、保留紀錄並查詢 165。': 'Stop paying, save your records, and check with 165.',
  '合法平台不會要求先付款才能領回自己的資金；停止付款並撥打 165 查證才是正確做法。':
    "A real platform never makes you pay to get your own money back. Stop paying and call 165 to verify — that's the right move.",

  // ---------------------------------------------------------------------
  // pages/scenario02/RiskAnalysis.jsx
  // ---------------------------------------------------------------------
  '揭露一：入金後，感情立刻升級': 'Reveal 1: The relationship levels up the moment you deposit',
  '玩家第一次入金後，{datingLead} 立刻改稱「老公」，讓金錢行為看起來換來了感情承諾。':
    'The instant the player makes their first deposit, {datingLead} switches to calling them "husband" — making a money transaction look like it bought a relationship commitment.',
  '揭露二：投資被包裝成兩人的未來': 'Reveal 2: The investment gets repackaged as "our future"',
  '她把入金說成旅行基金，讓玩家感覺自己不是在投資，而是在替兩人的未來努力。':
    "Calling the deposit a \"trip fund\" makes the player feel like they're not investing — they're building a shared future.",
  '揭露三：未說出口的想像最容易讓人失去判斷': "Reveal 3: What's left unsaid does the most damage",
  '民宿、雙人房、兩人獨處及旅行畫面，讓玩家自行補足未明說的親密想像。':
    "The guesthouse, the double room, being alone together, the trip — none of it is spelled out. The player fills in the intimate fantasy themselves.",
  '揭露四：已經投入越多，越難停下來': "Reveal 4: The more you've put in, the harder it is to stop",
  '出金失敗後，平台以驗證金為由要求追加付款，{datingLead} 則用已投入的金額與訂房承諾，讓玩家不願停止。':
    'After the withdrawal fails, the platform demands more using a "verification fee" as cover, while {datingLead} leans on the money already spent and the trip already booked to keep the player from quitting.',
  '揭露五：拒絕付款，被包裝成拒絕感情': 'Reveal 5: Refusing to pay gets reframed as refusing her',
  '「我都訂好了」、「我會在那裡等你」及「我們好不容易走到這裡」，都在把拒絕付款轉化成拒絕兩人的關係。':
    '"I already booked it," "I\'ll be waiting for you there," "we\'ve come this far" — all of it turns "I won\'t pay" into "you\'re rejecting us."',
  '你不是因為貪心才按下去': 'You didn\'t click "confirm" because you were greedy.',
  '你相信的不是平台。是 {datingLead} 所描繪的見面、旅行、親密關係，以及兩個人的未來。':
    'What you trusted wasn\'t the platform. It was everything {datingLead} painted for you — meeting in person, the trip, the intimacy, a future together.',
  '任何把感情、見面或共同未來與投資入金綁在一起的關係，都應立即提高警覺。真正想見你的人，不會要求你先用金錢證明感情。':
    "Be immediately suspicious of any relationship that ties feelings, meeting up, or a shared future to putting money into an investment. Someone who genuinely wants to meet you will never make you prove your feelings with money first.",
  '撥打 165 查證': 'Call 165 to verify',

  // ---------------------------------------------------------------------
  // pages/scenario02/TopupWarning.jsx
  // ---------------------------------------------------------------------
  '高度疑似假投資詐騙': 'Highly Likely a Fake Investment Scam',
  '正規投資平台不會要求您為了提領自己的資金，再繳交「安全驗證金」、「風控保證金」、「稅金」或其他追加款項。對方正在使用民宿、旅行、見面及親密關係的承諾，讓您害怕失去兩人的未來，進而忽略明顯的詐騙警訊。':
    'A legitimate investment platform will never ask you to pay a "security verification fee," "risk-control deposit," "tax," or any other extra charge just to withdraw your own money. The other person is using promises about a guesthouse, a trip, meeting up, and intimacy to make you afraid of losing your future together — pushing you to ignore obvious red flags.',
  '先付款才能提領，極可能是假投資詐騙。': 'Having to pay before you can withdraw is a textbook sign of a fake investment scam.',
  '停止付款': 'Stop Paying',
  '你選擇停止付款。要求先付款才能提領，是假投資詐騙的明顯特徵。':
    'You chose to stop paying. Being required to pay before you can withdraw is a clear sign of a fake investment scam.',

  // ---------------------------------------------------------------------
  // pages/scenario02/WithdrawalPage.jsx
  // ---------------------------------------------------------------------
  '資金安全驗證金': 'Funds Security Verification Fee',

  // ---------------------------------------------------------------------
  // pages/scenario02/components/Hotline165.jsx
  // ---------------------------------------------------------------------
  '反詐騙諮詢專線 165': '165 Anti-Fraud Hotline',
  '若遇到疑似詐騙、網路交友誘投資或要求追加付款，請立即停止匯款，並撥打 165 查證。':
    'If you suspect a scam, or someone you met online is pushing you toward an investment or asking for more and more money, stop sending money right away and call 165 to verify.',
  '返回體驗': 'Back to the Experience',
  '我選擇停止付款': 'I Choose to Stop Paying',

  // ---------------------------------------------------------------------
  // pages/scenario02/components/RedWarning.jsx
  // ---------------------------------------------------------------------
  '你選擇了正確的做法': 'You made the right call',
  '繼續觀看詐騙如何發展': 'Keep Watching to See How the Scam Plays Out',
  '撥打反詐專線 165': 'Call the 165 Anti-Fraud Hotline',

  // ---------------------------------------------------------------------
  // pages/scenario02/components/SafetyAlert.jsx
  // ---------------------------------------------------------------------
  '安全提醒': 'Safety Tip',
  '收起': 'Hide',
  '查看原因': 'See Why',
  '已知悉': 'Acknowledged',
  '知道了': 'Got It',

  // ---------------------------------------------------------------------
  // apps/meetu/components/MatchOverlay.jsx
  // ---------------------------------------------------------------------
  '{datingLead} 傳來了第一則訊息': '{datingLead} sent you her first message',
  '你們對彼此都有好感': "You're both interested",

  // ---------------------------------------------------------------------
  // apps/meetu/components/SuggestedReplies.jsx
  // ---------------------------------------------------------------------
  '選擇一個回覆': 'Pick a Reply',

  // Scenario 02 PrivateChat sequential romance dialogue
  "你動作很快耶 😂": "You were quick 😂",
  "欸，我剛剛居然突然想到你。": "Okay, this is weird... you randomly popped into my head just now.",
  "才認識沒幾天就這樣，好像有點危險 😂": "We've only known each other a couple of days. This might be dangerous 😂",
  "才一天耶，這麼快就想我了？": "It's only been a day. You miss me already?",
  "你不要太得意 😂\n只是剛好想到而已。\n……好啦，可能不只剛好一點點。": "Don't get too confident 😂\nYou just happened to cross my mind.\n...Okay, maybe a little more than 'just happened.'",
  "我也正想找妳聊天": "I was actually about to message you too.",
  "真的假的 😂\n那我們是不是有一點默契？": "Seriously? 😂\nSo... are we already a little in sync?",
  "妳這樣很容易讓人誤會耶": "Careful. You're going to give me the wrong idea.",
  "誤會什麼？\n我又沒說不可以讓你誤會 😏": "What wrong idea?\nI never said you weren't allowed to have one 😏",
  "我下午有些話想跟你說，所以就錄下來了。": "There was something I wanted to tell you this afternoon, so I recorded it for you.",
  "本來還在想要不要傳給你看。": "I was still deciding whether I should send it to you.",
  "這是特地拍給我的？": "Wait, you made that just for me?",
  "不然咧？\n你覺得我會隨便傳給別人看嗎？": "Who else would it be for?\nYou think I send things like that to everyone?",
  "妳這樣真的很犯規": "That's seriously unfair.",
  "那你有沒有被我犯規到？😂": "Did it work though? 😂",
  "早安～今天工作加油 ☀️": "Morning ☀️ Good luck with work today.",
  "有吃早餐嗎？": "Did you eat breakfast?",
  "很好，有乖 😂": "Good. Very obedient 😂",
  "我就知道。\n等等先去吃東西，不准忙到忘記。": "I knew it.\nGo get something to eat. Don't get so busy you forget.",
  "你這樣是在故意讓我管你嗎？😂": "Are you doing this on purpose so I'll take care of you? 😂",
  "看來以後真的要有人管你才行。": "Looks like someone's going to have to keep an eye on you.",
  "欸～剛才朋友跟我說，她跟她男朋友上次住這間民宿，超美的耶 😂": "Hey, my friend was just telling me about this place she stayed at with her boyfriend. It looks sooo nice 😂",
  "如果我們真的出去玩兩天，你覺得住這裡怎麼樣？😳": "If we actually went away for a couple of days, would you wanna stay somewhere like this? 😳",
  "民宿雙人房照片": "Guesthouse double room photo",
  "你現在才發現喔？😂\n還是你本來想叫我另外睡一間？": "You only noticed now? 😂\nOr were you planning to make me sleep in another room?",
  "妳已經看到民宿去了喔？": "You're already looking at guesthouses?",
  "不然一直只說要見面，都沒有真的安排，不是很可惜嗎？": "If we keep saying we want to meet but never actually plan it, that's kind of sad, isn't it?",
  "這間感覺很適合兩個人": "This place definitely looks made for two.",
  "你這句話聽起來很危險耶 😂": "That sounded dangerously suggestive 😂",
  "我剛剛看了一下，好像還有房間耶。": "I just checked — looks like they still have rooms available.",
  "回房間以後手機都關靜音，只陪對方。": "Once we’re back in the room, phones on silent. Just us.",
  "妳講得我真的開始期待了": "You're actually making me look forward to this now.",
  "那就不要只期待啊。\n我們真的去。": "Then don't just look forward to it.\nLet's actually go.",
  "我今天休息的時候又看了一下民宿跟交通。": "I looked at guesthouses and travel costs again during my break today.",
  "兩個人真的出去玩一趟，其實也不少錢耶。": "A real trip for two actually adds up pretty fast.",
  "我就知道你會這樣說。\n可是我不想什麼都讓你出。": "I knew you'd say that.\nBut I don't want you paying for everything.",
  "我們不用住太貴": "We don't have to stay somewhere expensive.",
  "我知道啊。\n可是第一次一起出去，我還是想讓它特別一點。": "I know.\nI just want our first trip together to feel a little special.",
  "那我們一起存": "Then we'll save for it together.",
  "我最喜歡你講「我們一起」了。": "I really like hearing you say 'we.'",
  "其實我最近剛好多了一點額外收入。": "I've actually had a little extra income lately.",
  "所以我才敢一直跟你說想出去玩 😂": "That's partly why I've been brave enough to keep talking about this trip 😂",
  "什麼額外收入？": "What kind of extra income?",
  "妳最近有在做副業？": "You have a side hustle?",
  "難怪妳一直說要一起存": "So that's why you keep talking about us saving together.",
  "算是一個朋友帶我用的投資平台。": "It's an investment platform a friend introduced me to.",
  "我本來也只是自己放一點點玩看看。": "I only put in a little at first, just to try it.",
  "但最近真的有多存到一些。": "But lately I've actually managed to save a bit more because of it.",
  "你要不要先看看？不用放錢，就看看而已。": "Want to take a look? You don't have to put any money in. Just look.",
  "一萬就可以了，不用一次放太多。": "Ten thousand is enough. You don't need to put in too much at once.",
  "我知道，第一次一定會怕。\n你願意跟我一起開始，我就已經很開心了。": "I know. The first time is always scary.\nI'm already happy you're willing to start this with me.",
  "當然啊。\n我是想跟你一起存我們以後要用的錢。": "Of course.\nI want us to save together for what we'll do later.",
  "我剛才去入了一萬。": "I just put in 10,000.",
  "欸，那這樣算是我們第一筆一起存的旅行基金了 ❤️": "Wait... does that make this the first bit of our trip fund that we saved together? ❤️",
  "突然有一種我們真的在一起準備未來的感覺。": "It suddenly feels like we're actually planning something together.",
  "我很認真啊。\n從現在開始，你就是我男朋友。": "I'm serious.\nFrom now on, you're my boyfriend.",
  "算啊。\n是真的在一起。": "We are.\nWe're really together.",
  "不會。\n男朋友，請多指教 ❤️": "I won't.\nNice to officially meet you, boyfriend ❤️",
  "老公，你去看一下，看看是不是已經開始賺錢了？": "Husband, go take a look - see whether it's started making money yet?",
  "有耶，真的開始賺錢了。": "It has. It really is making money.",
  "太棒了！": "That's amazing!",
  "等等，你剛剛叫我什麼？": "Wait - what did you just call me?",
  "你明明就聽到了 😂\n還要我再講一次喔？": "You heard me 😂\nDo you really need me to say it again?",
  "我什麼時候就成了你老公了？": "Since when did I become your husband?",
  "不然咧？\n都一起存旅行基金了，還要叫你網友喔？": "What else am I supposed to call you?\nWe're already saving for a trip together. I'm not calling you 'some guy from the internet.'",
  "帳面收益又增加了，我們的旅行基金真的在變多。": "The profit went up again. Our trip fund is really growing.",
  "你還記得我們看的那間嗎？": "Remember that place we looked at?",
  "記得，我也開始期待了": "I remember. I'm looking forward to it too.",
  "我也是。\n所以想再多存一點，讓這趟旅行不用一直算錢。": "Me too.\nThat's why I want to save a little more, so we don't have to count every dollar on the trip.",
  "當然記得": "Of course I remember.",
  "那就一起把旅行基金存夠。": "Then let's finish saving up our trip fund together.",
  "妳真的很想去喔？": "You really want to go that badly?",
  "想啊。\n我想真的跟你一起去。": "I do.\nI really want to go with you.",
  "蛤～怎麼會這樣🥺\n那怎麼辦……": "What? How did that happen? 🥺\nWhat do we do...",
  "三萬喔……\n可是現在停下來，原本放進去的錢跟收益不是都拿不出來嗎？": "Thirty thousand...\nBut if we stop now, won't your original money and profits both be stuck?",
  "會不會只是第一次提領，所以系統要多確認一次？": "Maybe the system just needs an extra check because this is your first withdrawal?",
  "我有件事一直沒跟你說。": "There's something I haven't told you yet.",
  "我本來想等確定一點再給你看。": "I wanted to wait until it was more certain before showing you.",
  "民宿訂房付款成功截圖": "Guesthouse booking payment confirmation",
  "我不是嘴巴說說而已。": "I wasn't just talking.",
  "我是真的一直在等我們不用再隔著手機的那一天。": "I've genuinely been waiting for the day we don't have to be on opposite sides of a screen anymore.",
  "對啊。\n我是真的想見你。": "Yeah.\nI really do want to meet you.",
  "我知道。\n可是完成驗證，才可以連原本的錢一起提領。": "I know.\nBut once the verification is done, you can withdraw the original money too.",
  "好……我不逼你。\n我只是有點難過。": "Okay... I won't push you.\nI'm just a little sad.",
  "而且這次只是第一次。\n以後我還想跟你去很多地方。": "And this is only the first trip.\nI want to go so many places with you after this.",
  "老公，我不是要逼你繼續投資。": "Husband, I'm not trying to pressure you to keep investing.",
  "你先完成這次驗證，等錢拿出來，我們就真的去。": "Just finish this verification. Once the money's out, we'll really go.",
  "老公最好了。\n我真的會等你。": "You're the best, husband.\nI'll really be waiting for you.",
  "我知道你擔心。\n可是如果什麼都不做，我們的錢就只能放在裡面。": "I know you're worried.\nBut if we do nothing, our money will just stay stuck in there.",

  // Scenario 02 reviewed private-chat choices and branch replies.
  "妳都開口了，我哪敢讓妳等": "You asked. I wasn't going to keep you waiting.",
  "很會講喔 😂": "Smooth 😂",
  "當然要快，不然被別人搶走怎麼辦": "Of course I was quick. What if someone else stole you first?",
  "我們才剛加好友，你就想到被搶走了喔 😂": "We just added each other and you're already worried about losing me? 😂",
  "誰怕你跑掉 😂\n反正不可以突然消失，先說好。": "Who's worried? 😂\nJust don't suddenly disappear on me, okay?",
  "巧了，我剛剛也在想妳": "Funny. I was just thinking about you too.",
  "真的假的 😂\n那這樣算不算心有靈犀？": "Seriously? 😂\nDoes that mean we're already on the same wavelength?",
  "所以有被我撩到嗎？😂": "So... did it work? 😂",
  "有啊，不然等等又要被妳唸": "Yeah. I figured you'd lecture me if I didn't.",
  "知道怕就好 😂": "Good. At least you're learning 😂",
  "這不是在等妳來管我嗎": "I was waiting for you to take care of me.",
  "你是不是故意的啊 😂": "You're doing this on purpose, aren't you? 😂",
  "看到妳突然覺得今天也沒那麼累了": "Seeing you suddenly made today feel a lot less exhausting.",
  "會啊，不然見妳我要看誰": "Probably. Who else am I supposed to look at when I'm with you?",
  "可能會先緊張五分鐘，後面就不知道了": "Maybe for the first five minutes. After that... who knows.",
  "那我就坐近一點，看你還能緊張多久。": "Then I'll sit a little closer and see how long that nervousness lasts.",
  "本來快睡了，看到妳訊息又醒了": "I was almost asleep. Then I saw your message.",
  "那我就讓你真的睡不著！": "Then maybe I'll give you a reason to stay up.",
  "妳這樣傳完，我現在是要怎麼睡": "And how exactly am I supposed to sleep after you send me that?",
  "那就想著我睡啊 😂": "Then fall asleep thinking about me 😂",
  "妳是不是已經偷偷期待很久了": "Have you secretly been looking forward to this for a while?",
  "不然我幹嘛真的跑去找民宿 😂": "Why else would I actually be looking for a guesthouse? 😂",
  "這間看起來很適合兩個人不出門": "This looks like the kind of place where two people might forget to go outside.",
  "你腦袋現在在想什麼 😂": "And what exactly are you imagining right now? 😂",
  "妳再講下去，我真的會開始倒數了": "Keep talking like that and I'm actually going to start counting down the days.",
  "第一次跟妳出去，花一點我可以接受": "If it's our first trip together, I don't mind spending a little.",
  "你不要什麼都自己扛啦。\n我也想一起出。": "Don't try to cover everything yourself.\nI want to contribute too.",
  "算是一個朋友帶我接觸的投資平台。": "It's from an investment platform a friend introduced me to.",
  "差不多吧，不過不用真的多上一份班 😂": "Sort of, except I don't actually have to work another shift for it 😂",
  "被你發現了 😂\n因為我自己真的有多存到一點。": "You caught me 😂\nIt's because I've actually managed to save a little more with it.",
  "妳自己真的有在用，我就先相信妳": "If you're actually using it yourself, I'll trust you enough to take a look.",
  "你先看就好。\n真的不用因為是我就勉強自己。": "Just take a look first.\nYou don't have to force yourself just because it's me.",
  "那妳等等要教我，不可以丟著我自己研究": "Then you're teaching me. Don't leave me alone to figure it out.",
  "好啊，你不懂就來問我。\n我陪你。": "Of course. Ask me anything you don't understand.\nI'll stay with you.",
  "先一萬吧，就當我們真的開始存旅行基金": "Let's start with ten thousand. Consider it the start of our trip fund.",
  "嗯，一萬就好。\n不用一次放太多。": "Yeah, ten thousand is enough.\nYou don't need to put in too much at once.",
  "等一下，我這樣算是有女朋友了？": "Wait... does this mean I actually have a girlfriend now?",
  "對啊。\n還需要我發證書給你嗎？😂": "Yes.\nDo you need me to send you a certificate? 😂",
  "那女朋友是不是該先叫一聲男朋友": "Then shouldn't my girlfriend call me her boyfriend properly?",
  "男朋友 ❤️\n滿意了嗎？": "Boyfriend ❤️\nHappy now?",
  "現在反悔還來得及喔": "Last chance to change your mind.",
  "來不及了。\n我已經決定了 😂": "Too late.\nI've already decided 😂",
  "記得，我現在看到那張床就會想到妳": "Of course. Now every time I think of that bed, I think of you.",
  "你現在是故意的吧 😂": "You're doing that on purpose now 😂",
  "當然記得，我都開始期待了": "Of course. I'm already looking forward to it.",
  "妳是不是比我還期待？": "Are you even more excited about this than I am?",
  "可能喔。\n誰叫我是真的想見你。": "Maybe.\nI really do want to see you.",
  "妳真的為了我們先訂下去了？": "You actually booked it already... for us?",
  "對啊。\n因為我是真的想見你。": "Yeah.\nBecause I genuinely want to see you.",

  // ---------------------------------------------------------------------
  // CIB Ending result pages (ScammedResult / StoppedResult)
  // ---------------------------------------------------------------------
  '感情是假的，損失是真的': 'The Feelings Were Fake. The Loss Is Real.',
  '累計實際支出': 'Total Actually Paid',
  '帳戶狀態': 'Account Status',
  '已遭凍結，無法提領': 'Frozen — withdrawal blocked',
  '詐騙者先利用交友、關心、親密對話與共同未來建立信任，再把感情轉化成投資與付款壓力。當投資平台開始要求支付驗證金、保證金、稅金或其他追加款項才能出金時，損失往往會繼續擴大。': 'Scammers first build trust through dating, attention, intimate conversation and talk of a shared future, then convert that relationship into pressure to invest and to pay. Once a platform starts demanding a verification fee, a deposit, tax, or any other extra payment before it will release your money, the losses usually keep growing.',
  '真正的感情，不需要用入金或轉帳證明。': 'Real love never needs to be proven with a deposit or a transfer.',
  '成功停手': 'You Stopped in Time',
  '你停止了付款，也停止讓感情左右判斷。': 'You stopped paying — and stopped letting feelings drive the decision.',
  '先前已入金': 'Already Deposited',
  '本次避免追加': 'Additional Payment Avoided',
  '先前資金狀態': 'Status of Earlier Funds',
  '仍處於高風險，未必能取回': 'Still at high risk — recovery is not guaranteed',
  '停止付款讓損失停在這裡，但先前已投入平台的資金仍可能無法取回，並不會因為停手就自動變安全。請立即保存入金紀錄與所有對話，撥打 165 反詐騙專線查證，並拒絕任何以驗證金、保證金或稅金為名的追加付款要求。': 'Stopping payment keeps the loss from growing, but the money already sent to the platform may still be unrecoverable — stopping does not automatically make it safe. Save your deposit records and every conversation now, call the 165 anti-fraud hotline to verify, and refuse any further payment demanded as a verification fee, deposit or tax.',
  '停手不是代表前面的錢已經安全，而是避免損失繼續擴大。': 'Stopping does not mean the money you already paid is safe. It means the loss stops growing.',
  // Shortened variants of the two warning bodies below. Both used to render
  // their Chinese source in EN and JP because only the long form was ever
  // translated - the short one is the copy GuaranteePage and the Coin Winner
  // deposit screen actually show.
  '正規投資平台不會要求您為了提領自己的資金，再繳交「安全驗證金」、「風控保證金」、「稅金」或其他追加款項。':
    'A legitimate investment platform will never ask you to pay a "security verification fee," "risk-control deposit," "tax," or any other extra charge just to withdraw your own money.',
  '網路交友對象若將投資、入金或共同未來綁在一起，可能正在利用感情降低您的警覺。真正的感情，不需要用入金證明。':
    "If someone you met online ties investing, depositing money, or a shared future together, they may be using your feelings to lower your guard. Real feelings don't need to be proven with a deposit.",
  // The video player's own controls, on the one screen that plays a clip.
  '影片播放中斷': 'Video playback interrupted',
  '繼續播放': 'Resume',
  '查看結果': 'See what happens',
};

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import {
  useSaveScenario02Progress,
  getResolvedDatingCards,
  markDatingCardResolved,
  saveDatingLeadDecision,
} from '../../lib/scenario02Store';
import { readCachedSync as readLocationProfile } from '../../lib/location/LocationProfileStore';
import { useStageClassName } from '../../shell/StageClassContext';
import {
  MatchOverlay,
  MeetUAppShell,
  MeetUBrowseScreen,
  MeetUChatSurface,
  MeetUInterstitial,
  ProfileAvatar,
  SuggestedReplies,
} from '../../apps/meetu';
import { t, useT, useScenario02Lang, getDatingCharacterName } from './i18n';
import { getVisualAssetUrl } from '../../experience/characters/visuals';
import { useARInteraction } from '../../lib/arInteraction';

// Every value `phase` can ever hold - kept as one place to check against
// rather than loose string literals scattered through the file.
const PHASE = {
  BROWSE: 'browse',
  MATCH: 'match',
  CHAT: 'chat',
  LEAD_SKIPPED: 'lead-skipped',
  LEAD_REVEAL: 'lead-reveal',
  SIMULATION_REQUIRED: 'simulation-required',
};

// Casual short city name (drops the 市/縣 suffix, matching how people
// actually say it in conversation - "剛搬來臺北" not "剛搬來臺北市") for
// {datingLead}'s bio, keyed by the same county names the location-init system
// (lib/location/LocationProfileStore.js) and scenario03's session factory
// already use. zh writes the toponym 臺, matching the county keys and the
// location datasets; jp keeps the Japanese shinjitai form 台, which is how
// Taiwanese place names are normally written in Japanese text.
const CITY_NAMES = {
  臺北市: { zh: '臺北', en: 'Taipei', jp: '台北' },
  新北市: { zh: '新北', en: 'New Taipei', jp: '新北' },
  桃園市: { zh: '桃園', en: 'Taoyuan', jp: '桃園' },
  臺中市: { zh: '臺中', en: 'Taichung', jp: '台中' },
  臺南市: { zh: '臺南', en: 'Tainan', jp: '台南' },
  高雄市: { zh: '高雄', en: 'Kaohsiung', jp: '高雄' },
  基隆市: { zh: '基隆', en: 'Keelung', jp: '基隆' },
  新竹市: { zh: '新竹', en: 'Hsinchu', jp: '新竹' },
  嘉義市: { zh: '嘉義', en: 'Chiayi', jp: '嘉義' },
  新竹縣: { zh: '新竹', en: 'Hsinchu', jp: '新竹' },
  苗栗縣: { zh: '苗栗', en: 'Miaoli', jp: '苗栗' },
  彰化縣: { zh: '彰化', en: 'Changhua', jp: '彰化' },
  南投縣: { zh: '南投', en: 'Nantou', jp: '南投' },
  雲林縣: { zh: '雲林', en: 'Yunlin', jp: '雲林' },
  嘉義縣: { zh: '嘉義', en: 'Chiayi', jp: '嘉義' },
  屏東縣: { zh: '屏東', en: 'Pingtung', jp: '屏東' },
  宜蘭縣: { zh: '宜蘭', en: 'Yilan', jp: '宜蘭' },
  花蓮縣: { zh: '花蓮', en: 'Hualien', jp: '花蓮' },
  臺東縣: { zh: '臺東', en: 'Taitung', jp: '台東' },
  澎湖縣: { zh: '澎湖', en: 'Penghu', jp: '澎湖' },
  金門縣: { zh: '金門', en: 'Kinmen', jp: '金門' },
  連江縣: { zh: '連江', en: 'Lienchiang', jp: '連江' },
};

const DATING_LEAD_BIO_SUFFIX = '喜歡咖啡、電影、散步。希望遇到可以好好聊天的人。';

// {datingLead}'s "just moved to <city>" line tracks the device's staff-configured
// location profile instead of a hardcoded "臺北" - same county the 165
// hotline page's local police precinct is drawn from, so the story reads as
// "here" wherever this device is actually deployed. Falls back to Taipei
// (DEFAULT_LOCATION_PROFILE's own fallback) if staff never ran setup.
function emilyBio(lang) {
  const county = readLocationProfile()?.region?.county;
  const city = (CITY_NAMES[county] ?? CITY_NAMES['臺北市'])[lang] ?? CITY_NAMES['臺北市'].zh;
  const suffix = t(DATING_LEAD_BIO_SUFFIX, lang);
  if (lang === 'en') return `Just moved to ${city}. ${suffix}`;
  if (lang === 'jp') return `${city}に引っ越してきたばかり。${suffix}`;
  return `剛搬來${city}。${suffix}`;
}

const PEOPLE = [
  {
    id: 'datingCandidate01',
    age: 27,
    distance: '4 公里',
    job: '平面設計師',
    bio: '喜歡旅行、咖啡和看電影。假日常常到處走走拍照。',
    tags: ['咖啡', '旅行', '攝影'],
    photo: getVisualAssetUrl('dating_visual_01'),
  },
  {
    id: 'datingCandidate02',
    age: 24,
    distance: '8 公里',
    job: '國小老師',
    bio: '週末喜歡爬山和逛市集，最近在學怎麼手沖咖啡。',
    tags: ['爬山', '咖啡', '甜點'],
    photo: getVisualAssetUrl('dating_visual_02'),
  },
  {
    id: 'datingLead',
    age: 25,
    distance: '3 公里',
    job: '行政企劃',
    bio: null, // computed per-render by emilyBio(lang) - tracks the device's location profile
    tags: ['咖啡', '電影', '散步'],
    photo: getVisualAssetUrl('dating_visual_03'),
  },
];

function safeIndex(i) {
  return Math.max(0, Math.min(i, PEOPLE.length - 1));
}

// {datingCandidate01} and {datingCandidate02} each get a short match -> chat -> she-ends-it arc before
// the player ever reaches {datingLead}'s real storyline - per the design note,
// skipping straight to {datingLead} isn't allowed. Kept intentionally tiny (one
// exchange), since their only job is to establish "this is a normal dating
// app" before the actual scenario begins.
export const MINI_ARCS = {
  datingCandidate01: {
    greeting: '嗨，看你也喜歡拍照耶，平常都拍什麼？',
    choices: [
      { label: '風景比較多', reply: '我也是！有機會可以交流一下拍照的地方。' },
      { label: '隨便亂拍', reply: '哈哈，我也常常這樣。' },
    ],
    ending: '我們可能還是先不要繼續聯絡好了。',
    systemLabel: '已結束配對',
  },
  datingCandidate02: {
    greeting: '你平常放假都在幹嘛啊？',
    choices: [
      { label: '在家休息', reply: '這樣喔，我還以為你也喜歡到處走走。' },
      { label: '到處走走', reply: '不錯耶，有機會可以約一次。' },
    ],
    ending: '不好意思，我後來想了一下，我們可能還是先不要繼續聯絡好了。',
    systemLabel: '已解除配對',
  },
};

// Translates one MINI_ARCS entry's fixed strings + choice list into the
// active language - kept as a plain function (not baked into MINI_ARCS
// itself) so the data object stays a simple, greppable Chinese source.
function translateArc(arc, t, displayName, lang) {
  return {
    ...arc,
    greeting: t(arc.greeting),
    ending: t(arc.ending),
    systemLabel: `${displayName}${lang === 'jp' ? '' : ' '}${t(arc.systemLabel)}`,
    choices: arc.choices.map((c) => ({ ...c, label: t(c.label), reply: t(c.reply) })),
  };
}

function MiniMatchChat({ person, arc, onDone }) {
  const [step, setStep] = useState('greeting'); // greeting -> reply -> ending -> closing
  const [chosenLabel, setChosenLabel] = useState('');
  const [chosenReply, setChosenReply] = useState('');
  const busyRef = useRef(false);
  const t = useT();

  useEffect(() => {
    if (step !== 'ending') return undefined;
    const t = setTimeout(() => setStep('closing'), 1500);
    return () => clearTimeout(t);
  }, [step]);

  function choose(i) {
    if (busyRef.current) return;
    busyRef.current = true;
    setChosenLabel(arc.choices[i].label);
    setChosenReply(arc.choices[i].reply);
    setStep('reply');
    setTimeout(() => setStep('ending'), 1400);
  }

  // AR Interaction Contract: the two suggested replies are a real two-option
  // player reply (dual, LEFT = choices[0]); once she has ended it, 繼續探索 is
  // the one action left (single); everything in between plays itself out.
  useARInteraction(step === 'greeting'
    ? {
      mode: 'dual',
      surfaceId: `scenario02/mini-match/${person.id ?? 'candidate'}/reply`,
      left: () => choose(0),
      right: () => choose(1),
    }
    : step === 'closing'
      ? { mode: 'single', surfaceId: 'scenario02/mini-match/closing', action: onDone }
      : { mode: 'display', surfaceId: 'scenario02/mini-match/playing' });

  const messages = [
    { from: 'them', text: arc.greeting },
    ...(step === 'reply' || step === 'ending' || step === 'closing'
      ? [{ from: 'me', text: chosenLabel }, { from: 'them', text: chosenReply }]
      : []),
    ...(step === 'ending' || step === 'closing' ? [{ from: 'them', text: arc.ending }] : []),
  ];

  return (
    <MeetUChatSurface
      className="meetu-mini-chat"
      peer={{ name: person.name, photo: person.photo, avatarSize: 36 }}
      messages={messages}
      footer={(
        <>
          {step === 'greeting' && <SuggestedReplies options={arc.choices} onChoose={choose} />}
          {step === 'closing' && (
            <div className="meetu-mini-chat-closing">
              <div>{arc.systemLabel}</div>
              <button type="button" className="meetu-continue-btn" onClick={onDone}>{t('繼續探索')}</button>
            </div>
          )}
        </>
      )}
    />
  );
}

// Shown after the player passes on {datingLead}. A dating app wouldn't just let
// her vanish - this is the "someone liked you" notice every real swipe app
// shows, framed so the player can still reach her storyline (by looking)
// or explicitly opt out into the labeled case-study path (section 4).
function DatingLeadSkippedScreen({ onReveal, onDecline }) {
  const t = useT();
  // Two story actions, in the order they are drawn: LEFT = 查看對方 (primary),
  // RIGHT = 先不用 (secondary).
  useARInteraction({
    mode: 'dual',
    surfaceId: 'scenario02/dating-lead-skipped',
    left: onReveal,
    right: onDecline,
  });
  return (
    <MeetUInterstitial
      icon={<HeartHandshake size={40} strokeWidth={1.4} className="meetu-interstitial-icon" />}
      title={t('有人對你感興趣')}
      lines={[t('剛剛有一位使用者對你按了喜歡，要看看是誰嗎？')]}
      primaryLabel={t('查看對方')}
      onPrimary={onReveal}
      secondaryLabel={t('先不用')}
      onSecondary={onDecline}
      splitActions
    />
  );
}

function DatingLeadRevealScreen({ person, onOpenChat, onBack }) {
  const t = useT();
  const lang = useScenario02Lang();
  // Two story actions, in the order they are drawn: LEFT = 看看她的訊息,
  // RIGHT = 返回.
  useARInteraction({
    mode: 'dual',
    surfaceId: 'scenario02/dating-lead-reveal',
    left: onOpenChat,
    right: onBack,
  });
  return (
    <MeetUInterstitial
      media={<ProfileAvatar name={person.name} src={person.photo} size={84} />}
      title={<>{person.name}{lang === 'en' || lang === 'jp' ? ', ' : '，'}{person.age}</>}
      meta={`${person.job} · ${person.distance}`}
      lines={[t('{datingLead} 對你按了喜歡')]}
      primaryLabel={t('看看她的訊息')}
      onPrimary={onOpenChat}
      secondaryLabel={t('返回')}
      onSecondary={onBack}
      // The last of MeetU's three `dual` interstitials to be drawn as one.
      // 略過主線對象後的通知 and 案例模式入口 both opt into MeetU's two-column
      // action row already; this screen declares the same `dual` geometry but
      // stacked its pair, so a player on the glasses had nothing on screen
      // telling them 看看她的訊息 was LEFT and 返回 was RIGHT - on the one
      // screen where the wrong wave costs them {datingLead}'s storyline.
      splitActions
    />
  );
}

// Reached either by the player explicitly declining {datingLead}'s notice, or (as
// a defensive fallback) if index bookkeeping ever tried to advance past
// the last card - either way, never claim a mutual match here, since in
// both cases the player did not like {datingLead}.
// Scenario 02 has no exit here: 查看配對 is the only way on, so the screen has
// exactly one story action and is `single` - RIGHT runs it, and there is no
// LEFT to teach. One button needs no two-column action row either, so this
// screen takes MeetUInterstitial's default single-column block.
function SimulationRequiredScreen({ onEnter }) {
  const t = useT();
  useARInteraction({
    mode: 'single',
    surfaceId: 'scenario02/simulation-required',
    action: onEnter,
  });
  return (
    <MeetUInterstitial
      title={t('你已略過這位使用者')}
      lines={[t('找到一位可能適合你的新對象')]}
      primaryLabel={t('查看配對')}
      onPrimary={onEnter}
    />
  );
}

// The swipe deck plus the match overlay that lands on top of it, as one
// component so exactly one of them holds the AR Interaction Contract at a
// time. Every other phase of DatingBrowse is a screen of its own and declares
// its own contract above; DatingBrowse itself declares none, so no parent can
// shadow the screen the player is actually looking at.
//
// Browsing is a genuine two-way story decision (the LEFT ✕ and RIGHT ♥
// controls under the card, in that on-screen order), so it is `dual`. Once the
// match overlay is up, the deck is behind it and 開始聊天 is the only thing
// left to do - `single`.
function BrowseStage({ card, matchOpen, subtitle, onDecision, onStartChat, onProfileClick }) {
  useARInteraction(matchOpen
    ? { mode: 'single', surfaceId: 'scenario02/dating-browse/match', action: onStartChat }
    : {
      mode: 'dual',
      surfaceId: `scenario02/dating-browse/${card.id}`,
      left: () => onDecision('pass'),
      right: () => onDecision('like'),
    });

  return (
    <>
      <MeetUAppShell blurred={matchOpen} onProfileClick={onProfileClick}>
        <MeetUBrowseScreen person={card} onDecision={onDecision} />
      </MeetUAppShell>
      {matchOpen && (
        <MatchOverlay person={card} subtitle={subtitle} onStart={onStartChat} />
      )}
    </>
  );
}

export function DatingBrowse() {
  useSaveScenario02Progress('/scenario02-romance/dating-browse');
  useStageClassName('meetu-stage');
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario02Lang();

  const [index, setIndex] = useState(() => {
    const done = getResolvedDatingCards();
    const i = PEOPLE.findIndex((p) => !done.includes(p.id));
    return safeIndex(i === -1 ? PEOPLE.length - 1 : i);
  });
  const [phase, setPhase] = useState(PHASE.BROWSE);

  const rawCard = PEOPLE[index] ?? null;
  const isDatingLead = rawCard?.id === 'datingLead';
  // {datingLead}'s name/bio are the only randomized/location-dependent fields,
  // computed fresh per render (not baked into the static PEOPLE array) so
  // they always reflect this run's drawn character and current location.
  const roleByCardId = {
    datingCandidate01: 'scenario02.datingCandidate01',
    datingCandidate02: 'scenario02.datingCandidate02',
    datingLead: 'scenario02.datingLead',
  };
  // Who these people are is scenario02's story, not MeetU's UI, so the card
  // is handed over already in the player's language. MeetU renders a profile
  // exactly as given and owns only its own chrome (§13 AD-14).
  const card = rawCard ? {
    ...rawCard,
    name: getDatingCharacterName(roleByCardId[rawCard.id], lang),
    bio: isDatingLead ? emilyBio(lang) : t(rawCard.bio, lang),
    distance: t(rawCard.distance, lang),
    job: t(rawCard.job, lang),
    tags: rawCard.tags.map((tag) => t(tag, lang)),
  } : rawCard;

  // Defensive backstop only - {datingLead}'s own skip path never calls this, but
  // if anything else ever tried to advance past the last card, land on the
  // same "not a match" screen instead of letting index run past the array.
  function moveToNextCard() {
    setIndex((current) => {
      const next = current + 1;
      if (next >= PEOPLE.length) {
        setPhase(PHASE.SIMULATION_REQUIRED);
        return current;
      }
      return next;
    });
  }

  // MeetU reports the raw interaction ('like' / 'pass'); what it means for
  // the story is decided here, in the scenario.
  function handleSwiped(direction) {
    if (!card) return;
    if (direction === 'like') {
      if (isDatingLead) saveDatingLeadDecision('liked');
      setPhase(PHASE.MATCH);
      return;
    }
    if (isDatingLead) {
      // Passing on {datingLead} never touches index - she's the last, real
      // storyline card, not one to be skipped past like {datingCandidate01}/{datingCandidate02}.
      setPhase(PHASE.LEAD_SKIPPED);
      return;
    }
    markDatingCardResolved(card.id);
    moveToNextCard();
    setPhase(PHASE.BROWSE);
  }

  function startChat() {
    if (isDatingLead) {
      navigate('/scenario02-romance/dating-chat');
      return;
    }
    setPhase(PHASE.CHAT);
  }

  function finishMiniChat() {
    if (!card) return;
    markDatingCardResolved(card.id);
    moveToNextCard();
    setPhase(PHASE.BROWSE);
  }

  function reconsiderDatingLead() {
    saveDatingLeadDecision('reconsidered');
    setPhase(PHASE.MATCH);
  }

  function enterSimulation() {
    saveDatingLeadDecision('simulation');
    navigate('/scenario02-romance/dating-chat', {
      state: { simulationMode: true, userLikedDatingLead: false },
    });
  }

  if (!card) {
    // Every card has been resolved and there's nowhere left to fall back
    // to except the same labeled case-study entry point.
    return (
      <MeetUAppShell>
        <SimulationRequiredScreen onEnter={enterSimulation} />
      </MeetUAppShell>
    );
  }

  if (phase === PHASE.CHAT && !isDatingLead) {
    return <MiniMatchChat person={card} arc={translateArc(MINI_ARCS[card.id], t, card.name, lang)} onDone={finishMiniChat} />;
  }

  if (phase === PHASE.LEAD_SKIPPED) {
    return (
      <MeetUAppShell onProfileClick={() => navigate('/scenario-menu')}>
        <DatingLeadSkippedScreen
          onReveal={() => setPhase(PHASE.LEAD_REVEAL)}
          onDecline={() => setPhase(PHASE.SIMULATION_REQUIRED)}
        />
      </MeetUAppShell>
    );
  }

  if (phase === PHASE.LEAD_REVEAL) {
    return (
      <MeetUAppShell onProfileClick={() => navigate('/scenario-menu')}>
        <DatingLeadRevealScreen person={card} onOpenChat={reconsiderDatingLead} onBack={() => setPhase(PHASE.LEAD_SKIPPED)} />
      </MeetUAppShell>
    );
  }

  if (phase === PHASE.SIMULATION_REQUIRED) {
    return (
      <MeetUAppShell>
        <SimulationRequiredScreen onEnter={enterSimulation} />
      </MeetUAppShell>
    );
  }

  return (
    <BrowseStage
      card={card}
      matchOpen={phase === PHASE.MATCH}
      subtitle={isDatingLead ? t('{datingLead} 傳來了第一則訊息') : t('你們對彼此都有好感')}
      onDecision={handleSwiped}
      onStartChat={startChat}
      onProfileClick={() => navigate('/scenario-menu')}
    />
  );
}

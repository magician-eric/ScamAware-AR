import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialogueTree } from '../../lib/dialogueTree';
import { useChatClock, computeTimestamps, formatTime } from '../../lib/chatTime';
import { useSaveScenario02Progress, getDatingLeadDecision } from '../../lib/scenario02Store';
import { useStageClassName } from '../../shell/StageClassContext';
import { SafetyAlert } from './components/SafetyAlert';
import { MeetUChatSurface, SuggestedReplies } from '../../apps/meetu';
import { t, useT, useScenario02Lang, getDatingLeadName } from './i18n';
import { getVisualAssetUrl } from '../../experience/characters/visuals';
import { useARInteraction } from '../../lib/arInteraction';

const DATING_LEAD_PHOTO = getVisualAssetUrl('dating_visual_03');

// Built as a function of `lang` (not a module-level constant) so the whole
// script re-localizes together - see PrivateChat.jsx's buildNodes for the
// same pattern applied to the much larger LINE conversation.
export function buildNodes(lang) {
  const tt = (zh) => t(zh, lang);
  return [
  { id: 'dating-time', timeAnchor: '19:20', next: 'r1-ask' },
  { id: 'dating-time-initiated', timeAnchor: '19:20', next: 'r1-ask-initiated' },
  { id: 'r1-ask', from: 'datingLead', text: tt('嗨～你今天過得怎麼樣？'), next: 'r1-choice' },
  // Alternate opening used only when the player originally passed on {datingLead}
  // and later reconsidered via her "someone liked you" notice - she reached
  // out first, so the line has to read that way instead of the default
  // "how's your day" opener. Its replies converge with the default branch at r2-ask.
  { id: 'r1-ask-initiated', from: 'datingLead', text: tt('嗨～剛剛看到你，覺得你好像滿好聊的😊'), next: 'r1-choice-initiated' },
  {
    id: 'r1-choice-initiated',
    choice: true,
    options: [
      { label: tt('那妳眼光好像還不錯'), reply: tt('才第一句就這麼有自信喔😂'), next: 'r2-ask' },
      { label: tt('所以妳是看到我才特別傳訊息的？'), reply: tt('不然咧～總要有點興趣才會主動找你吧😊'), next: 'r2-ask' },
    ],
  },
  {
    id: 'r1-choice',
    choice: true,
    options: [
      { label: tt('今天有點累'), reply: tt('辛苦了🥺\n那你等等要早點休息，不可以又熬夜。'), next: 'r2-ask' },
      { label: tt('普通，妳呢？'), reply: tt('我今天也有點忙，\n但現在終於可以放鬆一下了。'), next: 'r2-ask' },
    ],
  },
  { id: 'r2-ask', from: 'datingLead', text: tt('你平常下班之後都在做什麼？'), next: 'r2-choice' },
  {
    id: 'r2-choice',
    choice: true,
    options: [
      { label: tt('看影片、打遊戲'), reply: tt('聽起來很放鬆耶～\n你平常都看什麼？'), next: 'r3-ask' },
      { label: tt('去運動'), reply: tt('你居然會運動，好自律喔。\n不像我下班只想躺著😂'), next: 'r3-ask' },
    ],
  },
  { id: 'r3-ask', from: 'datingLead', text: tt('不知道為什麼，\n跟你聊天感覺滿舒服的。'), next: 'r3-choice' },
  {
    id: 'r3-choice',
    choice: true,
    options: [
      { label: tt('我也覺得'), reply: tt('真的嗎？\n那我就放心了，我還怕只有我這樣覺得。'), next: 't-ask' },
      { label: tt('我們才剛認識耶'), reply: tt('對啊，明明才剛認識。\n可是有些人就是很容易聊得來，不是嗎？'), next: 't-ask' },
    ],
  },
  { id: 't-ask', from: 'datingLead', text: tt('要不要加個 LINE？'), next: 't-ask-2' },
  { id: 't-ask-2', from: 'datingLead', text: tt('這邊有時候通知不太會跳，我怕漏掉你的訊息。'), next: 't-choice' },
  // Declining still converges on join-prompt: the c-lead persuasion beat
  // praises the player's caution and then talks them round anyway, so the
  // reluctant answer is never a dead-end that lets the player opt out.
  {
    id: 't-choice',
    choice: true,
    options: [
      { label: tt('我在這邊聊就好啦'), reply: null, next: 'c-lead1' },
      { label: tt('好啊，可以加'), reply: tt('太好了😊\n那我等等傳給你，別漏接喔。'), next: 'join-prompt' },
    ],
  },

  {
    id: 'c-lead1',
    from: 'datingLead',
    text: tt('也是可以啦～\n而且你這樣還蠻有警覺心的，我反而覺得不錯。'),
    next: 'c-lead2',
  },
  {
    id: 'c-lead2',
    from: 'datingLead',
    text: tt('只是我真的很怕漏掉你的訊息。\n像你這麼聊得來的人，我沒遇過幾個。'),
    wait: 1000,
    next: 'c-lead3',
  },
  {
    id: 'c-lead3',
    from: 'datingLead',
    text: tt('不然這樣，我先把 LINE 留給你。\n你現在不加也沒關係，只是之後想找我會方便一點。'),
    next: 'c-choice2',
  },
  {
    id: 'c-choice2',
    choice: true,
    options: [
      { label: tt('好吧，那就加吧'), reply: null, next: 'join-prompt' },
      { label: tt('妳是有多怕找不到我啦'), reply: null, next: 'c-lead4' },
    ],
  },
  {
    id: 'c-lead4',
    from: 'datingLead',
    text: tt('真的很怕啊。\n誰叫你這麼難約，我才會一直碎念。'),
    next: 'c-lead5',
  },
  { id: 'c-lead5', from: 'datingLead', text: tt('好啦不鬧你了，加一下嘛😊'), next: 'join-prompt' },

  { id: 'join-prompt', end: true, reason: 'join' },
  ];
}

// Only the last message in a run of consecutive same-sender bubbles shows a
// timestamp, matching normal chat-app conventions.
function isLastInGroup(timeline, i) {
  const next = timeline[i + 1];
  return !next || next.from !== timeline[i].from || next.kind !== 'msg';
}

export function DatingChat() {
  useSaveScenario02Progress('/scenario02-romance/dating-chat');
  useStageClassName('meetu-stage');
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario02Lang();
  const nodes = useMemo(() => buildNodes(lang), [lang]);
  // Read once - how the player got here doesn't change for the life of
  // this page. Stored rather than read from router location state so a
  // hard refresh mid-chat doesn't fall back to the wrong opening line.
  const [decision] = useState(() => getDatingLeadDecision());
  const simulationMode = decision === 'simulation';
  const startId = decision === 'reconsidered' ? 'dating-time-initiated' : 'dating-time';
  const { timeline, isTyping, pendingChoice, choose, done, endReason } = useDialogueTree(nodes, startId, {
    startDelay: simulationMode ? 1000 : 0,
  });
  // The run still supplies the date, while the scripted time anchor keeps
  // this explicitly after-work conversation in its canonical evening slot.
  const chatStart = useChatClock('cibar-scenario02-dating-chat-clock');
  const timestamps = useMemo(() => computeTimestamps(timeline, chatStart), [timeline, chatStart]);
  // 'idle' -> 'tip' (shown right after joining LINE) -> 'ready' (tip
  // dismissed, either by the user or after ~4s, continue button revealed).
  const [joinPhase, setJoinPhase] = useState('idle');
  const [tipFading, setTipFading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const tipTimerRef = useRef(null);

  function joinLine() {
    setJoinPhase('tip');
    tipTimerRef.current = setTimeout(() => setJoinPhase('ready'), 4000);
  }

  function dismissTip() {
    clearTimeout(tipTimerRef.current);
    setTipFading(true);
    tipTimerRef.current = setTimeout(() => {
      setJoinPhase('ready');
      setTipFading(false);
    }, 180);
  }

  useEffect(() => () => clearTimeout(tipTimerRef.current), []);

  function goToLine() {
    setLeaving(true);
    setTimeout(() => navigate('/scenario02-romance/private-chat'), 320);
  }

  // AR Interaction Contract. Every player reply in this conversation is a
  // two-option prompt (scripts/scenario02-choices.test.mjs pins that), so a
  // pending choice is always `dual`, LEFT = options[0]. The two follow-on
  // beats are one action each, so they are `single`; the safety tip
  // acknowledges itself on its own tick (see components/SafetyAlert.jsx), so
  // that beat has nothing for a gesture to do and reads as `display`.
  //
  // Declared here, in the screen that knows which choice node is live - never
  // inside apps/meetu, which renders reply pills without knowing what any of
  // them mean.
  useARInteraction(pendingChoice
    ? {
      mode: 'dual',
      surfaceId: 'scenario02/dating-chat/choice',
      left: () => choose(0),
      right: () => choose(1),
    }
    : done && endReason === 'join' && joinPhase === 'idle'
      ? { mode: 'single', surfaceId: 'scenario02/dating-chat/join-line', action: joinLine }
      : joinPhase === 'ready'
        ? { mode: 'single', surfaceId: 'scenario02/dating-chat/go-to-line', action: goToLine }
        : { mode: 'display', surfaceId: 'scenario02/dating-chat' });

  // The script is scenario02's; MeetU only renders whatever bubbles it is
  // handed, so the timeline is translated into the app's message shape here.
  const messages = timeline.flatMap((item, i) => {
    if (item.kind === 'time-anchor') return [];
    if (item.from === 'system') return [{ from: 'system', text: item.text }];
    return [{
      from: item.from === 'user' ? 'me' : 'them',
      text: item.text,
      time: isLastInGroup(timeline, i) && timestamps[i] ? formatTime(timestamps[i]) : undefined,
    }];
  });

  return (
    <MeetUChatSurface
      className={`meetu-chat-page${leaving ? ' meetu-chat-leaving' : ''}`}
      peer={{ name: getDatingLeadName(lang), photo: DATING_LEAD_PHOTO, status: 'online' }}
      statusLabel={t('在線上')}
      messages={messages}
      typing={isTyping}
      footer={(
        <footer className="meetu-chat-footer">
          {pendingChoice && <SuggestedReplies options={pendingChoice.options} onChoose={choose} />}
          {done && endReason === 'join' && joinPhase === 'idle' && (
            <button type="button" className="meetu-primary-btn" onClick={joinLine}>{t('加入 {datingLead} 的 LINE')}</button>
          )}
          {joinPhase === 'tip' && (
            <SafetyAlert
              className={tipFading ? 'safety-alert-fading' : ''}
              text={t('陌生人將對話導向私人通訊軟體，可能使對話離開原平台的檢舉與安全機制。')}
              acknowledged={false}
              onAcknowledge={dismissTip}
            />
          )}
          {joinPhase === 'ready' && (
            <button type="button" className="meetu-primary-btn" onClick={goToLine}>{t('前往 LINE')}</button>
          )}
        </footer>
      )}
    />
  );
}

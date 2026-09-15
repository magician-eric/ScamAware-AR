import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineConversation, LineQuickReplies } from '../../apps/line';
import { Button } from '../../components/ui/Button';
import { ButtonGroup } from '../../components/ui/ButtonGroup';
import { useChatClock, computeTimestamps, formatTime } from '../../lib/chatTime';
import { useStageClassName } from '../../shell/StageClassContext';
import { useT, getScenario01SenderName } from './i18n';
import { getScenario01CharacterBySlot } from '../../lib/scenario01Characters';
import { useARInteraction } from '../../lib/arInteraction';

// This page reimplements its own scripted-chat engine (rather than reusing
// useTypedMessages) because it needs branching reply paths, same as the
// original inline <script> in scene01_line_teacher.html.
const READ_DELAY = 1900;
const TYPING_DELAY = 1000;

const OPENING_MESSAGES = [
  '您好😊\n歡迎加入陳老師 AI 選股體驗。',
  '剛剛看到您是從 AI 選股直播課進來的，想先了解一下您的需求。',
  '請問您目前比較傾向哪一種方式？',
];

const CHOICE_OPTIONS = [{ label: '我想直接跟老師操作' }, { label: '我想先自己試試看' }];

const ROUTES = {
  A: {
    user: '我想直接跟老師操作',
    assistant: [
      '沒問題😊\n很多新朋友一開始也是希望有人帶著操作，這樣比較安心。',
      '老師平常不會在公開頁面直接公布標的，主要是在 VIP 群組裡即時分享盤勢和操作策略。',
      '我可以先邀請您進群，等等老師有新的操作提醒，您就能第一時間看到。',
    ],
  },
  B: {
    user: '我想先自己試試看',
    assistant: [
      '可以理解😊\n很多學員一開始也是想先自己研究看看。',
      '老師不會強迫大家跟單，您也可以先進 VIP 群組觀察大家每天怎麼分析市場。',
      '裡面會有老師的盤勢解析、學員交流和操作紀錄，您可以先學習，不一定要馬上投入。',
      '而且群組目前免費，不懂的地方也可以直接發問。',
      '我先幫您開通 VIP 群組邀請，您進去看看大家怎麼操作就好。',
    ],
  },
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same LINE chrome as scenario02's PrivateChat (.line-app/.line-header/
// .line-chat-scroll/.line-msg via the shared .ar-stage.line-stage variant)
// so the two scenarios' 1:1 LINE conversations look identical.
export function LineTeacher() {
  useStageClassName('line-stage');
  const navigate = useNavigate();
  const t = useT();
  const investmentAssistant = getScenario01CharacterBySlot('investmentAssistant');
  // "投資小助理 <her name>", resolved by ./i18n from the same cast entry the
  // avatar above comes from - the VIP group labels her with the identical
  // call, so the private chat and the group cannot show two different people.
  const investmentAssistantName = getScenario01SenderName('investmentAssistant');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [choiceVisible, setChoiceVisible] = useState(false);
  const [nextVisible, setNextVisible] = useState(false);
  const startedRef = useRef(false);
  const chatRef = useRef(null);
  const chatStart = useChatClock('cibar-scenario01-lineteacher-clock');
  const timestamps = useMemo(() => computeTimestamps(messages, chatStart), [messages, chatStart]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function assistantSay(text, delay = READ_DELAY) {
      setIsTyping(true);
      await wait(TYPING_DELAY);
      setIsTyping(false);
      setMessages((prev) => [...prev, { text }]);
      await wait(delay);
    }

    async function sayAll(msgs, finalDelay = READ_DELAY) {
      for (let i = 0; i < msgs.length; i += 1) {
        const isLast = i === msgs.length - 1;
        // eslint-disable-next-line no-await-in-loop
        await assistantSay(msgs[i], isLast ? finalDelay : READ_DELAY);
      }
    }

    (async () => {
      await sayAll(OPENING_MESSAGES.map(t), 700);
      setChoiceVisible(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chooseNeed(choice) {
    const route = ROUTES[choice];
    if (!route) return;
    setChoiceVisible(false);
    setMessages((prev) => [...prev, { text: t(route.user), type: 'user' }]);
    await wait(900);
    for (let i = 0; i < route.assistant.length; i += 1) {
      const isLast = i === route.assistant.length - 1;
      setIsTyping(true);
      // eslint-disable-next-line no-await-in-loop
      await wait(TYPING_DELAY);
      setIsTyping(false);
      setMessages((prev) => [...prev, { text: t(route.assistant[i]) }]);
      // eslint-disable-next-line no-await-in-loop
      await wait(isLast ? 500 : READ_DELAY);
    }
    setNextVisible(true);
  }

  // AR Interaction Contract, per state rather than per page - this one screen
  // is three different geometries in turn:
  //
  //   the assistant is still typing        -> display (nothing to do yet)
  //   the two quick replies are showing    -> dual   (LEFT = choice[0])
  //   the reply has played out             -> single (RIGHT = 加入 VIP 群組)
  //
  // The contract is declared where the current choice node is known - this
  // screen - and never inside apps/line, which renders quick replies without
  // knowing what any of them mean for the story (spec §4.12).
  useARInteraction(choiceVisible
    ? {
      mode: 'dual',
      surfaceId: 'scenario01/line-teacher/need-choice',
      left: () => chooseNeed('A'),
      right: () => chooseNeed('B'),
    }
    : nextVisible
      ? {
        mode: 'single',
        surfaceId: 'scenario01/line-teacher/join-vip',
        action: () => navigate('/scenario01-investment/vip-group'),
      }
      : { mode: 'display', surfaceId: 'scenario01/line-teacher' });

  return (
    <LineConversation
      fullBleed
      identity={{ displayName: investmentAssistantName, avatar: investmentAssistant.avatar }}
      onBack={() => navigate('/scenario-menu')}
      labels={{ back: t('返回'), search: t('搜尋'), call: t('通話'), menu: t('選單') }}
      scrollRef={chatRef}
      typing={isTyping}
      messages={messages.map((m, i) => {
        const time = timestamps[i] ? formatTime(timestamps[i]) : null;
        return { ...m, id: i, outgoing: m.type === 'user', time };
      })}
      quickReplies={choiceVisible ? (
          <LineQuickReplies
            label={t('選擇一個回覆')}
            options={CHOICE_OPTIONS.map((o) => ({ label: t(o.label) }))}
            onChoose={(i) => chooseNeed(i === 0 ? 'A' : 'B')}
          />
        ) : null}
      footer={nextVisible ? (
          <ButtonGroup className="line-chat-cta">
            <Button to="/scenario01-investment/vip-group">{t('加入 VIP 群組')}</Button>
          </ButtonGroup>
        ) : null}
    />
  );
}

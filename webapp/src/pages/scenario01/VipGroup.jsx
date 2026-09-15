import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineConversation } from '../../apps/line';
import { Button } from '../../components/ui/Button';
import { ButtonGroup } from '../../components/ui/ButtonGroup';
import { useTypedMessages } from '../../lib/typedMessages';
import { useStageClassName } from '../../shell/StageClassContext';
import { useScenario01Lang, useT, getScenario01SenderName } from './i18n';
import { COACH_CHEN_AVATAR, VIP_GROUP_AVATARS } from './avatars';
import { getScenario01CharacterBySlot } from '../../lib/scenario01Characters';
import { FraudWarningBanner } from '../../components/warnings/FraudWarningBanner';
import { useARInteraction } from '../../lib/arInteraction';

const MESSAGES = [
  { text: '你已加入群組。', type: 'system', delay: 800 },
  { text: '陳老師：今天盤勢很漂亮，AI 模型剛剛抓到一檔短線標的。' },
  { text: '{investmentAssistant}：新朋友可以先觀察，老師等等會公布操作方向。', senderSlot: 'investmentAssistant' },
  { text: '阿凱：我昨天跟老師那檔，今天開盤就拉上去了，真的有點誇張。', senderSlot: 'vipMale01' },
  { text: 'Jenny：我剛剛試著出金，已經入帳了，謝謝老師。', senderSlot: 'vipFemale01' },
  { text: '股海小白：原本只是進來看看，沒想到三天就有收益。' },
  { text: '王先生：我今天先小額跟 1 萬，想先試水溫。', senderSlot: 'vipMale02' },
  { text: '小雅：早上看帳面多了 2,800，雖然不多但很有感。', senderSlot: 'vipFemale02' },
  { text: '{investmentAssistant}：目前下午場名額剩 12 位，還沒補資料的我會一對一提醒。', senderSlot: 'investmentAssistant', showVipWarning: true },
  { text: 'Kevin：昨天照老師提醒停利，剛剛本金跟獲利都回到帳戶了。', senderSlot: 'vipMale03' },
  { text: '財富自由ing：我先把上週獲利留下來，今天準備再加碼一點。' },
  { text: '陳老師：今天這檔不適合猶豫，下午 2 點前完成入金，晚上我會公布操作策略。' },
  { text: '{investmentAssistant}：還沒完成註冊的新朋友，請先點下方連結開通帳戶。', senderSlot: 'investmentAssistant' },
  { text: '陳老師：完成平台註冊後把帳號截圖私訊助理，方便我安排今晚的操作名單。' },
];

// Splits the "Name：message" text format the script above is written in
// into separate sender/text fields, so the sender can be shown as its own
// small label above the bubble (real LINE group convention) instead of
// baked into the bubble's own text. Accepts both the full-width '：' the
// Chinese source uses and a plain ':' so the English/Japanese translations
// (which read more naturally with a half-width colon) split the same way.
function parseSender(text) {
  const idx = text.search(/[:：]/);
  if (idx === -1) return { sender: null, text };
  return { sender: text.slice(0, idx), text: text.slice(idx + 1).replace(/^\s+/, '') };
}

// Same LINE chrome as scenario02's PrivateChat, adapted for a group: the
// header shows the group name + member count instead of a single person,
// and each incoming message gets its own mini avatar + sender-name label
// above the bubble (LINE's actual group-chat convention) instead of the
// sender's name being baked into the message text.
export function VipGroup() {
  useStageClassName('line-stage');
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario01Lang();
  const [showWarning, setShowWarning] = useState(false);
  const tickerText = t('⚠ AI 提示：偵測到高風險投資訊息——大量獲利截圖、短時間快速收益、成功出金回報。這類內容可能是詐騙集團安排的暗樁話術，請勿僅依據群組訊息作為投資判斷。');
  const translatedMessages = useMemo(
    () => MESSAGES.map((m) => {
      const { sender: zhSender } = parseSender(m.text);
      const translated = parseSender(t(m.text));
      const random = m.senderSlot ? getScenario01CharacterBySlot(m.senderSlot, lang) : null;
      // Cast senders are labelled by ./i18n, not by their bare cast name.
      // For everyone in the VIP group that is the same thing; for the
      // assistant it is "投資小助理 <her name>", exactly as the LINE 1:1 chat
      // header spells her. She is one character seen in two places, so the
      // label has to come from one call - reading .name here is what let the
      // group quietly drop her title and read as a different person.
      const castSender = m.senderSlot ? getScenario01SenderName(m.senderSlot, lang) : null;
      return { ...m, sender: castSender ?? translated.sender, text: translated.text, avatar: random?.avatar ?? (zhSender ? VIP_GROUP_AVATARS[zhSender] : undefined) };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const { rendered, isTyping, done } = useTypedMessages(translatedMessages, {
    messageDelay: 1200,
    typingDelay: 650,
    onFlagged: () => setShowWarning(true),
  });
  const scrollRef = useRef(null);

  // Messages (and their avatars) reveal one at a time via useTypedMessages
  // (first one at 800ms, then every 1200ms) - without this, each avatar
  // <img> only starts its network fetch the instant its row first renders,
  // so the row's text paints immediately while the photo pops in a beat
  // later, visibly replacing the avatar's placeholder circle. Warming the
  // browser's image cache for every sender up front means each photo is
  // already loaded well before its row is due to appear.
  useEffect(() => {
    const urls = new Set(Object.values(VIP_GROUP_AVATARS));
    urls.add(COACH_CHEN_AVATAR);
    urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [rendered, isTyping]);

  // AR Interaction Contract: the group chat plays itself out, so the screen is
  // `display` for as long as messages are still arriving and becomes `single`
  // only once the 前往註冊平台 CTA is actually on screen.
  useARInteraction(done
    ? {
      mode: 'single',
      surfaceId: 'scenario01/vip-group',
      action: () => navigate('/scenario01-investment/platform-register'),
    }
    : { mode: 'display', surfaceId: 'scenario01/vip-group-playing' });

  return (
    <LineConversation
      fullBleed
      mode="group"
      identity={{ displayName: t('陳老師 AI 飆股'), avatar: COACH_CHEN_AVATAR, memberCount: t('165 人') }}
      onBack={() => navigate('/scenario-menu')}
      labels={{ back: t('返回'), search: t('搜尋'), call: t('通話'), menu: t('選單') }}
      bodyClassName="line-group-body"
      bodyBefore={<FraudWarningBanner active={showWarning} theme="chat" severity="notice" body={tickerText} />}
      scrollRef={scrollRef}
      typing={isTyping}
      messages={rendered.map((message, index) => ({ ...message, id: index }))}
      footer={done ? (
          <ButtonGroup className="line-chat-cta">
            <Button to="/scenario01-investment/platform-register">{t('前往註冊平台')}</Button>
          </ButtonGroup>
        ) : null}
    />
  );
}

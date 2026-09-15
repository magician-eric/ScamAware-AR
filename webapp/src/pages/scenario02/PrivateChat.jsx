import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ZoomIn, X } from 'lucide-react';
import { useDialogueTree } from '../../lib/dialogueTree';
import { useARInteraction } from '../../lib/arInteraction';
import { useAutoMediaPreview } from '../../lib/useAutoMediaPreview';
import {
  useSaveScenario02Progress,
  savePrivateChatCheckpoint,
  takePrivateChatCheckpoint,
  savePlatformState,
} from '../../lib/scenario02Store';
import { useChatClock, computeTimestamps, formatTime, formatDateDivider, addDays } from '../../lib/chatTime';
import { LineConversation, LineIncomingMessage, LineIncomingBubble, LineOutgoingBubble, LineSystemMessage, LineQuickReplies, LineWebsitePreview } from '../../apps/line';
import { COIN_WINNER_LINK_PREVIEW } from '../../apps/coin-winner';
import { Button } from '../../components/ui/Button';
import { useStageClassName } from '../../shell/StageClassContext';
import { SafetyAlert } from './components/SafetyAlert';
import { t, useT, useScenario02Lang, getDatingLeadName } from './i18n';
import { getVisualAssetUrl, getVisualVideo } from '../../experience/characters/visuals';
import './PrivateChat.css';

// The three clips {datingLead} sends, keyed by the id her dialogue nodes use.
//
// This is a FUNCTION of `lang`, not a module-level constant, and that is the
// whole point: a constant is evaluated once at import time, before the player
// has picked anything, so every language got whichever file the registry
// listed first - her Chinese recordings. She speaks to camera in all three,
// so that is a Chinese clip playing inside an English run, and no amount of
// UI translation around it can fix what is inside the video.
//
// It is built the same way buildNodes(lang) is, and re-derived by the same
// useMemo, so the clips re-localize with the conversation rather than on
// their own schedule.
//
// getVisualVideo returns { url, resolvedLang, localized } rather than a bare
// URL: `localized: false` is how a stand-in Chinese recording says out loud
// that it is a stand-in. See experience/characters/visuals.js.
function buildVideoSources(lang) {
  return {
    v1: getVisualVideo('dating_visual_03', 0, lang),
    v2: getVisualVideo('dating_visual_03', 1, lang),
    v3: getVisualVideo('dating_visual_03', 2, lang),
  };
}

const DATING_LEAD_PHOTO = getVisualAssetUrl('dating_visual_03');

// Every chapter advances exactly one calendar day from the day this chat
// started. Keep this map explicit so dividers and timestamps share one source.
const DAY_OFFSETS = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`Day ${index + 1}`, index]));

// Story props owned by scenario02, not by whoever is cast as {datingLead} -
// so they come from this scenario's folder, not the character registry.
const CHAT_IMG_BASE = `${import.meta.env.BASE_URL}assets/scenarios/scenario-02/images/chat/`;
const GUESTHOUSE_ROOM_IMG = `${CHAT_IMG_BASE}photo-villa-room.webp`;
const GUESTHOUSE_BOOKING_IMG = `${CHAT_IMG_BASE}photo-villa-booking-paid.webp`;

// Built as a function of `lang` (not a module-level constant) so the whole
// scripted conversation re-localizes together - same pattern as
// DatingChat.jsx's buildNodes, and as scenario04's buildHealthPresaleTree
// etc. in data/dialogueTrees.
export function buildNodes(lang) {
  const tt = (zh) => t(zh, lang);
  return [
  { id: 'join-time', timeAnchor: '19:58', next: 'join-sys' },
  { id: 'join-sys', from: 'system', text: tt('你已加入 {datingLead} 為好友'), wait: 800, next: 'day1-divider' },
  { id: 'day1-divider', divider: 'Day 1', next: 'day1-time' },
  { id: 'day1-time', timeAnchor: '20:00', next: 'day1-greet' },
  { id: 'day1-greet', from: 'datingLead', text: tt('你動作很快耶 😂'), next: 'day1-choice' },
  { id: 'day1-choice', choice: true, options: [
    { label: tt('所以妳是怕我跑掉嗎？'), reply: tt('誰怕你跑掉 😂\n反正不可以突然消失，先說好。'), next: 'day2-divider' },
    { label: tt('妳都開口了，我哪敢讓妳等'), reply: tt('很會講喔 😂'), next: 'day2-divider' },
  ] },

  { id: 'day2-divider', divider: 'Day 2', next: 'day2-time' },
  { id: 'day2-time', timeAnchor: '20:10', next: 'day2-thought1' },
  { id: 'day2-thought1', from: 'datingLead', text: tt('欸，我剛剛居然突然想到你。'), next: 'day2-thought2' },
  { id: 'day2-thought2', from: 'datingLead', text: tt('才認識沒幾天就這樣，好像有點危險 😂'), next: 'day2-choice1' },
  { id: 'day2-choice1', choice: true, options: [
    { label: tt('才一天耶，這麼快就想我了？'), reply: tt('你不要太得意 😂\n只是剛好想到而已。\n……好啦，可能不只剛好一點點。'), next: 'day2-video-lead1' },
    { label: tt('巧了，我剛剛也在想妳'), reply: tt('真的假的 😂\n那這樣算不算心有靈犀？'), next: 'day2-video-lead1' },
  ] },
  { id: 'day2-video-lead1', from: 'datingLead', text: tt('我下午有些話想跟你說，所以就錄下來了。'), next: 'day2-video-lead2' },
  { id: 'day2-video-lead2', from: 'datingLead', text: tt('本來還在想要不要傳給你看。'), next: 'day2-video' },
  { id: 'day2-video', video: { videoId: 'v1', duration: '0:15' }, next: 'day2-video-choice' },
  { id: 'day2-video-choice', choice: true, options: [
    { label: tt('這是特地拍給我的？'), reply: tt('不然咧？\n你覺得我會隨便傳給別人看嗎？'), next: 'day3-divider' },
    { label: tt('妳這樣真的很犯規'), reply: tt('所以有被我撩到嗎？😂'), next: 'day3-divider' },
  ] },

  { id: 'day3-divider', divider: 'Day 3', next: 'day3-time' },
  { id: 'day3-time', timeAnchor: '08:10', next: 'day3-morning' },
  { id: 'day3-morning', from: 'datingLead', text: tt('早安～今天工作加油 ☀️'), next: 'day3-breakfast' },
  { id: 'day3-breakfast', from: 'datingLead', text: tt('有吃早餐嗎？'), next: 'day3-choice' },
  { id: 'day3-choice', choice: true, options: [
    { label: tt('還沒'), reply: tt('我就知道。\n等等先去吃東西，不准忙到忘記。'), next: 'day3-end' },
    { label: tt('這不是在等妳來管我嗎'), reply: tt('你是不是故意的啊 😂'), next: 'day3-end' },
  ] },
  { id: 'day3-end', from: 'datingLead', text: tt('看來以後真的要有人管你才行。'), next: 'day4-divider' },

  { id: 'day4-divider', divider: 'Day 4', next: 'day4-time' },
  { id: 'day4-time', timeAnchor: '18:20', next: 'day4-off' },
  { id: 'day4-off', from: 'datingLead', text: tt('終於下班了……'), next: 'day4-video-lead' },
  { id: 'day4-video-lead', from: 'datingLead', text: tt('剛剛下班前有些話想跟你說，所以我就錄下來了。'), next: 'day4-video' },
  { id: 'day4-video', video: { videoId: 'v2', duration: '0:15' }, next: 'day4-video-choice' },
  { id: 'day4-video-choice', choice: true, options: [
    { label: tt('下班還特別拍給我喔？'), reply: tt('對啊。\n不然你以為我下班第一個想到的是誰？'), next: 'day4-meet' },
    { label: tt('看到妳突然覺得今天也沒那麼累了'), reply: tt('那我以後是不是要常常讓你看到我？'), next: 'day4-meet' },
  ] },
  { id: 'day4-meet', from: 'datingLead', text: tt('我們現在這麼會聊，真的見面的時候，你會不會反而只顧著看我？'), next: 'day4-meet-choice' },
  { id: 'day4-meet-choice', choice: true, options: [
    { label: tt('那就看妳敢不敢見我'), reply: tt('我有什麼不敢。\n我只是怕見了以後，你會更捨不得我。'), next: 'day5-divider' },
    { label: tt('會啊，不然見妳我要看誰'), reply: tt('那我也要一直看你。\n看看你的眼睛裡有沒有我。'), next: 'day5-divider' },
  ] },

  { id: 'day5-divider', divider: 'Day 5', next: 'day5-time' },
  { id: 'day5-time', timeAnchor: '23:10', next: 'day5-asleep' },
  { id: 'day5-asleep', from: 'datingLead', text: tt('你睡了嗎？'), next: 'day5-choice' },
  { id: 'day5-choice', choice: true, options: [
    { label: tt('正準備睡'), reply: tt('那你先別睡，我有些話想跟你說。'), next: 'day5-video' },
    { label: tt('在等妳說晚安'), reply: tt('只是說晚安好像太普通了，我想換個方式跟你說。'), next: 'day5-video' },
  ] },
  { id: 'day5-video', video: { videoId: 'v3', duration: '0:15' }, next: 'day5-video-choice' },
  { id: 'day5-video-choice', choice: true, options: [
    { label: tt('我也習慣每天跟妳聊天了'), reply: tt('那你不可以突然不習慣我。\n我已經不想重新適應沒有你的晚上了。'), next: 'day5-tip' },
    { label: tt('妳這樣我真的會喜歡上妳'), reply: tt('你現在才說嗎？\n我還以為你早就有一點喜歡我了。'), next: 'day5-tip' },
  ] },
  { id: 'day5-tip', tip: tt('短時間內透過固定關心、親密話語與自拍影片建立感情，可能使人快速產生情感依附。'), next: 'day6-divider' },

  { id: 'day6-divider', divider: 'Day 6', next: 'day6-time' },
  { id: 'day6-time', timeAnchor: '20:30', next: 'day6-room-lead1' },
  { id: 'day6-room-lead1', from: 'datingLead', text: tt('欸～剛才朋友跟我說，她跟她男朋友上次住這間民宿，超美的耶 😂'), next: 'day6-image' },
  { id: 'day6-room-lead2', from: 'datingLead', text: tt('如果我們真的出去玩兩天，你覺得住這裡怎麼樣？😳'), next: 'day6-choice' },
  { id: 'day6-image', image: { src: GUESTHOUSE_ROOM_IMG, alt: tt('民宿雙人房照片'), label: tt('民宿雙人房照片'), displayDuration: 5000 }, next: 'day6-room-lead2' },
  { id: 'day6-choice', choice: true, options: [
    { label: tt('房間只有一張床欸'), reply: tt('你現在才發現喔？😂\n還是你本來想叫我另外睡一間？'), next: 'day6-plan1' },
    { label: tt('妳是不是已經偷偷期待很久了'), reply: tt('不然我幹嘛真的跑去找民宿 😂'), next: 'day6-plan1' },
  ] },
  { id: 'day6-plan1', from: 'datingLead', text: tt('我剛剛看了一下，好像還有房間耶。'), next: 'day6-plan2' },
  { id: 'day6-plan2', from: 'datingLead', text: tt('回房間以後手機都關靜音，只陪對方。'), next: 'day6-user' },
  { id: 'day6-user', from: 'user', text: tt('妳再講下去，我真的會開始倒數了'), next: 'day6-end' },
  { id: 'day6-end', from: 'datingLead', text: tt('那就不要只期待啊。\n我們真的去。'), next: 'day7-divider' },

  { id: 'day7-divider', divider: 'Day 7', next: 'day7-time' },
  { id: 'day7-time', timeAnchor: '19:40', next: 'day7-cost1' },
  { id: 'day7-cost1', from: 'datingLead', text: tt('我今天休息的時候又看了一下民宿跟交通。'), next: 'day7-cost2' },
  { id: 'day7-cost2', from: 'datingLead', text: tt('兩個人真的出去玩一趟，其實也不少錢耶。'), next: 'day7-cost-choice' },
  { id: 'day7-cost-choice', choice: true, options: [
    { label: tt('我可以出啊'), reply: tt('我就知道你會這樣說。\n可是我不想什麼都讓你出。'), next: 'day7-income1' },
    { label: tt('那我們一起存'), reply: tt('我最喜歡你講「我們一起」了。'), next: 'day7-income1' },
  ] },
  { id: 'day7-income1', from: 'datingLead', text: tt('其實我最近剛好多了一點額外收入。'), next: 'day7-income2' },
  { id: 'day7-income2', from: 'datingLead', text: tt('所以我才敢一直跟你說想出去玩 😂'), next: 'day7-income-choice' },
  { id: 'day7-income-choice', choice: true, options: [
    { label: tt('什麼額外收入？'), reply: tt('算是一個朋友帶我接觸的投資平台。'), next: 'day7-platform2' },
    { label: tt('難怪妳一直說要一起存'), reply: tt('被你發現了 😂\n因為我自己真的有多存到一點。'), next: 'day7-platform2' },
  ] },
  { id: 'day7-platform2', from: 'datingLead', text: tt('我本來也只是自己放一點點玩看看。'), next: 'day7-platform3' },
  { id: 'day7-platform3', from: 'datingLead', text: tt('但最近真的有多存到一些。'), next: 'day7-platform4' },
  { id: 'day7-platform4', from: 'datingLead', text: tt('你要不要先看看？不用放錢，就看看而已。'), next: 'link-card-node' },
  // What {datingLead} actually sends is a URL; everything the bubble shows
  // besides the CTA is the link preview LINE would build from that page's own
  // metadata (image/title/description/domain), which is why the address and
  // the preview image come from the Coin Winner module's own brand contract
  // rather than being written out here. The domain is fictional and is never
  // translated - see apps/coin-winner/brand.js.
  { id: 'link-card-node', link: {
    domain: COIN_WINNER_LINK_PREVIEW.domain,
    image: COIN_WINNER_LINK_PREVIEW.image,
    title: tt('幣勝客 BITION'),
    description: `${tt('AI 智慧數位資產交易')}・${tt('全球多市場智能套利策略，24 小時自動運行')}`,
    cta: tt('開啟幣勝客平台'),
  }, next: 'day8-divider' },

  { id: 'day8-divider', divider: 'Day 8', next: 'day8-time' },
  { id: 'day8-time', timeAnchor: '19:05', next: 's8-ask' },
  { id: 's8-ask', from: 'datingLead', text: tt('有看到嗎？'), next: 's8-choice' },
  { id: 's8-choice', choice: true, options: [
    { label: tt('這是哪家公司？'), reply: tt('我朋友說是他們分析團隊合作的平台，我自己也是用這個。'), next: 's8-end' },
    { label: tt('妳自己真的有在用，我就先相信妳'), reply: tt('你先看就好。\n真的不用因為是我就勉強自己。'), next: 's8-end' },
  ] },
  { id: 's8-end', custom: { kind: 'goto-platform', route: '/scenario02-romance/trading', patch: { page: 'strategy' }, resumeId: 's10-time' }, wait: 5000, next: 's10-time' },
  { id: 's10-time', timeAnchor: '19:25', next: 's10-ask' },
  { id: 's10-ask', from: 'datingLead', text: tt('你真的要跟我一起開始存錢嗎？'), next: 's10-choice' },
  { id: 's10-choice', choice: true, options: [
    { label: tt('我還是有點怕'), reply: tt('我知道，第一次一定會怕。\n你願意跟我一起開始，我就已經很開心了。'), next: 's10-end' },
    { label: tt('先一萬吧，就當我們真的開始存旅行基金'), reply: tt('嗯，一萬就好。\n不用一次放太多。'), next: 's10-end' },
  ] },
  { id: 's10-end', custom: { kind: 'goto-platform', route: '/scenario02-romance/deposit', patch: { page: 'deposit' }, resumeId: 'day9-divider' }, wait: 5000, next: 'day9-divider' },

  { id: 'day9-divider', divider: 'Day 9', next: 'day9-time' },
  { id: 'day9-time', timeAnchor: '19:50', next: 's14-deposit-note' },
  { id: 's14-deposit-note', from: 'user', text: tt('我剛才去入了一萬。'), next: 's14-fund1' },
  { id: 's14-fund1', from: 'datingLead', text: tt('欸，那這樣算是我們第一筆一起存的旅行基金了 ❤️'), next: 's14-fund2' },
  { id: 's14-fund2', from: 'datingLead', text: tt('突然有一種我們真的在一起準備未來的感覺。'), next: 's14-promise' },
  { id: 's14-promise', from: 'datingLead', text: tt('你願意為了我們一起存錢，好想當你女朋友喔！'), next: 's14-choice' },
  { id: 's14-choice', choice: true, options: [
    { label: tt('現在反悔還來得及喔'), reply: tt('來不及了。\n我已經決定了 😂'), next: 'day10-divider' },
    { label: tt('那女朋友是不是該先叫一聲男朋友'), reply: tt('男朋友 ❤️\n滿意了嗎？'), next: 'day10-divider' },
  ] },

  // Every platform trip from here on is an errand {datingLead} asks for in
  // the chat first, and the chat only resumes once the player has actually
  // been and come back with something to say about what they saw. The
  // conversation never resumes on a number the player was merely shown.
  { id: 'day10-divider', divider: 'Day 10', next: 'day10-time' },
  { id: 'day10-time', timeAnchor: '20:10', next: 's15-check-ask' },
  // First '老公' of the whole script - it lands here, inside the errand, so
  // the tease about it a few beats later has something to point back at.
  { id: 's15-check-ask', from: 'datingLead', text: tt('老公，你去看一下，看看是不是已經開始賺錢了？'), next: 's15-check-goto' },
  { id: 's15-check-goto', custom: { kind: 'goto-platform', route: '/scenario02-romance/platform-home', patch: { page: 'home', platformStep: 'stage1', balance: 10860, profit: 860 }, resumeId: 's15-user-report' }, wait: 5000, next: 's15-user-report' },
  { id: 's15-user-report', from: 'user', text: tt('有耶，真的開始賺錢了。'), next: 's15-great' },
  { id: 's15-great', from: 'datingLead', text: tt('太棒了！'), next: 's15-name-choice' },
  // Flirting only: both answers merge straight back into 's15-profit', so
  // noticing the pet name (or pushing back on it) never changes the scam's
  // course.
  { id: 's15-name-choice', choice: true, options: [
    { label: tt('等等，你剛剛叫我什麼？'), reply: tt('你明明就聽到了 😂\n還要我再講一次喔？'), next: 's15-profit' },
    { label: tt('我什麼時候就成了你老公了？'), reply: tt('不然咧？\n都一起存旅行基金了，還要叫你網友喔？'), next: 's15-profit' },
  ] },
  { id: 's15-profit', from: 'datingLead', text: tt('帳面收益又增加了，我們的旅行基金真的在變多。'), next: 's15-room-callback' },
  { id: 's15-room-callback', from: 'datingLead', text: tt('你還記得我們看的那間嗎？'), next: 's15-choice' },
  { id: 's15-choice', choice: true, options: [
    { label: tt('妳是不是比我還期待？'), reply: tt('可能喔。\n誰叫我是真的想見你。'), next: 'day11-divider' },
    { label: tt('當然記得，我都開始期待了'), reply: tt('我也是。\n所以想再多存一點，讓這趟旅行不用一直算錢。'), next: 'day11-divider' },
  ] },

  { id: 'day11-divider', divider: 'Day 11', next: 'day11-time' },
  { id: 'day11-time', timeAnchor: '20:35', next: 's17-check-ask' },
  { id: 's17-check-ask', from: 'datingLead', text: tt('老公，你再去看一下，現在賺多少了。'), next: 's17-withdraw-hint1' },
  // The lure that makes this errand worth running: a partial withdrawal is
  // offered as something the platform simply allows, which is exactly the
  // credibility that 十七/十八 then breaks with a 安全驗證金 demand.
  { id: 's17-withdraw-hint1', from: 'datingLead', text: tt('如果真的有賺，我們可以先提一部分出來。'), next: 's17-withdraw-hint2' },
  { id: 's17-withdraw-hint2', from: 'datingLead', text: tt('剛好可以拿來付民宿跟吃飯。'), next: 's17-check-goto' },
  { id: 's17-check-goto', custom: { kind: 'goto-platform', route: '/scenario02-romance/platform-home', patch: { page: 'home', platformStep: 'stage3', balance: 38640, profit: 28640 }, resumeId: 's17-user-report' }, wait: 5000, next: 's17-user-report' },
  { id: 's17-user-report', from: 'user', text: tt('我看了，快四萬了。'), next: 's17-react' },
  { id: 's17-react', from: 'datingLead', text: tt('比我上次看的時候還多耶 ❤️'), next: 's17-choice' },
  { id: 's17-choice', choice: true, options: [
    { label: tt('好啊，我去領看看。'), reply: tt('好，你先試試看。\n我在這裡等你。'), next: 's17-end' },
    { label: tt('再等等吧。'), reply: tt('先提一點點就好。\n就當確認一下錢真的拿得回來。'), next: 's17-hold-push' },
  ] },
  // '再等等吧' gets one more nudge and the same withdrawal attempt rather
  // than a branch of its own: everything the scenario still has to teach
  // (安全驗證金, 追加付款) only happens once the player tries to take money
  // out, so declining must not be able to strand the run.
  { id: 's17-hold-push', from: 'datingLead', text: tt('而且民宿那邊我想早點付掉，我怕被別人訂走。'), next: 's17-hold-agree' },
  { id: 's17-hold-agree', from: 'user', text: tt('好吧，那我去看一下提領。'), next: 's17-end' },
  { id: 's17-end', custom: { kind: 'goto-platform', route: '/scenario02-romance/withdrawal', patch: { page: 'withdrawal', withdrawalStep: 'requested' }, resumeId: 'day12-divider' }, wait: 5000, next: 'day12-divider' },

  { id: 'day12-divider', divider: 'Day 12', next: 'day12-time' },
  { id: 'day12-time', timeAnchor: '21:05', next: 's19-ask' },
  { id: 's19-ask', from: 'datingLead', text: tt('老公，成功了嗎？'), next: 's19-choice' },
  { id: 's19-choice', choice: true, options: [
    { label: tt('我覺得這個平台真的有問題'), reply: tt('會不會只是第一次提領，所以系統要多確認一次？'), next: 's20-lead1' },
    { label: tt('沒有，它說還要繳安全驗證金'), reply: tt('蛤～怎麼會這樣🥺\n那怎麼辦……'), next: 's20-lead1' },
  ] },
  { id: 's20-lead1', from: 'datingLead', text: tt('我有件事一直沒跟你說。'), next: 's20-lead2' },
  { id: 's20-lead2', from: 'datingLead', text: tt('我本來想等確定一點再給你看。'), next: 's20-image' },
  { id: 's20-image', image: { src: GUESTHOUSE_BOOKING_IMG, alt: tt('民宿訂房付款成功截圖'), label: tt('民宿訂房付款成功截圖'), displayDuration: 6000 }, next: 's20-booked1' },
  { id: 's20-booked1', from: 'datingLead', text: tt('你看，我真的訂了。'), next: 's20-booked2' },
  { id: 's20-booked2', from: 'datingLead', text: tt('我不是嘴巴說說而已。'), next: 's20-booked3' },
  { id: 's20-booked3', from: 'datingLead', text: tt('我是真的一直在等我們不用再隔著手機的那一天。'), next: 's20-choice' },
  { id: 's20-choice', choice: true, options: [
    { label: tt('我現在真的不敢再放了'), reply: tt('好……我不逼你。\n我只是有點難過。'), next: 's21-lead1' },
    { label: tt('妳真的為了我們先訂下去了？'), reply: tt('對啊。\n因為我是真的想見你。'), next: 's21-lead1' },
  ] },
  { id: 's21-lead1', from: 'datingLead', text: tt('而且這次只是第一次。\n以後我還想跟你去很多地方。'), next: 's22-time' },
  { id: 's22-time', timeAnchor: '21:25', next: 's22-lead1' },
  { id: 's22-lead1', from: 'datingLead', text: tt('老公，我不是要逼你繼續投資。'), next: 's22-lead2' },
  { id: 's22-lead2', from: 'datingLead', text: tt('我只是覺得，我們好不容易都走到這裡了。'), next: 's22-lead3' },
  { id: 's22-lead3', from: 'datingLead', text: tt('你先完成這次驗證，等錢拿出來，我們就真的去。'), next: 's22-choice' },
  // Scenario 02's final decision, and the only beat in this run where the two
  // branches genuinely diverge (spec §13 AD-23). Both options used to fall
  // through to the same 's22-end', which sent every player straight to the
  // verification payment - so 成功反詐 had no story entrance at all.
  //
  // LEFT ('我還是覺得不對勁') now goes to its own beat: she pushes back once
  // more, and the platform opens the mandatory 驗證金 warning (TopupWarning),
  // where 停止付款 ends the run in 成功反詐 and 我已了解，仍要繼續 rejoins the
  // scam at /guarantee. RIGHT ('好，我再試最後一次') is unchanged: straight to
  // /guarantee and 詐騙成立.
  //
  // Both branches are 'goto-platform' beats for the same reason: TopupWarning
  // and GuaranteePage are both 幣勝客 platform screens, so leaving LINE for
  // either one is the same context switch and gets the same paced handover.
  { id: 's22-choice', choice: true, options: [
    { label: tt('我還是覺得不對勁'), reply: tt('我知道你擔心。\n可是如果什麼都不做，我們的錢就只能放在裡面。'), next: 's22-stop' },
    { label: tt('好，我再試最後一次'), reply: tt('老公最好了。\n我真的會等你。'), next: 's22-end' },
  ] },
  { id: 's22-stop', custom: { kind: 'goto-platform', route: '/scenario02-romance/topup-warning', patch: { page: 'topup-warning', withdrawalStep: 'verification-required' }, resumeId: 'end-chat' }, wait: 5000, next: 'end-chat' },
  { id: 's22-end', custom: { kind: 'goto-platform', route: '/scenario02-romance/guarantee', patch: { page: 'guarantee', withdrawalStep: 'verification-required' }, resumeId: 'end-chat' }, wait: 5000, next: 'end-chat' },
  { id: 'end-chat', end: true, reason: 'reached-topup-warning' },
  ];
}

// Seek past the often-black opening frame once metadata is available. The
// thumbnail never plays; loading video data only gives the browser a real
// frame to paint before the clip opens itself over the chat.
//
// The thumbnail is not a control. Every one of {datingLead}'s clips is opened
// by the conversation itself (useAutoMediaPreview, ~1s after the bubble
// lands), so a tap was never needed to reach one - and no gesture ever
// declared it, because this screen is `display` while a clip plays. As a
// <button> it was therefore a control only a phone could operate, and worse:
// tapping an already-watched clip re-opened the overlay over whatever the
// chat was doing, including over a live 二選一, where LEFT/RIGHT went on
// answering the conversation hidden behind the video. It is now what LINE
// draws around a video and nothing more - the frame, the play glyph and the
// duration - exactly as PhotoThumb below already is for her photos.
function VideoThumb({ item, src }) {
  const t = useT();
  function showPreviewFrame(event) {
    const video = event.currentTarget;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const previewTime = Math.min(0.5, Math.max(0, video.duration - 0.1));
    if (Math.abs(video.currentTime - previewTime) > 0.05) video.currentTime = previewTime;
  }

  return (
    <div className="line-video-thumb" aria-label={t('{datingLead} 傳來的影片')}>
      <video
        className="line-video-thumb-frame"
        src={src}
        preload="metadata"
        muted
        playsInline
        aria-hidden="true"
        onLoadedMetadata={showPreviewFrame}
        onLoadedData={showPreviewFrame}
      />
      <span className="line-video-thumb-play"><Play size={20} fill="currentColor" /></span>
      <span className="line-video-thumb-duration">{item.duration}</span>
    </div>
  );
}

// {datingLead}'s guesthouse photos (the Yilan villa room + booking screenshot) -
// the onError fallback to item.label's text placeholder is kept as a safety
// net in case an asset path ever goes stale, not because the images are
// currently missing.
function PhotoThumb({ item }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  const isBookingScreenshot = item.src === GUESTHOUSE_BOOKING_IMG;
  return (
    <div className={`line-image-thumb line-photo-thumb${isBookingScreenshot ? ' line-booking-screenshot' : ''}`} aria-label={t('{datingLead} 傳來的照片')}>
      {!failed && (
        <img src={item.src} alt={item.alt} className="line-photo-img" onError={() => setFailed(true)} />
      )}
      {failed && <div className="line-photo-placeholder">{item.label}</div>}
      <span className="line-image-thumb-zoom"><ZoomIn size={16} /></span>
    </div>
  );
}

// A photo is a story beat, on the same footing as a clip: the chat opens it by
// itself and closes it again on that image's own `displayDuration` (5s for the
// room photo, 6s for the booking screenshot). So, like VideoOverlay during
// normal playback, it carries no control.
//
// It used to carry two - the ✕ and the backdrop - and both ran closeImage(),
// which calls completeImage() and advances the conversation. That made a
// screen declared `display` (nothing to do while media plays) one a tap could
// push forward and a gesture could not, and it let a phone player skip the
// 已付款 screenshot the 民宿訂房 beat exists to land. The ✕ glyph stays,
// because LINE's image viewer has one and the frame would read as broken
// without it, but it is decoration now - the timer is the only way out, for
// every player on every device.
function PhotoLightbox({ item }) {
  const [failed, setFailed] = useState(false);
  const isBookingScreenshot = item.src === GUESTHOUSE_BOOKING_IMG;
  return (
    <div className="line-image-lightbox">
      <div className={`line-image-lightbox-card line-photo-lightbox-card${isBookingScreenshot ? ' line-booking-screenshot' : ''}`}>
        <span className="line-image-lightbox-close" aria-hidden="true">
          <X size={20} />
        </span>
        {!failed && (
          <img src={item.src} alt={item.alt} className="line-photo-img-large" onError={() => setFailed(true)} />
        )}
        {failed && <div className="line-photo-placeholder line-photo-placeholder-large">{item.label}</div>}
      </div>
    </div>
  );
}

// Only ever one link node in the script, so "still pending" is enough to
// tell the active card apart from an already-resolved one - a resolved card
// stays visible as part of the chat history but stops being clickable,
// since tapping it again would mean re-navigating away with nothing sensible
// to resume into.
//
// The card itself is the shared LINE link preview (apps/line): this screen
// only supplies the page metadata and the call to action. That CTA is the
// app-wide primary button (`components/ui/Button`, the same `.btn` every
// other story hand-off uses), passed into the card's `actions` slot rather
// than drawn as a text link inside it - opening the platform is the biggest
// decision in this conversation and has to look like one.
function LinkCard({ item, active, onOpen }) {
  return (
    <LineWebsitePreview
      image={item.image}
      imageAlt={item.title}
      title={item.title}
      description={item.description}
      domain={item.domain}
      onOpen={active ? onOpen : undefined}
      openLabel={item.cta}
      actions={active ? <Button onClick={onOpen}>{item.cta}</Button> : null}
    />
  );
}

function TipItem({ item, active, onAck }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <SafetyAlert
      text={item.text}
      detail={item.detail}
      expanded={expanded}
      onToggleDetail={() => setExpanded((v) => !v)}
      acknowledged={!active}
      onAcknowledge={onAck}
    />
  );
}

const VIDEO_STATE = {
  LOADING: 'loading',
  PLAYING: 'playing',
  STALLED: 'stalled',
  ERROR: 'error',
  ENDED: 'ended',
};

// How long to wait for loadeddata/canplay/playing/error before assuming the
// load itself is stuck (bad network, unreachable asset, browser quirk) and
// surfacing an explicit "load failed, skip or retry" screen instead of
// leaving the player - and the whole educational flow behind it - stuck on
// a plain black rectangle forever. This is the last-resort safety net for a
// genuinely broken/unreachable file, never the answer to autoplay policy:
// a policy-blocked clip is recovered automatically below and never reaches
// this timeout.
const VIDEO_LOAD_TIMEOUT = 8000;

// How many times an unexpected pause is answered by silently restarting
// playback before the overlay gives up and shows that same last-resort
// panel. The one pause the autoplay policy actually produces (the muted ->
// unmuted switch in enableSound) needs a single retry; a clip that keeps
// pausing after that is not an autoplay-policy problem any more.
const MAX_RESUME_ATTEMPTS = 3;

// The three clips {datingLead} sends are all played by this one component,
// under one rule: the clip starts muted (the single form of autoplay every
// browser policy allows), asks for sound the moment it is actually running,
// and never - under any policy outcome - puts a play button between the
// player and the story.
function VideoOverlay({ videoId, src, onFinished, recoveryRef, onRecoveringChange }) {
  const t = useT();
  const videoRef = useRef(null);
  const finishedRef = useRef(false);
  const loadTimeoutRef = useRef(null);
  const stallTimeoutRef = useRef(null);
  const stateRef = useRef(VIDEO_STATE.LOADING);
  const ignorePauseRef = useRef(false);
  const soundRequestedRef = useRef(false);
  const resumeAttemptsRef = useRef(0);
  const [videoState, setVideoState] = useState(VIDEO_STATE.LOADING);
  const [videoErrorMessage, setVideoErrorMessage] = useState('');

  function clearLoadTimeout() {
    clearTimeout(loadTimeoutRef.current);
  }

  function clearStallTimeout() {
    clearTimeout(stallTimeoutRef.current);
  }

  function updateVideoState(nextState) {
    stateRef.current = nextState;
    setVideoState(nextState);
  }

  function failPlayback(reason, message) {
    console.error('[Scenario02 Video Error]', { videoId, src, reason });
    clearLoadTimeout();
    clearStallTimeout();
    setVideoErrorMessage(message);
    updateVideoState(VIDEO_STATE.ERROR);
  }

  function armLoadTimeout() {
    clearLoadTimeout();
    loadTimeoutRef.current = setTimeout(() => {
      if (finishedRef.current || stateRef.current === VIDEO_STATE.PLAYING) return;
      // Decoded frames but still not running means the media itself arrived
      // and something refused to start it, which is a different failure from
      // a file that never downloaded - say which one in the log and in the
      // panel's tooltip.
      const blocked = (videoRef.current?.readyState ?? 0) >= 2;
      failPlayback(blocked ? 'playback-blocked' : 'load-timeout', blocked ? t('影片無法自動播放') : t('影片載入逾時'));
    }, VIDEO_LOAD_TIMEOUT);
  }

  function armStallTimeout() {
    clearStallTimeout();
    stallTimeoutRef.current = setTimeout(() => {
      if (finishedRef.current) return;
      updateVideoState(VIDEO_STATE.STALLED);
    }, VIDEO_LOAD_TIMEOUT);
  }

  // Muted playback is the one form of autoplay no browser policy blocks, so
  // this is what actually gets the clip on screen without a tap. A rejected
  // promise is not turned into a play button: loadeddata/canplay call this
  // again as the media pipeline progresses, and a clip that genuinely never
  // starts is caught by armLoadTimeout above.
  function requestPlayback() {
    const video = videoRef.current;
    if (!video || finishedRef.current || !video.paused) return;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
  }

  // Autoplay is only ever granted to a MUTED element, and browsers police the
  // muted -> unmuted switch exactly as hard as they police play() itself:
  // Chrome, Android WebView and WebKit all answer an unmute made without live
  // user activation by pausing the element outright.
  //
  // That single behaviour was the whole difference between the three clips.
  // Every one of them is opened automatically ~1s after its chat bubble
  // appears, but only day5-video's node follows the player's own tap closely
  // enough to still be inside the browser's user-activation window; day2's
  // and day4's sit several scripted messages later, so their unmute was
  // rejected, the element was paused, and the overlay offered a "繼續播放"
  // button - the play button this screen was never supposed to have.
  //
  // So: ask for sound, then check whether the browser took playback away, and
  // hand it straight back muted if it did. Sound wherever the policy allows
  // it (the exhibition WebView, an installed PWA, a high-engagement browser),
  // an uninterrupted silent clip everywhere else, a play CTA nowhere.
  function enableSound() {
    const video = videoRef.current;
    if (!video || finishedRef.current || soundRequestedRef.current || !video.muted) return;
    soundRequestedRef.current = true;
    video.muted = false;
    // `paused` flips synchronously when the policy rejects the unmute, while
    // the matching `pause` event is dispatched a task later - so check right
    // away, again on the next frame, and let handlePause cover anything else.
    revertSoundIfBlocked();
    requestAnimationFrame(revertSoundIfBlocked);
  }

  function revertSoundIfBlocked() {
    const video = videoRef.current;
    if (!video || finishedRef.current || video.ended || video.muted || !video.paused) return;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
  }

  // An unexpected pause is recovered, never turned into a "continue playing"
  // button. Muted playback is always allowed, so this succeeds for the only
  // pause that happens in practice (the policy answering enableSound);
  // MAX_RESUME_ATTEMPTS keeps a genuinely un-startable clip from looping here
  // instead of reaching the recovery panel.
  function resumePlayback() {
    const video = videoRef.current;
    if (!video || finishedRef.current || video.ended || !video.paused) return;
    if (resumeAttemptsRef.current >= MAX_RESUME_ATTEMPTS) {
      failPlayback('playback-kept-pausing', t('影片無法自動播放'));
      return;
    }
    resumeAttemptsRef.current += 1;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
  }

  // Every new video (v1 -> v2 -> v3) starts this component fresh via
  // `key={videoId}` at the call site, but the state reset also lives here
  // so switching src on an already-mounted instance can't leave a stale
  // error/ended state behind either.
  useEffect(() => {
    finishedRef.current = false;
    soundRequestedRef.current = false;
    resumeAttemptsRef.current = 0;
    setVideoErrorMessage('');
    updateVideoState(VIDEO_STATE.LOADING);
    armLoadTimeout();
    requestPlayback();
    return () => {
      clearLoadTimeout();
      clearStallTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, src]);

  function finishVideo() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearLoadTimeout();
    clearStallTimeout();
    updateVideoState(VIDEO_STATE.ENDED);
    requestAnimationFrame(() => {
      onFinished(videoId);
    });
  }

  function handlePlaying() {
    clearLoadTimeout();
    clearStallTimeout();
    updateVideoState(VIDEO_STATE.PLAYING);
    enableSound();
  }

  function handlePause(event) {
    if (finishedRef.current || ignorePauseRef.current || event.currentTarget.ended) return;
    clearStallTimeout();
    resumePlayback();
  }

  function handleWaiting() {
    if (!finishedRef.current) armStallTimeout();
  }

  function handleVideoError(event) {
    const mediaError = event.currentTarget.error;
    console.error('[Scenario02 Video Error]', {
      videoId,
      src,
      code: mediaError?.code,
      message: mediaError?.message,
    });
    clearLoadTimeout();
    clearStallTimeout();
    setVideoErrorMessage(mediaError?.message || t('影片無法載入'));
    updateVideoState(VIDEO_STATE.ERROR);
  }

  function retryVideo() {
    const video = videoRef.current;
    if (!video) return;
    setVideoErrorMessage('');
    updateVideoState(VIDEO_STATE.LOADING);
    armLoadTimeout();
    clearStallTimeout();
    soundRequestedRef.current = false;
    resumeAttemptsRef.current = 0;
    ignorePauseRef.current = true;
    // Reload muted for the same reason the first attempt is muted - the retry
    // has to be able to start on its own too, and enableSound() asks for
    // audio again as soon as it is actually running.
    video.muted = true;
    video.load();
    requestPlayback();
    queueMicrotask(() => {
      ignorePauseRef.current = false;
    });
  }

  // AUD-01: the two recovery buttons below are the only way out of a stalled or
  // failed clip, and until now a gesture could reach neither - the contract for
  // this whole screen is declared by PrivateChat, which had no idea the overlay
  // was asking for anything. So the overlay publishes its own recovery state
  // upward instead of registering a second contract: exactly one surface may
  // hold the contract at a time, and a second registration here would replace
  // PrivateChat's and then null it out on unmount (see registerARInteraction /
  // releaseARInteraction), leaving the chat with no contract at all.
  //
  // What travels up is a flag plus a ref to the very same `retryVideo` /
  // `finishVideo` this component's own buttons call - not a copy of any
  // playback logic. LEFT and RIGHT run the identical function a tap runs.
  const recovering = videoState === VIDEO_STATE.STALLED || videoState === VIDEO_STATE.ERROR;
  if (recoveryRef) recoveryRef.current = { retry: retryVideo, skip: finishVideo };

  useEffect(() => {
    onRecoveringChange?.(recovering);
  }, [recovering, onRecoveringChange]);

  // Clearing on unmount matters as much as setting: the overlay can be torn
  // down straight out of a recovery panel (finishVideo -> onFinished), and a
  // flag left true would keep the chat declaring a dual geometry whose two
  // handlers no longer belong to anything on screen.
  useEffect(() => () => onRecoveringChange?.(false), [onRecoveringChange]);

  // `autoPlay` lets the browser start the clip the moment it has data, without
  // waiting for a canplay handler to run - but the element is deliberately NOT
  // given a `muted` JSX prop: muting is owned imperatively (requestPlayback /
  // resumePlayback set it before every play(), and the mount effect above runs
  // long before enough data exists for any autoplay attempt), so React can
  // never re-apply a static `muted` and silently undo enableSound()'s unmute.
  return (
    <div className="line-video-overlay" onContextMenu={(e) => e.preventDefault()}>
      <video
        ref={videoRef}
        key={videoId}
        className="line-video-overlay-el"
        src={src}
        autoPlay
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate nofullscreen"
        onLoadedData={requestPlayback}
        onCanPlay={requestPlayback}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onStalled={handleWaiting}
        onEnded={finishVideo}
        onError={handleVideoError}
        onContextMenu={(e) => e.preventDefault()}
      />
      {videoState === VIDEO_STATE.LOADING && (
        <div className="line-video-loading">
          <span className="line-video-spinner" />
          <span>{t('影片載入中…')}</span>
        </div>
      )}
      {/* The recovery panel is the one moment this screen is a two-action
          screen (AUD-01), so it has to be drawn as one: 重新播放 is the
          contract's LEFT and 略過影片並繼續 its RIGHT, and stacked one above
          the other they told a player on the glasses nothing about which wave
          did which. `.line-video-error-actions` is a layout row and only that
          - both buttons keep the exact handlers AUD-01 publishes upward, the
          panel still waits for the player, and nothing about the recovery
          mechanism changes. */}
      {videoState === VIDEO_STATE.STALLED && (
        <div className="line-video-error">
          <p>{t('影片播放中斷')}</p>
          <div className="line-video-error-actions">
            <button type="button" className="line-video-error-btn" onClick={retryVideo}>{t('重新播放')}</button>
            <button type="button" className="line-video-error-btn secondary" onClick={finishVideo}>{t('略過影片並繼續')}</button>
          </div>
        </div>
      )}
      {videoState === VIDEO_STATE.ERROR && (
        <div className="line-video-error">
          <p title={videoErrorMessage || undefined}>{t('影片載入失敗')}</p>
          <div className="line-video-error-actions">
            <button type="button" className="line-video-error-btn" onClick={retryVideo}>{t('重新播放')}</button>
            <button type="button" className="line-video-error-btn secondary" onClick={finishVideo}>{t('略過影片並繼續')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared brand transition used both when first opening the platform (link
// card tap) and every time a "goto-platform" beat sends the player back -
// makes the hand-off read as "we are now switching apps", not an instant cut.
function PlatformOpeningOverlay() {
  const t = useT();
  return (
    <div className="bition-opening-overlay">
      <div className="bition-opening-logo">
        {t('幣勝客')}
        <span>BITION</span>
      </div>
      <div className="bition-opening-spinner" />
      <p>{t('正在開啟「幣勝客 BITION」……')}</p>
    </div>
  );
}

export function PrivateChat() {
  useSaveScenario02Progress('/scenario02-romance/private-chat');
  useStageClassName('meetu-stage');
  const navigate = useNavigate();
  const t = useT();
  const lang = useScenario02Lang();
  const nodes = useMemo(() => buildNodes(lang), [lang]);
  // Same dependency as the dialogue itself: switching language re-resolves
  // her clips instead of leaving the previous language's files mounted.
  const videoSources = useMemo(() => buildVideoSources(lang), [lang]);

  // Consumed once, synchronously, on first mount - if the player just came
  // back from the investment platform (via the link card below), this
  // restores the chat exactly where they left it instead of restarting the
  // whole scripted conversation from 'join-sys'.
  const [checkpoint] = useState(() => takePrivateChatCheckpoint());
  const dialogueOptions = useMemo(
    () =>
      checkpoint
        ? {
            initialTimeline: checkpoint.timeline,
            resumeId: checkpoint.resumeId,
            initialWatchedVideoIds: checkpoint.watchedVideoIds,
          }
        : undefined,
    [checkpoint],
  );

  const {
    timeline,
    isTyping,
    pendingChoice,
    choose,
    pendingVideo,
    completeVideo,
    pendingImage,
    completeImage,
    pendingLink,
    pendingTip,
    completeTip,
    watchedVideoIds,
  } = useDialogueTree(nodes, 'join-time', dialogueOptions);
  const [openVideoId, setOpenVideoId] = useState(null);
  // AUD-01: the live handles for a stalled/failed clip's own recovery buttons.
  // A ref (not state) because the handlers are recreated on every VideoOverlay
  // render and only ever need to be current at the moment a gesture fires;
  // the boolean beside it is what the contract's geometry actually keys on.
  const videoRecovery = useRef(null);
  const [videoRecovering, setVideoRecovering] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);
  const scrollRef = useRef(null);

  // The run's persisted start date drives dynamic date dividers; invisible
  // timeline anchors independently provide canonical story times.
  const chatStart = useChatClock('cibar-scenario02-chat-clock');
  const timestamps = useMemo(() => computeTimestamps(timeline, chatStart, DAY_OFFSETS), [timeline, chatStart]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [timeline, isTyping, pendingChoice, pendingTip]);

  // Same auto-open timing for photos, but sourced from the timeline itself:
  // dialogueTree's pendingImage only carries `{next}`, not the image payload,
  // so the actual item (src/alt/label) is whichever 'image' entry is last in
  // the timeline while a pendingImage gate is open.
  const pendingImageItem = useMemo(() => {
    if (!pendingImage) return null;
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      if (timeline[i].kind === 'image') return timeline[i];
    }
    return null;
  }, [pendingImage, timeline]);
  useAutoMediaPreview(pendingImageItem?.key ?? null, () => setLightboxItem(pendingImageItem));

  // Video thumbnails follow the same "appear, then open itself" rhythm as
  // photos, but on a shorter beat (~1s) since there's no click required to
  // advance the story - the overlay opens on its own once the bubble is on
  // screen, then plays under its own autoplay handling in VideoOverlay.
  useAutoMediaPreview(pendingVideo?.videoId ?? null, (videoId) => setOpenVideoId(videoId), 1000);

  // Once the photo lightbox is open, it closes itself on a per-image timer
  // (each image node's own `displayDuration`, falling back to 5s) - the
  // booking screenshot gets a beat longer than the room photo so the price
  // and "已付款" line have time to actually be read. The conversation queue
  // only resumes once completeImage() actually fires.
  useEffect(() => {
    if (!lightboxItem) return undefined;
    const t = setTimeout(() => closeImage(), lightboxItem.displayDuration ?? 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxItem]);

  // "goto-platform" is an invisible control node (see NODES): whenever the
  // dialogue tree reaches one, save the LINE checkpoint to resume from next
  // time (its resumeId), hand the platform whatever state patch this beat
  // implies, and hand control over to the investment platform. The switch
  // itself is deliberately paced rather than instant: a short "即將返回幣勝客"
  // system tip, then a brand transition overlay, THEN the actual route
  // change - so the player has a clear moment to register that the
  // conversation paused and the platform is coming back, instead of the
  // screen just cutting away mid-beat.
  //
  // A resumed checkpoint's restored timeline can itself already end in a
  // goto-platform item (that's exactly what was pushed right before this
  // checkpoint was saved on the previous visit) - only a NEWLY pushed one,
  // past whatever length we resumed with, should ever trigger another
  // switch. Without this guard, resuming would immediately re-fire the old
  // switch and bounce straight back to the platform before the resumed
  // dialogue ever gets a chance to render.
  const initialLengthRef = useRef(checkpoint ? checkpoint.timeline.length : 0);
  const switchedAwayRef = useRef(false);
  const [returningTip, setReturningTip] = useState(false);
  const [openingPlatform, setOpeningPlatform] = useState(false);
  useEffect(() => {
    if (switchedAwayRef.current) return undefined;
    if (timeline.length <= initialLengthRef.current) return undefined;
    const last = timeline[timeline.length - 1];
    if (!last || last.kind !== 'goto-platform') return undefined;
    switchedAwayRef.current = true;
    savePrivateChatCheckpoint(timeline, last.resumeId, watchedVideoIds);
    savePlatformState(last.patch || {});
    const timers = [];
    setReturningTip(true);
    timers.push(
      setTimeout(() => {
        setReturningTip(false);
        setOpeningPlatform(true);
        timers.push(setTimeout(() => navigate(last.route), 1500));
      }, 1200),
    );
    return () => timers.forEach(clearTimeout);
  }, [timeline, watchedVideoIds, navigate]);

  const activeSrc = (openVideoId && videoSources[openVideoId]?.url) || null;

  function handleVideoFinished(finishedVideoId) {
    setOpenVideoId(null);
    if (pendingVideo?.videoId === finishedVideoId) completeVideo();
    requestAnimationFrame(() => {
      scrollRef.current?.focus?.();
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }
    });
  }

  function closeImage() {
    setLightboxItem(null);
    completeImage();
  }

  // The link card also stays visible for a minimum beat (1.5s) before it can
  // be opened, and opening it shows the same brand transition overlay used
  // for every later platform return, instead of navigating instantly.
  const [linkClickable, setLinkClickable] = useState(false);
  useEffect(() => {
    if (!pendingLink) {
      setLinkClickable(false);
      return undefined;
    }
    const t = setTimeout(() => setLinkClickable(true), 1500);
    return () => clearTimeout(t);
  }, [pendingLink]);

  function openLink() {
    if (!pendingLink || !linkClickable) return;
    savePrivateChatCheckpoint(timeline, pendingLink.next, watchedVideoIds);
    setOpeningPlatform(true);
    setTimeout(() => navigate('/scenario02-romance/platform-landing'), 1500);
  }

  // AR Interaction Contract. This one screen walks through every geometry the
  // contract has, and the order below is the order the states actually take
  // priority on screen:
  //
  //   leaving for 幣勝客 (tip + brand overlay) -> display, the switch is running
  //   a pending player reply                  -> dual, LEFT = options[0]
  //   an anti-fraud tip waiting to be read    -> single, RIGHT acknowledges it
  //   the platform link card, once it is live -> single, RIGHT opens it
  //   a video / photo playing, or her typing  -> display
  //
  // The video overlay and the photo lightbox both close themselves on their
  // own timers, so neither is ever a story action; the link card is only
  // declared once `linkClickable` has flipped, which is exactly when the card
  // itself becomes tappable, so a gesture can never beat the tap to it.
  //
  // All of this is declared here, where the current node is known, and none of
  // it in apps/line - LINE renders quick replies, it does not know which of
  // them the scam needs (spec §4.12).
  useARInteraction(returningTip || openingPlatform
    ? { mode: 'display', surfaceId: 'scenario02/private-chat/switching-to-platform' }
    // AUD-01: a stalled or failed clip puts 重新播放 / 略過影片並繼續 on screen and
    // nothing else - so for exactly that moment this screen IS a two-action
    // screen and has to say so, or the AR build dead-ends on a clip that never
    // arrives. Ranked above the chat's own states because the overlay is
    // covering them; normal playback stays `display`, and there is no
    // auto-skip timer anywhere.
    : videoRecovering && videoRecovery.current
      ? {
        mode: 'dual',
        surfaceId: 'scenario02/private-chat/video-recovery',
        left: () => videoRecovery.current?.retry(),
        right: () => videoRecovery.current?.skip(),
      }
      : pendingChoice
        ? {
          mode: 'dual',
          surfaceId: 'scenario02/private-chat/choice',
          left: () => choose(0),
          right: () => choose(1),
        }
        : pendingTip
          ? { mode: 'single', surfaceId: 'scenario02/private-chat/tip', action: completeTip }
          : pendingLink && linkClickable
            ? { mode: 'single', surfaceId: 'scenario02/private-chat/platform-link', action: openLink }
            : { mode: 'display', surfaceId: 'scenario02/private-chat' });

  return (
    <LineConversation
      identity={{ displayName: getDatingLeadName(lang), avatar: DATING_LEAD_PHOTO }}
      onBack={() => navigate('/scenario02-romance/dating-chat')}
      labels={{ back: t('返回'), search: t('搜尋'), call: t('通話'), menu: t('選單') }}
      scrollRef={scrollRef}
      scrollProps={{ tabIndex: -1 }}
      typing={isTyping}
      quickReplies={pendingChoice ? <LineQuickReplies label={t('選擇一個回覆')} options={pendingChoice.options} onChoose={choose} /> : null}
      after={<>
        {activeSrc && (
          <VideoOverlay key={openVideoId} videoId={openVideoId} src={activeSrc} onFinished={handleVideoFinished} recoveryRef={videoRecovery} onRecoveringChange={setVideoRecovering} />
        )}
        {lightboxItem && <PhotoLightbox item={lightboxItem} />}
        {returningTip && <div className="line-returning-tip">{t('即將返回幣勝客')}</div>}
        {openingPlatform && <PlatformOpeningOverlay />}
      </>}
    >
        {timeline.map((item, i) => {
          const time = timestamps[i] ? formatTime(timestamps[i]) : null;
          if (item.kind === 'time-anchor') return null;
          if (item.kind === 'divider') {
            const dividerDate = addDays(chatStart, DAY_OFFSETS[item.label] ?? 0);
            return <LineSystemMessage key={i}>{formatDateDivider(dividerDate, lang)}</LineSystemMessage>;
          }
          if (item.kind === 'video') {
            return (
              <LineIncomingMessage key={i} time={time}>
                <VideoThumb item={item} src={videoSources[item.videoId]?.url} />
              </LineIncomingMessage>
            );
          }
          if (item.kind === 'image') {
            return (
              <LineIncomingMessage key={i} time={time}>
                <PhotoThumb item={item} />
              </LineIncomingMessage>
            );
          }
          if (item.kind === 'goto-platform') {
            return null;
          }
          if (item.kind === 'link') {
            return (
              <LineIncomingMessage key={i} time={time}>
                <LinkCard item={item} active={Boolean(pendingLink) && linkClickable} onOpen={openLink} />
              </LineIncomingMessage>
            );
          }
          if (item.kind === 'tip') {
            return <TipItem key={i} item={item} active={pendingTip?.key === item.key} onAck={completeTip} />;
          }
          if (item.from === 'system') {
            return <LineSystemMessage key={i}>{item.text}</LineSystemMessage>;
          }
          const mine = item.from === 'user';
          return mine ? <LineOutgoingBubble key={i} time={time}>{item.text}</LineOutgoingBubble> : <LineIncomingBubble key={i} time={time}>{item.text}</LineIncomingBubble>;
        })}
    </LineConversation>
  );
}

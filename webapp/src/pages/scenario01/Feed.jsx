import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Share2, Search, Users, PlaySquare, Store, Bell, Menu, Home } from 'lucide-react';
import { useStageClassName } from '../../shell/StageClassContext';
import creativeImage from '../../assets/scenarios/scenario-01/images/fb-ad-creative.webp';
import { useT, useScenario01Lang } from './i18n';
import { COACH_CHEN_AVATAR } from './avatars';
import { getScenario01CharacterBySlot } from '../../lib/scenario01Characters';
import { useARInteraction } from '../../lib/arInteraction';

const NEXT_STEP = '/scenario01-investment/video-teacher';

// Reuses the same 5 generic VIP-member slots scenario01's VipGroup already
// casts (vipFemale01/02, vipMale01/02/03) - no new character pool, no new
// avatars. Comment text is kept separate from the character so the same
// session-stable cast can be swapped in without touching copy.
const COMMENTS = [
  { textKey: '跟老師兩週，本金已經翻了快一倍，終於敢跟家人炫耀了！', slot: 'vipFemale01', likesKey: '42', timeKey: '1小時' },
  { textKey: '老師這次的判斷也太準了吧，K 線一出來就照他說的走。', slot: 'vipMale01', likesKey: '18', timeKey: '2小時' },
  { textKey: '看了好幾天了，我也想加入 VIP，要怎麼私訊？', slot: 'vipFemale02', likesKey: '65', timeKey: '3小時' },
  { textKey: '請問老師這邊現在還可以加入嗎？', slot: 'vipMale02', likesKey: '9', timeKey: '3小時' },
  { textKey: '已經私訊老師了，等通知中，好期待！', slot: 'vipMale03', likesKey: '130', timeKey: '4小時' },
  { textKey: 'VIP 團隊還有名額嗎？我怕我來晚了。', slot: 'vipFemale01', likesKey: '24', timeKey: '5小時' },
  { textKey: '我朋友上個月就加入了，說真的有賺，我也想跟。', slot: 'vipMale01', likesKey: '77', timeKey: '6小時' },
  { textKey: '還好昨天有趕上老師的提醒，不然又錯過一次。', slot: 'vipFemale02', likesKey: '3', timeKey: '1天' },
];

export function Feed() {
  useStageClassName('feed-stage');
  const t = useT();
  const lang = useScenario01Lang();
  const navigate = useNavigate();

  // AR Interaction Contract: one story action. The ad creative and the CTA
  // card are two <Link>s to the SAME next step, so this screen has exactly one
  // thing the player can do - `single`, not `dual`. Everything else on it
  // (the facebook topbar, the fake tab strip, 讚/留言/分享, the comment feed)
  // is storefront chrome and is deliberately not declared.
  useARInteraction({
    mode: 'single',
    surfaceId: 'scenario01/feed',
    action: () => navigate(NEXT_STEP),
  });

  return (
    <div className="feed-scroll fb-app">
      <header className="fb-topbar">
        <span className="fb-logo">facebook</span>
        <div className="fb-topbar-icons">
          <span aria-hidden="true"><Search size={17} /></span>
          <span aria-hidden="true"><Menu size={17} /></span>
        </div>
      </header>
      <nav className="fb-tabs" aria-hidden="true">
        <span className="active"><Home size={20} /></span>
        <span><Users size={20} /></span>
        <span><PlaySquare size={20} /></span>
        <span><Store size={20} /></span>
        <span><Bell size={20} /></span>
      </nav>

      <article className="fb-post">
        <div className="fb-post-header">
          <img className="fb-post-avatar" src={COACH_CHEN_AVATAR} alt="" />
          <div className="fb-post-identity">
            <div className="fb-post-name">{t('陳老師・AI 智慧投資')}</div>
            <div className="fb-post-meta">{t('贊助內容')} · 🌐</div>
          </div>
          <span className="fb-post-more" aria-hidden="true">···</span>
        </div>

        <p className="fb-post-body">
          {t('AI 智慧選股，精準預測漲跌 📈\n穩定獲利，讓財富自動增值 💰\n加入我們的 VIP 投資團隊，與我一起實現財務自由！🔥\n名額有限，立即私訊了解詳情👇')}
        </p>

        <Link className="fb-creative-link" to={NEXT_STEP} aria-label={t('繼續案件，了解更多')}>
          <img className="fb-creative-img" src={creativeImage} alt="" />
        </Link>

        <Link className="fb-cta-card" to={NEXT_STEP}>
          <span className="fb-cta-text">{t('立即加入 VIP 投資團隊')}</span>
          <span className="fb-cta-btn">{t('了解更多')}</span>
        </Link>

        <div className="fb-stats">
          <span className="fb-stats-reactions">
            <span className="fb-reaction-icons" aria-hidden="true">
              <span>👍</span><span>❤️</span><span>😮</span>
            </span>
            {t('8.7萬')}
          </span>
          <span>{t('165則留言')} · {t('987次分享')}</span>
        </div>

        <div className="fb-action-bar">
          <span><ThumbsUp size={17} />{t('讚')}</span>
          <span><MessageCircle size={17} />{t('留言')}</span>
          <span><Share2 size={17} />{t('分享')}</span>
        </div>

        <div className="fb-comments">
          <div className="fb-comments-track">
            {[0, 1].map((copy) => COMMENTS.map((comment, index) => {
              const character = getScenario01CharacterBySlot(comment.slot, lang);
              return (
                <div className="fb-comment" key={`${copy}-${index}`} aria-hidden={copy === 1 ? 'true' : undefined}>
                  <img className="fb-comment-avatar" src={character.avatar} alt="" />
                  <div>
                    <div className="fb-comment-bubble">
                      <div className="fb-comment-name">{character.name}</div>
                      <div className="fb-comment-text">{t(comment.textKey)}</div>
                    </div>
                    <div className="fb-comment-meta">
                      <span>{t(comment.likesKey)}</span>
                      <span>{t(comment.timeKey)}</span>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      </article>
    </div>
  );
}

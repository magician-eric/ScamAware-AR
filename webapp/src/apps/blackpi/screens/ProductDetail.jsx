import { useEffect, useRef, useState } from 'react';
import {
  Heart, Star, Truck, ShieldCheck,
  ChevronDown, ChevronUp, MessageCircle, Store, Package, BadgeCheck,
} from 'lucide-react';
import { useStageClassName } from '../../../shell/StageClassContext';
import { AssetImage } from '../components/AssetImage';
import { Toast } from '../components/Toast';
import { useToast } from '../../../lib/useToast';
import { getProductByRoute, getProductSpecs, getProductReviews } from '../data/catalog';
import { getAsset } from '../data/assetMap';
import { useT } from '../i18n';
import { useARInteraction } from '../../../lib/arInteraction';

// The pinned gallery's auto-play. First image holds still long enough to be
// read as the product, then each slide takes GALLERY_SLIDE_MS to travel one
// frame width leftwards - slow enough to follow what is moving off and what is
// coming in. GALLERY_RESUME_MS is the longer pause the gallery takes after the
// player has dragged it themselves.
const GALLERY_FIRST_DWELL_MS = 1800;
const GALLERY_DWELL_MS = 2400;
const GALLERY_SLIDE_MS = 900;
const GALLERY_RESUME_MS = 3200;

// The copy below the pinned hero reads itself out: it starts at the top,
// waits AUTO_SCROLL_START_DELAY_MS so the player sees the price and the title
// where they expect them, then creeps upward at AUTO_SCROLL_PX_PER_SEC - a
// reading pace, not a scroll animation - and stops for good at the bottom.
const AUTO_SCROLL_START_DELAY_MS = 1000;
const AUTO_SCROLL_PX_PER_SEC = 20;
// A backgrounded tab hands the next frame a gap of seconds. Clamping the
// per-frame delta keeps that from teleporting the page down the article.
const AUTO_SCROLL_MAX_FRAME_S = 0.1;

// Screen 05 - 商品詳情. Redesigned as a real e-commerce PDP: large hero
// image, price/rating/sold row, promo strip, delivery/guarantee card,
// collapsible spec block, shop row, description sections, and a sticky
// bottom action bar - not a single tall info card.
//
// LAYOUT: the hero is PINNED. It is a flex:none sibling of the scroller rather
// than its first child, so the product image stays put at the top of the phone
// while only the copy below it moves. Both Scenario 04 product lines
// (智慧掃拖機器人 / VEXA FLEX X1) are this one screen, so they get the same
// frame by construction.
//
// MOTION: the page presents itself, on two axes that never mix.
//   - the pinned hero slides SIDEWAYS: a horizontal track of the product's
//     images, auto-playing left one frame at a time and draggable by finger.
//   - the copy under it creeps UPWARDS at a reading pace, from the top, once,
//     stopping at the end.
//   - the bottom action bar does neither. It is outside both.
// Each is one effect below, each cleans itself up on unmount, and neither
// takes anything away from touch or mouse: no pointer-events, no scroll lock,
// no gesture handling of its own.
//
// The hero carries no chrome of its own any more: neither 返回 nor 分享 is
// rendered at all - not disabled, not inert decoration, simply absent. A back
// arrow let the player walk out of the scripted run from the PDP, and a share
// glyph next to it read as a second way out; the story's only exits from this
// screen are the two in the bottom bar (賣家聊聊 / 直接購買), which is also
// exactly what the `dual` AR contract below promises.
export function ProductDetail({ productRoute: route = null, onContactSeller, onBuy, onGoHome }) {
  useStageClassName('blackpi-stage');
  const t = useT();
  const product = getProductByRoute(route);
  const specs = getProductSpecs(route);
  const reviews = getProductReviews(route);
  const [specOpen, setSpecOpen] = useState(false);
  // Only the reader half is destructured now: AUD-07 removed 加入收藏, which was
  // this screen's last showToast() caller. The <Toast> below stays mounted
  // rather than being ripped out - it is this screen's toast slot, and taking
  // it away is a change AUD-07 did not ask for.
  const [toast] = useToast();
  const [imgIndex, setImgIndex] = useState(0);
  // The two moving parts of this screen, each owning one axis: the pinned
  // gallery track slides sideways, the copy underneath creeps upwards. They
  // are separate elements, separate effects and separate frames - the hero
  // never moves vertically and the copy never moves horizontally.
  const galleryRef = useRef(null);
  const scrollRef = useRef(null);
  // Set by the gallery effect while the track is on screen, so the dots can
  // drive the same animation auto-play uses instead of jumping the track.
  const galleryApi = useRef(null);

  const images = product && product.images && product.images.length
    ? product.images
    : (product ? [product.assetKey] : []);
  const imageCount = images.length;

  // AR Interaction Contract: the bottom bar's two controls are the two story
  // actions this page exists for - 賣家聊聊 and 直接購買 - in that on-screen
  // order, so `dual`. The gallery dots, the favourite button, the spec
  // accordion and the review photos are presentation. A route with no product
  // behind it is a dead end whose only action is 回首頁: `single`.
  useARInteraction(product
    ? {
      mode: 'dual',
      surfaceId: 'blackpi/product-detail',
      left: () => onContactSeller?.(product),
      right: () => onBuy?.(product),
    }
    : { mode: 'single', surfaceId: 'blackpi/product-not-found', action: () => onGoHome?.() });

  // Walking from one product line to the other is a new product, so the gallery
  // starts on image 1 again rather than inheriting the last page's position.
  useEffect(() => { setImgIndex(0); }, [route]);

  // ---- the pinned gallery: a horizontal carousel, not a slideshow --------
  //
  // The hero holds a flex track carrying every product image side by side,
  // and auto-play animates the track's scrollLeft frame by frame: image N
  // travels off to the left while N+1 arrives from the right. Nothing fades
  // and nothing is swapped in place - what the player sees is the film strip
  // moving, which is what a shopping app's gallery does.
  //
  // Because the movement is a real scroll, the finger keeps working for
  // free: drag left for the next picture, right for the previous one, at any
  // moment, with no auto-play flag to consult first. A touch takes the track
  // (auto-play drops whatever it was doing) and hands it back after a pause
  // measured from where the player let go.
  useEffect(() => {
    const track = galleryRef.current;
    if (!track || imageCount < 2 || typeof window.requestAnimationFrame !== 'function') return undefined;
    // Bound, not borrowed: these are window methods, and a detached copy is
    // an illegal invocation in more than one engine.
    const raf = window.requestAnimationFrame.bind(window);
    const caf = window.cancelAnimationFrame.bind(window);

    let frame = 0;
    let timer = 0;
    let dragging = false;
    const frameWidth = () => track.clientWidth || 1;
    const indexNow = () => Math.round(track.scrollLeft / frameWidth());

    function stopAutoPlay() {
      if (frame) { caf(frame); frame = 0; }
      if (timer) { window.clearTimeout(timer); timer = 0; }
      track.style.scrollSnapType = '';
    }

    function scheduleNext(delay) {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = 0;
        if (dragging) return;
        const next = indexNow() + 1;
        // The last image is where auto-play rests: wrapping round to the
        // first would be a jump back to the right, and the gallery only
        // ever travels left on its own. The finger can still go either way.
        if (next > imageCount - 1) return;
        slideTo(next);
      }, delay);
    }

    function slideTo(index) {
      const from = track.scrollLeft;
      const to = Math.max(0, Math.min(index, imageCount - 1)) * frameWidth();
      if (Math.abs(to - from) < 1) { scheduleNext(GALLERY_DWELL_MS); return; }
      // Snap points and a per-frame scrollLeft write pull against each other -
      // the browser re-snaps the track under the animation. Snapping comes
      // back the moment the slide lands, so a dragged track still settles on
      // a whole image.
      track.style.scrollSnapType = 'none';
      let startedAt = 0;
      const step = (now) => {
        const progress = Math.min(startedAt ? (now - startedAt) / GALLERY_SLIDE_MS : 0, 1);
        if (!startedAt) startedAt = now;
        // ease-in-out: the strip leaves and arrives gently instead of
        // snapping into motion at either end.
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - ((-2 * progress + 2) ** 2) / 2;
        track.scrollLeft = from + (to - from) * eased;
        if (progress < 1) { frame = raf(step); return; }
        frame = 0;
        track.style.scrollSnapType = '';
        scheduleNext(GALLERY_DWELL_MS);
      };
      frame = raf(step);
    }

    // A finger on the gallery always wins. No pointer-events juggling and no
    // lock of any kind: auto-play simply gets out of the way.
    const onGrab = () => { dragging = true; stopAutoPlay(); };
    const onRelease = () => {
      if (!dragging) return;
      dragging = false;
      scheduleNext(GALLERY_RESUME_MS);
    };
    track.addEventListener('pointerdown', onGrab);
    track.addEventListener('touchstart', onGrab, { passive: true });
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    window.addEventListener('touchend', onRelease);
    window.addEventListener('touchcancel', onRelease);

    track.scrollLeft = 0;
    galleryApi.current = { goTo: (i) => { stopAutoPlay(); dragging = false; slideTo(i); } };
    scheduleNext(GALLERY_FIRST_DWELL_MS);

    return () => {
      stopAutoPlay();
      galleryApi.current = null;
      track.removeEventListener('pointerdown', onGrab);
      track.removeEventListener('touchstart', onGrab);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      window.removeEventListener('touchend', onRelease);
      window.removeEventListener('touchcancel', onRelease);
    };
  }, [route, imageCount]);

  // ---- the copy below the hero: it reads itself out ----------------------
  //
  // Scenario 04 is played on a headset as much as in the hand, so the product
  // page presents itself: the scroller starts at the top, holds there long
  // enough to take in the price and the title, then moves up at a reading
  // pace until it reaches the end - and stops there. No loop, no bounce back
  // to the top, no reverse: this is a shopper reading a listing once, not a
  // ticker.
  //
  // requestAnimationFrame, one pixel-fraction at a time, is what keeps it
  // smooth; a timer nudging scrollBy in chunks is the stutter this replaces.
  // Nothing here blocks input: if the player scrolls the page themselves the
  // effect notices the position it did not write, adopts it, and carries on
  // from there rather than dragging them back.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    el.scrollTop = 0;
    if (typeof window.requestAnimationFrame !== 'function') return undefined;
    const raf = window.requestAnimationFrame.bind(window);
    const caf = window.cancelAnimationFrame.bind(window);

    let frame = 0;
    let lastFrameAt = 0;
    let position = 0;   // sub-pixel scrollTop, so 20px/s is not lost to rounding
    let written = 0;    // the last value this effect itself put on the element

    const step = (now) => {
      const seconds = lastFrameAt ? Math.min((now - lastFrameAt) / 1000, AUTO_SCROLL_MAX_FRAME_S) : 0;
      lastFrameAt = now;
      // Someone moved it that was not us: take their position as the truth.
      if (Math.abs(el.scrollTop - written) > 1.5) position = el.scrollTop;
      const bottom = el.scrollHeight - el.clientHeight;
      if (bottom <= 0) { frame = raf(step); return; }
      position = Math.min(position + AUTO_SCROLL_PX_PER_SEC * seconds, bottom);
      written = position;
      el.scrollTop = position;
      if (position >= bottom - 0.5) { frame = 0; return; }  // the end. Stop.
      frame = raf(step);
    };

    const startTimer = window.setTimeout(() => { frame = raf(step); }, AUTO_SCROLL_START_DELAY_MS);
    return () => {
      window.clearTimeout(startTimer);
      if (frame) caf(frame);
    };
  }, [route]);

  if (!product) {
    return (
      <div className="blackpi-app">
        <div className="bp-page" style={{ paddingTop: 24 }}>
          <p>{t('找不到商品。')}</p>
          <button type="button" className="bp-btn" onClick={() => onGoHome?.()}>{t('回首頁')}</button>
        </div>
      </div>
    );
  }

  const clampedIndex = Math.min(imgIndex, images.length - 1);

  // 賣家聊聊 / 直接購買 are reported as what the shopper did; the screen
  // each one opens is Scenario 04's to choose.
  function goChat() {
    onContactSeller?.(product);
  }
  function goCheckout() {
    onBuy?.(product);
  }
  // The dots and the 1/4 badge read the track's own position rather than a
  // counter kept beside it, so they cannot drift out of step with the picture
  // on screen: whatever moved the track - auto-play, a finger, a dot - the
  // scroll event is the single place the index is updated.
  function onGalleryScroll(e) {
    const track = e.currentTarget;
    const frame = track.clientWidth || 1;
    const at = Math.max(0, Math.min(Math.round(track.scrollLeft / frame), images.length - 1));
    setImgIndex((prev) => (prev === at ? prev : at));
  }
  // A dot travels to its image the same way auto-play does, so tapping one
  // looks like the gallery sliding rather than the picture being swapped.
  function goToImage(i) {
    if (galleryApi.current) galleryApi.current.goTo(i);
    else setImgIndex(i);
  }

  return (
    <div className="blackpi-app">
      {/* Pinned: outside .bp-scroll, so scrolling the copy never moves it. */}
      <div className="bp-pdp-hero">
        {/* The gallery: one frame-wide slide per image on a horizontal track.
            The browser scrolls it, so a drag is a drag and auto-play is the
            same movement driven by rAF - no cross-fade, no stacked images,
            nothing swapped underneath the player. */}
        <div className="bp-pdp-gallery" ref={galleryRef} onScroll={onGalleryScroll}>
          {images.map((key, i) => (
            <div className="bp-pdp-gallery-slide" key={key}>
              <AssetImage
                assetKey={key}
                label={getAsset(key).label}
                size="1024×1024"
                dashed={false}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
        {/* No 返回 and no 分享 here. 返回 was a real button that walked the
            player out of the scripted run from the PDP; 分享 was inert
            decoration sitting where a second exit would be. Neither is
            rendered now - nothing to tap, nothing to focus, nothing for a
            screen reader to find - so the only ways off this screen are the
            two story actions in the bottom bar. The gallery dots and the page
            indicator stay: they move between this product's own images. */}
        {images.length > 1 && (
          <>
            <div className="bp-pdp-dots" role="tablist" aria-label={t('商品圖片')}>
              {images.map((key, i) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-label={`${t('圖片 ')}${i + 1}`}
                  aria-selected={i === clampedIndex}
                  className={`bp-pdp-dot${i === clampedIndex ? ' active' : ''}`}
                  onClick={() => goToImage(i)}
                />
              ))}
            </div>
            <div className="bp-pdp-page-indicator">{clampedIndex + 1}/{images.length}</div>
          </>
        )}
      </div>

      {/* The independently scrolling half: everything below the pinned image.
          This is the element the auto-scroll effect above owns; the bottom
          action bar is deliberately outside it, so 賣家聊聊 / 直接購買 stay on
          screen however far the copy has travelled. */}
      <div className="bp-scroll bp-pdp-scroll" ref={scrollRef}>
        <div className="bp-pdp-body">
          <div className="bp-pdp-price-row">
            <span className="bp-pdp-price">NT${product.price.toLocaleString()}</span>
            {/* AUD-07 made this decoration for the same reason 分享 used to
                be decoration (分享 is now gone from the hero entirely): it did
                have a handler, but all it did was toast 「已加入收藏」 - nothing
                was stored, and /me's own 我的收藏 never showed it. The scenario
                never asks the player to favourite anything. It is inside the
                scrolling half, not the pinned hero, so it is not a corner
                control the way 返回 / 分享 were. */}
            <span className="bp-icon-btn bp-pdp-favorite is-decorative" aria-hidden="true">
              <Heart size={20} />
            </span>
          </div>
          <h1 className="bp-pdp-title">{t(product.name)}</h1>
          <div className="bp-pdp-meta-row">
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Star size={13} fill="var(--bp-gold)" color="var(--bp-gold)" />
              <strong>{product.rating}</strong>（{product.reviewCount} {t('則評價')}）
            </span>
            <span>{t('已售')} {product.sold.toLocaleString()}</span>
          </div>

          <div className="bp-pdp-promo">
            <div>
              <div className="bp-pdp-promo-title">{t(product.promoTitle)}</div>
              <div className="bp-pdp-promo-sub">{t(product.promoSub)}</div>
            </div>
          </div>

          <div className="bp-pdp-info-card">
            <div className="bp-pdp-info-row">
              <Truck size={18} />
              <div><strong>{t('配送方式')}</strong><span>{t(product.deliveryInfo)}</span></div>
            </div>
            <div className="bp-pdp-info-row">
              <ShieldCheck size={18} />
              <div><strong>{t('購物保障')}</strong><span>{t(product.guaranteeInfo)}</span></div>
            </div>
            {product.contentInfo && (
              <div className="bp-pdp-info-row">
                <Package size={18} />
                <div><strong>{t('商品內容')}</strong><span>{t(product.contentInfo)}</span></div>
              </div>
            )}
          </div>

          <div className="bp-pdp-spec">
            <button type="button" className="bp-pdp-spec-toggle" onClick={() => setSpecOpen((v) => !v)} aria-expanded={specOpen}>
              {t('商品規格')}
              {specOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {specOpen && (
              <div className="bp-pdp-spec-body">
                {specs.map((s) => (
                  <div key={s.label} className="bp-pdp-spec-row">
                    <span>{t(s.label)}</span>
                    <strong>{t(s.value)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* S04 remaining audit: the shop row was the third fake control on
              this screen - a real button with no onClick at all, exactly the
              defect AUD-07 named for 分享, and the one #332 recorded and
              deliberately left for this batch.

              「進入商店」 goes with it rather than merely being made inert: a
              badge reading "enter the shop" IS the affordance, so keeping it on
              a non-interactive row would leave the same broken promise the
              button made. There is no storefront page behind it, and inventing
              one would mean a new route, new store state, and a third gesture
              action on a screen whose contract is `dual` because 賣家聊聊 and
              直接購買 are the two story actions (see the contract above).

              Everything the row actually told the shopper about the seller -
              avatar, shop name, rating, item count - stays exactly where it
              was. Only the button semantics and the CTA go: a plain div, no
              handler, nothing focusable, nothing for a screen reader to
              announce as pressable. */}
          <div className="bp-pdp-shop-row">
            <div className="bp-pdp-shop-avatar"><Store size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bp-pdp-shop-name">{t(product.shop)}</div>
              <div className="bp-pdp-shop-meta">★ {product.shopRating}｜{t('商品 ')}{product.shopItemCount}{t(' 件')}</div>
            </div>
          </div>

          <div className="bp-pdp-section">
            <h3>{t('商品介紹')}</h3>
            <p>{t(product.description)}</p>
            <div className="bp-pdp-intro-images">
              {images.slice(1, 3).map((key) => <AssetImage key={key} assetKey={key} className="bp-pdp-intro-image" />)}
            </div>
          </div>
          <div className="bp-pdp-section">
            <h3>{t('商品特色')}</h3>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--bp-text-secondary)', fontSize: 'var(--fs-caption)', lineHeight: 1.8 }}>
              {product.claims.map((c) => <li key={c}>{t(c)}</li>)}
            </ul>
          </div>
          <div className="bp-pdp-section">
            <h3>{t('注意事項')}</h3>
            <p>{t(product.notice)}</p>
          </div>
          <div className="bp-pdp-section" style={{ paddingBottom: 8 }}>
            <h3>{t('買家評價')}</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {reviews.map((r) => (
                <div key={r.name} className="bp-card" style={{ padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} size={11} fill="var(--bp-gold)" color="var(--bp-gold)" />
                    ))}
                    <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--bp-text-tertiary)' }}>{t(r.name)}</span>
                    {r.purchased && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 'var(--fs-caption)', color: 'var(--bp-success)' }}>
                        <BadgeCheck size={11} /> {t('已購買')}
                      </span>
                    )}
                    {r.date && <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--bp-text-tertiary)' }}>{r.date}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--fs-caption)', color: 'var(--bp-text-secondary)' }}>{t(r.text)}</p>
                  {r.photo && (
                    <div style={{ marginTop: 6 }}>
                      <AssetImage assetKey={r.photo} label={getAsset(r.photo).label} size="200×200" className="bp-review-thumb" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bp-pdp-bottom-bar">
        <button type="button" className="bp-pdp-chat-btn" onClick={goChat} aria-label={t('賣家聊聊')}>
          <MessageCircle size={20} />
          {t('賣家聊聊')}
        </button>
        {/* No 加入購物車 here: nothing in this scenario ever read the cart, so
            the button only ever produced a toast and a dead cart page. 直接購買
            is the one action that moves the story forward. */}
        <button type="button" className="bp-btn bp-pdp-buy-btn" onClick={goCheckout}>{t('直接購買')}</button>
      </div>
      <Toast message={toast} />
    </div>
  );
}

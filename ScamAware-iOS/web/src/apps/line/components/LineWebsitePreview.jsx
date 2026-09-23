import { useState } from 'react';

// The link-preview card LINE draws whenever a URL is sent in a chat: the page's
// own preview image on top, then its title, its description and the bare
// domain it points at. It is chat chrome - LINE builds it from the page's
// metadata, the sender never composes it - so it belongs to this module rather
// than to whichever Scenario pastes the link, the same way the bubbles and the
// header do.
//
// Everything on the card is handed in as already-localized text (this module
// owns no dictionary), and the card knows nothing about where tapping it
// leads: `onOpen` is the whole contract. A card with no `onOpen` renders as
// plain, non-interactive chat history - which is what a resolved link looks
// like once the story has moved past it.
//
// `actions` is an optional slot under the card for the host's own call to
// action, so the button stays the consumer's (and keeps the app-wide primary
// button styling) instead of this module inventing a second button design.
// It is a sibling of the tappable region rather than a child, because a
// button inside a button is not valid markup.
export function LineWebsitePreview({
  image,
  imageAlt = '',
  title,
  description,
  domain,
  actions,
  onOpen,
  openLabel,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const body = (
    <>
      {image && !imageFailed && (
        <img
          className="line-website-card-image"
          src={image}
          alt={imageAlt}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="line-website-card-text">
        {title && <div className="line-website-card-title">{title}</div>}
        {description && <div className="line-website-card-desc">{description}</div>}
        {domain && <div className="line-website-card-domain">{domain}</div>}
      </div>
    </>
  );

  return (
    <div className="line-website-card">
      {onOpen
        ? (
          <button type="button" className="line-website-card-main line-website-card-tappable" onClick={onOpen} aria-label={openLabel || undefined}>
            {body}
          </button>
        )
        : <div className="line-website-card-main">{body}</div>}
      {actions && <div className="line-website-card-actions">{actions}</div>}
    </div>
  );
}

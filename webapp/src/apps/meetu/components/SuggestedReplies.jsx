import { useT } from '../i18n';

export function SuggestedReplies({ options, onChoose }) {
  const t = useT();
  return (
    <div className="meetu-suggested-replies">
      <div className="meetu-suggested-label">{t('選擇一個回覆')}</div>
      <div className="meetu-suggested-pills">
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className="meetu-suggested-pill"
            onClick={() => onChoose(i)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

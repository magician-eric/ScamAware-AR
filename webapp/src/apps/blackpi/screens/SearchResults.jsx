import { useMemo } from 'react';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react';
import { useStageClassName } from '../../../shell/StageClassContext';
import { AssetImage } from '../components/AssetImage';
import { getSearchResults } from '../data/catalog';
import { useT } from '../i18n';

const QUERY_LABEL = { health: '智慧掃地機器人', luckyBag: '驚喜福袋' };

// Screen 04 - 搜尋結果. Every result here is category-matched to the query
// (data/products.js#SEARCH_DECOYS) - a robot-vacuum search never surfaces
// luckyBag-flavoured decoys or vice versa. `query` is the catalog's own
// product-line key, handed in by whoever mounts the App rather than read off
// the URL.
export function SearchResults({ query: route = null, onSelectProduct, onBack }) {
  useStageClassName('blackpi-stage');
  const t = useT();
  const results = useMemo(() => getSearchResults(route), [route]);

  function open(item) {
    if (!item.route) return;
    onSelectProduct?.(item);
  }

  return (
    <div className="blackpi-app">
      <header className="bp-header">
        <button type="button" className="bp-icon-btn" aria-label={t('返回')} onClick={() => onBack?.()}>
          <ChevronLeft size={24} />
        </button>
        {/* Already a plain <span> rather than a field; `is-decorative` makes
            that explicit and takes away the pointer cursor the shared
            .bp-searchbar rule was giving a bar that has never been pressable
            (see Search.jsx). */}
        <div className="bp-searchbar is-decorative" style={{ flex: 1 }}>
          <SearchIcon size={16} />
          <span>{t(QUERY_LABEL[route]) || route}</span>
        </div>
      </header>
      <div className="bp-scroll bp-page">
        <p className="bp-tertiary bp-section">{t('找到 ')}{results.length}{t(' 項相關商品')}</p>
        <div>
          {results.map((item) => (
            <button key={item.id} type="button" className="bp-list-row" style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => open(item)}>
              <AssetImage assetKey={item.assetKey} label={item.assetLabel} size="" dashed={false} />
              <div style={{ minWidth: 0 }}>
                <div className="bp-product-name" style={{ minHeight: 0 }}>{t(item.name)}</div>
                <div className="bp-product-price">NT${item.price.toLocaleString()}</div>
                <div className="bp-product-meta">{t(item.shop)} ・ {t('已售')} {item.sold.toLocaleString()}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

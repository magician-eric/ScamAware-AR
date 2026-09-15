import { formatTaiwanDateTime } from '../../lib/dateTimeService';
import './staff.css';

const SOURCE_LABELS = {
  'gps-online': 'GPS＋線上地址解析',
  'gps-offline': 'GPS＋本機離線比對',
  manual: '工作人員手動設定',
};

// Renders the field list from spec section 4 for whatever profile/draft is
// passed in - used both for the saved+locked profile and for an unsaved
// draft awaiting confirmation, so the two look identical to staff except
// for the locked/unlocked status line.
export function StaffLocationSummary({ profile }) {
  if (!profile) {
    return <p className="mini">目前尚未設定所在地。</p>;
  }
  const { region, coordinates, agencies, source, updatedAt, locked, telephoneAreaCode } = profile;

  const rows = [
    ['縣市', region?.county ?? '－'],
    ['行政區', region?.district ?? '（未指定，可手動修正）'],
    ['最後更新時間', updatedAt ? formatTaiwanDateTime(new Date(updatedAt)) : '－'],
    ['定位來源', SOURCE_LABELS[source] ?? source ?? '－'],
    ['GPS 精度', coordinates?.accuracy != null ? `約 ${Math.round(coordinates.accuracy)} 公尺` : '－'],
    ['是否已鎖定', locked ? '已鎖定' : '尚未鎖定'],
    ['對應警察機關', agencies?.policeDepartment ?? '－'],
    ['對應分局', agencies?.policePrecinct
      ? `${agencies.policePrecinct}${agencies.policeDivisionIsAmbiguous ? '（本行政區跨分局轄區，現有定位精度不足，暫以此分局為準）' : ''}`
      : '－'],
    ['對應地方檢察機關', agencies?.prosecutorsOffice ?? '－'],
    ['對應法院', agencies?.districtCourt ?? '－'],
    ['地區電話區碼', telephoneAreaCode ?? '－'],
  ];

  return (
    <div className="staff-summary">
      {rows.map(([label, value]) => (
        <div className="staff-summary-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

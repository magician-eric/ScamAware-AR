import { formatTaiwanDateTime } from '../../lib/dateTimeService';
import './staff.css';

// Spec section 12: the required "confirm before handoff" screen. Staff must
// land here and explicitly press "開始玩家模式" - the system never jumps
// straight from a successful GPS fix into the scenario menu on its own,
// because once the device is in a player's hands nothing here can be
// corrected anymore.
export function StaffHandoffConfirm({ profile, onStartPlayerMode }) {
  const { region, agencies, telephoneAreaCode } = profile;
  return (
    <div className="staff-card staff-handoff">
      <h2>所在地初始化完成</h2>
      <div className="staff-summary">
        <div className="staff-summary-row"><span>使用地區</span><strong>{region.county}{region.district ? region.district : ''}</strong></div>
        <div className="staff-summary-row"><span>對應警察機關</span><strong>{agencies.policeDepartment}</strong></div>
        <div className="staff-summary-row"><span>對應檢察機關</span><strong>{agencies.prosecutorsOffice}</strong></div>
        <div className="staff-summary-row"><span>對應法院</span><strong>{agencies.districtCourt}</strong></div>
        <div className="staff-summary-row"><span>地區電話區碼</span><strong>{telephoneAreaCode}</strong></div>
        <div className="staff-summary-row"><span>目前日期時間</span><strong>{formatTaiwanDateTime()}</strong></div>
        <div className="staff-summary-row"><span>離線資料狀態</span><strong>已儲存至本機，離線可用</strong></div>
      </div>
      <p className="mini">
        按下「開始玩家模式」後，管理模式將關閉並隱藏，設定隨即鎖定，回到情境選擇首頁。
        玩家後續操作無法再回到此頁面。
      </p>
      <button type="button" className="btn" onClick={onStartPlayerMode}>開始玩家模式</button>
    </div>
  );
}

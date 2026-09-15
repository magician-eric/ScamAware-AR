import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../../shell/TopBar';
import { useStageClassName } from '../../shell/StageClassContext';
import {
  loadLocationProfile,
  saveLocationProfile,
  clearLocationProfile,
} from '../../lib/location/LocationProfileStore';
import {
  loadRegionData,
  listCounties,
  listDistricts,
  resolveCoordinateToRegion,
  resolveLocation,
} from '../../lib/location/RegionAgencyResolver';
import { requestCurrentPosition, isOnline } from '../../lib/location/LocationManager';
import { isDeviceClockSuspicious, DEVICE_CLOCK_WARNING, generateSessionTimestamp } from '../../lib/dateTimeService';
import { StaffLocationSummary } from './StaffLocationSummary';
import { StaffHandoffConfirm } from './StaffHandoffConfirm';
import { StaffVersionPanel } from './StaffVersionPanel';
import './staff.css';

const FAILURE_MESSAGES = {
  'position-unavailable': '目前無法取得精確位置，請移至靠近窗戶的位置後重試，或使用手動設定。',
  'permission-denied': '定位權限遭拒絕。請於瀏覽器設定中開啟定位權限，或使用手動設定。',
  timeout: '定位逾時，請重試或使用手動設定。',
  unsupported: '此瀏覽器不支援定位功能，請使用手動設定。',
  offline: '目前無網路連線，已無法進行線上地址解析，可使用本機離線比對或手動設定。',
};

function buildProfileFromResolved(resolved, coordinates, regionData, source) {
  const location = resolveLocation(resolved.county, resolved.district, regionData, {
    village: resolved.village ?? null,
    coordinates: coordinates ?? null,
  });
  if (!location) return null;
  return {
    version: 2,
    locked: false,
    source,
    coordinates: coordinates ?? null,
    region: { county: resolved.county, district: resolved.district },
    agencies: {
      policeDepartment: location.policeDepartment,
      policePrecinct: location.policePrecinct,
      policeDivisionId: location.policeDivisionId,
      policeDivisionIsAmbiguous: location.precinctResolution.isAmbiguous,
      prosecutorsOffice: location.prosecutorsOffice,
      districtCourt: location.districtCourt,
    },
    telephoneAreaCode: location.telephoneAreaCode,
    updatedAt: generateSessionTimestamp(),
  };
}

// The staff-only management screen (spec sections 4-6, 12, 13). Reachable
// only via the hidden long-press entry on the language screen - never
// linked from any player-facing navigation. This is the ONE place in the
// whole system that ever calls the Geolocation API; every scenario reads
// the locked result afterward instead of locating again (section 7).
export function StaffSetupScreen() {
  // This mode is the one screen in the app whose content is genuinely taller
  // than the stage: the summary card, the (expandable) manual-correction card
  // and the five-button grid stack up past a phone viewport, and the stage box
  // every screen renders into is a fixed 100dvh with `overflow:hidden`
  // (styles/global.css). Without a stage variant the overflow was simply
  // clipped - on a real Android device the last buttons sat under the system
  // navigation bar with no way to reach them. `staff-stage` turns the WHOLE
  // page into the scroller (see staff.css) rather than giving any single card
  // its own scrollbar, so opening 手動修正所在地 just makes the page longer.
  //
  // Claimed here, above every early return below, so the loading and handoff
  // screens are rendered into the same scrolling stage as the main one.
  useStageClassName('staff-stage');
  const navigate = useNavigate();
  const [regionData, setRegionData] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [manualEditing, setManualEditing] = useState(false);
  const [manualCounty, setManualCounty] = useState('');
  const [manualDistrict, setManualDistrict] = useState('');
  const [handoffReady, setHandoffReady] = useState(false);
  const [clockWarning, setClockWarning] = useState(false);

  useEffect(() => {
    setClockWarning(isDeviceClockSuspicious());
    (async () => {
      // staffOnly: true - this screen must show an honest "尚未設定" when
      // nothing's been locked yet, not the system-wide default fallback
      // every scenario reads if staff skips this step.
      const [data, profile] = await Promise.all([loadRegionData(), loadLocationProfile({ staffOnly: true })]);
      setRegionData(data);
      if (profile) setSavedProfile(profile);
    })();
  }, []);

  function applyResolvedDraft(resolved, coordinates, source) {
    const next = buildProfileFromResolved(resolved, coordinates, regionData, source);
    if (!next) {
      setStatusMessage('GPS 僅能提供縣市建議；請手動選擇正確的鄉鎮市區。');
      setManualCounty(resolved?.county ?? listCounties(regionData)[0] ?? '');
      setManualDistrict('');
      setManualEditing(true);
      return;
    }
    setDraft(next);
    setManualEditing(false);
    setStatusMessage('');
  }

  async function handleLocateNow() {
    setStatusMessage('');
    setLocating(true);
    try {
      const coords = await requestCurrentPosition();
      const resolved = resolveCoordinateToRegion(regionData, coords.latitude, coords.longitude);
      if (!resolved) {
        setStatusMessage('無法比對出對應縣市，請使用手動設定。');
      } else {
        applyResolvedDraft(resolved, coords, isOnline() ? 'gps-online' : 'gps-offline');
      }
    } catch (err) {
      const code = err?.code ?? 'timeout';
      setStatusMessage(FAILURE_MESSAGES[code] ?? err?.message ?? '定位失敗，請使用手動設定。');
    } finally {
      setLocating(false);
    }
  }

  function openManualEdit() {
    const base = draft ?? savedProfile;
    setManualCounty(base?.region?.county ?? listCounties(regionData)[0] ?? '');
    setManualDistrict(base?.region?.district ?? '');
    setManualEditing(true);
  }

  function applyManualSelection() {
    if (!manualCounty || !manualDistrict) return;
    const location = resolveLocation(manualCounty, manualDistrict, regionData);
    if (!location) return;
    setDraft({
      version: 2,
      locked: false,
      source: 'manual',
      coordinates: null,
      region: { county: manualCounty, district: manualDistrict },
      agencies: {
        policeDepartment: location.policeDepartment,
        policePrecinct: location.policePrecinct,
        policeDivisionId: location.policeDivisionId,
        policeDivisionIsAmbiguous: location.precinctResolution.isAmbiguous,
        prosecutorsOffice: location.prosecutorsOffice,
        districtCourt: location.districtCourt,
      },
      telephoneAreaCode: location.telephoneAreaCode,
      updatedAt: generateSessionTimestamp(),
    });
    setManualEditing(false);
  }

  async function handleSaveAndLock() {
    if (!draft) return;
    const locked = { ...draft, locked: true, updatedAt: generateSessionTimestamp() };
    await saveLocationProfile(locked);
    setSavedProfile(locked);
    setDraft(null);
    setHandoffReady(true);
  }

  async function handleClearCache() {
    await clearLocationProfile();
    setSavedProfile(null);
    setDraft(null);
    setHandoffReady(false);
    setStatusMessage('已清除本機所在地快取。');
  }

  function handleStartPlayerMode() {
    navigate('/scenario-menu');
  }

  if (!regionData) {
    return (
      <>
        <TopBar brand="工作人員管理模式" homeHref="/language" homeLabel="返回首頁" />
        <section className="hero"><p>載入地區資料中……</p></section>
      </>
    );
  }

  if (handoffReady && savedProfile) {
    return (
      <>
        <TopBar brand="工作人員管理模式" homeHref="/language" homeLabel="返回首頁" />
        <StaffHandoffConfirm profile={savedProfile} onStartPlayerMode={handleStartPlayerMode} />
        <div className="staff-bottom-spacer" aria-hidden="true" />
      </>
    );
  }

  const displayed = draft ?? savedProfile;

  return (
    <>
      <TopBar brand="工作人員管理模式" homeHref="/language" homeLabel="返回首頁" />

      {clockWarning && (
        <div className="staff-clock-warning">⚠ {DEVICE_CLOCK_WARNING}</div>
      )}

      <div className="staff-card">
        <h2>目前所在地設定</h2>
        <StaffLocationSummary profile={displayed} />
        {draft && !draft.locked && (
          <p className="mini staff-draft-note">以上為尚未儲存的暫存結果，請確認無誤後按「儲存並鎖定」。</p>
        )}
        {statusMessage && <p className="staff-status-msg">{statusMessage}</p>}
      </div>

      {manualEditing && (
        <div className="staff-card">
          <h2>手動修正所在地</h2>
          <label className="staff-field">
            <span>縣市</span>
            <select value={manualCounty} onChange={(e) => { setManualCounty(e.target.value); setManualDistrict(''); }}>
              {listCounties(regionData).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="staff-field">
            <span>行政區（可留空）</span>
            <select value={manualDistrict} onChange={(e) => setManualDistrict(e.target.value)}>
              <option value="">（未指定）</option>
              {listDistricts(regionData, manualCounty).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <div className="staff-btn-row">
            <button type="button" className="btn" onClick={applyManualSelection}>套用</button>
            <button type="button" className="btn secondary" onClick={() => setManualEditing(false)}>取消</button>
          </div>
        </div>
      )}

      <div className="staff-card">
        <div className="staff-btn-grid">
          <button type="button" className="btn" disabled={locating} onClick={handleLocateNow}>
            {locating ? '定位中……' : '重新取得目前位置'}
          </button>
          <button type="button" className="btn secondary" onClick={openManualEdit}>手動修正所在地</button>
          <button type="button" className="btn" disabled={!draft} onClick={handleSaveAndLock}>儲存並鎖定</button>
          <button type="button" className="btn danger" onClick={handleClearCache}>清除所在地快取</button>
          <button type="button" className="btn secondary" onClick={() => navigate('/language')}>返回首頁</button>
        </div>
      </div>

      {/* 系統版本與更新. Last, deliberately: 所在地設定 is the step every session needs and
          this is the one somebody opens when something looks wrong. It is a section of this
          mode rather than a page of its own, so a host reaches both without another door to
          be told about - and so nothing player-facing gains a link to it. */}
      <StaffVersionPanel />

      <div className="staff-bottom-spacer" aria-hidden="true" />
    </>
  );
}

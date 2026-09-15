// Part of PlatformHome's props API: why the player is on the home screen
// this time, as the host describes it.
//
// The app reacts to the visit kind (a profit check-in shows its number for a
// beat, the first visit after 建立帳戶 lasts a longer one, browsing does
// nothing on its own) but never learns which story beat produced it. Kept in
// plain JS so the hosting scenario's adapter can share the vocabulary without
// pulling a JSX module in with it.
export const HOME_VISIT_PROFIT_UPDATE = 'profit-update';
export const HOME_VISIT_POST_REGISTRATION = 'post-registration';
export const HOME_VISIT_BROWSING = 'browsing';

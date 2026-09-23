import { useMemo } from 'react';
import { PhoneHome as SharedPhoneHome } from '../../../shared/phone/PhoneHome';
import { useT } from '../i18n';
import { MYDONDON_APP_ICON_BOX, MYDONDON_LOGOS } from '../brand/manifest';
import { PhoneShell } from '../components/PhoneShell';

// The phone desktop the scenario opens on. The desktop itself is
// SharedPhoneHome, which is the same layout scenario02's PhoneDesktop and
// scenario04's SimPhoneHome already use - this screen only swaps in the
// MyDonDon app (買東東's icon and label). Nothing about the desktop is
// designed here, and where opening the app leads is the caller's call
// (`onOpenApp`).
//
// The whole screen is SharedPhoneHome and nothing else: a stray sibling next
// to it (an off-screen brand label, with no .sr-only rule in this bundle to
// hide it) is what used to print a clipped "MyDonDon" at the bottom edge. The
// app's name reaches assistive tech through the icon button's aria-label.
export function PhoneHome({ onOpenApp }) {
  const t = useT();
  const now = useMemo(() => new Date(), []);
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <PhoneShell className="go-phone-home">
      <SharedPhoneHome
        time={time}
        apps={[{
          id: 'mydondon',
          label: t('買東東'),
          openLabel: t('開啟買東東 MyDonDon'),
          icon: MYDONDON_LOGOS.appIcon,
          iconBox: MYDONDON_APP_ICON_BOX,
          onOpen: onOpenApp,
        }]}
      />
    </PhoneShell>
  );
}

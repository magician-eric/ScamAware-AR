import { useTranslation } from "react-i18next";
import { Phone, Lock } from "lucide-react";
import { LogoHorizontal } from "../../components/logo/LogoHorizontal";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAppStore } from "../../store/AppStoreContext";
import { useARInteraction } from "../../../../../lib/arInteraction";

const DEMO_PHONE = "0995-165165";
const DEMO_PASSWORD = "********";

// AR Interaction Contract (lib/arInteraction). This screen is the whole of
// the "open an account" story step and it owns the only control on it - every
// field is a pre-filled display card, not an input - so the geometry is
// `single` and RIGHT is 建立帳戶. This is the App-layer exception the contract
// allows: a component that IS one story CTA may declare it, and the platform
// still reports what the player did through its own callbacks (see
// OnboardingGate). No App-wide button scan exists or may be added.
export function Register() {
  const { t } = useTranslation();
  const { register } = useAppStore();

  useARInteraction({
    mode: "single",
    surfaceId: "gugo-invest/onboarding/register",
    action: () => register(DEMO_PHONE),
  });

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-10">
      <div className="mb-8 flex justify-center">
        <LogoHorizontal size="lg" />
      </div>

      <h1 className="text-center text-lg font-bold text-brand-white">{t("onboarding.welcomeTitle")}</h1>
      <p className="mx-auto mt-2 max-w-[280px] text-center text-sm text-brand-gray">{t("onboarding.welcomeBody")}</p>

      <Card className="mt-8 space-y-4 p-4">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-brand-gray">
            <Phone size={13} />
            {t("onboarding.phone")}
          </label>
          <div
            className="w-full rounded-lg border border-brand-gold/20 bg-brand-bg px-3 py-2.5 text-sm text-brand-white focus:outline-none"
          >{DEMO_PHONE}</div>
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[14px] font-semibold text-brand-gray">
            <Lock size={13} />
            {t("onboarding.password")}
          </label>
          <div
            className="w-full rounded-lg border border-brand-gold/20 bg-brand-bg px-3 py-2.5 text-sm text-brand-white focus:outline-none"
          >{DEMO_PASSWORD}</div>
        </div>
      </Card>

      <Button variant="primary" fullWidth className="mt-6" onClick={() => register(DEMO_PHONE)}>
        {t("onboarding.registerButton")}
      </Button>
    </div>
  );
}

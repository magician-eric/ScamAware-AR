import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { LogoHorizontal } from "../../components/logo/LogoHorizontal";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAppStore } from "../../store/AppStoreContext";
import { formatInt } from "../../utils/format";
import { useARInteraction } from "../../../../../lib/arInteraction";

const INVEST_AMOUNT = 300_000;
const EXPECTED_RETURN_PCT = 45.8;

interface InvestOfferProps {
  onDone: () => void;
}

// AR Interaction Contract: two states, one story action each - the offer
// itself (RIGHT = 立即投入) and the success card that follows it (RIGHT =
// continue). Both are `single`; there is never a second thing to do here.
export function InvestOffer({ onDone }: InvestOfferProps) {
  const { t } = useTranslation();
  const { investInQuantContract } = useAppStore();
  const [invested, setInvested] = useState(false);

  const invest = () => {
    investInQuantContract(INVEST_AMOUNT, EXPECTED_RETURN_PCT);
    setInvested(true);
  };

  useARInteraction(invested
    ? { mode: "single", surfaceId: "gugo-invest/onboarding/invest-success", action: onDone }
    : { mode: "single", surfaceId: "gugo-invest/onboarding/invest-offer", action: invest });

  if (invested) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-gold/15 text-brand-gold">
          <CheckCircle2 size={36} />
        </div>
        <h1 className="text-lg font-bold text-brand-white">{t("onboarding.investSuccessTitle")}</h1>
        <p className="max-w-[260px] text-sm text-brand-gray">{t("onboarding.investSuccessBody")}</p>
        <Button variant="primary" fullWidth className="mt-2" onClick={onDone}>
          {t("onboarding.continueButton")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-10">
      <div className="mb-8 flex justify-center">
        <LogoHorizontal size="lg" />
      </div>

      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-gold" />
          <h1 className="text-base font-bold text-brand-white">{t("onboarding.investTitle")}</h1>
        </div>
        <p className="text-sm text-brand-gray">{t("onboarding.investBody")}</p>

        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <span className="text-[14px] text-brand-gray">{t("onboarding.investAmount")}</span>
          <span className="text-xl font-bold text-brand-white">
            NT$ {formatInt(INVEST_AMOUNT)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-brand-gray">{t("onboarding.expectedReturn")}</span>
          <span className="rounded-full bg-brand-red/15 px-3 py-1 text-sm font-bold text-brand-red">+{EXPECTED_RETURN_PCT}%</span>
        </div>
      </Card>

      <Button
        variant="primary"
        fullWidth
        className="mt-6"
        onClick={invest}
      >
        {t("onboarding.investButton")}
      </Button>
    </div>
  );
}

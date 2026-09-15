import { useEffect, useState, type ReactNode } from "react";
import { useAppStore } from "./store/AppStoreContext";
import { OnboardingLayout } from "./components/layout/OnboardingLayout";
import { Register } from "./pages/onboarding/Register";
import { InvestOffer } from "./pages/onboarding/InvestOffer";
import { GUGO_ONBOARDING_STAGES } from "../index.js";

/**
 * Gates the whole routed app behind register -> invest in the AI quant
 * contract -> success, matching scenario01's narrative (the player hasn't
 * registered yet when this app first opens). investCompleted is tracked as
 * local state rather than derived purely from quantContract !== null so
 * that pressing "confirm investment" doesn't instantly skip the success
 * screen the moment the store updates - it's seeded from the store on
 * mount, so a reload after finishing onboarding correctly skips straight
 * to the app instead of replaying it.
 *
 * Which of the three steps is showing is also reported outward, because the
 * host draws its own chrome around this app and cannot see inside it. The
 * value reported is one of GUGO_ONBOARDING_STAGES (../index.js) - a fact
 * about the platform, not an instruction: what the host does with "the
 * account is funded" stays the host's decision.
 */
export function OnboardingGate({
  children,
  onStageChange,
}: {
  children: ReactNode;
  onStageChange?: (stage: string) => void;
}) {
  const { registered, quantContract } = useAppStore();
  const [investCompleted, setInvestCompleted] = useState(quantContract !== null);

  const stage = !registered
    ? GUGO_ONBOARDING_STAGES.register
    : !investCompleted
      ? GUGO_ONBOARDING_STAGES.deposit
      : GUGO_ONBOARDING_STAGES.funded;

  // Fires on mount as well as on every step, so a host that mounted the app
  // mid-run (a reload straight onto a funded account) is told where it is
  // rather than being left on the initial guess.
  useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);

  if (!registered) {
    return (
      <OnboardingLayout>
        <Register />
      </OnboardingLayout>
    );
  }

  if (!investCompleted) {
    return (
      <OnboardingLayout>
        <InvestOffer onDone={() => setInvestCompleted(true)} />
      </OnboardingLayout>
    );
  }

  return <>{children}</>;
}

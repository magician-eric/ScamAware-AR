import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PlatformHeader } from "../components/layout/PlatformHeader";
import { useGuGoLanguage } from "../i18n/useGuGoLanguage";
import "../styles/platform.css";

export interface WithdrawalResultProps {
  /** Host language, in CIBAR's codes ('zh' | 'en' | 'jp'). */
  language?: string;
  /** Extra classes for the result card - the host owns where it sits. */
  className?: string;
  /** Why the withdrawal failed, in the host's words. */
  children: ReactNode;
  /** What the player can do about it. */
  actions?: ReactNode;
}

/**
 * The platform's "withdrawal failed" screen: brand header, result card, and
 * whatever the platform says went wrong.
 *
 * The split here is deliberate and is the whole point of the component. GuGo
 * owns the *shell* - the brand, the card, the "出金失敗" result itself, which
 * is ordinary platform UI. It does not own, and must never contain, the
 * reason: that a deposit is demanded before the player can withdraw their own
 * money is scenario01's scam script, and the two choices it offers are the
 * story's fork. Those come in as `children` and `actions`, so this screen has
 * no opinion about the scam and never routes anywhere - it cannot send a
 * player to the 165 hotline, the quiz or an ending.
 */
export function WithdrawalResult({ language, className = "", children, actions }: WithdrawalResultProps) {
  useGuGoLanguage(language);
  const { t } = useTranslation();

  return (
    <>
      <PlatformHeader subtitle={t("withdrawal.notice")} />
      <section className={`warning ${className}`.trim()}>
        <h2>{t("withdrawal.failed")}</h2>
        {children}
        {actions}
      </section>
    </>
  );
}

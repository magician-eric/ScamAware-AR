import { useEffect, useMemo, useState } from 'react';

// Port of the old js/app.js moneyAnim()/initProfitAnimation(): steps a
// balance counter from the principal to its final value, then reveals the
// withdraw button 1600ms after the last step. finalValue is derived from
// whatever the (now randomized, possibly negative) month-return percentage
// is, so the counter can count either up or down.
export function useMoneyCounter(principal: number, finalValue: number) {
  const steps = useMemo(() => {
    const n = 4;
    const s: number[] = [];
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const eased = 1 - (1 - t) * (1 - t);
      s.push(Math.round(principal + (finalValue - principal) * eased));
    }
    return s;
  }, [principal, finalValue]);

  const [stepIndex, setStepIndex] = useState(0);
  const [withdrawVisible, setWithdrawVisible] = useState(false);

  useEffect(() => {
    if (stepIndex >= steps.length - 1) {
      const t = setTimeout(() => setWithdrawVisible(true), 1600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIndex((i) => i + 1), 1200);
    return () => clearTimeout(t);
  }, [stepIndex, steps]);

  return { money: 'NT$' + steps[stepIndex].toLocaleString(), withdrawVisible };
}

// Steps the return-rate badge (+56.4%) up from 0 in sync with the
// candlestick chart's own trend-line draw animation (`drawTrend`, a 5s
// ease-out CSS keyframe - see .trend-line in global.css), instead of just
// showing the final number frozen from the first frame. Ticks every 100ms
// (50 steps over 5s) rather than every animation frame so each increment is
// actually perceptible - a screenshot taken at any point mid-animation
// should visibly show a lower, still-climbing number - with the same
// ease-out easing curve the CSS animation uses, so the number's pace of
// change reads as the same motion as the line being drawn underneath it.
export function usePercentCounter(target: number, durationMs = 5000) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const stepMs = 100;
    const totalSteps = Math.round(durationMs / stepMs);
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      const t = Math.min(step / totalSteps, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setPercent(target * eased);
      if (t >= 1) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [target, durationMs]);

  return percent;
}

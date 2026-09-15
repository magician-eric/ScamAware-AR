import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { directionColorClass, formatPercent, formatSigned, priceDirection } from "../../utils/format";

interface PriceChangeProps {
  change: number;
  changePercent: number;
  align?: "left" | "right";
  size?: "sm" | "md";
}

export function PriceChange({ change, changePercent, align = "left", size = "sm" }: PriceChangeProps) {
  const dir = priceDirection(change);
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <div className={`flex items-center gap-1 ${directionColorClass(change)} ${align === "right" ? "justify-end" : ""} ${textSize}`}>
      <Icon size={size === "md" ? 14 : 12} strokeWidth={2.5} />
      <span className="font-semibold">{formatSigned(change)}</span>
      <span className="font-semibold">({formatPercent(changePercent)})</span>
    </div>
  );
}

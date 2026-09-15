import { PachiCalico } from "@/components/pachi-calico";

type Props = {
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
};

/** Hand-plotted pixel-calico mascot. Props kept for call-site compatibility. */
export function PachiMascotImg({ className = "" }: Props) {
  return <PachiCalico className={className} />;
}

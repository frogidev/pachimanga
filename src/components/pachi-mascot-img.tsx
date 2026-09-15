import Image from "next/image";

type Props = {
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
};

/** AI-generated Pachi sitting sprite (3:2). Decorative by default. */
export function PachiMascotImg({ className = "", width = 220, height = 147, eager = false }: Props) {
  return (
    <Image
      src="/ai-art/pachi-mascot-calico.avif"
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      className={className}
    />
  );
}

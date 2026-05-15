import { useBeamEffectiveCaip2Network } from "@/lib/beam-network-context";

/** Read-only hint that forms use the header / wallet network. */
export function BeamCurrentNetworkNote({ className }: { className?: string }) {
  const { label } = useBeamEffectiveCaip2Network();
  return (
    <p className={className ?? "text-[11px] text-muted-foreground"}>
      Network: <span className="font-medium text-foreground">{label}</span> (from your selector)
    </p>
  );
}

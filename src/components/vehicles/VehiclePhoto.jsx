import { useState } from "react";
import { VehicleArt } from "./VehicleArt.jsx";

/** Foto real do veículo; se não houver ou não carregar, mostra a ilustração da categoria. */
export function VehiclePhoto({ vehicle: v, eager = false }) {
  const [falhou, setFalhou] = useState(false);
  const nome = `${v.brand} ${v.model} ${v.version ?? ""}`.trim();
  if (!v.photo?.url || falhou) return <VehicleArt category={v.category} color={v.color?.hex} label={eager ? `${nome} (ilustração)` : undefined} />;
  return (
    <img className="photo" src={v.photo.url} alt={`Foto de um ${nome}`} loading={eager ? "eager" : "lazy"} decoding="async"
      fetchpriority={eager ? "high" : undefined} width="960" height="540" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
  );
}

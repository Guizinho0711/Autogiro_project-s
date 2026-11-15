import { useEffect, useState } from "react";

const read = () => window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);

/** Rota por hash (#/operacoes/OP-2026-0001), sem dependências. Retorna os segmentos. */
export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route.length ? route : ["veiculos"];
}

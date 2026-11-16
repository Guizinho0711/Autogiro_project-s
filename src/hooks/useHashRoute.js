import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

const read = () => window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
const semMovimento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Rota por hash (#/operacoes/OP-2026-0001), sem dependências. Retorna os segmentos.
 *  Onde o navegador permite, a troca de tela usa View Transitions (a tela antiga sai e a nova entra). */
export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => {
      const trocar = () => { flushSync(() => setRoute(read())); window.scrollTo(0, 0); };
      if (document.startViewTransition && !semMovimento()) document.startViewTransition(trocar);
      else trocar();
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route.length ? route : ["veiculos"];
}

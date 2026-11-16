import { useEffect, useState } from "react";

// "sistema" segue o aparelho; "claro" e "escuro" ficam guardados neste navegador.
const ORDEM = ["sistema", "claro", "escuro"];
const ler = () => { try { return localStorage.getItem("autogiro:tema") || "sistema"; } catch { return "sistema"; } };

export function useTema() {
  const [tema, setTema] = useState(ler);
  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === "sistema") raiz.removeAttribute("data-theme"); else raiz.setAttribute("data-theme", tema);
    try { tema === "sistema" ? localStorage.removeItem("autogiro:tema") : localStorage.setItem("autogiro:tema", tema); } catch { /* sem armazenamento */ }
    const cor = getComputedStyle(raiz).getPropertyValue("--c-bg").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", cor || "#121314");
  }, [tema]);
  const proximo = () => {
    const novo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length];
    if (document.startViewTransition && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(() => setTema(novo));
    else setTema(novo);
  };
  return { tema, proximo };
}

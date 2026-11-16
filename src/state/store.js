import { useSyncExternalStore } from "react";

/** Estado pequeno e compartilhado entre componentes, guardado no navegador (localStorage).
 *  Se o armazenamento estiver bloqueado, funciona só na memória. */
function persisted(key) {
  let value = [];
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(raw)) value = raw.filter((x) => typeof x === "string");
  } catch { /* sem armazenamento: segue na memória */ }
  const subs = new Set();
  return {
    get: () => value,
    set(next) {
      value = next;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignora */ }
      subs.forEach((f) => f());
    },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
  };
}

const favoritos = persisted("autogiro:favoritos");
const comparar = persisted("autogiro:comparar");
export const MAX_COMPARAR = 3;

export function useFavoritos() {
  const ids = useSyncExternalStore(favoritos.subscribe, favoritos.get);
  return {
    ids,
    has: (id) => ids.includes(id),
    toggle: (id) => favoritos.set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
  };
}

export function useComparar() {
  const ids = useSyncExternalStore(comparar.subscribe, comparar.get);
  return {
    ids,
    cheio: ids.length >= MAX_COMPARAR,
    has: (id) => ids.includes(id),
    toggle: (id) => {
      if (ids.includes(id)) comparar.set(ids.filter((x) => x !== id));
      else if (ids.length < MAX_COMPARAR) comparar.set([...ids, id]);
    },
    limpar: () => comparar.set([]),
  };
}

import { useCallback, useEffect, useRef, useState } from "react";

/** Executa uma função assíncrona e expõe { status, data, error, reload }.
 *  status: "loading" | "success" | "error". Ignora respostas de chamadas antigas. */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, status: "loading", error: null }));
    fnRef.current(controller.signal).then(
      (data) => !controller.signal.aborted && setState({ status: "success", data, error: null }),
      (error) => !controller.signal.aborted && setState({ status: "error", data: null, error })
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

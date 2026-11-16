import { creditoService } from "../services/creditoService.js";
import { useAsync } from "./useAsync.js";

/** Política de crédito de veículos (taxas por perfil). Sempre devolve algo: há tabela de referência. */
export function usePolitica() {
  const { status, data } = useAsync((signal) => creditoService.politica(signal), []);
  return status === "success" ? data : null;
}

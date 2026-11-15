import { useEffect, useRef, useState } from "react";
import { operacaoService } from "../../services/operacaoService.js";
import { formatMoney, formatDate } from "../../utils/format.js";
import { uid } from "../../utils/id.js";

/** onDone(pagou:boolean) é chamado ao fechar; a página recarrega os dados se pagou. */
export function PagarParcelaDialog({ operacaoId, parcela, dataRef, onDone }) {
  const dialog = useRef(null);
  const idPagamento = useRef(uid());
  const [valor, setValor] = useState(parcela.totalParaQuitar.toFixed(2).replace(".", ","));
  const [state, setState] = useState({ status: "idle" });

  useEffect(() => { dialog.current.showModal(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!(n > 0)) return setState({ status: "error", message: "Informe um valor maior que zero." });
    setState({ status: "loading" });
    try {
      const result = await operacaoService.pagar(operacaoId, parcela.numero, { valor: n, dataPagamento: dataRef, identificadorPagamento: idPagamento.current, origem: "AUTOGIRO_WEB" });
      setState({ status: "ok", result });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  };

  const { status, result, message } = state;
  return (
    <dialog ref={dialog} onClose={() => onDone(status === "ok")} aria-labelledby="pagar-titulo">
      <h2 id="pagar-titulo" className="dialog__title">Pagar parcela {parcela.numero}</h2>

      {status !== "ok" ? (
        <form onSubmit={submit}>
          <p className="muted">Vence em {formatDate(parcela.vencimento)}. Total para quitar em {formatDate(dataRef)}: <strong>{formatMoney(parcela.totalParaQuitar)}</strong></p>
          <div className="field" style={{ margin: "16px 0" }}>
            <label htmlFor="valor">Valor a pagar (R$)</label>
            <input id="valor" inputMode="decimal" value={valor} onChange={(e) => { setValor(e.target.value); idPagamento.current = uid(); }} aria-invalid={status === "error"} aria-describedby="valor-erro" autoFocus />
          </div>
          <p id="valor-erro" className="form-error" role="alert">{status === "error" ? message : ""}</p>
          <div className="dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={() => dialog.current.close()}>Cancelar</button>
            <button className="btn" disabled={status === "loading"}>{status === "loading" ? "Registrando..." : "Confirmar pagamento"}</button>
          </div>
        </form>
      ) : (
        <div>
          <p>Pagamento de <strong>{formatMoney(result.valor)}</strong> registrado.</p>
          <table className="table" style={{ margin: "12px 0" }}>
            <caption className="muted" style={{ textAlign: "left" }}>Para onde foi o dinheiro</caption>
            <tbody>
              {[["Multa", result.distribuicao.multa], ["Juros de mora", result.distribuicao.jurosMora], ["Juros", result.distribuicao.juros], ["Amortização", result.distribuicao.amortizacao]].map(([k, v]) => (
                <tr key={k}><th scope="row">{k}</th><td className="num">{formatMoney(v)}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Saldo devedor da operação: {formatMoney(result.operacao.saldoDevedor)}</p>
          <div className="dialog__actions"><button className="btn" onClick={() => dialog.current.close()}>Fechar</button></div>
        </div>
      )}
    </dialog>
  );
}

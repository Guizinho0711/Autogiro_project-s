/** Mensagem para estados de erro e lista vazia. Diz o que houve e o que fazer. */
export function StateMessage({ title, text, actionLabel, onAction, role = "status" }) {
  return (
    <div className="state" role={role}>
      <h2 className="state__title">{title}</h2>
      <p className="state__text">{text}</p>
      {actionLabel && (
        <button className="btn" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

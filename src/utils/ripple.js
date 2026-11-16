/** Onda de toque em botões, chips e abas. Um listener só no documento: custo mínimo. */
export function initRipple() {
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest?.(".btn, .chip, .tab");
    if (!el || el.disabled) return;
    const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
    const dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.appendChild(dot);
    setTimeout(() => dot.remove(), 650);
  }, { passive: true });
}

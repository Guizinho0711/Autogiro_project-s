// Converte a linha da tabela public.veiculos (português) para o formato usado nas telas, e o contrário.
export const CORES = {
  Branco: "#e8e6f0", Prata: "#b9b6c7", Preto: "#2a2735", Cinza: "#6f6c80", Vermelho: "#c2334d",
  Azul: "#3b5bdb", Verde: "#2f8f6b", Amarelo: "#e0b12e", Marrom: "#7a5136", Bege: "#cbb994",
};
const STATUS_TELA = { disponivel: "available", reservado: "reserved", vendido: "sold", oculto: "hidden" };
export const STATUS_BANCO = { available: "disponivel", reserved: "reservado", sold: "vendido", hidden: "oculto" };

export function fromRow(r) {
  return {
    id: r.id, brand: r.marca, model: r.modelo, version: r.versao ?? "", year: r.ano, mileageKm: r.quilometragem,
    priceBRL: Number(r.preco), category: r.categoria, fuel: r.combustivel, transmission: r.cambio, city: r.cidade,
    status: STATUS_TELA[r.status] ?? "available", color: r.cor ? { nome: r.cor, hex: CORES[r.cor] ?? "#6d28d9" } : null,
    opcionais: r.opcionais ?? [], description: r.descricao ?? "",
    photo: r.foto_url ? { url: r.foto_url, credito: r.foto_credito, fonte: r.foto_fonte_url } : null,
    createdAt: r.created_at,
  };
}

export function toRow(v) {
  return {
    marca: v.brand, modelo: v.model, versao: v.version || null, ano: v.year, quilometragem: v.mileageKm, preco: v.priceBRL,
    categoria: v.category, combustivel: v.fuel, cambio: v.transmission, cidade: v.city, status: STATUS_BANCO[v.status] ?? "disponivel",
    cor: v.color?.nome || null, opcionais: v.opcionais ?? [], descricao: v.description || null,
    foto_url: v.photo?.url || null, foto_credito: v.photo?.credito || null, foto_fonte_url: v.photo?.fonte || null,
  };
}

/** Foto do Wikimedia Commons em tamanho de vitrine, com o link da página (autor e licença). */
export const commons = (arquivo) => {
  const slug = arquivo.replace(/ /g, "_");
  return { url: `https://commons.wikimedia.org/wiki/Special:FilePath/${slug}?width=960`, credito: "Wikimedia Commons", fonte: `https://commons.wikimedia.org/wiki/File:${slug}` };
};

/** @type {import("../api/contracts.js").Vehicle[]} */
const C = { branco: ["Branco", "#e8e6f0"], prata: ["Prata", "#b9b6c7"], preto: ["Preto", "#2a2735"], cinza: ["Cinza", "#6f6c80"], vermelho: ["Vermelho", "#c2334d"], azul: ["Azul", "#3b5bdb"], verde: ["Verde", "#2f8f6b"] };
const v = (id, brand, model, version, year, mileageKm, priceBRL, category, fuel, transmission, city, status, cor, opcionais) =>
  ({ id, brand, model, version, year, mileageKm, priceBRL, category, fuel, transmission, city, status, color: { nome: C[cor][0], hex: C[cor][1] }, opcionais });

export const VEHICLES_MOCK = [
  v("v1", "Fiat", "Argo", "1.0 Drive", 2021, 42000, 58900, "hatch", "flex", "manual", "São Paulo", "available", "branco", ["Ar-condicionado", "Direção elétrica", "Central multimídia"]),
  v("v2", "Chevrolet", "Onix", "1.0 Turbo LT", 2022, 28000, 72500, "hatch", "flex", "automatico", "Campinas", "available", "cinza", ["Ar-condicionado", "Câmera de ré", "Wi-Fi a bordo"]),
  v("v3", "Toyota", "Corolla", "2.0 XEi", 2020, 61000, 109900, "sedan", "flex", "automatico", "São Paulo", "available", "prata", ["Bancos de couro", "Piloto automático", "Sensor de estacionamento"]),
  v("v4", "Volkswagen", "Virtus", "1.6 MSI", 2021, 39000, 81400, "sedan", "flex", "manual", "Santos", "reserved", "preto", ["Ar-condicionado", "Direção elétrica", "Vidros elétricos"]),
  v("v5", "Jeep", "Renegade", "1.3 T270 Longitude", 2022, 24000, 119800, "suv", "flex", "automatico", "São Paulo", "available", "vermelho", ["Teto solar", "Câmera de ré", "Faróis de LED"]),
  v("v6", "Hyundai", "Creta", "1.0 Turbo Comfort", 2023, 15000, 127500, "suv", "flex", "automatico", "Osasco", "available", "branco", ["Central multimídia", "Controle de estabilidade", "Sensor de chuva"]),
  v("v7", "Toyota", "Hilux", "2.8 SRX Diesel", 2019, 88000, 224000, "picape", "diesel", "automatico", "Ribeirão Preto", "available", "prata", ["Tração 4x4", "Bancos de couro", "Capota marítima"]),
  v("v8", "Fiat", "Strada", "1.3 Freedom CD", 2022, 31000, 96900, "picape", "flex", "manual", "Campinas", "available", "azul", ["Cabine dupla", "Ar-condicionado", "Central multimídia"]),
  v("v9", "Honda", "CG 160", "Titan", 2023, 9000, 15900, "moto", "flex", "manual", "São Paulo", "available", "vermelho", ["Partida elétrica", "Freio combinado"]),
  v("v10", "Yamaha", "Fazer 250", "ABS", 2022, 12000, 21800, "moto", "gasolina", "manual", "Guarulhos", "available", "azul", ["Freios ABS", "Painel digital"]),
  v("v11", "Renault", "Kwid", "1.0 Zen", 2022, 33000, 42900, "hatch", "flex", "manual", "Santo André", "available", "verde", ["Ar-condicionado", "Direção elétrica"]),
  v("v12", "Volkswagen", "Polo", "1.0 TSI Highline", 2023, 18000, 94500, "hatch", "flex", "automatico", "São Paulo", "available", "cinza", ["Painel digital", "Piloto automático", "Câmera de ré"]),
  v("v13", "Honda", "Civic", "2.0 Sport", 2019, 72000, 104900, "sedan", "flex", "automatico", "Campinas", "available", "preto", ["Bancos de couro", "Teto solar", "Sensor de estacionamento"]),
  v("v14", "Nissan", "Kicks", "1.6 SV", 2021, 47000, 89900, "suv", "flex", "automatico", "Osasco", "available", "prata", ["Câmera 360°", "Central multimídia", "Controle de estabilidade"]),
  v("v15", "Chevrolet", "S10", "2.8 LTZ Diesel", 2020, 76000, 189900, "picape", "diesel", "automatico", "Ribeirão Preto", "available", "branco", ["Tração 4x4", "Bancos de couro", "Assistente de partida em rampa"]),
  v("v16", "Honda", "XRE 300", "ABS", 2022, 14000, 27900, "moto", "gasolina", "manual", "Santos", "available", "preto", ["Freios ABS", "Protetor de motor", "Painel digital"]),
];

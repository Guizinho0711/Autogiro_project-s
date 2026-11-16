import { CORES, commons } from "../veiculoMapper.js";

// Catálogo de exemplo: o mesmo que foi gravado no banco. Usado quando o Supabase não responde.
// Fotos reais do Wikimedia Commons (licenças livres; autor e licença na página de cada arquivo).
const v = (id, brand, model, version, year, mileageKm, priceBRL, category, fuel, transmission, city, status, cor, opcionais, arquivo) =>
  ({ id, brand, model, version, year, mileageKm, priceBRL, category, fuel, transmission, city, status, color: { nome: cor, hex: CORES[cor] }, opcionais, description: "", photo: commons(arquivo) });

/** @type {import("../api/contracts.js").Vehicle[]} */
export const VEHICLES_MOCK = [
  v("v1", "Fiat", "Argo", "1.0 Drive", 2021, 42000, 58900, "hatch", "flex", "manual", "São Paulo", "available", "Branco", ["Ar-condicionado", "Direção elétrica", "Central multimídia"], "2022 Fiat Argo 1.3 Drive ELX.jpg"),
  v("v2", "Chevrolet", "Onix", "1.0 Turbo LT", 2022, 28000, 72500, "hatch", "flex", "automatico", "Campinas", "available", "Cinza", ["Ar-condicionado", "Câmera de ré", "Wi-Fi a bordo"], "2022 Chevrolet Onix RS 1.0 Turbo.jpg"),
  v("v3", "Toyota", "Corolla", "2.0 XEi", 2020, 61000, 109900, "sedan", "flex", "automatico", "São Paulo", "available", "Prata", ["Bancos de couro", "Piloto automático", "Sensor de estacionamento"], "Toyota Corolla 2.0 XEi 2022.jpg"),
  v("v4", "Volkswagen", "Virtus", "1.6 MSI", 2021, 39000, 81400, "sedan", "flex", "manual", "Santos", "reserved", "Preto", ["Ar-condicionado", "Direção elétrica", "Vidros elétricos"], "Volkswagen Virtus 1.6 MSi Comfortline 2018 (45432103972).jpg"),
  v("v5", "Jeep", "Renegade", "1.3 T270 Longitude", 2022, 24000, 119800, "suv", "flex", "automatico", "São Paulo", "available", "Vermelho", ["Teto solar", "Câmera de ré", "Faróis de LED"], "2019 Jeep Renegade 1.6 Multijet.jpg"),
  v("v6", "Hyundai", "Creta", "1.0 Turbo Comfort", 2023, 15000, 127500, "suv", "flex", "automatico", "Osasco", "available", "Branco", ["Central multimídia", "Controle de estabilidade", "Sensor de chuva"], "2022 Hyundai Creta 1.6 Plus (Chile) front view.jpg"),
  v("v7", "Toyota", "Hilux", "2.8 SRX Diesel", 2019, 88000, 224000, "picape", "diesel", "automatico", "Ribeirão Preto", "available", "Prata", ["Tração 4x4", "Bancos de couro", "Capota marítima"], "Toyota Hilux SRX.jpg"),
  v("v8", "Fiat", "Strada", "1.3 Volcano CD", 2022, 31000, 96900, "picape", "flex", "manual", "Campinas", "available", "Azul", ["Cabine dupla", "Ar-condicionado", "Central multimídia"], "Fiat Strada 2020 Volcano in Montevideo (front).jpg"),
  v("v9", "Honda", "CG 150", "Titan Mix", 2014, 23000, 11900, "moto", "flex", "manual", "São Paulo", "available", "Vermelho", ["Partida elétrica", "Injeção eletrônica"], "Moto Honda Flex Titan CG 150 Mix Fuel Injection 06 2009 Itu.jpg"),
  v("v10", "Yamaha", "Fazer 250", "ABS", 2022, 12000, 21800, "moto", "gasolina", "manual", "Guarulhos", "available", "Cinza", ["Freios ABS", "Painel digital"], "Yamaha Ys 250 Fazer Cinza.jpg"),
  v("v11", "Renault", "Kwid", "1.0 Zen", 2022, 33000, 42900, "hatch", "flex", "manual", "Santo André", "available", "Vermelho", ["Ar-condicionado", "Direção elétrica"], "2018 Renault Kwid 1.0 SCe Iconic (Brazil), frontal view.jpg"),
  v("v12", "Volkswagen", "Polo", "1.0 TSI Highline", 2023, 18000, 94500, "hatch", "flex", "automatico", "São Paulo", "available", "Prata", ["Painel digital", "Piloto automático", "Câmera de ré"], "The frontview of Volkswagen Polo TSI Highline (ABA-AWCHZ).jpg"),
  v("v13", "Honda", "Civic", "2.0 Sport", 2019, 72000, 104900, "sedan", "flex", "automatico", "Campinas", "available", "Preto", ["Bancos de couro", "Teto solar", "Sensor de estacionamento"], "Honda Civic Sport Facelift.JPG"),
  v("v14", "Nissan", "Kicks", "1.6 SV", 2021, 47000, 89900, "suv", "flex", "automatico", "Osasco", "available", "Prata", ["Câmera 360°", "Central multimídia", "Controle de estabilidade"], "0 Nissan Kicks (P15) 1.jpg"),
  v("v15", "Fiat", "Toro", "2.0 Volcano Diesel 4x4", 2022, 41000, 159900, "picape", "diesel", "automatico", "Ribeirão Preto", "available", "Branco", ["Tração 4x4", "Bancos de couro", "Central multimídia"], "2022 Fiat Toro 2.0 Multijet Volcano.jpg"),
  v("v16", "Honda", "XRE 300", "ABS", 2022, 14000, 27900, "moto", "gasolina", "manual", "Santos", "available", "Preto", ["Freios ABS", "Protetor de motor", "Painel digital"], "Honda XRE300 ano2010.jpg"),
];

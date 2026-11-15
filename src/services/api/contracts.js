/**
 * Contratos do catálogo (mock por enquanto).
 * @typedef {"hatch"|"sedan"|"suv"|"picape"|"moto"} VehicleCategory
 * @typedef {Object} Vehicle
 * @property {string} id @property {string} brand @property {string} model @property {string} version
 * @property {number} year @property {number} mileageKm @property {number} priceBRL
 * @property {VehicleCategory} category @property {"flex"|"gasolina"|"diesel"|"eletrico"} fuel
 * @property {"manual"|"automatico"} transmission @property {string} city @property {"available"|"reserved"} status
 * @typedef {Object} ListVehiclesParams @property {string} [search] @property {VehicleCategory} [category] @property {number} [maxPrice]
 * @typedef {Object} ListVehiclesResponse @property {Vehicle[]} items @property {number} total
 */
export {};

/**
 * ASHRAE Fundamentals Chapter 1 standard atmosphere.
 * Converts altitude (metres) to atmospheric pressure (Pa).
 * Valid range: -500 to 5000 m.
 */
export function altitudeToPressure(altitudeM: number): number {
  return 101325 * Math.pow(1 - 2.25577e-5 * altitudeM, 5.2559);
}

/**
 * Specific volume of moist air (m³ / kg of dry air).
 * Uses ASHRAE formulation: v = R_da × T_K × (1 + W/ε) / P
 *
 * @param T_db      Dry-bulb temperature (°C)
 * @param W         Humidity ratio (kg water / kg dry air)
 * @param pressurePa  Atmospheric pressure (Pa), default sea level
 * @returns         Specific volume (m³/kg dry air)
 */
export function calcSpecificVolume(T_db: number, W: number, pressurePa: number = 101325): number {
  const T_K = T_db + 273.15;
  return (287.042 * T_K * (1 + W / 0.621945)) / pressurePa;
}

/**
 * Format a heat duty value (kW) with adaptive precision so small values are
 * never displayed as zero:
 *   ≥ 100 kW → 0 dp  (e.g. "123 kW")
 *   ≥  10 kW → 1 dp  (e.g. "12.3 kW")
 *   ≥   1 kW → 2 dp  (e.g. "1.23 kW")
 *          <  → 3 dp  (e.g. "0.012 kW")
 */
export function formatHeatDuty(kW: number): string {
  const abs = Math.abs(kW);
  if (abs >= 100) return kW.toFixed(0);
  if (abs >= 10)  return kW.toFixed(1);
  if (abs >= 1)   return kW.toFixed(2);
  return kW.toFixed(3);
}

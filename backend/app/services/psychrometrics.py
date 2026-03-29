from pathlib import Path

import numpy as np
import pandas as pd
import psychrolib as psy

# Set unit system to SI
psy.SetUnitSystem(psy.SI)

# ── Constants ──────────────────────────────────────────────────────────
ATMOSPHERIC_PRESSURE_PA = 101325
GRAMS_PER_KG = 1000

T_DB_MIN, T_DB_MAX = -10, 50
W_MIN, W_MAX = 0, 30
T_AXIS = list(range(-10, 46, 5))
RH_LEVELS = [10, 20, 30, 40, 50, 60, 70, 80, 90]

# ── CSV data (loaded once at import) ───────────────────────────────────
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DEWPOINT_DATA = pd.read_csv(_DATA_DIR / "dewpoint_data.csv").to_dict("records")
ENTHALPY_DATA = pd.read_csv(_DATA_DIR / "enthalpy_intersections.csv").to_dict("records")


# ── Core calculation functions (preserved from simple_enthalpy.py) ─────

def calc_humidity_ratio(T_db, RH_percent, P=ATMOSPHERIC_PRESSURE_PA):
    """Calculates Humidity Ratio (g/kg) from T_db (°C) and RH (%)"""
    RH = RH_percent / 100.0
    try:
        P_ws = psy.GetSatVapPres(T_db)
        if P_ws <= 0:
            return None
        P_w = RH * P_ws
        W = 0.621945 * P_w / (P - P_w)
        return W * GRAMS_PER_KG
    except (ValueError, TypeError) as e:
        print(f"Warning: psychrolib calculation error T={T_db}, RH={RH_percent}: {e}")
        return None


def calc_humidity_ratios_vectorized(T_db_arr, RH_percent_arr, P=ATMOSPHERIC_PRESSURE_PA):
    """Vectorized humidity ratio calculation for arrays of T_db (°C) and RH (%)."""
    T_db = np.asarray(T_db_arr, dtype=float)
    RH = np.asarray(RH_percent_arr, dtype=float) / 100.0

    # ASHRAE saturation vapor pressure coefficients (same as psychrolib)
    C1 = -5.6745359e3; C2 = 6.3925247e0; C3 = -9.6778430e-3
    C4 = 6.2215701e-7; C5 = 2.0747825e-9; C6 = -9.4840240e-13; C7 = 4.1635019e0
    C8 = -5.8002206e3; C9 = 1.3914993e0; C10 = -4.8640239e-2
    C11 = 4.1764768e-5; C12 = -1.4452093e-8; C13 = 6.5459673e0

    T_K = T_db + 273.15
    ln_P_ws = np.where(
        T_db < 0,
        C1/T_K + C2 + C3*T_K + C4*T_K**2 + C5*T_K**3 + C6*T_K**4 + C7*np.log(T_K),
        C8/T_K + C9 + C10*T_K + C11*T_K**2 + C12*T_K**3 + C13*np.log(T_K)
    )
    P_ws = np.exp(ln_P_ws)

    P_w = RH * P_ws
    W = 0.621945 * P_w / (P - P_w)
    W_gkg = W * GRAMS_PER_KG

    valid = np.isfinite(W_gkg) & (P_ws > 0)
    return W_gkg, valid


def calc_enthalpy(T_db, W, P=ATMOSPHERIC_PRESSURE_PA):
    """Calculates Enthalpy (kJ/kg) from T_db (°C) and Humidity Ratio (g/kg)"""
    try:
        W_kg = W / GRAMS_PER_KG
        enthalpy = psy.GetMoistAirEnthalpy(T_db, W_kg)
        return enthalpy / 1000  # Convert J/kg to kJ/kg
    except (ValueError, TypeError) as e:
        print(f"Warning: psychrolib enthalpy calculation error T={T_db}, W={W}: {e}")
        return None


# ── Pre-computed chart data (computed once at import) ──────────────────
T_DB_RANGE = np.linspace(T_DB_MIN, T_DB_MAX, 100)
W_SAT_LIST = [calc_humidity_ratio(t, 100.0) for t in T_DB_RANGE]
_SAT_AT_T = {t: calc_humidity_ratio(t, 100.0) for t in T_AXIS}
RH_CURVES = {rh: [calc_humidity_ratio(t, float(rh)) for t in T_DB_RANGE] for rh in RH_LEVELS}


# ── Chart data functions ──────────────────────────────────────────────

def get_base_chart_data() -> dict:
    """Returns all static chart geometry as raw coordinate data (no Plotly)."""

    # Saturation curve (100% RH)
    saturation_curve = {
        "temperatures": T_DB_RANGE.tolist(),
        "humidity_ratios": W_SAT_LIST,
    }

    # RH curves + annotation positions (all labels at same x for vertical alignment)
    rh_curves = {}
    rh_annotations = []
    label_index = int(np.argmin(np.abs(T_DB_RANGE - 32)))  # fixed x ≈ 32°C
    for rh in RH_LEVELS:
        W_rh_list = RH_CURVES[rh]
        rh_curves[str(rh)] = {
            "temperatures": T_DB_RANGE.tolist(),
            "humidity_ratios": W_rh_list,
        }
        w_at_label = W_rh_list[label_index]
        rh_annotations.append({
            "rh_value": rh,
            "x": float(T_DB_RANGE[label_index]),
            "y": w_at_label if w_at_label is not None and w_at_label <= W_MAX else None,
        })

    # Enthalpy lines
    enthalpy_lines = []
    for data in ENTHALPY_DATA:
        h = data["Enthalpy"]
        T_intersect = data["Temperature"]

        T_start = h / 1.006
        T_points = np.linspace(T_intersect, T_start, 50)
        W_points = [((h - 1.006 * T) * 1000) / (2501 + 1.86 * T) for T in T_points]

        # Label position (from main.py lines 117-118)
        T_label = T_intersect - 0.8
        W_label = ((h - 1.006 * T_label) * 1000) / (2501 + 1.86 * T_label)

        enthalpy_lines.append({
            "enthalpy_value": h,
            "temperatures": T_points.tolist(),
            "humidity_ratios": W_points,
            "label_position": {"x": T_label, "y": W_label},
        })

    # Dewpoint lines (horizontal humidity ratio lines)
    dewpoint_lines = [
        {
            "humidity_ratio": data["HR"],
            "dewpoint_temp": data["Dew point"],
            "max_temp": T_DB_MAX,
        }
        for data in DEWPOINT_DATA
    ]

    # Vertical dry-bulb temperature lines
    vertical_lines = [
        {
            "temperature": t,
            "max_humidity_ratio": _SAT_AT_T[t],
        }
        for t in T_AXIS
    ]

    # Axis configuration
    axis_config = {
        "x_min": T_DB_MIN,
        "x_max": T_DB_MAX,
        "x_dtick": 5,
        "y_min": W_MIN,
        "y_max": W_MAX,
    }

    return {
        "saturation_curve": saturation_curve,
        "rh_curves": rh_curves,
        "rh_annotations": rh_annotations,
        "enthalpy_lines": enthalpy_lines,
        "dewpoint_lines": dewpoint_lines,
        "vertical_lines": vertical_lines,
        "axis_config": axis_config,
    }


def calc_sensible_heating_cooling(T1, RH1, T2_target) -> dict:
    """Sensible heating/cooling: constant humidity ratio, temperature changes."""
    W1 = calc_humidity_ratio(T1, RH1)
    if W1 is None:
        raise ValueError("Could not compute humidity ratio for start state.")

    W1_kg = W1 / GRAMS_PER_KG
    h1 = calc_enthalpy(T1, W1)
    if h1 is None:
        raise ValueError("Could not compute enthalpy for start state.")

    # Check if target temp would push above saturation (below dewpoint)
    W_sat_at_T2 = calc_humidity_ratio(T2_target, 100.0)
    if W_sat_at_T2 is not None and W1 > W_sat_at_T2:
        raise ValueError(
            "Target temperature is below the dewpoint of the start state. "
            "Use Cooling & Dehumidification instead."
        )

    # End state: same W, new T
    RH2 = psy.GetRelHumFromHumRatio(T2_target, W1_kg, ATMOSPHERIC_PRESSURE_PA) * 100
    h2 = calc_enthalpy(T2_target, W1)
    if h2 is None:
        raise ValueError("Could not compute enthalpy for end state.")

    # Line is horizontal at constant W from T1 to T2
    n_points = 50
    line_temps = np.linspace(T1, T2_target, n_points).tolist()
    line_w = [W1] * n_points

    delta_h = h2 - h1

    return {
        "process_type": "sensible_heating_cooling",
        "start_point": {
            "temperature": round(T1, 2),
            "relative_humidity": round(RH1, 2),
            "humidity_ratio": round(W1, 4),
            "enthalpy": round(h1, 2),
        },
        "end_point": {
            "temperature": round(T2_target, 2),
            "relative_humidity": round(RH2, 2),
            "humidity_ratio": round(W1, 4),
            "enthalpy": round(h2, 2),
        },
        "line_temperatures": [round(t, 4) for t in line_temps],
        "line_humidity_ratios": [round(w, 4) for w in line_w],
        "delta_enthalpy": round(delta_h, 2),
        "sensible_heat_ratio": 1.0,
    }


def calc_cooling_dehumidification(T1, RH1, T_adp, bypass_factor) -> dict:
    """Cooling & dehumidification toward an apparatus dewpoint (ADP)."""
    W1 = calc_humidity_ratio(T1, RH1)
    if W1 is None:
        raise ValueError("Could not compute humidity ratio for start state.")
    h1 = calc_enthalpy(T1, W1)
    if h1 is None:
        raise ValueError("Could not compute enthalpy for start state.")

    # ADP is on saturation curve (100% RH)
    W_adp = calc_humidity_ratio(T_adp, 100.0)
    if W_adp is None:
        raise ValueError("Could not compute humidity ratio at ADP.")

    # Validate: ADP must be below start state dewpoint (i.e. W_adp < W1)
    if W_adp >= W1:
        raise ValueError(
            "ADP temperature must be below the dewpoint of the start state "
            "(ADP humidity ratio must be less than start humidity ratio)."
        )

    # End state via bypass factor: blend between ADP and start
    T2 = T_adp + bypass_factor * (T1 - T_adp)
    W2 = W_adp + bypass_factor * (W1 - W_adp)

    W2_kg = W2 / GRAMS_PER_KG
    RH2 = psy.GetRelHumFromHumRatio(T2, W2_kg, ATMOSPHERIC_PRESSURE_PA) * 100
    h2 = calc_enthalpy(T2, W2)
    if h2 is None:
        raise ValueError("Could not compute enthalpy for end state.")

    # Straight line from start to end
    n_points = 50
    line_temps = np.linspace(T1, T2, n_points).tolist()
    line_w = np.linspace(W1, W2, n_points).tolist()

    delta_h = h2 - h1
    delta_w = W2 - W1
    delta_t = T2 - T1
    # SHR = sensible / total = cp*ΔT / Δh
    shr = (1.006 * delta_t) / (delta_h) if delta_h != 0 else None

    return {
        "process_type": "cooling_dehumidification",
        "start_point": {
            "temperature": round(T1, 2),
            "relative_humidity": round(RH1, 2),
            "humidity_ratio": round(W1, 4),
            "enthalpy": round(h1, 2),
        },
        "end_point": {
            "temperature": round(T2, 2),
            "relative_humidity": round(RH2, 2),
            "humidity_ratio": round(W2, 4),
            "enthalpy": round(h2, 2),
        },
        "line_temperatures": [round(t, 4) for t in line_temps],
        "line_humidity_ratios": [round(w, 4) for w in line_w],
        "delta_enthalpy": round(delta_h, 2),
        "sensible_heat_ratio": round(shr, 4) if shr is not None else None,
    }


def calc_evaporative_cooling(T1, RH1, target_RH) -> dict:
    """Evaporative cooling: follows constant wet-bulb temperature line."""
    if target_RH <= RH1:
        raise ValueError("Target RH must be higher than start RH.")
    if target_RH > 100:
        raise ValueError("Target RH cannot exceed 100%.")

    W1 = calc_humidity_ratio(T1, RH1)
    if W1 is None:
        raise ValueError("Could not compute humidity ratio for start state.")
    W1_kg = W1 / GRAMS_PER_KG
    h1 = calc_enthalpy(T1, W1)
    if h1 is None:
        raise ValueError("Could not compute enthalpy for start state.")

    # Find wet-bulb temperature of start state
    T_wb = psy.GetTWetBulbFromRelHum(T1, RH1 / 100.0, ATMOSPHERIC_PRESSURE_PA)

    # Sweep T_db downward from T1, following constant wet-bulb line
    # At each T_db, compute W from wet-bulb, then check RH
    n_sweep = 200
    T_sweep = np.linspace(T1, T_wb, n_sweep)
    path_temps = [T1]
    path_w = [W1]
    T2 = None
    W2 = None

    for T_db in T_sweep[1:]:
        try:
            W_kg = psy.GetHumRatioFromTWetBulb(T_db, T_wb, ATMOSPHERIC_PRESSURE_PA)
            W_gkg = W_kg * GRAMS_PER_KG
            RH_at_point = psy.GetRelHumFromHumRatio(T_db, W_kg, ATMOSPHERIC_PRESSURE_PA) * 100
        except (ValueError, TypeError):
            continue

        path_temps.append(float(T_db))
        path_w.append(float(W_gkg))

        if RH_at_point >= target_RH:
            # Interpolate between this point and previous to find exact crossing
            T2 = float(T_db)
            W2 = float(W_gkg)
            break

    if T2 is None or W2 is None:
        raise ValueError("Could not reach target RH along wet-bulb line.")

    W2_kg = W2 / GRAMS_PER_KG
    RH2 = psy.GetRelHumFromHumRatio(T2, W2_kg, ATMOSPHERIC_PRESSURE_PA) * 100
    h2 = calc_enthalpy(T2, W2)
    if h2 is None:
        raise ValueError("Could not compute enthalpy for end state.")

    # Resample path to ~50 evenly spaced points
    n_out = 50
    indices = np.linspace(0, len(path_temps) - 1, n_out).astype(int)
    line_temps = [round(path_temps[i], 4) for i in indices]
    line_w = [round(path_w[i], 4) for i in indices]

    delta_h = h2 - h1

    return {
        "process_type": "evaporative_cooling",
        "start_point": {
            "temperature": round(T1, 2),
            "relative_humidity": round(RH1, 2),
            "humidity_ratio": round(W1, 4),
            "enthalpy": round(h1, 2),
        },
        "end_point": {
            "temperature": round(T2, 2),
            "relative_humidity": round(RH2, 2),
            "humidity_ratio": round(W2, 4),
            "enthalpy": round(h2, 2),
        },
        "line_temperatures": line_temps,
        "line_humidity_ratios": line_w,
        "delta_enthalpy": round(delta_h, 2),
        "sensible_heat_ratio": None,
    }


def calc_mixing(T1, RH1, T2, RH2, ratio) -> dict:
    """Mixing of two airstreams using enthalpy-based method (thermodynamically correct)."""
    # Stream 1
    W1 = calc_humidity_ratio(T1, RH1)
    if W1 is None:
        raise ValueError("Could not compute humidity ratio for stream 1.")
    h1 = calc_enthalpy(T1, W1)
    if h1 is None:
        raise ValueError("Could not compute enthalpy for stream 1.")

    # Stream 2
    W2 = calc_humidity_ratio(T2, RH2)
    if W2 is None:
        raise ValueError("Could not compute humidity ratio for stream 2.")
    h2 = calc_enthalpy(T2, W2)
    if h2 is None:
        raise ValueError("Could not compute enthalpy for stream 2.")

    # Mass-weighted averages (ratio = m1/(m1+m2))
    W_mix = ratio * W1 + (1 - ratio) * W2  # g/kg — mass is conserved
    h_mix = ratio * h1 + (1 - ratio) * h2  # kJ/kg — enthalpy is conserved

    # Derive T_mix from h_mix and W_mix using psychrolib
    W_mix_kg = W_mix / GRAMS_PER_KG
    h_mix_J = h_mix * 1000  # psychrolib expects J/kg
    T_mix = psy.GetTDryBulbFromEnthalpyAndHumRatio(h_mix_J, W_mix_kg)
    RH_mix = psy.GetRelHumFromHumRatio(T_mix, W_mix_kg, ATMOSPHERIC_PRESSURE_PA) * 100

    # 3-point line: stream 1 → mix point → stream 2
    line_temps = [T1, T_mix, T2]
    line_w = [W1, W_mix, W2]

    delta_h = h_mix - h1

    return {
        "process_type": "mixing",
        "start_point": {
            "temperature": round(T1, 2),
            "relative_humidity": round(RH1, 2),
            "humidity_ratio": round(W1, 4),
            "enthalpy": round(h1, 2),
        },
        "end_point": {
            "temperature": round(T2, 2),
            "relative_humidity": round(RH2, 2),
            "humidity_ratio": round(W2, 4),
            "enthalpy": round(h2, 2),
        },
        "mix_point": {
            "temperature": round(T_mix, 2),
            "relative_humidity": round(RH_mix, 2),
            "humidity_ratio": round(W_mix, 4),
            "enthalpy": round(h_mix, 2),
        },
        "line_temperatures": [round(t, 4) for t in line_temps],
        "line_humidity_ratios": [round(w, 4) for w in line_w],
        "delta_enthalpy": round(delta_h, 2),
        "sensible_heat_ratio": None,
    }


def compute_design_zone_polygon(min_temp, max_temp, min_rh, max_rh) -> dict:
    """Computes design zone polygon boundary coordinates."""
    temps = np.linspace(min_temp, max_temp, 50)

    # Bottom edge: min_rh curve, left to right
    x_bottom = list(temps)
    y_bottom = [calc_humidity_ratio(t, min_rh) for t in temps]

    # Top edge: max_rh curve, right to left (reversed to close polygon)
    x_top = list(reversed(temps))
    y_top = [calc_humidity_ratio(t, max_rh) for t in reversed(temps)]

    x_zone = x_bottom + x_top + [x_bottom[0]]
    y_zone = y_bottom + y_top + [y_bottom[0]]

    return {"x": x_zone, "y": y_zone}

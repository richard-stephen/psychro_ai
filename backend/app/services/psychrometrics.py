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

    # RH curves + annotation positions
    rh_curves = {}
    rh_annotations = []
    for rh in RH_LEVELS:
        W_rh_list = RH_CURVES[rh]
        rh_curves[str(rh)] = {
            "temperatures": T_DB_RANGE.tolist(),
            "humidity_ratios": W_rh_list,
        }
        # Annotation position logic (from main.py lines 92-94)
        index_position = int(len(T_DB_RANGE) * 0.75)
        while index_position > 0 and W_rh_list[index_position] > W_MAX:
            index_position -= 1
        rh_annotations.append({
            "rh_value": rh,
            "x": float(T_DB_RANGE[index_position]),
            "y": W_rh_list[index_position],
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

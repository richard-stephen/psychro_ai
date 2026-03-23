import pytest
from app.services.psychrometrics import (
    calc_humidity_ratio,
    calc_humidity_ratios_vectorized,
    calc_enthalpy,
    get_base_chart_data,
    compute_design_zone_polygon,
)
import numpy as np


class TestCalcHumidityRatio:
    def test_known_value(self):
        # At 25°C, 50% RH ≈ 9.95 g/kg
        W = calc_humidity_ratio(25, 50)
        assert W is not None
        assert abs(W - 9.95) < 0.1

    def test_zero_rh(self):
        W = calc_humidity_ratio(20, 0)
        assert W == 0.0

    def test_saturation(self):
        # 100% RH should give a positive value
        W = calc_humidity_ratio(20, 100)
        assert W is not None
        assert W > 0

    def test_freezing(self):
        W = calc_humidity_ratio(-10, 50)
        assert W is not None
        assert W > 0


class TestCalcHumidityRatiosVectorized:
    def test_matches_scalar(self):
        temps = [20, 25, 30]
        rhs = [50, 50, 50]
        W_vec, valid = calc_humidity_ratios_vectorized(temps, rhs)
        assert valid.all()
        for i, (t, rh) in enumerate(zip(temps, rhs)):
            W_scalar = calc_humidity_ratio(t, rh)
            assert abs(W_vec[i] - W_scalar) < 0.01

    def test_returns_valid_mask(self):
        W, valid = calc_humidity_ratios_vectorized([25], [50])
        assert valid[0] is np.bool_(True)

    def test_array_length(self):
        W, valid = calc_humidity_ratios_vectorized([10, 20, 30], [40, 50, 60])
        assert len(W) == 3
        assert len(valid) == 3


class TestCalcEnthalpy:
    def test_known_value(self):
        # At 25°C, W≈9.95 g/kg, enthalpy ≈ 50.4 kJ/kg
        W = calc_humidity_ratio(25, 50)
        h = calc_enthalpy(25, W)
        assert h is not None
        assert abs(h - 50.4) < 1.0

    def test_returns_kjkg(self):
        # Enthalpy should be in kJ/kg range (not J/kg)
        W = calc_humidity_ratio(20, 50)
        h = calc_enthalpy(20, W)
        assert 20 < h < 200


class TestGetBaseChartData:
    data: dict

    def setup_method(self):
        self.data = get_base_chart_data()

    def test_saturation_curve_length(self):
        assert len(self.data["saturation_curve"]["temperatures"]) == 100
        assert len(self.data["saturation_curve"]["humidity_ratios"]) == 100

    def test_rh_curves_keys(self):
        assert set(self.data["rh_curves"].keys()) == {"10", "20", "30", "40", "50", "60", "70", "80", "90"}

    def test_enthalpy_lines_count(self):
        assert len(self.data["enthalpy_lines"]) == 12

    def test_dewpoint_lines_count(self):
        assert len(self.data["dewpoint_lines"]) == 6

    def test_vertical_lines_count(self):
        assert len(self.data["vertical_lines"]) == 12

    def test_axis_config(self):
        ax = self.data["axis_config"]
        assert ax["x_min"] == -10
        assert ax["x_max"] == 50
        assert ax["y_min"] == 0
        assert ax["y_max"] == 30

    def test_enthalpy_line_has_label(self):
        line = self.data["enthalpy_lines"][0]
        assert "label_position" in line
        assert "x" in line["label_position"]
        assert "y" in line["label_position"]


class TestComputeDesignZonePolygon:
    def test_polygon_length(self):
        poly = compute_design_zone_polygon(20, 24, 40, 60)
        # 50 bottom + 50 top + 1 closing = 101
        assert len(poly["x"]) == 101
        assert len(poly["y"]) == 101

    def test_polygon_closes(self):
        poly = compute_design_zone_polygon(20, 24, 40, 60)
        assert poly["x"][0] == poly["x"][-1]
        assert poly["y"][0] == poly["y"][-1]

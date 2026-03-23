import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealth:
    def test_health(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


class TestBaseChartData:
    def test_returns_200(self):
        r = client.get("/api/v1/chart/base-data")
        assert r.status_code == 200

    def test_response_keys(self):
        r = client.get("/api/v1/chart/base-data")
        data = r.json()
        assert "saturation_curve" in data
        assert "rh_curves" in data
        assert "enthalpy_lines" in data
        assert "dewpoint_lines" in data
        assert "vertical_lines" in data
        assert "axis_config" in data

    def test_saturation_curve_length(self):
        data = client.get("/api/v1/chart/base-data").json()
        assert len(data["saturation_curve"]["temperatures"]) == 100


class TestCalculatePoint:
    def test_valid_point(self):
        r = client.post("/api/v1/calculate/point", json={"temperature": 25.0, "humidity": 50.0})
        assert r.status_code == 200
        body = r.json()
        assert body["temperature"] == 25.0
        assert body["relative_humidity"] == 50.0
        assert abs(body["humidity_ratio"] - 9.95) < 0.1
        assert abs(body["enthalpy"] - 50.4) < 1.0

    def test_temp_out_of_range(self):
        r = client.post("/api/v1/calculate/point", json={"temperature": 60.0, "humidity": 50.0})
        assert r.status_code == 422

    def test_humidity_out_of_range(self):
        r = client.post("/api/v1/calculate/point", json={"temperature": 25.0, "humidity": 110.0})
        assert r.status_code == 422

    def test_boundary_values(self):
        r = client.post("/api/v1/calculate/point", json={"temperature": -10.0, "humidity": 0.0})
        assert r.status_code == 200


class TestCalculateDesignZone:
    def test_valid_zone(self):
        r = client.post("/api/v1/calculate/design-zone", json={
            "min_temp": 20.0, "max_temp": 24.0,
            "min_rh": 40.0, "max_rh": 60.0,
        })
        assert r.status_code == 200
        body = r.json()
        assert "polygon" in body
        assert len(body["polygon"]["x"]) == 101
        assert len(body["polygon"]["y"]) == 101

    def test_inverted_temp_rejected(self):
        r = client.post("/api/v1/calculate/design-zone", json={
            "min_temp": 30.0, "max_temp": 20.0,
            "min_rh": 40.0, "max_rh": 60.0,
        })
        assert r.status_code == 422

    def test_inverted_rh_rejected(self):
        r = client.post("/api/v1/calculate/design-zone", json={
            "min_temp": 20.0, "max_temp": 24.0,
            "min_rh": 60.0, "max_rh": 40.0,
        })
        assert r.status_code == 422


class TestCalculateDataset:
    def _make_xlsx(self, rows: list[tuple]) -> bytes:
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Temperature", "Humidity"])
        for row in rows:
            ws.append(list(row))
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    def test_valid_upload(self):
        data = self._make_xlsx([(25.0, 50.0), (30.0, 60.0), (20.0, 40.0)])
        r = client.post(
            "/api/v1/calculate/dataset",
            files={"file": ("data.xlsx", data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["total_rows"] == 3
        assert body["valid_rows"] == 3
        assert len(body["points"]) == 3

    def test_wrong_extension(self):
        r = client.post(
            "/api/v1/calculate/dataset",
            files={"file": ("data.csv", b"Temperature,Humidity\n25,50", "text/csv")},
        )
        assert r.status_code == 400

    def test_missing_columns(self):
        import openpyxl, io as _io
        wb = openpyxl.Workbook()
        wb.active.append(["Temp", "RH"])
        wb.active.append([25, 50])
        buf = _io.BytesIO()
        wb.save(buf)
        r = client.post(
            "/api/v1/calculate/dataset",
            files={"file": ("data.xlsx", buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert r.status_code == 400

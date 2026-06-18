"""
Tests for health, model status, image serving, and scan history endpoints.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ── Health / status ──


async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


async def test_health(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


async def test_model_status(client: AsyncClient):
    response = await client.get("/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "model_loaded" in data
    assert isinstance(data["model_loaded"], bool)


# ── Image serving (path traversal protection) ──


async def test_get_original_image_not_found(client: AsyncClient):
    response = await client.get("/images/original/nonexistent.jpg")
    assert response.status_code == 404


async def test_get_processed_image_not_found(client: AsyncClient):
    response = await client.get("/images/processed/nonexistent.png")
    assert response.status_code == 404


async def test_get_result_image_not_found(client: AsyncClient):
    response = await client.get("/results/nonexistent.jpg")
    assert response.status_code == 404


async def test_path_traversal_blocked(client: AsyncClient):
    """Ensure path traversal attempts are blocked."""
    response = await client.get("/images/original/..%2F..%2Fetc%2Fpasswd")
    assert response.status_code in (400, 404)


async def test_path_traversal_dot_dot(client: AsyncClient):
    response = await client.get("/images/original/../../../etc/passwd")
    assert response.status_code in (400, 404)


# ── Scan history (unauthenticated) ──


async def test_scans_requires_auth(client: AsyncClient):
    response = await client.get("/scans")
    assert response.status_code == 401


async def test_scan_detail_requires_auth(client: AsyncClient):
    response = await client.get("/scans/some-id")
    assert response.status_code == 401


# ── Scan history (authenticated, empty) ──


async def test_scans_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/scans", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["scans"] == []
    assert data["total"] == 0


async def test_progress_empty(client: AsyncClient, auth_headers: dict):
    response = await client.get("/scans/history/progress", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["progress"] == []
    assert data["latest_stats"] is None


# ── Upload (unauthenticated) ──


async def test_upload_requires_auth(client: AsyncClient):
    response = await client.post("/upload")
    assert response.status_code == 401


async def test_analyze_requires_auth(client: AsyncClient):
    response = await client.post("/analyze")
    assert response.status_code == 401

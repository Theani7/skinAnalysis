"""
Tests for authentication endpoints: register, login, me, profile update.
"""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ── Registration ──


async def test_register_success(client: AsyncClient):
    response = await client.post(
        "/auth/register",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "jane@example.com"
    assert data["user"]["name"] == "Jane Doe"
    assert "id" in data["user"]


async def test_register_duplicate_email(client: AsyncClient, registered_user: dict):
    response = await client.post(
        "/auth/register",
        json={
            "name": "Another User",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


async def test_register_invalid_email(client: AsyncClient):
    response = await client.post(
        "/auth/register",
        json={
            "name": "Bad Email",
            "email": "not-an-email",
            "password": "password123",
        },
    )
    assert response.status_code == 422


async def test_register_short_password(client: AsyncClient):
    response = await client.post(
        "/auth/register",
        json={
            "name": "Short Pass",
            "email": "short@example.com",
            "password": "123",
        },
    )
    assert response.status_code == 422


# ── Login ──


async def test_login_success(client: AsyncClient, registered_user: dict):
    response = await client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "securepassword123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"


async def test_login_wrong_password(client: AsyncClient, registered_user: dict):
    response = await client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post(
        "/auth/login",
        json={
            "email": "nobody@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 401


# ── Get current user ──


async def test_get_me_success(client: AsyncClient, auth_headers: dict):
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"


async def test_get_me_no_token(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401


async def test_get_me_invalid_token(client: AsyncClient):
    response = await client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid-token-here"},
    )
    assert response.status_code == 401


# ── Profile update ──


async def test_update_profile_success(client: AsyncClient, auth_headers: dict):
    response = await client.put(
        "/auth/profile",
        json={"name": "Updated Name"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"


async def test_update_profile_empty_name(client: AsyncClient, auth_headers: dict):
    response = await client.put(
        "/auth/profile",
        json={"name": ""},
        headers=auth_headers,
    )
    assert response.status_code == 422


async def test_update_profile_no_auth(client: AsyncClient):
    response = await client.put(
        "/auth/profile",
        json={"name": "Hacker"},
    )
    assert response.status_code == 401

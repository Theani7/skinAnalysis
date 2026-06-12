"""
Tests for Pydantic validation schemas in auth service.
"""

import pytest
from pydantic import ValidationError

from services.auth import UserCreate, UserUpdate

# ── UserCreate validation ──


def test_user_create_valid():
    user = UserCreate(name="John Doe", email="john@example.com", password="password123")
    assert user.name == "John Doe"
    assert user.email == "john@example.com"


def test_user_create_strips_whitespace():
    user = UserCreate(name="  John Doe  ", email="  JOHN@Example.COM  ", password="password123")
    assert user.name == "John Doe"
    assert user.email == "john@example.com"


def test_user_create_invalid_email():
    with pytest.raises(ValidationError):
        UserCreate(name="John", email="not-an-email", password="password123")


def test_user_create_short_password():
    with pytest.raises(ValidationError):
        UserCreate(name="John", email="john@example.com", password="123")


def test_user_create_long_password():
    with pytest.raises(ValidationError):
        UserCreate(name="John", email="john@example.com", password="x" * 129)


def test_user_create_empty_name():
    with pytest.raises(ValidationError):
        UserCreate(name="", email="john@example.com", password="password123")


def test_user_create_long_name():
    with pytest.raises(ValidationError):
        UserCreate(name="x" * 101, email="john@example.com", password="password123")


# ── UserUpdate validation ──


def test_user_update_valid():
    update = UserUpdate(name="New Name")
    assert update.name == "New Name"


def test_user_update_empty_name():
    with pytest.raises(ValidationError):
        UserUpdate(name="")


def test_user_update_long_name():
    with pytest.raises(ValidationError):
        UserUpdate(name="x" * 101)

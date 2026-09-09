from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import ORMModel


class RoleResponse(ORMModel):
    id: UUID
    code: str
    name: str
    description: str
    permissions: list[str] = []


class StoreResponse(ORMModel):
    id: UUID
    name: str
    code: str
    timezone: str
    is_active: bool


class StoreCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    code: str = Field(min_length=1, max_length=40)
    timezone: str = Field(default="Asia/Kolkata", min_length=2, max_length=64)


class StoreUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    code: str | None = Field(default=None, min_length=1, max_length=40)
    timezone: str | None = Field(default=None, min_length=2, max_length=64)
    is_active: bool | None = None


class UserResponse(ORMModel):
    id: UUID
    tenant_id: UUID
    store_id: UUID | None
    email: EmailStr
    full_name: str
    status: str
    locale: str
    timezone: str
    phone_number: str | None
    job_title: str | None
    location: str | None
    bio: str | None
    avatar_url: str | None
    avatar_emoji: str
    date_of_birth: date | None
    theme_preference: str
    date_format: str
    dashboard_density: str
    email_notifications: bool
    role_preferences: dict[str, bool | int | str]
    joined_at: datetime
    last_login_at: datetime | None
    tenant_name: str
    currency: str
    store: StoreResponse | None
    email_verified_at: datetime | None
    email_verified: bool = False
    mfa_enabled: bool
    role: RoleResponse


class BusinessProfileUpdate(BaseModel):
    business_name: str | None = Field(default=None, min_length=2, max_length=160)
    currency: str | None = Field(default=None, min_length=3, max_length=3, pattern=r"^[A-Z]{3}$")
    timezone: str | None = Field(default=None, min_length=2, max_length=64)
    phone_number: str | None = Field(default=None, max_length=24)
    gstin: str | None = Field(default=None, max_length=60)


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    locale: str | None = Field(default=None, min_length=2, max_length=16)
    timezone: str | None = Field(default=None, min_length=2, max_length=64)
    phone_number: str | None = Field(default=None, max_length=24)
    job_title: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=160)
    bio: str | None = Field(default=None, max_length=500)
    date_of_birth: date | None = None
    avatar_emoji: Literal["🙂", "👨‍💼", "👩‍💼", "🧑‍💼", "🚀"] | None = None
    theme_preference: Literal["light", "dark", "system"] | None = None
    date_format: Literal["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] | None = None
    dashboard_density: Literal["comfortable", "compact"] | None = None
    email_notifications: bool | None = None
    role_preferences: dict[str, bool | int | str] | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        cleaned = value.strip()
        if not all(character.isdigit() or character in "+- ()" for character in cleaned):
            raise ValueError("Phone number contains unsupported characters")
        if sum(character.isdigit() for character in cleaned) < 7:
            raise ValueError("Phone number must contain at least 7 digits")
        return cleaned


class UserInvitationRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    role_code: str
    store_id: UUID | None = None


class InvitationAcceptRequest(BaseModel):
    token: str
    password: str


class RoleChangeRequest(BaseModel):
    role_code: str
    store_id: UUID | None = None


class AccountStateRequest(BaseModel):
    enabled: bool


class EmployeeUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, max_length=24)
    role_code: str | None = None
    store_id: UUID | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        cleaned = value.strip()
        if not all(character.isdigit() or character in "+- ()" for character in cleaned):
            raise ValueError("Phone number contains unsupported characters")
        if sum(character.isdigit() for character in cleaned) < 7:
            raise ValueError("Phone number must contain at least 7 digits")
        return cleaned

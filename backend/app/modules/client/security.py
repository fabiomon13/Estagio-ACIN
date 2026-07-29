#backend/app/modules/client/security.py

from hashlib import sha256
from hmac import new

from app.core.config import settings


def hash_device_token(device_token: str) -> str:
    """Hash a device token with a server-side secret."""
    secret = settings.device_token_secret or settings.jwt_secret_key
    return new(
        secret.encode("utf-8"),
        device_token.encode("utf-8"),
        sha256,
    ).hexdigest()


def hash_legacy_device_token(device_token: str) -> str:
    """Hash tokens created before server-side HMAC was introduced."""
    return sha256(device_token.encode("utf-8")).hexdigest()

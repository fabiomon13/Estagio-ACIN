#backend/app/modules/client/security.py

from hashlib import sha256


def hash_device_token(device_token: str) -> str:
    #Converts the device token into a SHA-256 hash for secure storage and comparison.
    return sha256(
        device_token.encode("utf-8"),
    ).hexdigest()
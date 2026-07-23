#backend/app/modules/client/security.py

from hashlib import sha256


def hash_device_token(device_token: str) -> str:
    """
    Converte o token do dispositivo num hash SHA-256.

    O token original fica guardado no dispositivo.
    Apenas o hash é armazenado na base de dados.
    """
    return sha256(
        device_token.encode("utf-8"),
    ).hexdigest()
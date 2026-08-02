# Unit tests for KitchenStatusUpdateRequest validation.

import pytest
from pydantic import ValidationError

from app.modules.kitchen.schemas import KitchenStatusUpdateRequest


def test_accepts_preparing():
    payload = KitchenStatusUpdateRequest(status="Preparing")

    assert payload.status == "Preparing"


def test_accepts_ready():
    payload = KitchenStatusUpdateRequest(status="Ready")

    assert payload.status == "Ready"


# Reject invalid kitchen status values.
@pytest.mark.parametrize(
    "value",
    [
        "Pending",
        "Served",
        "Cancelled",
        "Returned",
        "preparing",
        "Preparng",
        "",
    ],
)
def test_rejects_unsupported_values(value):
    with pytest.raises(ValidationError):
        KitchenStatusUpdateRequest(status=value)
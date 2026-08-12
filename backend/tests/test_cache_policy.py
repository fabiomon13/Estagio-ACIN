from app.core.cache_policy import (
    CATALOG_CACHE_CONTROL,
    STATIC_CACHE_CONTROL,
    get_cache_control,
)

# tests for the cache policy applied to different routes in the application
# verifies that static assets receive the long cache policy
def test_static_assets_receive_the_long_cache_policy() -> None:
    assert get_cache_control("/static/menu-items/salmon.webp") == STATIC_CACHE_CONTROL

# tests for the cache policy applied to different routes in the application
# verifies that public catalogue routes receive the short cache policy
def test_public_catalogue_routes_receive_the_short_cache_policy() -> None:
    paths = (
        "/api/client/buffets",
        "/api/client/buffets/3/items",
        "/api/client/categories",
        "/api/client/menu-items",
        "/api/client/menu-items/7",
        "/api/client/tags",
    )

    assert all(get_cache_control(path) == CATALOG_CACHE_CONTROL for path in paths)

# tests for the cache policy applied to different routes in the application
# verifies that private or mutable routes are never cached
def test_private_or_mutable_routes_are_never_cached() -> None:
    paths = (
        "/api/client/tables/table-code",
        "/api/client/orders",
        "/api/client/billing/summary",
        "/api/staff/requests",
        "/api/auth/me",
    )

    assert all(get_cache_control(path) is None for path in paths)
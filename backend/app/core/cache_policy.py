"""Cache policy for public, read-only HTTP resources."""

from re import compile as compile_pattern


STATIC_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800"
CATALOG_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300"

_CATALOG_PATH_PATTERN = compile_pattern(
    r"^/api/client/(?:buffets(?:/\d+/items)?|categories|menu-items(?:/\d+)?|tags)$"
)


def get_cache_control(path: str) -> str | None:
    """Return the cache policy for a safe public path, if one exists."""
    if path.startswith("/static/"):
        return STATIC_CACHE_CONTROL

    if _CATALOG_PATH_PATTERN.fullmatch(path):
        return CATALOG_CACHE_CONTROL

    return None

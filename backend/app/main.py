import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from fastapi.staticfiles import StaticFiles
from app.api.deps import ACCESS_TOKEN_COOKIE_NAME, InvalidSessionError
from app.api.router import api_router
from app.core.config import settings
from app.core.websocket_manager import connection_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    connection_manager.bind_loop(asyncio.get_running_loop())  # so broadcast() can reach this loop from sync code
    yield


app = FastAPI(
    title="Buffet Ordering API",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves whatever image files a teammate drops into static/menu-items/ at
# /static/menu-items/<filename> -- e.g. static/menu-items/salmon-nigiri.jpg
# becomes http://localhost:8000/static/menu-items/salmon-nigiri.jpg. No code
# change needed per image, see app/db/seeds/menu_items.py for the naming
# convention (filename == the menu item's alias).
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "menu-items").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.exception_handler(InvalidSessionError)
async def handle_invalid_session(request: Request, exc: InvalidSessionError) -> JSONResponse:
    response = JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE_NAME, path="/")
    return response


@app.exception_handler(ValidationError)
async def handle_pydantic_validation_error(request: Request, exc: ValidationError) -> JSONResponse:
    """Catches cross-field @model_validator errors on Depends()-injected query
    models (e.g. KitchenHistoryFilters' date_to >= date_from check) -- FastAPI
    only auto-converts its OWN per-field query validation into a 422; a
    ValidationError raised while Pydantic builds the model itself otherwise
    propagates as an unhandled 500."""
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(exc.errors())})


app.include_router(
    api_router,
    prefix="/api",
)

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.api.deps import ACCESS_TOKEN_COOKIE_NAME, InvalidSessionError
from app.api.router import api_router
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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


app.include_router(
    api_router,
    prefix="/api",
)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.deps import ACCESS_TOKEN_COOKIE_NAME, InvalidSessionError
from app.api.router import api_router


app = FastAPI(
    title="Buffet Ordering API",
    version="0.1.0",
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
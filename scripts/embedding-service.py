"""
venusus-master Embedding Service.

Tiny FastAPI wrapper around `intfloat/multilingual-e5-small` (384-dim).
Listens on 127.0.0.1:8765, used only locally by the ingest pipeline and
the Next.js search route. NOT exposed via nginx.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.environ.get("EMBED_MODEL", "intfloat/multilingual-e5-small")

_model: SentenceTransformer | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    _model = SentenceTransformer(MODEL_NAME)
    _model.max_seq_length = 512
    yield
    _model = None


app = FastAPI(lifespan=lifespan, title="venusus-master embedding")


class EmbedRequest(BaseModel):
    texts: list[str]
    # e5-models expect "query: " prefix for queries and "passage: " for indexed text
    kind: str = "passage"  # or "query"


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    dim: int
    model: str


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_NAME, "loaded": _model is not None}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    prefix = "query: " if req.kind == "query" else "passage: "
    inputs = [prefix + t for t in req.texts]
    vecs = _model.encode(inputs, normalize_embeddings=True, show_progress_bar=False)
    return EmbedResponse(
        embeddings=vecs.tolist(),
        dim=int(vecs.shape[1]),
        model=MODEL_NAME,
    )

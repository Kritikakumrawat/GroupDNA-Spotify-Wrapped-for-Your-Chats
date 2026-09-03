from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from groupdna.analytics import analyze_chat
from groupdna.storage import AggregateStore

app = FastAPI(title="GroupDNA ML Engine", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
store = AggregateStore()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict[str, object]:
    if not file.filename or not file.filename.lower().endswith((".txt", ".text")):
        raise HTTPException(status_code=400, detail="Upload a WhatsApp .txt export")

    raw_bytes = await file.read()
    try:
        lines = raw_bytes.decode("utf-8-sig").splitlines()
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=400, detail="The export must be UTF-8 text") from error

    result = analyze_chat(lines)
    analysis_id = store.save(result.stats)
    return {"analysis_id": analysis_id, **result.to_dict()}

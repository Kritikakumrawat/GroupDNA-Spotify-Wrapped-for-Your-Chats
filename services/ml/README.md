# ML / NLP service

FastAPI owns parsing and analytics. Uploaded text is held in memory for the request, converted immediately to `AggregateStats`, and never stored. The SQLite store contains counts and distributions only.

Run locally from the repository root:

```powershell
uvicorn services.ml.main:app --reload --port 8000
```

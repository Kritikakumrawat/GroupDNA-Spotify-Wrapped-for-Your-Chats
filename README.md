# GroupDNA

GroupDNA is a privacy-first analytics platform that decodes WhatsApp group exports into communication patterns, mood trends, and playful member archetypes.

## Architecture

- `frontend/`: React + Tailwind CSS + Recharts dashboard.
- `backend/`: Java/Spring Boot authentication and API boundary.
- `services/ml/`: Python/FastAPI parsing and NLP engine using pandas, NumPy, scikit-learn, and VADER/NLTK.
- `groupdna/`: privacy-first aggregate domain model and SQLite store.

The system never persists raw message text. The ML service parses the uploaded export in memory and stores only aggregate counts, distributions, and derived scores. PostgreSQL can replace SQLite behind the same storage interface when deployment needs shared persistence.

## Local development

```powershell
python -m pip install -r requirements.txt
uvicorn services.ml.main:app --reload --port 8000
```

The React app is started from `frontend/` with `npm install` and `npm run dev`.

## Privacy

Raw message text is processed in memory and never persisted. The database stores only aggregate counts, distributions, sentiment scores, and derived archetype features.

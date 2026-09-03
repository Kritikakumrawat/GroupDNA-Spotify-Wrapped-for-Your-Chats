# Spring Boot API / auth layer

This service owns authentication, authorization, analysis ownership, and proxy requests to the FastAPI ML engine. It must never accept or persist raw message text beyond forwarding an upload to the in-memory analysis endpoint.

## Run locally

From the repository root:

```powershell
.tools\maven\maven-3.9.16\bin\mvn.cmd -f backend\pom.xml spring-boot:run
```

The API listens on `http://localhost:8080`.

Passwords are stored only as BCrypt hashes. The local MVP user store is saved in `backend/data/users.tsv`; replace it with PostgreSQL or SQLite persistence before production deployment.

Planned endpoints:

- `POST /api/auth/register` — JSON: `{ "name": "Asha", "email": "asha@example.com", "password": "secret123" }`
- `POST /api/auth/login` — JSON: `{ "email": "asha@example.com", "password": "secret123" }`
- `POST /api/analyses`
- `GET /api/analyses/{id}`
- `GET /api/analyses/{id}/export`

# Spring Boot API / auth layer

This service will own authentication, authorization, analysis ownership, and proxy requests to the FastAPI ML engine. It must never accept or persist raw message text beyond forwarding an upload to the in-memory analysis endpoint.

Planned endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/analyses`
- `GET /api/analyses/{id}`
- `GET /api/analyses/{id}/export`

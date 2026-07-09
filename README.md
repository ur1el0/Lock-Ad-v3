# Lock-Ad v3

Lock-Ad v3 is a full-stack cautious navigation platform for the Philippines. It combines route previews with safety-related context such as lighting, public infrastructure, reports, weather, and available public datasets.

Full documentation now lives in [`docs/`](docs/).

Start here:

- [Project README and Plan](docs/PROJECT_README.md)
- [Backend Guide](docs/BACKEND.md)
- [Frontend Guide](docs/FRONTEND.md)
- [Conversation / Project Context Export](docs/CONVERSATION_EXPORT.md)

## Quick start

Backend:

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Use:

```txt
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:8000
```

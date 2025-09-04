# Travel Guide Backend (Production Ready)

## Overview
This is a Flask-based backend for a travel guide app using Gemini AI and PostgreSQL. It is ready for production and deployment.

## Features
- Search for famous places (AI-powered, cached)
- Get detailed, conversational travel guides
- Regenerate guide sections
- CORS enabled for frontend
- Wikipedia image fetching

## Setup Instructions

### 1. Clone the Repository
```
git clone <your-backend-repo-url>
cd <repo-folder>
```

### 2. Python Environment
- Use Python 3.9+
- (Recommended) Create a virtual environment:
    ```
    python -m venv venv
    venv\Scripts\activate  # On Windows
    source venv/bin/activate  # On Mac/Linux
    ```

### 3. Install Dependencies
```
pip install -r requirements.txt
```

### 4. Environment Variables
Create a `.env` file in the root directory with:
```
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=your_postgres_connection_url
```

### 5. Database Setup
- The app will auto-create tables on first run if your database is accessible.

### 6. Run the Server
```
python app.py
```
- The server runs on port 5000 by default.

## Deployment
- Use a production WSGI server (e.g., Gunicorn, uWSGI) for deployment.
- Set `debug=False` in `app.py` for production.
- Use environment variables for all secrets.

## Endpoints
- `POST /search-places` — Get 10 famous places for a location
- `POST /place-details` — Get detailed info for a place
- `POST /regenerate-section` — Regenerate a section of a guide
- `POST /save-detailed-description` — Save a detailed description

## Notes
- Ensure your database and Gemini API credentials are correct.
- Frontend should handle CORS and use the correct endpoints.

---

For any issues, open an issue or contact the maintainer.
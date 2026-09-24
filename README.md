# News Pulse

News Pulse pulls in live RSS feeds, groups related articles into story clusters, and shows the result as a timeline. It's three independent parts that share one MongoDB database:

```
News Pulse/
├── scraper/    Python — fetches RSS feeds, extracts full article text, clusters articles, writes to MongoDB
├── backend/    Node.js/Express — REST API that reads MongoDB and can trigger the scraper
└── frontend/   Next.js/React — calls the backend API and renders the timeline UI
```

## How it fits together

```
RSS feeds (BBC, NPR, Al Jazeera)
        │
        ▼
scraper/main.py  →  fetch → extract → clean → cluster → write to MongoDB
        │
        ▼
   MongoDB (db.articles, db.clusters)
        │
        ▼
backend/  (Express API: GET /clusters, GET /clusters/:id, GET /timeline,
           POST /ingest/trigger, GET /ingest/status/:jobId)
        │
        ▼
frontend/ (Next.js — fetches from the backend, renders the timeline)
```

The backend's `/ingest/trigger` endpoint spawns `scraper/main.py` as a separate OS process (see `backend/services/ingest.service.js`) — there's no HTTP call between Node and Python, just a spawned process.

## Tech stack

- **Scraper**: Python, `feedparser`, `requests`, `trafilatura`, `pymongo`
- **Backend**: Node.js, Express 5, `mongodb` driver, CORS
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Database**: MongoDB

## Prerequisites

- Node.js 18+
- Python 3.10+
- A MongoDB instance (local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)

## Local setup

Clone the repo, then set up each part:

### 1. Database
Have MongoDB running locally (`mongodb://localhost:27017`) or an Atlas connection string ready.

### 2. Scraper
```bash
cd scraper
pip install -r requirements.txt
cp .env.example .env   # fill in MONGO_URI / DB_NAME
python main.py
```
Run this once to populate the database before starting the backend/frontend — there's nothing to view until at least one article exists.

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, DB_NAME, PORT, PYTHON_PATH, PYTHON_SCRIPT, FRONTEND_URL
npm run dev             # or: npm start
```
API runs at `http://localhost:5000` by default.

### 4. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_URL
npm run dev
```
App runs at `http://localhost:3000`.

## Environment variables

**`scraper/.env`**
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `DB_NAME` | Database name |

**`backend/.env`**
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `DB_NAME` | Database name |
| `PORT` | Port the API listens on |
| `PYTHON_PATH` | Path to the Python interpreter used to run the scraper |
| `PYTHON_SCRIPT` | Absolute path to `scraper/main.py` |
| `FRONTEND_URL` | Frontend origin, used for CORS |

**`frontend/.env.local`**
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the running backend API |

None of the `.env` files are committed — copy each `.env.example` and fill in real values.

## API endpoints (backend)

| Method | Path | Description |
|---|---|---|
| GET | `/clusters` | List all clusters |
| GET | `/clusters/:id` | Get one cluster's detail |
| GET | `/timeline` | Timeline data for the frontend |
| POST | `/ingest/trigger` | Kick off a scraper run |
| GET | `/ingest/status/:jobId` | Check status of a triggered run |

## Keeping the data fresh

The scraper only runs when you run `python main.py` manually or hit `POST /ingest/trigger`. For continuously updated data, schedule one of those on a recurring basis (cron, a hosting platform's scheduled job, etc.).

## Notes on the clustering algorithm

Clustering is a single greedy pass over articles sorted by publish time: each article joins the best-matching existing cluster if it shares at least 3 keywords and a Jaccard similarity of at least 0.15 with that cluster's accumulated keyword pool, otherwise it starts a new cluster. Full details are in `scraper/clustering.py`.

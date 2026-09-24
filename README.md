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

The backend's `/ingest/trigger` endpoint spawns `scraper/main.py` as a separate OS process (see `backend/services/ingest.service.js`) — there's no HTTP call between Node and Python, just a spawned process. This only works when Node and Python run on the same machine (true locally); see **Deployment** below for how ingestion actually runs in the hosted version.

## News sources used

- **BBC News** — `http://feeds.bbci.co.uk/news/rss.xml`
- **NPR** — `https://feeds.npr.org/1001/rss.xml`
- **Al Jazeera** — `https://www.aljazeera.com/xml/rss/all.xml`

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

## Deployment

Live URLs:
- Frontend: https://news-pulse-coral-kappa.vercel.app
- Backend API: https://news-pulse-5osn.onrender.com

| Component | Runs on | Why |
|---|---|---|
| Frontend | Vercel | Purpose-built for Next.js; free tier, zero config |
| Backend API | Render (free Node web service) | Simple Express host; free tier, connected to GitHub for auto-deploy |
| Database | MongoDB Atlas (free M0 cluster) | Managed, no ops, reachable from both Render and GitHub Actions |
| Scraper | **GitHub Actions**, scheduled hourly (`.github/workflows/scrape.yml`) | See note below |

**Why the scraper doesn't run via `/ingest/trigger` in production:** that endpoint spawns Python as a subprocess of the Node backend, which only works when both run on the same machine. Render's free Node web service has no Python runtime installed, so `/ingest/trigger` fails there (by design of that hosting tier, not a code bug). Rather than pay for a host that bundles both runtimes, ingestion instead runs as its own scheduled GitHub Actions job — one of the alternatives this assessment's own Part 4 explicitly lists ("GitHub Actions cron"). It runs `scraper/main.py` hourly against the same Atlas database, using `MONGO_URI`/`DB_NAME` repo secrets.

The **Refresh Data** button still calls `POST /ingest/trigger` and polls `/ingest/status/:jobId` exactly as specified, and this works end-to-end when run locally (`PYTHON_PATH`/`PYTHON_SCRIPT` point at a real local Python + script). On the hosted backend, that call fails for the reason above, and the button falls back to simply re-fetching `/timeline` with a one-line explanation, rather than showing a raw server error to a visitor.

## Notes on the clustering algorithm

**Approach**: keyword/word-overlap grouping (Option A), not TF-IDF. Clustering is a single greedy pass over articles sorted by publish time: each article joins the best-matching existing cluster if it shares at least `MIN_SHARED_WORDS = 3` keywords *and* a Jaccard similarity of at least `MIN_JACCARD = 0.15` with that cluster's accumulated keyword pool (both thresholds picked by hand-testing against real feed output — high enough to avoid grouping unrelated stories that happen to share a couple of common words, low enough that same-story articles from different outlets still match despite differing phrasing). If no existing cluster clears both thresholds, the article starts a new one. Full implementation is in `scraper/clustering.py`.

**Limitations**:
- **Order-dependent**: it's a single greedy pass in publish-time order — once an article joins a cluster, that decision is never revisited even if a later article would have been a better fit.
- **Unbounded keyword drift**: a cluster's keyword pool only ever grows (`cluster["keywords"] |= article_keywords`), so a large, old cluster can slowly accumulate enough unrelated keywords to start absorbing tangentially-related articles.
- **No stemming**: "election" and "elections" are treated as different keywords, which can undercount real overlap.
- **No cross-source story merging**: the same real-world story from two different outlets isn't recognized as one story unless their keyword overlap independently clears the threshold (this is listed as an optional stretch goal, not attempted here).

# Huddle — Real-time Chat Application

A production-ready real-time chat application with room-based messaging, JWT authentication, message history, and horizontal scaling via Redis Pub/Sub.

## ✨ Features

- Real-time messaging via WebSockets with instant delivery
- Room-based communication — create public or private rooms with unique codes
- JWT authentication — signup, login, and secure WebSocket handshake verification
- Typing indicators — see when someone is typing in real time
- Online presence — see who is currently in the room
- Message history — last 50 messages loaded on room join
- Horizontal scaling — Redis Pub/Sub broadcasts messages across multiple server instances
- Persistent storage — all messages stored in PostgreSQL with sender relationships

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| WebSockets | ws library |
| Database | PostgreSQL (Docker locally / Neon for production) |
| ORM | Prisma 7 |
| Cache / Pub-Sub | Redis (Docker) |
| Auth | JWT, bcrypt |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker Desktop

### 1. Clone the repo

```bash
git clone https://github.com/Abhinav5665/Huddle-Chat-App.git
cd Huddle-Chat-App
```

### 2. Start Redis and PostgreSQL

```bash
# Start PostgreSQL
docker run --name huddle-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=huddle \
  -p 5432:5432 -d postgres:16

# Start Redis
docker run --name huddle-redis \
  -p 6379:6379 -d redis
```

Already created the containers before? Just start them:

```bash
docker start huddle-db
docker start huddle-redis
```

### 3. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/huddle"
JWT_SECRET="your_secret_key_here"
PORT=3000
WS_PORT=8080
```

Run migrations and start:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| WebSocket | ws://localhost:8080 |

## 📖 How To Use

1. Open `http://localhost:5173`
2. Sign up with a username and password
3. Create a public room or enter a room code to join a private one
4. Share the room code with anyone you want to chat with
5. Start chatting in real time

## 📁 Project Structure

```
Huddle-Chat-App/
├── backend/
│   └── src/
│       ├── config/         # Database and Redis connection
│       ├── controllers/    # Auth and room logic
│       ├── middleware/     # JWT auth middleware
│       ├── models/         # Prisma schema
│       ├── routes/         # Auth and room routes
│       ├── websocket/      # wsServer, wsHandlers, roomManager
│       └── types/          # Shared TypeScript types
│
└── frontend/
    └── src/
        ├── components/     # Reusable UI components
        ├── context/        # Auth and WebSocket context
        ├── hooks/          # Custom React hooks
        ├── pages/          # Auth, Lobby, Chat pages
        ├── services/       # Axios API calls
        └── utils/          # Helper functions
```

## 🔮 Future Scope

- **Private messaging** — direct one-to-one chat between users outside of rooms, with a dedicated inbox and notification system
- **File and image sharing** — send images and files inside chat rooms with preview support, stored via Cloudinary
- **Mobile app** — React Native client using the same WebSocket and REST backend, bringing Huddle to iOS and Android

## ⚠️ Important Notes

- Make sure Docker Desktop is open before starting the backend
- After every machine restart run `docker start huddle-db` and `docker start huddle-redis` before `npm run dev`
- To test horizontal scaling, run two backend instances on different ports and connect clients to each

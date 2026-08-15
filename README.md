# AI-Powered Digital Work Order & Job Card Management System

A production-quality, responsive web application that digitizes industrial work orders, job cards, materials, inventory, real-time WebSocket telemetry, and AI capabilities across four operational user roles (**Administrator**, **Supervisor**, **Worker**, **Inventory Manager**).

---

## 🛠 Required Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router DOM v6, TanStack Query, Recharts, Socket.io-client, Lucide Icons.
- **Backend**: Node.js, Express.js, TypeScript, REST API, Socket.io (real-time gateway).
- **Database**: PostgreSQL 16 + Prisma ORM 5.
- **Authentication**: JWT authentication, bcrypt password hashing, server-side RBAC authorization middleware.
- **Infrastructure**: Docker, docker-compose.

---

## 👤 Pre-configured User Roles & Accounts

All seed accounts are initialized with password: `Password123!`

| Role | Email | Permissions |
| :--- | :--- | :--- |
| **Administrator** | `admin@example.com` | User management, RBAC, System audit log viewer |
| **Supervisor** | `supervisor1@example.com` | Create Work Orders, calculate AI priority scores, approve/reject Job Cards & Material Requests, Semantic Search |
| **Supervisor 2** | `supervisor2@example.com` | Monitor worker workload & generate NL reports |
| **Worker 1** | `worker1@example.com` | View assigned Job Cards, update completion %, upload photo evidence, raise Material Requests |
| **Worker 2** | `worker2@example.com` | Assigned maintenance tasks & job card progress updates |
| **Inventory Manager** | `inventory@example.com` | Spare parts catalog, stock levels, atomic material issuance with low-stock guardrails |

---

## 🤖 AI Features & Fallback Architecture

1. **AI Priority Scoring Engine (`backend/src/ai/priorityScorer.ts`)**:
   - Calculates a 0–100 priority score based on Proximity to Deadline (40%), Equipment Criticality (35%), and SLA Risk keywords (25%).
   - Generates plain-language factor breakdown explanations.
2. **Semantic Work Order Search (`backend/src/ai/semanticSearch.ts`)**:
   - Parses natural language intent (e.g. "urgent turbine leak", "pump issues last month") and ranks results by relevance score.
3. **Automated NL Report Generator (`backend/src/ai/reportGenerator.ts`)**:
   - Aggregates verified database metrics and generates natural language executive summaries alongside verified source data tables.

---

## 🚀 Running the Project

### 1. Backend & Database Setup
```bash
# Navigate to workspace
cd "c:\Users\aarya\OneDrive\Desktop\SE SYNOPSIS"

# Install backend dependencies
cd backend
npm install

# Run database migrations and generate Prisma client
npx prisma generate --schema=../prisma/schema.prisma
npx prisma db push --schema=../prisma/schema.prisma

# Seed realistic industrial data
npm run seed

# Start backend server
npm run dev
```

### 2. Frontend Setup
```bash
cd "../frontend"
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.

### 3. Docker Deployment
```bash
docker-compose -f docker/docker-compose.yml up --build -d
```

---

## 🧪 Automated Testing

```bash
cd backend
npm test
```
Runs the Jest integration test suite verifying authentication, RBAC authorization blocks, Work Order 1-to-1 Job Card creation constraints, inventory stock floor guardrails, and AI scoring engines.

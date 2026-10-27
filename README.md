# Industrial AI-Powered Work Order & Job Card Management System

A full-stack industrial maintenance management platform that digitizes work orders, job cards, equipment maintenance, inventory, and material requests. The system combines role-based access control with AI-assisted prioritization, semantic search, operational reporting, and real-time communication.

**Live Demo:** [Open Application](https://ai-digital-work-order-management-system-1.onrender.com)

---

## Overview

Industrial maintenance operations often rely on fragmented records and manual workflows. This project provides a centralized platform for managing maintenance activities, tracking equipment, coordinating technicians, and monitoring inventory.

Built with React, TypeScript, Node.js, Express, PostgreSQL, and Prisma, the application supports four operational roles and provides AI-assisted features for maintenance decision-making.

## Features

* **Role-Based Access Control:** Separate permissions for administrators, supervisors, workers, and inventory managers.
* **Work Order Management:** Create, prioritize, and track maintenance work orders.
* **Job Card Management:** Organize maintenance tasks and monitor completion progress.
* **Equipment Management:** Maintain equipment records and track criticality.
* **Inventory Management:** Manage spare parts, stock levels, material requests, and inventory issuance.
* **AI Priority Scoring:** Calculate maintenance priority scores using deadlines, equipment criticality, and SLA-related keywords.
* **Semantic Search:** Search work orders using natural-language queries.
* **AI-Assisted Reporting:** Generate readable operational summaries from database metrics.
* **Audit Logging:** Maintain records of relevant system activities.
* **Real-Time Communication:** Socket.io integration for supported real-time events.
* **Responsive Interface:** Web-based interface for accessing maintenance workflows.

## Technology Stack

| Component               | Technologies                          |
| ----------------------- | ------------------------------------- |
| Frontend                | React, TypeScript, Vite, Tailwind CSS |
| Routing                 | React Router                          |
| Data Fetching           | TanStack Query                        |
| Visualization           | Recharts                              |
| Backend                 | Node.js, Express.js, TypeScript       |
| API                     | REST API                              |
| Database                | PostgreSQL                            |
| ORM                     | Prisma                                |
| Authentication          | JWT, bcrypt                           |
| Real-Time Communication | Socket.io                             |
| Icons                   | Lucide React                          |
| Deployment              | Render                                |
| Containerization        | Docker, Docker Compose                |

## AI Components

### 1. Maintenance Priority Scoring

**Module:** `backend/src/ai/priorityScorer.ts`

Calculates a score from 0 to 100 using weighted factors:

* Deadline proximity: 40%
* Equipment criticality: 35%
* SLA-risk keywords: 25%

The scoring engine provides explanations of the factors contributing to a work order's priority.

### 2. Semantic Work Order Search

**Module:** `backend/src/ai/semanticSearch.ts`

Supports natural-language search and relevance-based ranking.

Example queries:

* `Urgent turbine leak`
* `Pump issues last month`
* `High-priority maintenance tasks`

### 3. Natural-Language Reporting

**Module:** `backend/src/ai/reportGenerator.ts`

Aggregates operational metrics and generates natural-language summaries accompanied by supporting data.

## Application Architecture

```text
                  User
                   |
                   v
          React + TypeScript
             Frontend
                   |
             HTTPS / REST
                   |
                   v
          Node.js + Express
               Backend
                   |
          +--------+---------+
          |        |         |
          v        v         v
       Prisma    AI Logic   Socket.io
          |
          v
       PostgreSQL
```

## Live Deployment

| Service      | Link                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| Frontend     | [Open Application](https://ai-digital-work-order-management-system-1.onrender.com) |
| Backend      | [Backend Service](https://ai-digital-work-order-management-system.onrender.com)    |
| Database     | Managed PostgreSQL instance on Render                                              |
| Database GUI | Prisma Studio, available during local development                                  |

The frontend communicates with the deployed backend, which accesses PostgreSQL through Prisma.

**Note:** The backend URL is an API service, not a separate web interface. The database is not publicly exposed; access requires valid database connection credentials.

## Demo Access

The project supports four roles:

| Role              | Capabilities                                                |
| ----------------- | ----------------------------------------------------------- |
| Administrator     | User management and audit log access                        |
| Supervisor        | Work order management, approvals, and operational reporting |
| Worker            | Assigned job cards, task progress, and material requests    |
| Inventory Manager | Inventory records, stock management, and material issuance  |

For security, public documentation should not expose production credentials. If demo accounts are available, provide their credentials through a controlled demonstration channel or create dedicated, restricted demo accounts.

## Getting Started

### Prerequisites

Install the following:

* [Node.js](https://nodejs.org/)
* npm
* [Git](https://git-scm.com/)
* PostgreSQL, or access to a PostgreSQL database

### 1. Clone the Repository

```bash
git clone https://github.com/Aaryansinngh/ai-digital-work-order-management-system.git
cd ai-digital-work-order-management-system
```

### 2. Configure the Backend

```bash
cd backend
npm install
```

Create a `backend/.env` file:

```env
DATABASE_URL="YOUR_POSTGRESQL_CONNECTION_STRING"
JWT_SECRET="YOUR_RANDOM_SECRET"
PORT=5000
```

Replace the placeholder values with your own configuration. Check the backend source code for any additional required environment variables.

**Security:** Never commit `.env` files or database credentials to GitHub.

### 3. Generate the Prisma Client

From the `backend` directory:

```bash
npx prisma generate --schema=prisma/schema.prisma
```

### 4. Initialize the Database

Check the migration status:

```bash
npx prisma migrate status --schema=prisma/schema.prisma
```

Apply the existing migrations when appropriate for your database:

```bash
npx prisma migrate deploy --schema=prisma/schema.prisma
```

Use a separate development database when possible. Avoid running schema-changing commands against production without reviewing their impact.

### 5. Seed Sample Data (Optional)

If you are using a fresh development database:

```bash
npm run seed
```

Review the seed script before running it. It may create sample accounts and records, and it should not be assumed safe to run repeatedly.

### 6. Start the Backend

```bash
npm run dev
```

Keep the terminal open.

### 7. Start the Frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, commonly:

`http://localhost:5173`

Ensure the frontend API configuration points to the backend you intend to use.

## Viewing the Database

The project uses PostgreSQL with Prisma ORM.

To inspect database records during development, open a terminal in the `backend` directory and run:

```bash
npx prisma studio --schema=prisma/schema.prisma
```

Prisma Studio normally opens at:

`http://localhost:5555`

Available application models include:

* `User`
* `Equipment`
* `WorkOrder`
* `JobCard`
* `MaterialRequest`
* `InventoryItem`
* `InventoryIssue`
* `AuditLog`

Prisma Studio can modify records. Use caution when connected to a production database.

## Docker

If the repository includes a configured Docker Compose file, start the containers from the repository root:

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

Review the Compose configuration and environment variables before running the command.

To stop the containers:

```bash
docker compose -f docker/docker-compose.yml down
```

## Testing

From the backend directory:

```bash
npm test
```

The configured test suite may cover authentication, role-based authorization, work order validation, inventory safeguards, and AI scoring. Actual coverage depends on the tests present in the repository.

## Security Considerations

* Keep secrets and database credentials out of source control.
* Use strong JWT secrets and password policies.
* Change or disable default demonstration credentials before public use.
* Restrict database access to authorized services and users.
* Avoid exposing sensitive operational data in logs or screenshots.
* Use a separate development database for testing and experimentation.

## Future Improvements

Potential enhancements include:

* Predictive maintenance based on equipment history
* Advanced search and retrieval
* Automated maintenance alerts
* Expanded operational analytics
* Enhanced mobile support
* Integration with industrial IoT telemetry

## Author

**Aryan Singh**

B.Tech, Computer Science and Engineering
Manipal University Jaipur

GitHub: [Aaryansinngh](https://github.com/Aaryansinngh)

---

*Developed as an industrial maintenance management project combining full-stack engineering, database design, role-based access control, and AI-assisted workflows.*

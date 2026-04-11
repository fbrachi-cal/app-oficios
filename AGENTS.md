# 🤖 AGENTS.md — AI Development Rules

This file defines **mandatory rules** for any AI agent (ChatGPT, Claude, Cursor, Copilot, etc.) working on this repository.

The AI must follow these rules strictly.

---

## 🎯 Objective

Ensure consistent, maintainable, and production-ready code when using AI-assisted development ("vibecoding").

The AI is treated as a **junior developer**.  
The human developer is responsible for validation, architecture, and final decisions.

---

## 📦 Project Context

This project is a marketplace platform connecting clients and professionals.

### Frontend
- React + TypeScript + Vite
- Tailwind CSS
- Firebase (Auth + Firestore for chat)
- Axios for backend communication

### Backend
- FastAPI (Python)
- Firebase Admin SDK
- Firestore
- Hexagonal Architecture (ports & adapters)

---

## 🧠 General Rules (MANDATORY)

- Do NOT assume missing context → ask questions if needed
- Do NOT introduce shortcuts or "demo-level" solutions
- Always prioritize **readability, maintainability, and scalability**
- Do NOT change architecture without explicit request
- Do NOT introduce new libraries unless clearly justified
- Do NOT mark tasks as complete if the code does not build or run

---

## 🏗️ Architecture Rules

### Backend (STRICT)

- Follow **hexagonal architecture**
  - `api/` → controllers
  - `domain/` → business logic
  - `adapters/` → external integrations
- Do NOT put business logic in controllers
- Use services in the domain layer
- Validate input using Pydantic
- Always handle errors explicitly
- Respect user roles: `cliente`, `profesional`, `admin`

---

### Frontend (STRICT)

- Keep separation of concerns:
  - `components/` → UI
  - `services/` → API calls
  - `hooks/` → reusable logic
- Do NOT put business logic inside UI components
- Use existing project structure consistently
- Respect i18n (no hardcoded user-facing strings)

---

## 🧾 Code Standards

- All comments must be written in **English**
- Use clear and descriptive naming
- Avoid duplication
- Handle errors properly (no silent failures)
- Follow existing patterns before creating new ones

---

## 🔐 Authentication & Roles

- Authentication is handled via Firebase
- Backend expects `Authorization: Bearer <token>`
- Role-based behavior must always be respected:
  - cliente
  - profesional
  - admin

Never bypass role validation.

---

## 🚫 Anti-Patterns (FORBIDDEN)

- Mixing layers (controller + DB logic together)
- Hardcoded values or credentials
- Ignoring validation
- Ignoring existing architecture
- Creating "quick fixes" without proper structure
- Duplicating logic already implemented elsewhere

---

## 🧪 Testing & Validation

- Code must be **runnable and valid**
- Backend: use pytest when applicable
- Frontend: ensure build works (`pnpm build`)
- Do NOT finalize tasks with broken code

---

## 🧠 Prompting Guidelines (IMPORTANT)

When generating code, the AI must:

- Respect this document (`AGENTS.md`)
- Respect the project structure
- Ask for missing details before implementing
- Prefer incremental changes over large rewrites

---

## 🔄 Workflow Expectations

1. Understand the problem
2. Ask clarifying questions if needed
3. Propose a solution aligned with architecture
4. Implement clean, production-ready code
5. Ensure it builds and works

---

## 📌 Final Rule

If there is any doubt:

👉 ASK FIRST, DO NOT GUESS.
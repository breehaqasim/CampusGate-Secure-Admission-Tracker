# CampusGate — Secure Admission Tracker

**Course:** Cybersecurity: Theory, Tools (L1) · **Group:** Project Group 5  
**Repository:** [github.com/breehaqasim/CampusGate-Secure-Admission-Tracker](https://github.com/breehaqasim/CampusGate-Secure-Admission-Tracker)

University admission management **SPA**: students explore institutions; **university admins** manage programmes after approval; **super admins** oversee the system. Data and auth live in **Supabase** (PostgreSQL). Production-style hosting uses **Docker** (Vite build + **nginx**).

This document is the **requirements specification**, **installation guide**, and **user / operator manual** for developers, markers, and demo hosts. Formal security analysis, pipeline detail, and rubric-aligned reporting are in **[`PROJECT_REPORT.md`](PROJECT_REPORT.md)**.

---

## Table of contents

1. [Requirements](#1-requirements)  
2. [Installation — local development](#2-installation--local-development)  
3. [Installation — Docker](#3-installation--docker)  
4. [User manual](#4-user-manual)  
5. [Troubleshooting](#5-troubleshooting)  
6. [Project layout](#6-project-layout)  
7. [Security automation & artefacts](#7-security-automation--artefacts)  

---

## 1. Requirements

### 1.1 Software

| Software | Version / notes |
|----------|-----------------|
| **Node.js** | **20.x** (Dockerfile uses **20.19.2** Alpine for builds — match major version locally). |
| **npm** | Comes with Node; this repo uses **`package-lock.json`** — prefer **`npm ci`** for reproducible installs. |
| **Git** | For clone, branch, and push workflows. |
| **Docker Engine** + **Docker CLI** | Optional for [Section 3](#3-installation--docker); **required** if you reproduce CI builds locally. |
| **Supabase project** | A project with **URL** and **anon (public) key**; tables and Auth configured per your deployment (see app services under `src/app/services/`). |

### 1.2 Network & deployment (course baseline)

- **Development:** localhost is fine for coding (`npm run dev`).  
- **Graded demo / submission:** the running application must be reachable at a **hostname or IP with HTTPS**, **not** “localhost only” — use a VM, lab host, or cloud instance with TLS (public CA or organisation **self-signed** cert, with trust instructions for markers if needed).

### 1.3 Accounts you need

- At least one **Supabase** project with Auth enabled.  
- Test users for **student**, **university admin** (pending and **approved**), and **super admin** — create these in Supabase Auth (and matching **`profiles`** rows / policies) according to your schema.

---

## 2. Installation — local development

### 2.1 Clone the repository

```bash
git clone https://github.com/breehaqasim/CampusGate-Secure-Admission-Tracker.git
cd CampusGate-Secure-Admission-Tracker
```

### 2.2 Install dependencies

```bash
npm ci
```

If `npm ci` complains the lockfile is out of sync with `package.json`, run `npm install` once, commit the updated lockfile (on a branch), then return to `npm ci` for CI parity.

**Check Node version:**

```bash
node -v   # expect v20.x
```

### 2.3 Configure environment variables

1. In the **project root**, create a file named **`.env`** (same folder as `package.json`).  
2. **Do not commit** `.env` — it must stay in `.gitignore` for real keys.

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

3. Restart the dev server after any change to `.env`.

The client is created in **`src/lib/supabase.ts`**; missing variables cause a clear startup error.

### 2.4 Run the application (development server)

```bash
npm run dev
```

- **Default Vite URL:** `http://localhost:5173` (terminal prints the exact URL).  
- Open that URL in a modern browser (Chrome or Edge recommended for DevTools-based testing).

### 2.5 Production build (local output only)

```bash
npm run build
```

- **Output directory:** `dist/`  
- **Purpose:** static files that nginx serves in Docker ([Section 3](#3-installation--docker)) or any static host.

### 2.6 Verify installation

| Check | Expected |
|--------|----------|
| `npm ci` | Completes with no errors. |
| `npm run dev` | Vite starts; browser loads role selection or redirects after session check. |
| Browser **Network** tab | Requests to `*.supabase.co` return **200** (not 401) when logged in. |

---

## 3. Installation — Docker

The **Dockerfile** builds the SPA with Node, then copies **`dist/`** into **nginx** (`nginx.conf`, `nginx-csp.inc`).

### 3.1 Build image

Replace placeholders with your Supabase values (same as `.env`):

```bash
docker build ^
  --build-arg VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co ^
  --build-arg VITE_SUPABASE_ANON_KEY=<your-anon-key> ^
  -t campusgate:local .
```

On **macOS / Linux**, use line continuation `\` instead of `^`.

### 3.2 Run container

Map host port **8080** to container **80** (nginx):

```bash
docker run --rm -p 8080:80 --name campusgate campusgate:local
```

- **Local smoke test:** `http://localhost:8080`  
- **Stop:** `Ctrl+C` or `docker stop campusgate` from another terminal.

### 3.3 HTTPS in front of Docker (for course submission)

Dockerfile exposes **HTTP** on port 80 inside the container. For **HTTPS**:

1. Run the container on a server with a **public or lab DNS name**.  
2. Put **nginx**, **Caddy**, **Traefik**, or a **cloud load balancer** in front with TLS certificates.  
3. Reverse-proxy to `http://127.0.0.1:8080` (or the mapped host port).

Document your exact URL and certificate type in **`PROJECT_REPORT.md`** for markers.

---

## 4. User manual

### 4.1 First launch

1. Open the app URL (dev or deployed).  
2. **Role selection:** choose **Student**, **University Admin**, or **Super Admin**.  
3. **Register** or **log in** with credentials that exist in your Supabase project.

### 4.2 Roles and typical tasks

| Role | What you can do |
|------|------------------|
| **Student** | Browse universities and details, manage **favourites**, use search/filter within the student experience, **log out** from the dashboard. |
| **University admin** | Register / log in; if your profile is **not approved**, you stay on the admin login path until a super admin approves you; once **approved**, use the **university admin dashboard** to maintain **universities** and **programmes** (CRUD via Supabase). |
| **Super admin** | Full **super admin dashboard** — oversight and administrative actions defined on that screen (e.g. approvals, global data). |

### 4.3 Session behaviour

- **Supabase Auth** maintains the session; the app refreshes tokens (`persistSession`, `autoRefreshToken` in `src/lib/supabase.ts`).  
- **Logout** clears the session through the app’s logout flow.  
- **Inactivity:** after a period without mouse, keyboard, scroll, or touch, the app signs the user out automatically (see `App.tsx`).

### 4.4 Data persistence

All durable data is stored in **Supabase PostgreSQL**. Refreshing the page or closing the browser does **not** erase committed records.

### 4.5 Validation

Forms use **react-hook-form** and UI validation. Invalid submissions should show field-level errors rather than silently accepting bad input.

---

## 5. Troubleshooting

| Symptom | Likely cause | What to do |
|---------|----------------|------------|
| `Missing Supabase environment variables` | No `.env` or wrong names | Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; restart `npm run dev`. |
| Blank screen / auth loop | Wrong Supabase keys or Auth redirect URLs | Check Supabase dashboard → Auth → URL configuration matches your dev/prod origin. |
| `npm ci` fails | Lock out of sync | Run `npm install`, commit `package-lock.json`, retry. |
| Docker build fails at `npm ci` | Network or Node mismatch | Retry build; ensure Docker has network access; align host Node with 20.x if debugging locally. |
| Docker runs but page empty | Build args missing | Rebuild with both `VITE_*` `--build-arg` values set. |
| 403 / empty data for a role | RLS or `approved` / `role` mismatch | Check Supabase **RLS policies** and **`profiles`** rows for the signed-in user. |

---

## 6. Project layout

| Path | Purpose |
|------|---------|
| `src/app/` | Screens, components, app shell (`App.tsx`) |
| `src/app/services/` | Supabase data + auth helpers (e.g. `universityService.ts`, `authService.ts`) |
| `src/lib/supabase.ts` | Supabase client |
| `Dockerfile` | Multi-stage Node → nginx image |
| `nginx.conf`, `nginx-csp.inc` | Static hosting + security headers |
| `.github/workflows/` | `sonar.yml`, `syft-sbom.yml`, `dast.yml` |
| `dast/zap-baseline-rules.conf` | ZAP Baseline custom rules |
| `PROJECT_REPORT.md` | Full security / DevSecOps report |
| `newthreatmodel.pdf` | Threat model artefact |
| `docs/images/architecture.png` | Architecture diagram (referenced from report) |

---

## 7. Security automation & artefacts

| Workflow | Role |
|----------|------|
| [`sonar.yml`](.github/workflows/sonar.yml) | **SAST** — SonarCloud |
| [`syft-sbom.yml`](.github/workflows/syft-sbom.yml) | **SCA** — Syft + Grype + gate |
| [`dast.yml`](.github/workflows/dast.yml) | **DAST** — ZAP Baseline on built image |

**Actions:** [github.com/breehaqasim/CampusGate-Secure-Admission-Tracker/actions](https://github.com/breehaqasim/CampusGate-Secure-Admission-Tracker/actions)

Artifacts (per workflow): **`sonarcloud-report`**, **`sca-reports`**, **`dast-zap-reports`** — download from a completed run.

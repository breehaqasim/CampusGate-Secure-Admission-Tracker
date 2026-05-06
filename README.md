# CampusGate-Secure-Admission-Tracker

## 📌 Overview

UniTrack Secure is a role-based web application designed to simplify the university admission exploration process while incorporating strong security practices. The system allows students to search and explore universities, university administrators to manage their institutional data, and a super administrator to control access through an approval workflow.

This project is built as part of a DevSecOps-focused application, integrating security testing, vulnerability assessment, and remediation within a CI/CD pipeline.

---

## 🎯 Objectives

* Provide a centralized platform for university discovery
* Implement Role-Based Access Control (RBAC)
* Introduce a secure approval workflow for administrators
* Identify, exploit, and remediate security vulnerabilities
* Integrate SAST, DAST, and SCA in CI/CD

---

## 👥 User Roles

### 🟢 Student

* Register and login
* Search universities by filters (country, city, etc.)
* View university details

### 🔵 University Admin

* Register and request access (pending approval)
* Manage their own university data (Add/Edit)

### 🔴 Super Admin

* Approve or reject university admin requests
* View and manage all users and universities

---

## 🔁 System Workflow

1. User selects role (Student / University Admin / Super Admin)
2. Authentication (Login/Register)
3. University Admin accounts require approval by Super Admin
4. Access is granted based on role permissions
5. Users interact with role-specific dashboards

---

## 🗂️ Features

* 🔐 Secure authentication system (login/logout)
* 👥 Role-Based Access Control (RBAC)
* 🏫 University management (CRUD operations)
* 🔍 Search and filtering functionality
* ✅ Approval system for university admins
* 🗄️ Database integration for persistent storage

---

## 🧱 Tech Stack

* **Frontend:** HTML, CSS
* **Backend:** Flask (Python)
* **Database:** MySQL
* **Containerization:** Docker
* **CI/CD:** GitHub Actions

---

## 🔐 Security Implementation

This project intentionally includes and tests common web vulnerabilities:

* SQL Injection (Authentication bypass)
* Cross-Site Scripting (XSS)
* Broken Access Control (IDOR)
* Privilege Escalation
* Business Logic Flaws (Approval bypass)

---

## 🧪 Security Testing

* **SAST:** Bandit (Python static analysis)
* **SCA:** pip-audit / Safety (dependency scanning)
* **DAST:** OWASP ZAP (dynamic testing)

---

## 🛠️ Exploitation & Remediation

Each identified vulnerability is:

1. Discovered using tools/manual testing
2. Exploited with proof-of-concept
3. Fixed at root cause
4. Re-tested to verify resolution

---

## 🚀 Setup & Installation

### Prerequisites

* Python 3.x
* MySQL
* Docker (optional)

### Installation Steps

1. Clone the repository:

```bash
git clone https://github.com/your-repo/unitrack-secure.git
cd unitrack-secure
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Setup database:

* Create MySQL database
* Run provided SQL schema

4. Run the application:

```bash
python app.py
```

---

## 🐳 Docker (Optional)

```bash
docker-compose up --build
```

---

## 📊 Project Structure

```
/app
  /templates
  /static
  /routes
  /models
  /utils
app.py
requirements.txt
Dockerfile
docker-compose.yml
```

---

## 📄 Reports & Documentation

* Architecture & Threat Model
* Vulnerability Assessment Report
* Exploitation Report
* Remediation & Re-test Report
* Executive Summary (Non-Technical)

---

## 👥 Team

This project was developed as part of a collaborative academic effort.

---

## ⚠️ Disclaimer

This project includes intentionally vulnerable components for educational purposes only. Do not deploy in production environments.

---

## ⭐ Key Highlights

* Clean RBAC implementation
* Approval-based admin onboarding
* Full DevSecOps pipeline integration
* Real-world security testing and fixes

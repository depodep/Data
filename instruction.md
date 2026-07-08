# GitHub Copilot Instructions
## Web-Based Academic Data Science Hub

## System Role

You are an expert Software Architect, Senior Full-Stack PHP Developer, Python Data Engineer, Machine Learning Engineer, UI/UX Designer, and Database Architect.

Your responsibility is to build a production-ready **Web-Based Academic Data Science Hub** using **Pure PHP** and **Python**.

Always generate clean, modular, reusable, scalable, secure, and production-ready code.

Build the project one phase at a time.

Never skip phases.

Never generate future modules unless requested.

---

# Development Workflow

Always follow this order.

1. Project Structure

2. Database Design

3. Authentication

4. User Management

5. Dashboard

6. Dataset Library

7. Dataset Workspace

8. Data Preparation

9. Statistical Analysis

10. Visualization

11. Machine Learning

12. Reports

13. Student Module

14. Teacher Module

15. Admin Module

16. Testing

Do not jump ahead.

---

# Technology Stack

## Backend

- PHP 8.x (Pure PHP)
- PDO
- MySQL

## Frontend

- HTML5
- CSS3
- Bootstrap 5
- JavaScript ES6
- AJAX
- jQuery
- DataTables

## Python

- Python 3.12+
- Pandas
- NumPy
- OpenPyXL
- Scikit-learn
- Matplotlib

## Communication

PHP ↔ Python

Use JSON only.

---

# Architecture

Always follow Layered Architecture.

```
Presentation Layer (PHP)

↓

Application Layer (PHP API)

↓

Python Data Engine

↓

MySQL Database

↓

File Storage
```

Never mix responsibilities.

PHP handles

- Authentication
- Authorization
- Sessions
- Database
- Routing
- UI
- API

Python handles

- Data Preparation
- Statistical Analysis
- Visualization
- Machine Learning

---

# Project Folder Structure

```
project/

assets/

config/

includes/

pages/

api/

python/

uploads/

cleaned/

charts/

reports/

models/

index.php
```

---

# User Roles

## Administrator

Responsibilities

- Manage Users
- Manage Roles
- Manage Permissions
- Manage System Settings
- View All Datasets
- View Reports
- Activity Logs

---

## Teacher / Analyst

Responsibilities

- Download Dataset Template
- Upload Dataset
- Preview Dataset
- Perform Data Cleaning
- Perform Statistical Analysis
- Generate Charts
- Generate Insights
- Execute Machine Learning
- Export Reports

Teachers manage only their uploaded datasets.

---

## Student

Responsibilities

- Login
- Browse Shared Datasets
- View Own Records
- View Analysis
- View Charts
- View Predictions
- View Reports

Students cannot

- Upload datasets
- Clean datasets
- Edit datasets
- Delete datasets
- Manage users

Students must never access another student's records.

---

# Standard Dataset Template

The system uses ONE standardized dataset template.

Teachers must download the template from the system before uploading data.

Uploaded datasets must contain EXACTLY these columns.

| Student ID |
| Student Name |
| Course |
| Year Level |
| Section |
| Subject |
| Quiz Score |
| Midterm Score |
| Final Score |
| Attendance  |

No additional columns.

Reject datasets with missing required columns.

Validate uploaded templates before processing.

---

# Dataset Workflow

Teacher Login

↓

Download Dataset Template

↓

Fill Dataset

↓

Upload CSV/Excel

↓

Dataset Validation

↓

Dataset Preview

↓

Data Preparation

↓

Statistical Analysis

↓

Visualization

↓

Machine Learning

↓

Reports

↓

Dataset Library

---

# Sidebar Modules

## Dashboard

- Overview
- Quick Statistics
- Recent Datasets
- Recent Activities

---

## Dataset Library

- Search Dataset
- Filter Dataset
- Download Template
- Upload Dataset
- Dataset Cards

Each dataset opens a Dataset Workspace.

---

## Dataset Workspace

### Overview

- Dataset Information
- Dataset Details
- Dataset Status

### Preview

- Raw Dataset
- Dataset Summary
- Cleaning Summary
- Apply Cleaning
- Cleaned Dataset

### Analysis

- Statistical Summary
- Correlation
- Trend Analysis
- Insights

### Visualization

- Bar Chart
- Line Chart
- Pie Chart
- Histogram
- Scatter Plot

### Machine Learning

- Select Model
- Feature Selection
- Prediction
- Accuracy

### Reports

- Cleaning Report
- Analysis Report
- Prediction Report
- Export PDF
- Export Excel
- Export CSV

---

# Python Modules

## clean_dataset.py

Responsibilities

- Read CSV
- Read Excel
- Validate Dataset
- Profile Dataset
- Remove Duplicates
- Handle Missing Values
- Trim Spaces
- Standardize Text
- Convert Data Types
- Detect Outliers
- Generate Cleaning Summary
- Save Clean Dataset

---

## analyze_dataset.py

Generate

- Mean
- Median
- Mode
- Minimum
- Maximum
- Standard Deviation
- Correlation
- Trend Analysis
- Insights

Return JSON.

---

## visualize_dataset.py

Generate

- Bar Chart
- Line Chart
- Pie Chart
- Histogram
- Scatter Plot

Save charts inside

```
/charts/
```

Return image paths.

---

## predict_dataset.py

Supported Models

- Linear Regression
- Logistic Regression
- K-Nearest Neighbors

Generate

- Prediction
- Accuracy
- Evaluation Metrics

Return JSON.

---

# Reports

Generate

- Cleaning Report
- Statistical Report
- Visualization Report
- Prediction Report

Export

- PDF
- Excel
- CSV

---

# Student Access

Student accounts contain Student ID.

When a student opens a dataset,

display only rows where

```
dataset.student_id == logged_in_student.student_id
```

Never expose another student's records.

---

# PHP API Modules

upload_api.php

dataset_api.php

cleaning_api.php

analysis_api.php

visualization_api.php

prediction_api.php

report_api.php

Each API performs one responsibility only.

Python scripts must never be called directly from the UI.

---

# Coding Standards

PHP

- PSR-12
- PDO
- Prepared Statements
- Reusable Functions
- Modular Code
- Separate HTML and PHP
- Validate Inputs
- Return JSON for APIs

Python

- PEP8
- Modular Functions
- Type Hints
- Docstrings
- Exception Handling
- Return JSON

JavaScript

- ES6
- Async/Await
- AJAX
- Modular Scripts

HTML

- Semantic HTML5

CSS

- Bootstrap 5 first
- Custom CSS only when necessary

---

# Security

Always use

- password_hash()
- password_verify()
- PDO Prepared Statements
- Session Validation
- Role-Based Authorization
- CSRF Protection
- XSS Sanitization
- File Upload Validation

Never

- Trust user input
- Store plaintext passwords
- Use MySQLi
- Mix SQL inside HTML
- Duplicate code

---

# Code Generation Rules

Whenever generating code:

- Generate complete production-ready files.
- Keep one responsibility per file.
- Never generate placeholder code.
- Follow the project structure.
- Respect module boundaries.
- Keep PHP responsible for the web application.
- Keep Python responsible for data science.
- Generate reusable and maintainable code.
- Explain dependencies before generating code.
- Generate only the requested phase.
- Wait for approval before continuing to the next phase.
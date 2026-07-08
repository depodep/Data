# GitHub Copilot Commands
## Web-Based Academic Data Science Hub

> Always follow the project architecture and copilot instructions.
> Generate only the requested phase.
> Do not generate future modules.

---

# Phase 1 - Project Structure

Build the complete project folder structure for the Web-Based Academic Data Science Hub using Pure PHP, Python, MySQL, Bootstrap 5, and AJAX. Create only the folders and empty files. Do not generate any functionality.

---

# Phase 2 - Database

Design a normalized MySQL database for the system.

Include:

- users
- roles
- datasets
- dataset_records
- analysis_results
- prediction_results
- reports
- activity_logs

Generate:
- ERD
- SQL Schema
- Foreign Keys
- Indexes

Do not generate PHP code.

---

# Phase 3 - Authentication

Create the Authentication module.

Include:

- Login
- Logout
- Session Management
- Password Hashing
- Role-based Authentication

Use PDO.

Do not generate dashboard.

---

# Phase 4 - User Management

Create the Admin User Management module.

Include:

- Create User
- Update User
- Delete User
- Search
- Pagination
- Roles

---

# Phase 5 - Dashboard

Build the Dashboard.

Include:

- Statistics Cards
- Recent Datasets
- Recent Activities
- Quick Actions

---

# Phase 6 - Dataset Library

Build the Dataset Library.

Include:

- Download Dataset Template
- Upload Dataset
- Search
- Filter
- Dataset Cards

Do not generate analysis yet.

---

# Phase 7 - Dataset Workspace

Create the Dataset Workspace.

Tabs:

- Overview
- Preview
- Analysis
- Visualization
- Machine Learning
- Reports

Generate only the UI and routing.

---

# Phase 8 - Data Preparation

Create the Python Data Preparation module.

Generate clean_dataset.py.

Functions:

- validate_dataset()
- profile_dataset()
- remove_duplicates()
- handle_missing_values()
- trim_spaces()
- standardize_text()
- convert_data_types()
- detect_outliers()

Return JSON only.

Generate the PHP API that executes the script.

---

# Phase 9 - Statistical Analysis

Generate analyze_dataset.py.

Include:

- Mean
- Median
- Mode
- Min
- Max
- Standard Deviation
- Correlation
- Trend Analysis
- Insights

Return JSON.

---

# Phase 10 - Visualization

Generate visualize_dataset.py.

Create:

- Bar Chart
- Line Chart
- Pie Chart
- Histogram
- Scatter Plot

Save charts inside /charts/.

Return chart paths.

---

# Phase 11 - Machine Learning

Generate predict_dataset.py.

Support:

- Linear Regression
- Logistic Regression
- KNN

Return:

- Prediction
- Accuracy
- Metrics

---

# Phase 12 - Reports

Create the Reports module.

Generate:

- Cleaning Report
- Analysis Report
- Prediction Report

Support export:

- PDF
- Excel
- CSV

---

# Phase 13 - Student Module

Build the Student interface.

Students can:

- View Shared Datasets
- View Own Records
- View Charts
- View Reports
- View Predictions

Students cannot edit datasets.

---

# Phase 14 - Teacher Module

Build the Teacher interface.

Teachers can:

- Download Template
- Upload Dataset
- Clean Data
- Analyze Data
- Generate Charts
- Run Prediction
- Export Reports

---

# Phase 15 - Admin Module

Build the Admin interface.

Include:

- User Management
- Roles
- Permissions
- Activity Logs
- System Settings

---

# Phase 16 - Testing

Generate:

- Unit Test Checklist
- Integration Test Checklist
- System Test Checklist
- Security Checklist
- Deployment Checklist
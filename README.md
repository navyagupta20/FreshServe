# FreshServe — Smart Food Rescue & Management

FreshServe is a web-based platform designed to organize surplus food donations based on urgency and remaining expiry time. It combines Data Structures and Algorithms with a web interface to support more efficient food rescue and donation management.

## Features

- **Smart Food Prioritization:** Organizes donations according to urgency.
- **DSA-Based Processing:** Uses a C++ priority queue to prioritize food donations.
- **Interactive Dashboard:** Add and view donations with quantities and expiry times.
- **Backend Integration:** Connects the web interface to the C++ engine through Python Flask.
- **Input Validation:** Validates donation details before processing.
- **Impact Statistics:** Displays donation-related statistics on the dashboard.

## Tech Stack

- **Languages:** C++, Python, JavaScript
- **Backend:** Flask
- **Frontend:** HTML, CSS, JavaScript
- **Data Structures:** Priority Queue
- **Version Control:** Git and GitHub

## How It Works

1. Users enter food donation details through the web interface.
2. The Flask backend validates the submitted information.
3. The C++ engine processes donations according to priority.
4. The results are returned to the frontend and displayed on the dashboard.

## Project Structure

```text
FreshServe/
├── app.py
├── README.md
├── requirements.txt
├── cpp/
│   ├── main.cpp
│   └── freshserve.exe
├── static/
│   ├── script.js
│   └── style.css
└── templates/
    └── index.html
```
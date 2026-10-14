# FreshServe – Smart Food Rescue & Management

FreshServe is a web-based food donation management platform that helps donors manage surplus food and enables NGOs to claim donations and track their collection status. It combines Data Structures and Algorithms (DSA) with web development to prioritize food donations based on their expiry time.

**Live Website:** https://freshserve-eqql.onrender.com/  
**NGO Dashboard:** https://freshserve-eqql.onrender.com/ngo

## Features

- **Smart Food Prioritization:** Prioritizes available donations by earliest expiry time.
- **DSA-Based Processing:** Uses a C++ priority queue to organize donations efficiently, with donation ID as a tie-breaker.
- **Donation Management:** Allows users to add, edit, view, and delete food donations.
- **NGO Dashboard:** Enables NGOs to claim available donations and mark them as collected.
- **Database Integration:** Uses SQLite to store donation details and track their status.
- **Input Validation:** Validates donation information before processing.
- **Interactive Interface:** Provides a web dashboard for managing and viewing donations.

## Tech Stack

- **Languages:** C++, Python, JavaScript
- **Backend:** Python Flask
- **Frontend:** HTML, CSS, JavaScript
- **Database:** SQLite
- **Data Structure:** C++ Priority Queue
- **Deployment:** Render, Gunicorn
- **Version Control:** Git and GitHub

## How It Works

1. Donors submit food donation details through the web interface.
2. The Flask backend validates requests and manages donation records in SQLite.
3. The C++ priority queue prioritizes available donations by earliest expiry time.
4. The frontend displays donation information and prioritization results.
5. NGOs use the NGO dashboard to claim donations and update their collection status.

## Project Structure

```text
FreshServe/
├── app.py
├── README.md
├── requirements.txt
├── render.yaml
├── cpp/
│   └── main.cpp
├── static/
│   ├── script.js
│   ├── style.css
│   └── ngo.js
└── templates/
    ├── index.html
    └── ngo.html
```

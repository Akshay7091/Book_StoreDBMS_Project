Online Bookstore - Full-Stack Application 📚
This project is a complete online bookstore web application, developed to demonstrate core concepts in database management and full-stack development. It features a Python (Flask) backend, a MySQL database, and a dynamic HTML, CSS, and JavaScript frontend.

Key Features
The application is split into two primary roles: a feature-rich experience for customers and a powerful administrative panel for management.

User Functionality
Account Management: Users can register for a new account and log in securely.

Browse Inventory: View all available books with cover images, author details, and pricing.

Live Purchasing System: Select books and quantities to purchase, which updates the database inventory in real-time.

Administrative Panel
Secure Admin Login: A dedicated and separate login route for administrators.

Inventory Management:

Add Books: A form to add new books to the database, including a local file upload for the cover image.

Remove Books: Functionality to delete books from the inventory by their barcode.

User Oversight: A page to view a list of all registered non-admin users.

Tech Stack
Getting Started
Follow these instructions to get a local copy of the project up and running.

Prerequisites
You will need the following software installed on your machine:

Python 3.x

MySQL Server

Git

Installation & Setup
Clone the Repository
Open your terminal and run the following command to download the project files:

git clone [Your GitHub Repository URL]
cd [Your Project Folder Name]

Set Up a Python Virtual Environment
It is highly recommended to use a virtual environment to manage project dependencies.

# Create the environment
python -m venv venv

# Activate the environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

Install Dependencies
Install all required Python libraries with a single command:

pip install -r requirements.txt

Configure the Database

First, ensure your MySQL server is running. Log in and create a new database named book_store.

Then, run the provided setup script from your terminal to automatically create the books and users tables:

python setup_database.py

Set Up Environment Variables

In the project's root directory, find the .env.example file.

Make a copy of this file and rename the copy to .env.

Open the new .env file and fill in your personal MySQL username and password.

Running the Application
This project runs on two separate backend servers that must be running at the same time. Open two terminal windows for this process.

Start the Book Server
In your first terminal (with the virtual environment activated), run:

python BooksBE.py

Start the User Server
In your second terminal (with the virtual environment activated), run:

python UsersPE.py

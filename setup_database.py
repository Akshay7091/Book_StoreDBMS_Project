import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

# Load environment variables from .env file
load_dotenv()

# Read database configuration from environment variables
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}


CREATE_BOOKS_TABLE = """
CREATE TABLE IF NOT EXISTS books (
    barcode VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100),
    author VARCHAR(100),
    price INT,
    quantity INT,
    image_url VARCHAR(2048)
)
"""

CREATE_USERS_TABLE = """
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100),
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    phone VARCHAR(100) UNIQUE,
    mailid VARCHAR(100) UNIQUE,
    usertype INT DEFAULT 0
)
"""

# Establish connection and create tables
connection = None
try:
    # Connect to the database using the credentials from the .env file
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor()

    print("Successfully connected to the database.")

    # Create Books table
    print("Creating 'books' table if it doesn't exist...")
    cursor.execute(CREATE_BOOKS_TABLE)
    print("'books' table is ready.")

    # Create Users table
    print("Creating 'users' table if it doesn't exist...")
    cursor.execute(CREATE_USERS_TABLE)
    print("'users' table is ready.")

    # Commit the changes to the database
    connection.commit()
    print("\nDatabase setup is complete. Done hai bhai!")

# CORRECTED: Catches the specific database error and prints a useful message
except mysql.connector.Error as e:
    print(f"\nYeh toh prank hoo gaya. A database error occurred: {e}")

finally:
    # Ensure the connection is always closed
    if connection and connection.is_connected():
        cursor.close()
        connection.close()
        print("\nDatabase connection closed.")

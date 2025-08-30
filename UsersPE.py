import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

load_dotenv()
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

app = Flask(__name__)
CORS(app)

# --- Health Check Route ---
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "User API server is running."})

# --- Get All Users Route ---
@app.route('/api/users', methods=['GET'])
def get_all_users():
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        query = """ 
        SELECT username, firstname, lastname, mailid, phone 
        FROM users 
        WHERE usertype IS NULL OR usertype != 1
            """
        cursor.execute(query)
        users = cursor.fetchall()
        return jsonify(users)
    except mysql.connector.Error as e:
        print(f"Database Error: {e}")
        return jsonify({"error": "A database error occurred while fetching users."}), 500
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()

# --- User Registration Route (UPDATED) ---
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    firstname = data.get('firstname')
    lastname = data.get('lastname')
    username = data.get('username')
    password = data.get('password')
    mailid = data.get('mailid')
    phone = data.get('phone')

    if not all([firstname, username, password, mailid]):
        return jsonify({"error": "Missing required fields."}), 400

    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        query = """
            INSERT INTO users (firstname, lastname, username, password, mailid, phone)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        user_tuple = (firstname, lastname, username, password, mailid, phone)
        
        cursor.execute(query, user_tuple)
        connection.commit()
        
        return jsonify({"message": "User registered successfully."}), 201

    except mysql.connector.Error as e:
        # This block checks for duplicate entry errors (error code 1062)
        if e.errno == 1062:
            error_msg = str(e).lower() # Get the error message from the database
            
            # Check which field caused the duplicate error
            if 'username' in error_msg:
                return jsonify({"error": "This username is already taken."}), 409
            if 'mailid' in error_msg:
                return jsonify({"error": "This email is already registered."}), 409
            # --- NEW: This block handles the duplicate phone number error ---
            if 'phone' in error_msg:
                return jsonify({"error": "This phone number is already registered."}), 409
        
        # For any other database errors
        print(f"Database Error: {e}")
        return jsonify({"error": "A database error occurred during registration."}), 500
        
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()

# --- User Login Route ---
@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)

        query = "SELECT username, password FROM users WHERE username = %s"
        cursor.execute(query, (username,))
        user = cursor.fetchone()

        if user and user['password'] == password:
            return jsonify({"message": "Login successful."}), 200
        else:
            return jsonify({"error": "Invalid username or password."}), 401
    except mysql.connector.Error as e:
        print(f"Database Error: {e}")
        return jsonify({"error": "A database error occurred during login."}), 500
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()

@app.route('/api/admin/login', methods=['POST'])
def login_admin():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)

        # MODIFIED: Query now checks for usertype = 1 directly in the database.
        # This is more efficient.
        query = "SELECT username, password FROM users WHERE username = %s AND usertype = 1"
        cursor.execute(query, (username,))
        user = cursor.fetchone()

        # MODIFIED: The logic is now simpler.
        # If a user is found, we already know they are an admin.
        # We just need to check the password.
        if user and user['password'] == password:
            return jsonify({"message": "Admin login successful."}), 200
        else:
            # This error now covers all failure cases:
            # - User does not exist
            # - Password does not match
            # - User exists but is not an admin
            return jsonify({"error": "Invalid admin credentials,Access denied."}), 401

    except mysql.connector.Error as e:
        print(f"Database Error: {e}")
        return jsonify({"error": "A database error occurred."}), 500
        
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()

# --- Run the User API Server ---
if __name__ == '__main__':
    app.run(debug=True, port=5001)


import os #helps the code to interact with local machine's evnironmnt
from dotenv import load_dotenv #loads the env data that is present inside
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from werkzeug.utils import secure_filename

# --- Configuration ---
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

load_dotenv()
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME')
}

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- Helper Function to check file extension ---
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- UNCHANGED ROUTES (get_books, remove_book, buy_books) ---
@app.route('/api/books', methods=['GET'])
def get_books():
    # ... (code is the same as before)
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        query = "SELECT barcode, name, author, price, quantity, image_url FROM books"
        cursor.execute(query)
        books = cursor.fetchall()
        return jsonify(books)
    except Error as e:
        return jsonify({"error": "Failed to retrieve data."}), 500
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()

# --- MODIFIED ROUTE: Add Book now handles file uploads ---
@app.route('/api/books/add', methods=['POST'])
def add_book():
    # Check if the file part is in the request
    if 'image' not in request.files:
        return jsonify({"error": "No image file part in the request."}), 400
    
    file = request.files['image']
    
    # Check if a file was selected
    if file.filename == '':
        return jsonify({"error": "No selected file."}), 400

    # Get text data from the form
    barcode = request.form.get('barcode')
    name = request.form.get('name')
    author = request.form.get('author')
    price = request.form.get('price')
    quantity = request.form.get('quantity')

    if not all([barcode, name, author, price, quantity]):
        return jsonify({"error": "Missing form data. All fields are required."}), 400

    image_url = None
    if file and allowed_file(file.filename):
        # Sanitize the filename to prevent security issues
        filename = secure_filename(file.filename)
        # Save the file to the UPLOAD_FOLDER
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        # The URL to be stored in the database is the path to the file
        image_url = f"/static/uploads/{filename}"

    if not image_url:
        return jsonify({"error": "Invalid file type. Allowed types are png, jpg, jpeg, gif, webp."}), 400

    # --- Database insertion logic ---
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        query = """
            INSERT INTO books (barcode, name, author, price, quantity, image_url) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        book_tuple = (barcode, name, author, price, quantity, image_url)
        cursor.execute(query, book_tuple)
        connection.commit()
        return jsonify({"message": f"Book '{name}' added successfully."}), 201
    except mysql.connector.Error as e:
        if e.errno == 1062:
            return jsonify({"error": f"Error: Barcode '{barcode}' already exists."}), 409
        print(f"Database Error: {e}")
        return jsonify({"error": "A database error occurred."}), 500
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()

# --- OTHER ROUTES (remove, buy) remain unchanged ---
@app.route('/api/books/remove', methods=['DELETE'])
def remove_book():
    # ... (code is the same)
    data = request.get_json()
    barcode = data.get('barcode')
    connection = None










    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        query = "DELETE FROM books WHERE barcode = %s"
        cursor.execute(query, (barcode,))
        connection.commit()
        if cursor.rowcount > 0:
            return jsonify({"message": f"Book with barcode '{barcode}' was removed."}), 200
        else:
            return jsonify({"error": f"Book with barcode '{barcode}' not found."}), 404
    except mysql.connector.Error as e:
        return jsonify({"error": "A database error occurred."}), 500
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()


@app.route('/api/books/buy', methods=['POST'])
def buy_books():
    # ... (code is the same)
    data = request.get_json()
    items_to_purchase = data.get('items')
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()
        for item in items_to_purchase:
            barcode = item.get('barcode')
            quantity_to_buy = int(item.get('quantity'))
            query_stock = "SELECT name, quantity FROM books WHERE barcode = %s FOR UPDATE"
            cursor.execute(query_stock, (barcode,))
            book = cursor.fetchone()
            if not book:
                connection.rollback()
                return jsonify({"error": f"Book with barcode '{barcode}' not found."}), 404
            if book['quantity'] < quantity_to_buy:
                connection.rollback()
                return jsonify({"error": f"Not enough stock for '{book['name']}'."}), 400
            new_quantity = book['quantity'] - quantity_to_buy
            query_update = "UPDATE books SET quantity = %s WHERE barcode = %s"
            cursor.execute(query_update, (new_quantity, barcode))
        connection.commit()
        return jsonify({"message": "Purchase successful!"}), 200
    except mysql.connector.Error as e:
        if connection: connection.rollback()
        return jsonify({"error": "A database error occurred."}), 500
    except ValueError:
         return jsonify({"error": "Invalid quantity provided."}), 400
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)

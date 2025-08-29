# Food Track Application

A Flask-based application for tracking meal opt-ins and generating QR codes for meal verification.

## Local Development

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python app.py
   ```

4. Access the application at http://localhost:5000

## Environment Variables

- `SECRET_KEY`: Secret key for Flask sessions
- `DATABASE_URL`: Database connection string (automatically set by Railway)
- `PORT`: Port to run the application on (automatically set by Railway)
- `FLASK_ENV`: Set to `development` for local development, `production` for deployment

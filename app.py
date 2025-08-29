import os
from flask import Flask
from flask_cors import CORS
import urllib.parse

from __init__ import db, login_manager
from models import User

# Initialize Flask app
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-for-lunch-track')

# Database configuration - use PostgreSQL in production, SQLite in development
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    # Heroku/Railway style PostgreSQL URL
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    # Local development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///lunch_track.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions with app
db.init_app(app)
login_manager.init_app(app)
CORS(app)

# Configure login manager
login_manager.login_view = 'main.login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Import and register blueprints
from routes import main_bp
app.register_blueprint(main_bp)

# Create database tables if they don't exist
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    # Use PORT environment variable if available (for Railway/Heroku)
    port = int(os.environ.get('PORT', 5000))
    # Set debug to False in production
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

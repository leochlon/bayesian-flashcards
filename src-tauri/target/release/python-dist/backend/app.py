from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from models import db
from config import get_database_path
from db_init import initialize_database
from utils.error_handlers import handle_500_error, handle_exception

# Import blueprints (to be implemented in routes/)
from routes.decks import decks_bp
from routes.cards import cards_bp
from routes.sessions import sessions_bp
from routes.users import users_bp
from routes.stats import stats_bp
from routes.health import health_bp

# App factory
app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]}})
app.config['SQLALCHEMY_DATABASE_URI'] = get_database_path()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

# Initialize DB and default user
def setup_app(app):
    initialize_database(app)

setup_app(app)

# Register error handlers
app.register_error_handler(500, handle_500_error)
app.register_error_handler(Exception, handle_exception)

# Register blueprints
app.register_blueprint(decks_bp)
app.register_blueprint(cards_bp)
app.register_blueprint(sessions_bp)
app.register_blueprint(users_bp)
app.register_blueprint(stats_bp)
app.register_blueprint(health_bp)

if __name__ == '__main__':
    app.run(port=5002, debug=True)

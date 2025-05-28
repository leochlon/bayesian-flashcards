from models import db, User

def create_default_user(app):
    """Create the default user if not exists."""
    with app.app_context():
        try:
            user = User.query.filter_by(username='default').first()
            if not user:
                print("Creating default user...")
                default_user = User(username='default')
                db.session.add(default_user)
                db.session.commit()
                print("Default user created successfully")
            else:
                print("Default user already exists")
            return True
        except Exception as e:
            print(f"Error creating default user: {str(e)}")
            db.session.rollback()
            return False

def initialize_database(app):
    """Create database tables and default user."""
    with app.app_context():
        try:
            print("Creating database tables...")
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Database initialization error: {str(e)}")
    create_default_user(app)

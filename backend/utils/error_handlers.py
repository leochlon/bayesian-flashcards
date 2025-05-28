from flask import jsonify

def handle_500_error(e):
    """Handle internal server errors (HTTP 500)."""
    print(f"Internal Server Error: {str(e)}")
    return jsonify(error=str(e)), 500

def handle_exception(e):
    """Handle uncaught exceptions."""
    print(f"Unhandled Exception: {str(e)}")
    return jsonify(error=str(e)), 500

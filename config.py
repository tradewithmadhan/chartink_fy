"""
Application configuration for different environments.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment-specific .env file
env = os.environ.get('FLASK_ENV', 'development')
env_file = f'.env.{env}'
if os.path.exists(env_file):
    load_dotenv(env_file)

class Config:
    """Base configuration with common settings."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-change-in-production'
    
    # Database settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Fyers API settings
    FYERS_CLIENT_ID = os.environ.get('FYERS_CLIENT_ID')
    FYERS_SECRET_KEY = os.environ.get('FYERS_SECRET_KEY')
    FYERS_REDIRECT_URI = os.environ.get('FYERS_REDIRECT_URI')
    
    # Socket.IO settings
    SOCKETIO_ASYNC_MODE = 'threading'
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # Application settings
    APP_HOST = os.environ.get('APP_HOST', '127.0.0.1')
    APP_PORT = int(os.environ.get('APP_PORT', 5000))
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_DIR = Path(__file__).parent / 'logs'
    LOG_FILE = LOG_DIR / 'app.log'

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SOCKETIO_CORS_ALLOWED_ORIGINS = ['*']
    APP_HOST = '0.0.0.0'
    LOG_LEVEL = 'DEBUG'

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Ensure secret key is set in production
    if not SECRET_KEY:
        raise ValueError("No SECRET_KEY set for production environment")
    
    # More restrictive CORS in production
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://yourdomain.com').split(',')
    
    # Production host settings
    APP_HOST = os.environ.get('APP_HOST', '0.0.0.0')
    
    # Production logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'WARNING')

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    WTF_CSRF_ENABLED = False

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on environment."""
    return config[os.environ.get('FLASK_ENV', 'default')]
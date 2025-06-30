# backend/models.py
import os
from flask_mysqldb import MySQL
from dotenv import load_dotenv

load_dotenv()  # carga .env

# DEBUG: Mostrar variables de entorno cargadas
print('DEBUG DB_HOST:', os.getenv('DB_HOST'))
print('DEBUG DB_USER:', os.getenv('DB_USER'))
print('DEBUG DB_PASSWORD:', os.getenv('DB_PASSWORD'))
print('DEBUG DB_NAME:', os.getenv('DB_NAME'))

def init_db(app):
    app.config.update(
        MYSQL_HOST     = os.getenv("DB_HOST"),
        MYSQL_USER     = os.getenv("DB_USER"),
        MYSQL_PASSWORD = os.getenv("DB_PASSWORD"),
        MYSQL_DB       = os.getenv("DB_NAME")
    )
    return MySQL(app)


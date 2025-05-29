# backend/models.py
import os
from flask_mysqldb import MySQL
from dotenv import load_dotenv

load_dotenv()  # carga .env

def init_db(app):
    app.config.update(
        MYSQL_HOST     = os.getenv("DB_HOST"),
        MYSQL_USER     = os.getenv("DB_USER"),
        MYSQL_PASSWORD = os.getenv("DB_PASS"),
        MYSQL_DB       = os.getenv("DB_NAME")
    )
    return MySQL(app)


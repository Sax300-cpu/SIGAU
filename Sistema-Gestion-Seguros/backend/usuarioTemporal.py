#!/usr/bin/env python3
import os
from werkzeug.security import generate_password_hash
import mysql.connector            # <— esto viene de mysql-connector-python
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "seguros_user")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_NAME", "insurance_db")

# Define la contraseña en texto plano que quieras para el admin
CONTRASEÑA_CLARA = "Admin1234"
pw_hash = generate_password_hash(CONTRASEÑA_CLARA)

# Conectar a MySQL
conn = mysql.connector.connect(
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASS,
    database=DB_NAME
)
cur = conn.cursor()

try:
    # Insertar un nuevo usuario con role_id = 1 (Admin)
    cur.execute(
        """
        INSERT INTO users (username, email, password_hash, role_id)
        VALUES (%s, %s, %s, %s)
        """,
        ("admin", "admin20@ejemplo.com", pw_hash, 1)
    )
    conn.commit()
    print("✅ Usuario ADMIN creado correctamente.")
    cur.execute("SELECT id, username, email, role_id FROM users WHERE username = 'admin'")
    print("Datos guardados:", cur.fetchone())
except mysql.connector.IntegrityError as e:
    print("❌ Error: quizás ya existía un usuario 'admin' o el email está repetido.")
    print("Detalle:", e)
finally:
    cur.close()
    conn.close()

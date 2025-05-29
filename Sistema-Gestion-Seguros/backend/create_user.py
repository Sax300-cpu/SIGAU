# backend/create_user.py

import os
from dotenv import load_dotenv
from flask import Flask
from models import init_db
from werkzeug.security import generate_password_hash

# 1) Carga .env
load_dotenv()

# 2) Crea la app y configura la BD igual que en app.py
app = Flask(__name__)
mysql = init_db(app)

def create_test_user():
    username = 'testuser'
    email    = 'testuser@example.com'
    password = 'MiPass123'
    role_id  = 1

    pw_hash = generate_password_hash(password)

    # 3) Aquí abrimos el cursor y ejecutamos la inserción
    cur = mysql.connection.cursor()
    cur.execute(
        "INSERT INTO users (username, email, password_hash, role_id) "
        "VALUES (%s, %s, %s, %s)",
        (username, email, pw_hash, role_id)
    )
    mysql.connection.commit()
    cur.close()
    print(f"✅ Usuario creado: {email} / {password}")

if __name__ == "__main__":
    # 4) Activamos el contexto de aplicación
    with app.app_context():
        create_test_user()

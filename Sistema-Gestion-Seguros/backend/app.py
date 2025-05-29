import os
from functools import wraps
from dotenv import load_dotenv
from flask import (
    Flask, render_template, request,
    redirect, url_for, flash, session, jsonify
)
from models import init_db
from werkzeug.security import check_password_hash, generate_password_hash

# Carga .env
load_dotenv()

app = Flask(
    __name__,
    static_folder="../static",
    template_folder="templates"
)
app.secret_key = os.getenv("SECRET_KEY")
mysql = init_db(app)

from flask import make_response

@app.after_request
def add_no_cache_headers(response):
    """
    Añade cabeceras para que el navegador no guarde
    en caché las páginas protegidas y siempre pida 
    de nuevo al servidor.
    """
    response.headers['Cache-Control'] = (
        'no-store, no-cache, must-revalidate, '
        'max-age=0, post-check=0, pre-check=0'
    )
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Decorador para proteger rutas solo a admins
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        if session.get('role_id') != 1:
            flash("Acceso denegado: sólo admins.", "danger")
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated

@app.route('/')
def home():
    return render_template('login-index.html')

@app.route('/login', methods=['GET','POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        email    = request.form['email']
        password = request.form['password']
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT id, password_hash, role_id FROM users WHERE email = %s",
            (email,)
        )
        fila = cur.fetchone()
        cur.close()
        if fila and check_password_hash(fila[1], password):
            session.clear()
            session['user_id'] = fila[0]
            session['role_id'] = fila[2]
            return redirect(url_for('dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')
    return render_template('login-index.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    # si es admin, llévalo al panel de admin
    if session.get('role_id') == 1:
        return redirect(url_for('admin_panel'))

    # para otros roles, mantén tu dashboard sencillo
    return render_template('dashboard.html')


@app.route('/logout')
def logout():
    session.clear()
    flash("Has cerrado sesión correctamente.", "info")
    return redirect(url_for('login'))

@app.route('/admin')
@admin_required
def admin_panel():
    return render_template('admin-index.html')

# 📋 API de usuarios
@app.route('/users', methods=['GET'])
@admin_required
def list_users():
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, username, email, role_id, created_at FROM users")
    users = [
        {"id": r[0], "username": r[1], "email": r[2],
         "role_id": r[3], "created_at": r[4].isoformat()}
        for r in cur.fetchall()
    ]
    cur.close()
    return jsonify(users)

@app.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    pw_hash = generate_password_hash(data['password'])
    cur = mysql.connection.cursor()
    cur.execute(
        "INSERT INTO users (username,email,password_hash,role_id) VALUES (%s,%s,%s,%s)",
        (data['username'], data['email'], pw_hash, data['role_id'])
    )
    mysql.connection.commit()
    new_id = cur.lastrowid
    cur.close()
    return jsonify({"id": new_id}), 201

@app.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    data = request.get_json()
    fields = []
    values = []
    if 'email' in data:
        fields.append("email=%s"); values.append(data['email'])
    if 'role_id' in data:
        fields.append("role_id=%s"); values.append(data['role_id'])
    if 'password' in data:
        fields.append("password_hash=%s")
        values.append(generate_password_hash(data['password']))
    values.append(user_id)
    sql = f"UPDATE users SET {', '.join(fields)} WHERE id=%s"
    cur = mysql.connection.cursor()
    cur.execute(sql, tuple(values))
    mysql.connection.commit()
    cur.close()
    return jsonify(success=True)

@app.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
    mysql.connection.commit()
    cur.close()
    return jsonify(success=True)

if __name__ == "__main__":
    app.run(debug=True)

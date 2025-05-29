from functools import wraps
from flask import jsonify

# Decorador para restringir a administradores
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        # Aquí podrías consultar el role_id real del user desde la BD
        # Si no es admin (role_id != 1), redirige o devuelve 403
        # Por simplicidad supongamos role_id en session
        if session.get('role_id') != 1:
            flash("Acceso denegado: sólo admins.", "danger")
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated

@app.route('/users', methods=['GET'])
@admin_required
def list_users():
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, username, email, role_id, created_at FROM users")
    rows = cur.fetchall()
    cur.close()
    users = [
      {"id": r[0], "username": r[1], "email": r[2],
       "role_id": r[3], "created_at": r[4].isoformat()}
      for r in rows
    ]
    return jsonify(users)

@app.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    # Aquí validarías data['username'], data['email'], data['password'], data['role_id']
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

# Rutas PUT /users/<id> y DELETE /users/<id> siguen la misma lógica…

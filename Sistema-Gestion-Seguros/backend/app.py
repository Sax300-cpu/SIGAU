import os
from functools import wraps
from dotenv import load_dotenv
from flask import (
    Flask, render_template, request,
    redirect, url_for, flash, session,
    jsonify
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

# Evitar cache para que BACK no deje páginas atrás de logout
@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = (
        'no-store, no-cache, must-revalidate, '
        'max-age=0, post-check=0, pre-check=0'
    )
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Decorador para rutas admin-only
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
            session['user_id']  = fila[0]
            session['role_id']  = fila[2]

            # Redirección por rol
            if fila[2] == 1:
                return redirect(url_for('admin_panel'))
            elif fila[2] == 2:
                return redirect(url_for('agente_panel'))
            elif fila[2] == 3:
                return redirect(url_for('client_panel'))

            return redirect(url_for('dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')

    return render_template('login-index.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    role = session.get('role_id')
    if role == 1:
        return redirect(url_for('admin_panel'))
    if role == 2:
        return redirect(url_for('agente_panel'))
    if role == 3:
        return redirect(url_for('client_panel'))
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.clear()
    flash("Has cerrado sesión correctamente.", "info")
    return redirect(url_for('login'))

@app.route('/admin')
@admin_required
def admin_panel():
    return render_template('admin-index.html')

@app.route('/agente')
def agente_panel():
    if 'user_id' not in session or session.get('role_id') != 2:
        return redirect(url_for('login'))
    return render_template('agente-Index.html')

@app.route('/client')
def client_panel():
    if 'user_id' not in session or session.get('role_id') != 3:
        return redirect(url_for('login'))
    return render_template('client-index.html')

# API de usuarios (admin only)
@app.route('/users', methods=['GET'])
@admin_required
def list_users():
    cur = mysql.connection.cursor()
    cur.execute(
        "SELECT id, username, email, role_id, created_at "
        "FROM users"
    )
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
        "INSERT INTO users "
        "(username,email,password_hash,role_id) "
        "VALUES (%s,%s,%s,%s)",
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
    fields, values = [], []
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
# ------------------------------
# RUTAS PARA “TIPOS DE PÓLIZA” (policy_types)
# ------------------------------

@app.route('/policy_types', methods=['GET'])
@admin_required
def list_policy_types():
    """
    Retorna todos los tipos de póliza (incluyendo cost, payment_frequency y status).
    Solo administradores pueden acceder.
    """
    cur = mysql.connection.cursor()
    cur.execute(
        """
        SELECT id, name, description, cost, payment_frequency, status
        FROM policy_types
        """
    )
    resultados = cur.fetchall()
    cur.close()

    lista = []
    for r in resultados:
        lista.append({
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "cost": float(r[3]),
            "payment_frequency": r[4],
            "status": r[5]
        })
    return jsonify(lista), 200


@app.route('/policy_types/<int:pt_id>', methods=['GET'])
@admin_required
def get_policy_type(pt_id):
    """
    Devuelve JSON con los datos de un tipo de póliza específico.
    """
    cur = mysql.connection.cursor()
    cur.execute(
        """
        SELECT id, name, description, cost, payment_frequency, status
        FROM policy_types
        WHERE id = %s
        """, (pt_id,)
    )
    r = cur.fetchone()
    cur.close()
    if not r:
        return jsonify({"error": "Tipo de póliza no encontrado"}), 404

    policy = {
        "id": r[0],
        "name": r[1],
        "description": r[2],
        "cost": float(r[3]),
        "payment_frequency": r[4],
        "status": r[5]
    }
    return jsonify(policy), 200


@app.route('/policy_types', methods=['POST'])
@admin_required
def create_policy_type():
    """
    Inserta un nuevo tipo de póliza en policy_types.
    JSON esperado:
      {
        "name": "...",
        "description": "...",
        "cost": 123.45,
        "payment_frequency": "Mensual",
        "status": "Activo"
      }
    Solo admin puede insertar.
    """
    data = request.get_json()
    # Validar campos mínimos
    if not data.get('name') or not data.get('description'):
        return jsonify({"error": "Faltan 'name' o 'description'"}), 400
    try:
        cost = float(data.get('cost', 0))
    except:
        return jsonify({"error": "Costo inválido"}), 400

    payment = data.get('payment_frequency', '').strip()
    status  = data.get('status', '').strip()
    if payment not in ('Mensual', 'Trimestral', 'Anual'):
        return jsonify({"error": "Frecuencia de pago inválida"}), 400
    if status not in ('Activo', 'Inactivo'):
        return jsonify({"error": "Estado inválido"}), 400

    name        = data['name'].strip()
    description = data['description'].strip()

    try:
        cur = mysql.connection.cursor()
        cur.execute(
            """
            INSERT INTO policy_types
              (name, description, cost, payment_frequency, status)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (name, description, cost, payment, status)
        )
        mysql.connection.commit()
        new_id = cur.lastrowid
        cur.close()
        return jsonify({"id": new_id, "message": "Tipo de póliza creado"}), 201

    except Exception as e:
        print("Error al insertar policy_types:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/policy_types/<int:pt_id>', methods=['PUT'])
@admin_required
def update_policy_type(pt_id):
    """
    Actualiza un tipo de póliza existente.
    JSON esperado, al menos uno de:
      {
        "name": "...",             # opcional
        "description": "...",      # opcional
        "cost": 123.45,            # opcional
        "payment_frequency": "Mensual",  # opcional
        "status": "Activo"         # opcional
      }
    """
    data = request.get_json()
    campos = []
    valores = []

    if 'name' in data:
        campos.append("name = %s")
        valores.append(data['name'].strip())

    if 'description' in data:
        campos.append("description = %s")
        valores.append(data['description'].strip())

    if 'cost' in data:
        try:
            c = float(data['cost'])
        except:
            return jsonify({"error": "Costo inválido"}), 400
        campos.append("cost = %s")
        valores.append(c)

    if 'payment_frequency' in data:
        pf = data['payment_frequency'].strip()
        if pf not in ('Mensual','Trimestral','Anual'):
            return jsonify({"error": "Frecuencia de pago inválida"}), 400
        campos.append("payment_frequency = %s")
        valores.append(pf)

    if 'status' in data:
        st = data['status'].strip()
        if st not in ('Activo','Inactivo'):
            return jsonify({"error": "Estado inválido"}), 400
        campos.append("status = %s")
        valores.append(st)

    if not campos:
        return jsonify({"error": "No hay campos para actualizar"}), 400

    valores.append(pt_id)
    sql = f"UPDATE policy_types SET {', '.join(campos)} WHERE id = %s"

    try:
        cur = mysql.connection.cursor()
        cur.execute(sql, tuple(valores))
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Tipo de póliza actualizado"}), 200

    except Exception as e:
        print("Error al actualizar policy_types:", e)
        return jsonify({"error": str(e)}), 500


@app.route('/policy_types/<int:pt_id>', methods=['DELETE'])
@admin_required
def delete_policy_type(pt_id):
    """
    Elimina un tipo de póliza por su ID.
    """
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM policy_types WHERE id = %s", (pt_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Tipo de póliza eliminado"}), 200
    except Exception as e:
        print("Error al eliminar policy_types:", e)
        return jsonify({"error": str(e)}), 500


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
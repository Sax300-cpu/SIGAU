import os
import re
from functools import wraps
from dotenv import load_dotenv
from flask import (
    Flask, render_template, request,
    redirect, url_for, flash, session,
    jsonify
)
from models import init_db
from werkzeug.security import check_password_hash, generate_password_hash

# ===================================
# Carga de configuración y BD
# ===================================
load_dotenv()

app = Flask(
    __name__,
    static_folder="../static",
    template_folder="templates"
)
app.secret_key = os.getenv("SECRET_KEY")
app.config['MYSQL_HOST']     = os.getenv('DB_HOST', 'db')
app.config['MYSQL_USER']     = os.getenv('DB_USER')
app.config['MYSQL_PASSWORD'] = os.getenv('DB_PASSWORD')
app.config['MYSQL_DB']       = os.getenv('DB_NAME')
mysql = init_db(app)

# ===================================
# DECORADORES
# ===================================

# Evitar cache tras logout
@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = (
        'no-store, no-cache, must-revalidate, '
        'max-age=0, post-check=0, pre-check=0'
    )
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Solo Admin puede acceder
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        if session.get('role_id') != 1:  # 1 = Admin
            flash("Acceso denegado: sólo administradores.", "danger")
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated

# Cualquier usuario logueado puede acceder
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

# ===================================
# RUTAS DE AUTENTICACIÓN / PÁGINAS
# ===================================

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
            "SELECT id, password_hash, role_id, username FROM users WHERE email = %s",
            (email,)
        )
        fila = cur.fetchone()
        cur.close()

        if fila and check_password_hash(fila[1], password):
            session.clear()
            session['user_id']   = fila[0]
            session['role_id']   = fila[2]
            session['username']  = fila[3]  # Para mostrar en sidebar

            # Redirigir según rol
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

# ===================================
# PANELES POR ROL
# ===================================

@app.route('/admin')
@admin_required
def admin_panel():
    # Aquí está tu admin-index.html, que incluye la sección de Gestión de Usuarios
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
    return render_template('client-Index.html')

# ===================================
# API DE USUARIOS (Solo Admin)
# ===================================

@app.route('/users', methods=['GET'])
@admin_required
def list_users():
    """
    Devuelve JSON con todos los usuarios (para el Admin).
    Tu admin-index.html debe hacer fetch('/users') y mostrarlos.
    """
    cur = mysql.connection.cursor()
    cur.execute(
        "SELECT id, username, email, role_id, created_at FROM users"
    )
    users = [
        {
            "id": r[0],
            "username": r[1],
            "email": r[2],
            "role_id": r[3],
            "created_at": r[4].isoformat()
        }
        for r in cur.fetchall()
    ]
    cur.close()
    return jsonify(users), 200

@app.route('/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    print("Datos recibidos en backend:", data)  # Log de datos recibidos
    try:
        username = data['username']
        email = data['email']
        password = data['password']
        role_id = data['role_id']

        pw_hash = generate_password_hash(password)
        cur = mysql.connection.cursor()
        cur.execute(
            "INSERT INTO users (username,email,password_hash,role_id) VALUES (%s,%s,%s,%s)",
            (username, email, pw_hash, role_id)
        )
        mysql.connection.commit()
        new_id = cur.lastrowid
        cur.close()
        print("Usuario creado con ID:", new_id)
        return jsonify({"id": new_id}), 201
    except Exception as e:
        print("Error al crear usuario:", str(e))  # Log del error exacto
        return jsonify({"error": str(e)}), 500



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
    return jsonify(success=True), 200

@app.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
    mysql.connection.commit()
    cur.close()
    return jsonify(success=True), 200

# ===================================
# API de CLIENTES (para Agente)
# ===================================

@app.route('/clients', methods=['GET'])
@login_required
def list_clients():
    """
    Devuelve JSON con todos los usuarios que tengan role_id = 3 (Clientes).
    Cualquiera que esté logueado (incluido el Agente) puede ver esta lista.
    """
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT id, username, email 
        FROM users 
        WHERE role_id = 3
        ORDER BY username ASC
    """)
    rows = cur.fetchall()
    cur.close()

    clientes = [
        {
            "id":    r[0],
            "name":  r[1],
            "email": r[2]
        }
        for r in rows
    ]
    return jsonify(clientes), 200

# ===================================
# API de TIPOS DE PÓLIZA (policy_types)
# ===================================

@app.route('/policy_types', methods=['GET'])
@login_required   # Ya no es @admin_required: cualquier usuario autenticado puede consultar el catálogo
def list_policy_types():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT id, name, description, cost, payment_frequency, status
        FROM policy_types
    """)
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
@login_required
def get_policy_type(pt_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT id, name, description, cost, payment_frequency, status
        FROM policy_types
        WHERE id = %s
    """, (pt_id,))
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
    data = request.get_json()
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
    try:
        cur = mysql.connection.cursor()
        cur.execute("DELETE FROM policy_types WHERE id = %s", (pt_id,))
        mysql.connection.commit()
        cur.close()
        return jsonify({"message": "Tipo de póliza eliminado"}), 200
    except Exception as e:
        print("Error al eliminar policy_types:", e)
        return jsonify({"error": str(e)}), 500

# =========================================
# API de PÓLIZAS (policies)
# =========================================

@app.route('/policies', methods=['GET'])
@admin_required
def list_policies():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT
          p.id,
          p.name          AS policy_name,
          pt.id           AS type_id,
          pt.name         AS type_name,
          pt.description  AS benefits,
          p.coverage_details,
          p.premium_amount,
          p.payment_frequency,
          p.status
        FROM policies p
        JOIN policy_types pt ON p.type_id = pt.id
        ORDER BY p.id ASC
    """)
    rows = cur.fetchall()
    cur.close()

    policies = []
    for r in rows:
        policies.append({
            "id":                r[0],
            "name":              r[1],
            "type_id":           r[2],
            "type_name":         r[3],
            "benefits":          r[4] or "",
            "coverage_details":  r[5] or "",
            "premium_amount":    float(r[6]),
            "payment_frequency": r[7],
            "status":            r[8]
        })
    return jsonify(policies), 200

@app.route('/policies', methods=['POST'])
@login_required   # Cualquiera autenticado (Admin, Agente o Cliente) puede crear
def create_policy():
    """
    Crea una nueva póliza. 
    - Si role_id == 3 (Cliente): se asocia client_id = session['user_id'].
    - Si role_id == 2 (Agente): espera client_id en el payload y asocia agent_id = session['user_id'].
    - Si role_id == 1 (Admin): puede omitir client_id (o enviar uno explícitamente).
    """
    data = request.get_json()

    name           = data.get('name', '').strip()
    raw_type_name  = data.get('type_name', '').strip()
    client_id_sel  = data.get('client_id')    # Solo para Agente
    coverage       = data.get('coverage', '').strip()
    benefits       = data.get('benefits', '').strip()
    premium_amount = data.get('premium_amount')
    payment_freq   = data.get('payment_frequency', '').strip()
    status         = data.get('status', 'inactive').strip()

    # — Validaciones mínimas (backend) —
    if not name:
        return jsonify({"error": "El nombre de la póliza es obligatorio."}), 400

    # Validar que el nombre solo contenga letras y espacios
    if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$', name):
        return jsonify({"error": "El nombre del seguro no puede contener números ni caracteres especiales."}), 400

    # Normalizar raw_type_name (quitar “Seguro de ” si existe)
    if raw_type_name.startswith('Seguro de '):
        type_name = raw_type_name.replace('Seguro de ', '').strip()
    else:
        type_name = raw_type_name

    if not coverage:
        return jsonify({"error": "La cobertura es obligatoria."}), 400
    if not benefits:
        return jsonify({"error": "Los beneficios son obligatorios."}), 400

    try:
        amt = float(premium_amount)
        if amt <= 0:
            raise ValueError
    except:
        return jsonify({"error": "El monto de la prima debe ser número mayor a cero."}), 400

    if payment_freq not in ('Mensual', 'Trimestral', 'Anual'):
        return jsonify({"error": "Frecuencia de pago no válida."}), 400
    if status not in ('active', 'inactive', 'pending', 'cancelled', 'expired'):
        return jsonify({"error": "Estado no válido."}), 400

    # 1) Obtener type_id a partir de type_name
    cur = mysql.connection.cursor()
    cur.execute("SELECT id FROM policy_types WHERE name = %s", (type_name,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": f"El tipo de póliza '{raw_type_name}' no existe"}), 400
    type_id = row[0]

    # 2) Determinar client_id y agent_id según el rol
    user_id = session.get('user_id')
    role_id = session.get('role_id')

    client_id = None
    agent_id  = None

    if role_id == 3:
        # Cliente → client_id = su propio user_id
        client_id = user_id
    elif role_id == 2:
        # Agente → debe venir client_id_sel
        if not client_id_sel:
            cur.close()
            return jsonify({"error": "El Agente debe escoger un client_id."}), 400
        client_id = client_id_sel
        agent_id  = user_id
    elif role_id == 1:
        # Admin → por defecto deja ambos en NULL (o el Admin puede enviar client_id si quiere)
        client_id = data.get('client_id')  # Opcional: si envía, lo usa
        agent_id  = None
    else:
        cur.close()
        return jsonify({"error": "Rol no válido para crear pólizas."}), 403

    # 3) Insertar en la tabla policies
    start_date = '2025-01-01'
    end_date   = '2025-12-31'
    cur.execute(
        """
        INSERT INTO policies
          (client_id, agent_id, name, type_id, coverage_details, benefits, premium_amount, payment_frequency, start_date, end_date, status)
        VALUES
          (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
          client_id,
          agent_id,
          name,
          type_id,
          coverage,
          benefits,
          amt,
          payment_freq,
          start_date,
          end_date,
          status
        )
    )
    new_id = cur.lastrowid
    mysql.connection.commit()
    cur.close()

    return jsonify({"id": new_id}), 201

@app.route('/policies/<int:policy_id>', methods=['GET'])
@admin_required
def get_policy(policy_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT
          p.id,
          p.name          AS policy_name,
          pt.id           AS type_id,
          pt.name         AS type_name,
          pt.description  AS benefits,
          p.coverage_details,
          p.premium_amount,
          p.payment_frequency,
          p.status
        FROM policies p
        JOIN policy_types pt ON p.type_id = pt.id
        WHERE p.id = %s
    """, (policy_id,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return jsonify({"error": "Póliza no encontrada"}), 404

    policy = {
        "id":                row[0],
        "name":              row[1],
        "type_id":           row[2],
        "type_name":         row[3],
        "benefits":          row[4] or "",
        "coverage_details":  row[5] or "",
        "premium_amount":    float(row[6]),
        "payment_frequency": row[7],
        "status":            row[8]
    }
    return jsonify(policy), 200

@app.route('/policies/<int:policy_id>', methods=['PUT'])
@admin_required
def update_policy(policy_id):
    data = request.get_json()

    name           = data.get('name', '').strip()
    type_name      = data.get('type_name', '').strip()
    coverage       = data.get('coverage', '').strip()
    benefits       = data.get('benefits', '').strip()
    premium_amount = data.get('premium_amount')
    payment_freq   = data.get('payment_frequency', '').strip()
    status         = data.get('status', 'inactive').strip()

    # — Validaciones mínimas (backend) —
    if not name:
        return jsonify({"error": "El nombre de la póliza es obligatorio."}), 400

    # Validar que el nombre sólo contenga letras y espacios
    if not re.match(r'^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$', name):
        return jsonify({"error": "El nombre del seguro no puede contener números ni caracteres especiales."}), 400

    if not type_name:
        return jsonify({"error": "Debe indicar un tipo de póliza."}), 400
    if not coverage:
        return jsonify({"error": "La cobertura es obligatoria."}), 400
    if not benefits:
        return jsonify({"error": "Los beneficios son obligatorios."}), 400
    try:
        amt = float(premium_amount)
        if amt <= 0:
            raise ValueError
    except:
        return jsonify({"error": "El costo debe ser número mayor a cero."}), 400

    if payment_freq not in ('Mensual','Trimestral','Anual'):
        return jsonify({"error": "Frecuencia de pago no válida."}), 400
    if status not in ('active','inactive','pending','cancelled','expired'):
        return jsonify({"error": "Estado no válido."}), 400

    # Obtener type_id a partir de type_name
    cur = mysql.connection.cursor()
    cur.execute("SELECT id FROM policy_types WHERE name = %s", (type_name,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({"error": f"El tipo de póliza '{type_name}' no existe"}), 400
    type_id = row[0]

    # Actualizar la póliza, incluyendo payment_frequency
    cur.execute(
        """
        UPDATE policies SET
          name               = %s,
          type_id            = %s,
          coverage_details   = %s,
          benefits           = %s,
          premium_amount     = %s,
          payment_frequency  = %s,
          status             = %s
        WHERE id = %s
        """,
        (name, type_id, coverage, benefits, amt, payment_freq, status, policy_id)
    )
    mysql.connection.commit()
    cur.close()
    return jsonify({"success": True}), 200

@app.route('/policies/<int:policy_id>', methods=['DELETE'])
@admin_required
def delete_policy(policy_id):
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM policies WHERE id = %s", (policy_id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({"success": True}), 200

# ===================================
# FIN RUTAS
# ===================================

if __name__ == "__main__":
    app.run(debug=True)

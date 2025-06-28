import os
import re
from functools import wraps
from dotenv import load_dotenv
from flask import (
    Flask, render_template, request,
    redirect, url_for, flash, session,
    jsonify, send_from_directory
)
from models import init_db
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
import time
import io
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from PIL import Image

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


# Carpeta raíz de tu proyecto
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Directorio donde guardaremos subcarpetas por contratosw
UPLOAD_ROOT = os.path.join(BASE_DIR, 'uploads', 'contracts')
os.makedirs(UPLOAD_ROOT, exist_ok=True)

# Configuración para uploads
app.config['UPLOAD_FOLDER'] = UPLOAD_ROOT
app.config['ALLOWED_EXTENSIONS'] = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Crear directorio de uploads si no existe
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Función de validación
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

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
    try:
        # Obtener los tipos de póliza para el select
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT id, name, description, cost, payment_frequency, status 
            FROM policy_types 
            WHERE status = 'Activo'
            ORDER BY name
        """)
        policy_types = cur.fetchall()
        cur.close()
        
        # Convertir los resultados a una lista de diccionarios
        policy_types = [
            {
                'id': pt[0],
                'name': pt[1],
                'description': pt[2],
                'cost': float(pt[3]) if pt[3] else 0,
                'payment_frequency': pt[4],
                'status': pt[5]
            } 
            for pt in policy_types
        ]
        
        return render_template('admin-Index.html', policy_types=policy_types)
    except Exception as e:
        print("Error al cargar tipos de póliza:", str(e))
        return render_template('admin-Index.html', policy_types=[])

@app.route('/agente')
def agente_panel():
    if 'user_id' not in session or session.get('role_id') != 2:
        return redirect(url_for('login'))
    return render_template('agente-Index.html')

@app.route('/client')
def client_panel():
    if 'user_id' not in session or session.get('role_id') != 3:
        return redirect(url_for('login'))
    # 1. Obtengo el client_id relacionado a este user_id
    cur = mysql.connection.cursor()
    cur.execute("SELECT id FROM clients WHERE user_id = %s", (session['user_id'],))
    row = cur.fetchone()
    client_id = row[0] if row else None

    # 2. Traigo sus contratos (sin filtrar por estado)
    contracts = []
    if client_id:
        cur.execute("""
            SELECT cp.id, p.name, cp.premium_amount, cp.payment_frequency, cp.status
            FROM client_policies cp
            JOIN policies p ON cp.policy_id = p.id
            WHERE cp.client_id = %s
            ORDER BY cp.created_at DESC
        """, (client_id,))
        contracts = [
            {
              'id':    r[0],
              'name':  r[1],
              'amount': float(r[2]),
              'freq':  r[3],
              'status': r[4]
            } for r in cur.fetchall()
        ]
    cur.close()

    return render_template('client-Index.html', contracts=contracts)

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
        # Validar campos obligatorios
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        role_id = data.get('role_id')
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()

        if not username or not email or not password or not role_id:
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        # Solo exigir nombre y apellido para clientes
        if int(role_id) == 3 and (not first_name or not last_name):
            return jsonify({"error": "Nombre y apellido son obligatorios para clientes"}), 400

        pw_hash = generate_password_hash(password)
        cur = mysql.connection.cursor()
        
        try:
            # Insertar usuario
            cur.execute(
                "INSERT INTO users (username, email, password_hash, role_id) VALUES (%s, %s, %s, %s)",
                (username, email, pw_hash, role_id)
            )
            mysql.connection.commit()
            new_id = cur.lastrowid

            # Si es cliente, insertar datos adicionales
            if int(role_id) == 3:
                dob = data.get('dob')
                phone = data.get('phone', '').strip()
                address = data.get('address', '').strip()

                if not dob:
                    mysql.connection.rollback()
                    return jsonify({"error": "Fecha de nacimiento es obligatoria para clientes"}), 400

                cur.execute(
                    "INSERT INTO clients (user_id, first_name, last_name, dob, phone, address) VALUES (%s, %s, %s, %s, %s, %s)",
                    (new_id, first_name, last_name, dob, phone, address)
                )
                mysql.connection.commit()

            cur.close()
            print("Usuario creado con ID:", new_id)
            return jsonify({"id": new_id}), 201

        except Exception as e:
            mysql.connection.rollback()
            cur.close()
            print("Error al crear usuario:", str(e))
            return jsonify({"error": str(e)}), 500

    except Exception as e:
        print("Error al procesar la solicitud:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    cur = mysql.connection.cursor()
    # Obtener datos básicos del usuario
    cur.execute("""
        SELECT u.id, u.username, u.email, u.role_id, 
               c.first_name, c.last_name, c.dob, c.phone, c.address
        FROM users u
        LEFT JOIN clients c ON u.id = c.user_id
        WHERE u.id = %s
    """, (user_id,))
    row = cur.fetchone()
    cur.close()
    
    if not row:
        return jsonify({"error": "Usuario no encontrado"}), 404
        
    user = {
        "id": row[0],
        "username": row[1],
        "email": row[2],
        "role_id": row[3],
        "first_name": row[4],
        "last_name": row[5],
        "dob": row[6],
        "phone": row[7],
        "address": row[8]
    }
    return jsonify(user), 200

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
    cur = mysql.connection.cursor()
    if session.get('role_id') == 2:  # Agente
        cur.execute("""
            SELECT
              c.id AS id,
              u.username AS username,
              u.email AS email
            FROM clients c
            JOIN users u ON u.id = c.user_id
            WHERE u.role_id = 3 AND c.agent_id = %s
            ORDER BY u.username ASC
        """, (session['user_id'],))
    else:  # Admin u otro
        cur.execute("""
            SELECT
              c.id AS id,
              u.username AS username,
              u.email AS email
            FROM clients c
            JOIN users u ON u.id = c.user_id
            WHERE u.role_id = 3
            ORDER BY u.username ASC
        """)
    rows = cur.fetchall()
    cur.close()

    clientes = [
        {"id": r[0], "name": r[1], "email": r[2]}
        for r in rows
    ]
    return jsonify(clientes), 200

@app.route('/clients', methods=['POST'])
@login_required
def create_client():
    data = request.get_json()
    # Validar campos requeridos
    required_fields = ['first_name', 'last_name', 'email', 'username', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Campo requerido: {field}'}), 400

    # Determinar el agente asignado
    if session.get('role_id') == 1:  # Admin
        agent_id = data.get('agent_id')
        if not agent_id:
            return jsonify({'error': 'Debe seleccionar un agente para el cliente'}), 400
    elif session.get('role_id') == 2:  # Agente
        agent_id = session['user_id']
    else:
        return jsonify({'error': 'No autorizado'}), 403

    # Campos adicionales
    dob = data.get('dob')
    phone = data.get('phone')
    address = data.get('address')

    # Crear usuario
    cur = mysql.connection.cursor()
    try:
        # Insertar en users
        cur.execute("""
            INSERT INTO users (username, email, password_hash, role_id)
            VALUES (%s, %s, %s, 3)
        """, (
            data['username'],
            data['email'],
            generate_password_hash(data['password']),
        ))
        user_id = cur.lastrowid

        # Insertar en clients
        cur.execute("""
            INSERT INTO clients (user_id, first_name, last_name, dob, phone, address, agent_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            data['first_name'],
            data['last_name'],
            dob,
            phone,
            address,
            agent_id
        ))
        mysql.connection.commit()
        return jsonify({'success': True, 'message': 'Cliente creado correctamente.'}), 201
    except Exception as e:
        mysql.connection.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

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
@login_required
def get_policies():
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT p.id, p.name, pt.name as type_name, p.coverage_details, 
                   p.benefits, p.premium_amount, p.payment_frequency, p.insured_amount, p.payment_method, p.status
            FROM policies p
            JOIN policy_types pt ON p.type_id = pt.id
            ORDER BY p.id DESC
        """)
        policies = cur.fetchall()
        cur.close()

        return jsonify([{
            'id': p[0],
            'name': p[1],
            'type_name': p[2],
            'coverage_details': p[3],
            'benefits': p[4],
            'premium_amount': float(p[5]),
            'payment_frequency': p[6],
            'insured_amount': float(p[7]) if p[7] is not None else None,
            'payment_method': p[8],
            'status': p[9]
        } for p in policies])

    except Exception as e:
        print("Error al obtener pólizas:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/policies', methods=['POST'])
@admin_required
def create_policy():
    try:
        data = request.get_json()
        
        # Validar datos requeridos
        required_fields = ['name', 'type_id', 'coverage', 'benefits', 'premium_amount', 'payment_frequency']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400

        cur = mysql.connection.cursor()
        
        # Insertar la póliza
        cur.execute("""
            INSERT INTO policies (
                name, type_id, coverage_details, benefits,
                premium_amount, payment_frequency, insured_amount, payment_method, status,
                start_date, end_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
        """, (
            data['name'],
            data['type_id'],
            data['coverage'],
            data['benefits'],
            data['premium_amount'],
            data['payment_frequency'],
            data.get('insured_amount'),
            data.get('payment_method'),
            data.get('status', 'pending')
        ))
        
        mysql.connection.commit()
        new_policy_id = cur.lastrowid
        cur.close()
        
        return jsonify({'id': new_policy_id}), 201
        
    except Exception as e:
        print("Error al crear póliza:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/policies/<int:policy_id>', methods=['GET'])
@login_required
def get_policy(policy_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT
          p.id,
          p.name          AS policy_name,
          pt.id           AS type_id,
          pt.name         AS type_name,
          p.benefits      AS benefits,
          p.coverage_details,
          p.premium_amount,
          p.payment_frequency,
          p.insured_amount,
          p.payment_method,
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
        "insured_amount":    float(row[8]) if row[8] is not None else None,
        "payment_method":    row[9],
        "status":            row[10]
    }
    return jsonify(policy), 200

@app.route('/policies/<int:policy_id>', methods=['PUT'])
@admin_required
def update_policy(policy_id):
    try:
        data = request.get_json()
        
        # Validar datos requeridos
        required_fields = ['name', 'type_id', 'coverage', 'benefits', 'premium_amount', 'payment_frequency']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo requerido: {field}'}), 400

        cur = mysql.connection.cursor()
        
        # Actualizar la póliza
        cur.execute("""
            UPDATE policies 
            SET name = %s,
                type_id = %s,
                coverage_details = %s,
                benefits = %s,
                premium_amount = %s,
                payment_frequency = %s,
                insured_amount = %s,
                payment_method = %s,
                status = %s
            WHERE id = %s
        """, (
            data['name'],
            data['type_id'],
            data['coverage'],
            data['benefits'],
            data['premium_amount'],
            data['payment_frequency'],
            data.get('insured_amount'),
            data.get('payment_method'),
            data.get('status', 'pending'),
            policy_id
        ))
        
        mysql.connection.commit()
        cur.close()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print("Error al actualizar póliza:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/policies/<int:policy_id>', methods=['DELETE'])
@admin_required
def delete_policy(policy_id):
    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM policies WHERE id = %s", (policy_id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({"success": True}), 200

@app.route('/contracts', methods=['POST'])
@login_required
def create_contract():
    # para ver exactamente qué campos y archivos estás recibiendo:
    print("DEBUG form keys:", request.form.to_dict(flat=False))
    print("DEBUG files:", request.files)
    
    try:
        # Verificar que el usuario es agente
        if session.get('role_id') != 2:
            return jsonify({'error': 'Solo los agentes pueden crear contratos'}), 403

        # Obtener datos básicos del formulario
        data = request.form
        client_id = data.get('client_id')
        policy_id = data.get('policy_id')
        premium_amount = data.get('premium_amount')
        payment_frequency = data.get('payment_frequency')

        if not all([client_id, policy_id, premium_amount, payment_frequency]):
            return jsonify({'error': 'Faltan campos requeridos'}), 400

        # Obtener beneficiarios
        beneficiarios = []
        i = 0
        while f'beneficiarios[{i}][name]' in data:
            beneficiarios.append({
                'name': data[f'beneficiarios[{i}][name]'],
                'relationship': data[f'beneficiarios[{i}][relationship]'],
                'percentage': float(data[f'beneficiarios[{i}][percentage]'])
            })
            i += 1

        # --- DEBUG ANTES DE INSERTAR BENEFICIARIOS ---
        print("--- REQUEST.FORM ---")
        print(request.form.to_dict(flat=False))
        print("--- REQUEST.FILES ---")
        print(request.files)
        # pausa aquí antes de procesar beneficiarios
        # ...

        # Verificar porcentaje de beneficiarios
        if beneficiarios:
            total = sum(b['percentage'] for b in beneficiarios)
            if abs(total - 100) > 0.01:
                return jsonify({'error': 'La suma de porcentajes debe ser exactamente 100%'}), 400

        cur = mysql.connection.cursor()

        # 1. Crear el contrato
        cur.execute("""
            INSERT INTO client_policies 
            (client_id, policy_id, agent_id, premium_amount, payment_frequency, start_date, end_date, status)
            VALUES (%s, %s, %s, %s, %s, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'active')
        """, (client_id, policy_id, session['user_id'], premium_amount, payment_frequency))
        
        contract_id = cur.lastrowid
        mysql.connection.commit()  # Commit tras crear el contrato y obtener el ID

        # === INSERTAR BENEFICIARIOS ===
        import re
        from collections import defaultdict
        ben_data = defaultdict(dict)
        for key, vals in request.form.to_dict(flat=False).items():
            m = re.match(r'beneficiarios\[(\d+)\]\[(\w+)\]', key)
            if m:
                idx, field = m.groups()
                ben_data[idx][field] = vals[0]
        for idx, ben in ben_data.items():
            cur.execute("""
                INSERT INTO beneficiaries
                  (contract_id, name, relationship, percentage)
                VALUES (%s, %s, %s, %s)
            """, (
                contract_id,
                ben.get('name'),
                ben.get('relationship'),
                float(ben.get('percentage'))
            ))
        mysql.connection.commit()
        # === FIN INSERTAR BENEFICIARIOS ===

        # 1) Creamos carpeta específica para este contrato
        contract_folder = os.path.join(app.config['UPLOAD_FOLDER'], str(contract_id))
        os.makedirs(contract_folder, exist_ok=True)

        # 2) Recorremos los archivos subidos en el campo 'documents'
        for f in request.files.getlist('documents'):
            if f.filename:
                filename = secure_filename(f.filename)
                save_path = os.path.join(contract_folder, filename)
                f.save(save_path)

                # 3) Registramos en la tabla documents
                cur.execute("""
                    INSERT INTO documents (contract_id, file_path)
                    VALUES (%s, %s)
                """, (contract_id, filename))

        # 4) Commit final con los inserts de documentos
        mysql.connection.commit()

        # --- Guardar datos adicionales en extra_data ---
        extra_fields = [
            # Vida
            'estado_civil', 'sexo', 'ocupacion', 'nacionalidad', 'altura', 'peso',
            'enfermedades_cronicas', 'fuma_alcohol', 'medicamentos', 'hospitalizado', 'cirugias',
            # Salud
            'alergias_conocidas', 'sexo_salud', 'enfermedades_previas', 'hospitalizado_salud', 'tratamiento_actual', 'embarazada',
            # Contacto de emergencia (Salud)
            'emergencia_nombre', 'emergencia_relacion', 'emergencia_telefono'
        ]
        extra_data = {field: data.get(field) for field in extra_fields if data.get(field) is not None and data.get(field) != ''}

        # === GUARDAR DATOS EXTRA EN TABLA SEPARADA ===
        # extra_data ya contiene solo los campos con valor
        for key, value in extra_data.items():
            cur.execute(
                """
                INSERT INTO client_policy_extra_data (contract_id, field_name, field_value)
                VALUES (%s, %s, %s)
                """,
                (contract_id, key, value)
            )
        mysql.connection.commit()
        # === FIN DATOS EXTRA ===

        cur.close()
        return jsonify({
            'success': True,
            'contract_id': contract_id,
            'message': 'Contrato creado exitosamente',
            'beneficiarios_count': len(beneficiarios),
            'documentos_count': len(request.files.getlist('documents')) if 'documents' in request.files else 0,
            'extra_data': extra_data
        }), 201

    except Exception as e:
        mysql.connection.rollback()
        print("Error al crear contrato:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/contracts/<int:contract_id>')
@login_required
def get_contract(contract_id):
    cur = mysql.connection.cursor()
    # 1) Traer datos principales con JOIN
    cur.execute("""
        SELECT 
            c.first_name, c.last_name,
            p.name AS policy_name,
            cp.premium_amount,
            cp.payment_frequency,
            cp.status
        FROM client_policies cp
        JOIN clients c ON cp.client_id = c.id
        JOIN policies p ON cp.policy_id = p.id
        WHERE cp.id = %s
    """, (contract_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return jsonify({'error': 'Contrato no encontrado'}), 404

    client_name     = f"{row[0]} {row[1]}"
    policy_name     = row[2]
    premium_amount  = float(row[3])
    payment_frequency = row[4]
    status          = row[5]

    # 2) Beneficiarios
    cur.execute("""
        SELECT name, relationship, percentage 
        FROM beneficiaries 
        WHERE contract_id = %s
    """, (contract_id,))
    beneficiaries = [
        {'name': b[0], 'relationship': b[1], 'percentage': float(b[2])}
        for b in cur.fetchall()
    ]

    # 3) Documentos
    cur.execute("""
        SELECT file_path 
        FROM documents 
        WHERE contract_id = %s
    """, (contract_id,))
    documents = [
        {'filename': d[0], 
         'url': url_for('serve_doc', contract_id=contract_id, filename=d[0])}
        for d in cur.fetchall()
    ]

    cur.close()
    # 4) Responder con los campos directos que tu JS espera
    return jsonify({
        'client_name': client_name,
        'policy_name': policy_name,
        'premium_amount': premium_amount,
        'payment_frequency': payment_frequency,
        'status': status,
        'beneficiaries': beneficiaries,
        'documents': documents
    })

def add_signature_to_pdf(pdf_path, signature_path, output_path):
    reader = PdfReader(pdf_path)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    # --- Convertir la firma a fondo blanco ---
    with Image.open(signature_path) as im:
        if im.mode in ('RGBA', 'LA'):
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[3])  # 3 es el canal alpha
            temp_signature_path = signature_path + "_whitebg.png"
            bg.save(temp_signature_path, "PNG")
            signature_to_use = temp_signature_path
        else:
            signature_to_use = signature_path

    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=letter)
    can.drawString(100, 100, "Firma del cliente:")
    can.drawImage(ImageReader(signature_to_use), 200, 80, width=150, height=50)
    can.save()
    packet.seek(0)

    signature_pdf = PdfReader(packet)
    writer.add_page(signature_pdf.pages[0])

    with open(output_path, 'wb') as f:
        writer.write(f)

    # Opcional: borrar el archivo temporal
    if 'temp_signature_path' in locals():
        os.remove(temp_signature_path)

@app.route('/contracts/<int:contract_id>/upload_docs', methods=['POST'])
@login_required
def upload_docs(contract_id):
    cur = mysql.connection.cursor()
    # Carpeta
    folder = os.path.join(app.config['UPLOAD_FOLDER'], str(contract_id))
    os.makedirs(folder, exist_ok=True)

    # Variables para saber si hay PDF y firma
    pdf_path = None
    signature_path = None

    # Archivos
    for f in request.files.getlist('documents'):
        if f.filename:
            fname = secure_filename(f.filename)
            save_path = os.path.join(folder, fname)
            f.save(save_path)
            cur.execute("INSERT INTO documents (contract_id, file_path) VALUES (%s,%s)",
                        (contract_id, fname))
            # Si es PDF, lo guardamos para unir la firma
            if fname.lower().endswith('.pdf'):
                pdf_path = save_path

    # Firma
    sig = request.files.get('signature')
    if sig:
        fname = f"firma_{int(time.time())}.png"
        sig_path = os.path.join(folder, fname)
        sig.save(sig_path)
        cur.execute("INSERT INTO documents (contract_id, file_path) VALUES (%s,%s)",
                    (contract_id, fname))
        signature_path = sig_path

    # Si hay PDF y firma, unirlos
    if pdf_path and signature_path:
        output_path = os.path.join(folder, 'documento_firmado.pdf')
        add_signature_to_pdf(pdf_path, signature_path, output_path)
        # Registrar el PDF firmado en la base de datos
        cur.execute("INSERT INTO documents (contract_id, file_path) VALUES (%s,%s)",
                    (contract_id, 'documento_firmado.pdf'))

    mysql.connection.commit()
    cur.close()
    return ('', 204)

@app.route('/contracts/<int:contract_id>/docs/<filename>')
@login_required
def serve_doc(contract_id, filename):
    folder = os.path.join(app.config['UPLOAD_FOLDER'], str(contract_id))
    return send_from_directory(folder, filename)

@app.route('/contracts/<int:contract_id>/status', methods=['PUT'])
@login_required
def update_contract_status(contract_id):
    # Solo agentes pueden cambiar el estado
    if session.get('role_id') != 2:
        return jsonify({'error': 'Solo los agentes pueden cambiar el estado de contrataciones'}), 403
    data = request.get_json()
    new_status = data.get('status')
    if new_status not in ['active', 'cancelled', 'expired']:
        return jsonify({'error': 'Estado no válido'}), 400
    cur = mysql.connection.cursor()
    cur.execute("UPDATE client_policies SET status = %s WHERE id = %s", (new_status, contract_id))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True, 'message': f'Estado actualizado a {new_status}.'})

# ===================================
# RUTAS DE REEMBOLSO
# ===================================

@app.route('/refunds', methods=['POST'])
@login_required
def create_refund_request():
    """Crear una solicitud de reembolso desde el cliente"""
    try:
        # Verificar que el usuario es cliente
        if session.get('role_id') != 3:
            return jsonify({'error': 'Solo los clientes pueden solicitar reembolsos'}), 403
        
        data = request.get_json()
        contract_id = data.get('contract_id')
        
        if not contract_id:
            return jsonify({'error': 'ID de contrato requerido'}), 400
        
        cur = mysql.connection.cursor()
        
        # Obtener información del contrato y verificar que pertenece al cliente
        cur.execute("""
            SELECT cp.id, cp.client_id, cp.agent_id, cp.premium_amount, p.name
            FROM client_policies cp
            JOIN policies p ON cp.policy_id = p.id
            WHERE cp.id = %s AND cp.client_id = (
                SELECT id FROM clients WHERE user_id = %s
            )
        """, (contract_id, session['user_id']))
        
        contract_data = cur.fetchone()
        if not contract_data:
            cur.close()
            return jsonify({'error': 'Contrato no encontrado o no autorizado'}), 404
        
        contract_id, client_id, agent_id, premium_amount, policy_name = contract_data
        
        # Crear la solicitud de reembolso
        cur.execute("""
            INSERT INTO refunds 
            (policy_id, client_id, agent_id, amount, reason, reason_description, status, created_by)
            VALUES (%s, %s, %s, %s, 'cancelation', 'Solicitud de cancelación y reembolso del cliente', 'pending', %s)
        """, (contract_id, client_id, agent_id, premium_amount, session['user_id']))
        
        mysql.connection.commit()
        cur.close()
        
        return jsonify({
            'success': True,
            'message': f'Solicitud de reembolso creada para {policy_name}',
            'refund_id': cur.lastrowid
        }), 201
        
    except Exception as e:
        mysql.connection.rollback()
        print("Error al crear solicitud de reembolso:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/refunds', methods=['GET'])
@login_required
def list_refunds():
    """Listar solicitudes de reembolso según el rol del usuario"""
    try:
        cur = mysql.connection.cursor()
        
        if session.get('role_id') == 2:  # Agente
            # Agentes ven solicitudes de sus clientes
            cur.execute("""
                SELECT 
                    r.id AS refund_id,
                    r.policy_id,
                    p.name AS policy_name,
                    CONCAT(c.first_name, ' ', c.last_name) AS client_name,
                    u.email AS client_email,
                    r.amount,
                    r.request_date,
                    r.status,
                    r.reason,
                    r.reason_description
                FROM refunds r
                JOIN client_policies cp ON r.policy_id = cp.id
                JOIN policies p ON cp.policy_id = p.id
                JOIN clients c ON r.client_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE r.agent_id = %s
                ORDER BY r.request_date DESC
            """, (session['user_id'],))
            
        elif session.get('role_id') == 1:  # Admin
            # Admins ven todas las solicitudes
            cur.execute("""
                SELECT 
                    r.id AS refund_id,
                    r.policy_id,
                    p.name AS policy_name,
                    CONCAT(c.first_name, ' ', c.last_name) AS client_name,
                    u.email AS client_email,
                    r.amount,
                    r.request_date,
                    r.status,
                    r.reason,
                    r.reason_description
                FROM refunds r
                JOIN client_policies cp ON r.policy_id = cp.id
                JOIN policies p ON cp.policy_id = p.id
                JOIN clients c ON r.client_id = c.id
                JOIN users u ON c.user_id = u.id
                ORDER BY r.request_date DESC
            """)
            
        else:  # Cliente
            # Clientes ven solo sus solicitudes
            cur.execute("""
                SELECT 
                    r.id AS refund_id,
                    r.policy_id,
                    p.name AS policy_name,
                    r.amount,
                    r.request_date,
                    r.status,
                    r.reason,
                    r.reason_description
                FROM refunds r
                JOIN client_policies cp ON r.policy_id = cp.id
                JOIN policies p ON cp.policy_id = p.id
                WHERE r.client_id = (
                    SELECT id FROM clients WHERE user_id = %s
                )
                ORDER BY r.request_date DESC
            """, (session['user_id'],))
        
        refunds = []
        for row in cur.fetchall():
            if session.get('role_id') == 3:  # Cliente
                refunds.append({
                    'refund_id': row[0],
                    'policy_id': row[1],
                    'policy_name': row[2],
                    'amount': float(row[3]),
                    'request_date': row[4].isoformat() if row[4] else None,
                    'status': row[5],
                    'reason': row[6],
                    'reason_description': row[7]
                })
            else:  # Agente o Admin
                refunds.append({
                    'refund_id': row[0],
                    'policy_id': row[1],
                    'policy_name': row[2],
                    'client_name': row[3],
                    'client_email': row[4],
                    'amount': float(row[5]),
                    'request_date': row[6].isoformat() if row[6] else None,
                    'status': row[7],
                    'reason': row[8],
                    'reason_description': row[9]
                })
        
        cur.close()
        return jsonify(refunds), 200
        
    except Exception as e:
        print("Error al listar reembolsos:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/refunds/<refund_id>/status', methods=['PUT'])
@login_required
def update_refund_status(refund_id):
    """Actualizar el estado de una solicitud de reembolso (solo agentes y admins)"""
    try:
        if session.get('role_id') not in [1, 2]:  # Solo admin y agentes
            return jsonify({'error': 'No autorizado'}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        notes = data.get('notes', '')
        
        if new_status not in ['approved', 'rejected', 'processed']:
            return jsonify({'error': 'Estado no válido'}), 400
        
        cur = mysql.connection.cursor()
        
        # Verificar que la solicitud existe y pertenece al agente (si es agente)
        if session.get('role_id') == 2:  # Agente
            cur.execute("""
                SELECT id FROM refunds 
                WHERE id = %s AND agent_id = %s
            """, (refund_id, session['user_id']))
        else:  # Admin
            cur.execute("SELECT id FROM refunds WHERE id = %s", (refund_id,))
        
        if not cur.fetchone():
            cur.close()
            return jsonify({'error': 'Solicitud de reembolso no encontrada'}), 404
        
        # Actualizar estado
        cur.execute("""
            UPDATE refunds 
            SET status = %s, processed_date = NOW(), processed_by = %s, notes = %s
            WHERE id = %s
        """, (new_status, session['user_id'], notes, refund_id))
        
        mysql.connection.commit()
        cur.close()
        
        return jsonify({
            'success': True,
            'message': f'Estado de reembolso actualizado a {new_status}'
        }), 200
        
    except Exception as e:
        mysql.connection.rollback()
        print("Error al actualizar estado de reembolso:", str(e))
        return jsonify({'error': str(e)}), 500

# ===================================
# FIN RUTAS
# ===================================

@app.route('/clients/<int:client_id>/contracts')
@login_required
def get_client_contracts(client_id):
    cur = mysql.connection.cursor()
    # Traer todos los contratos de este cliente
    cur.execute('''
        SELECT cp.id, p.name, cp.premium_amount, cp.payment_frequency, cp.status
        FROM client_policies cp
        JOIN policies p ON cp.policy_id = p.id
        WHERE cp.client_id = %s
        ORDER BY cp.created_at DESC
    ''', (client_id,))
    contratos = cur.fetchall()
    resultado = []
    for contrato in contratos:
        contract_id = contrato[0]
        # Beneficiarios
        cur.execute('SELECT name, relationship, percentage FROM beneficiaries WHERE contract_id = %s', (contract_id,))
        beneficiarios = [
            {'name': b[0], 'relationship': b[1], 'percentage': float(b[2])}
            for b in cur.fetchall()
        ]
        # Datos extra
        cur.execute('SELECT field_name, field_value FROM client_policy_extra_data WHERE contract_id = %s', (contract_id,))
        extra_data = {row[0]: row[1] for row in cur.fetchall()}
        resultado.append({
            'contract_id': contract_id,
            'policy_name': contrato[1],
            'premium_amount': float(contrato[2]),
            'payment_frequency': contrato[3],
            'status': contrato[4],
            'beneficiaries': beneficiarios,
            'extra_data': extra_data
        })
    cur.close()
    return jsonify(resultado)

if __name__ == "__main__":
    app.run(debug=True)
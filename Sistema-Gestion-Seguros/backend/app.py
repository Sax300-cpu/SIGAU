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
from werkzeug.utils import secure_filename

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

# Configuración para uploads
app.config['UPLOAD_FOLDER'] = 'uploads'
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
        # Validar campos obligatorios
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        role_id = data.get('role_id')
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()

        if not username or not email or not password or not role_id:
            return jsonify({"error": "Faltan campos obligatorios"}), 400

        # Validar nombre y apellido para todos los roles
        if not first_name or not last_name:
            return jsonify({"error": "Nombre y apellido son obligatorios"}), 400

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
    cur.execute("""
        SELECT
          c.id        AS id,       -- este es clients.id
          u.username AS username,
          u.email    AS email
        FROM clients c
        JOIN users   u ON u.id = c.user_id
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
                   p.benefits, p.premium_amount, p.payment_frequency, p.status
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
            'status': p[7]
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
                premium_amount, payment_frequency, status,
                start_date, end_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR))
        """, (
            data['name'],
            data['type_id'],
            data['coverage'],
            data['benefits'],
            data['premium_amount'],
            data['payment_frequency'],
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
    try:
        cur = mysql.connection.cursor()
        cur.execute("""
            SELECT 
                p.id, p.name, pt.name as type_name, 
                p.coverage_details, p.benefits, 
                p.premium_amount, p.payment_frequency, p.status
            FROM policies p
            JOIN policy_types pt ON p.type_id = pt.id
            WHERE p.id = %s
        """, (policy_id,))
        
        policy = cur.fetchone()
        cur.close()
        
        if not policy:
            return jsonify({'error': 'Póliza no encontrada'}), 404
            
        return jsonify({
            'id': policy[0],
            'name': policy[1],
            'type_name': policy[2],
            'coverage_details': policy[3],
            'benefits': policy[4],
            'premium_amount': float(policy[5]),
            'payment_frequency': policy[6],
            'status': policy[7]
        })
        
    except Exception as e:
        print(f"Error al obtener póliza {policy_id}:", str(e))
        return jsonify({'error': str(e)}), 500

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
                status = %s
            WHERE id = %s
        """, (
            data['name'],
            data['type_id'],
            data['coverage'],
            data['benefits'],
            data['premium_amount'],
            data['payment_frequency'],
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

        # 2. Agregar beneficiarios
        for beneficiario in beneficiarios:
            cur.execute("""
                INSERT INTO beneficiaries
                (contract_id, name, relationship, percentage)
                VALUES (%s, %s, %s, %s)
            """, (contract_id, beneficiario['name'], beneficiario['relationship'], beneficiario['percentage']))

        # 3. Guardar documentos
        if 'documents' in request.files:
            for file in request.files.getlist('documents'):
                if file.filename != '':
                    # Guardar el archivo (en producción usar AWS S3 o similar)
                    filename = secure_filename(file.filename)
                    filepath = os.path.join('uploads', filename)
                    os.makedirs('uploads', exist_ok=True)
                    file.save(filepath)

                    cur.execute("""
                        INSERT INTO documents
                        (contract_id, doc_type, file_path)
                        VALUES (%s, %s, %s)
                    """, (contract_id, 'contract_doc', filepath))

        # Hacer commit una sola vez después de todos los INSERT
        mysql.connection.commit()
        cur.close()

        return jsonify({
            'success': True,
            'contract_id': contract_id,
            'message': 'Contrato creado exitosamente',
            'beneficiarios_count': len(beneficiarios),
            'documentos_count': len(request.files.getlist('documents')) if 'documents' in request.files else 0
        }), 201

    except Exception as e:
        mysql.connection.rollback()
        print("Error al crear contrato:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/contracts/<int:contract_id>')
@login_required
def get_contract(contract_id):
    cur = mysql.connection.cursor()
    
    # Obtener contrato
    cur.execute("SELECT * FROM client_policies WHERE id = %s", (contract_id,))
    contract = cur.fetchone()
    
    if not contract:
        return jsonify({'error': 'Contrato no encontrado'}), 404
    
    # Obtener beneficiarios
    cur.execute("SELECT name, relationship, percentage FROM beneficiaries WHERE contract_id = %s", (contract_id,))
    beneficiaries = cur.fetchall()
    
    # Obtener documentos
    cur.execute("SELECT doc_type, file_path FROM documents WHERE contract_id = %s", (contract_id,))
    documents = cur.fetchall()
    
    cur.close()
    
    return jsonify({
        'contract': {
            'id': contract[0],
            'client_id': contract[1],
            'policy_id': contract[2],
            'premium_amount': float(contract[4]),
            'payment_frequency': contract[5],
            'status': contract[8]
        },
        'beneficiaries': [{
            'name': b[0],
            'relationship': b[1],
            'percentage': float(b[2])
        } for b in beneficiaries],
        'documents': [{
            'type': d[0],
            'path': d[1]
        } for d in documents]
    })

# ===================================
# FIN RUTAS
# ===================================

if __name__ == "__main__":
    app.run(debug=True)
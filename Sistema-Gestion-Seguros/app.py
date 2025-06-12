from flask import Flask, request, jsonify, render_template, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_wtf.csrf import CSRFProtect
import os

app = Flask(__name__)

# Configuración de la base de datos
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = ''
app.config['MYSQL_DB'] = 'gseguros'
app.config['SECRET_KEY'] = os.urandom(24)

# Inicialización de extensiones
mysql = MySQL(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Configuración de CSRF
csrf = CSRFProtect(app)

@app.route('/policies', methods=['GET'])
@login_required
def get_policies():
    try:
        type_name = request.args.get('type_name')
        
        cur = mysql.connection.cursor()
        
        if type_name:
            # Buscar por tipo de póliza
            cur.execute("""
                SELECT p.id, p.name, pt.name as type_name, p.coverage_details, 
                       p.benefits, p.premium_amount, p.payment_frequency, p.status
                FROM policies p
                JOIN policy_types pt ON p.type_id = pt.id
                WHERE pt.name LIKE %s
                ORDER BY p.id DESC
            """, (f"%{type_name}%",))
        else:
            # Todas las pólizas
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

@app.route('/contracts', methods=['POST'])
@login_required
def create_contract():
    try:
        # Verificar que es agente
        if session.get('role_id') != 2:
            return jsonify({'error': 'Solo los agentes pueden crear contratos'}), 403

        # Obtener datos básicos
        data = {
            'client_id': request.form.get('client_id'),
            'policy_id': request.form.get('policy_id'),
            'premium_amount': request.form.get('premium_amount'),
            'payment_frequency': request.form.get('payment_frequency'),
            'agent_id': session['user_id']
        }

        # Validar datos básicos
        if not all(data.values()):
            missing = [k for k, v in data.items() if not v]
            return jsonify({'error': f'Faltan campos requeridos: {missing}'}), 400

        # Procesar beneficiarios
        beneficiarios = []
        i = 0
        while True:
            name_key = f'beneficiarios[{i}][name]'
            if name_key not in request.form:
                break
            beneficiarios.append({
                'name': request.form[name_key],
                'relationship': request.form[f'beneficiarios[{i}][relationship]'],
                'percentage': float(request.form[f'beneficiarios[{i}][percentage]'])
            })
            i += 1

        # Verificar porcentajes si hay beneficiarios
        if beneficiarios:
            total = sum(b['percentage'] for b in beneficiarios)
            if abs(total - 100) > 0.01:
                return jsonify({'error': 'La suma de porcentajes debe ser 100%'}), 400

        # Iniciar transacción
        cur = mysql.connection.cursor()
        
        # 1. Crear contrato
        cur.execute("""
            INSERT INTO client_policies 
            (client_id, policy_id, agent_id, premium_amount, 
             payment_frequency, start_date, end_date, status)
            VALUES (%s, %s, %s, %s, %s, CURDATE(), 
                    DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'active')
        """, (data['client_id'], data['policy_id'], data['agent_id'],
              data['premium_amount'], data['payment_frequency']))
        
        contract_id = cur.lastrowid

        # 2. Agregar beneficiarios
        for ben in beneficiarios:
            cur.execute("""
                INSERT INTO beneficiaries
                (contract_id, name, relationship, percentage)
                VALUES (%s, %s, %s, %s)
            """, (contract_id, ben['name'], ben['relationship'], ben['percentage']))

        # 3. Guardar documentos
        if 'documents' in request.files:
            for file in request.files.getlist('documents'):
                if file.filename != '':
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                    file.save(filepath)

                    cur.execute("""
                        INSERT INTO documents
                        (contract_id, doc_type, file_path)
                        VALUES (%s, %s, %s)
                    """, (contract_id, 'contract_doc', filepath))

        mysql.connection.commit()
        cur.close()

        return jsonify({
            'success': True,
            'contract_id': contract_id,
            'message': 'Contrato creado exitosamente'
        })

    except Exception as e:
        mysql.connection.rollback()
        print(f"Error en create_contract: {str(e)}")
        return jsonify({'error': str(e)}), 500 
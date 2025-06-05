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

    # 1) Validar datos comunes (username, email, password, role_id)
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role_id  = data.get('role_id')

    if not username or not email or not password or not role_id:
        return jsonify({'error': 'Faltan campos obligatorios en usuario.'}), 400

    # 2) Generar hash de contraseña
    pw_hash = generate_password_hash(password)

    cur = mysql.connection.cursor()
    try:
        # 3) Insertar en tabla users
        cur.execute(
          "INSERT INTO users (username, email, password_hash, role_id) "
          "VALUES (%s, %s, %s, %s)",
          (username, email, pw_hash, role_id)
        )
        mysql.connection.commit()
        new_user_id = cur.lastrowid

        # 4) Si role_id == 3, insertar en clients
        if int(role_id) == 3:
            # Extraer datos de cliente
            first_name = data.get('first_name', '').strip()
            last_name  = data.get('last_name', '').strip()
            dob        = data.get('dob')  # debe venir en formato 'YYYY-MM-DD'
            phone      = data.get('phone', '').strip()
            address    = data.get('address', '').strip()

            # Validar que first_name, last_name y dob existan
            if not first_name or not last_name or not dob:
                # Si falta algún campo obligatorio de cliente → deshacer creación de usuario
                mysql.connection.rollback()
                cur.close()
                return jsonify({'error': 'Faltan datos de cliente: Nombre/Apellido/Fecha de nacimiento.'}), 400

            # Insertar en tabla clients
            cur.execute(
              "INSERT INTO clients (user_id, first_name, last_name, dob, phone, address) "
              "VALUES (%s, %s, %s, %s, %s, %s)",
              (new_user_id, first_name, last_name, dob, phone, address)
            )
            mysql.connection.commit()

        cur.close()
        return jsonify({"id": new_user_id}), 201

    except Exception as e:
        # En caso de cualquier error, deshacer y devolver mensaje
        mysql.connection.rollback()
        cur.close()
        # Si hubiera un duplicado de username/email, por ejemplo, puedes detectar el error aquí
        return jsonify({'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    data = request.get_json()

    # 1) Validar campos comunes
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')         # Si queda vacío, no cambiamos contraseña
    role_id  = data.get('role_id')

    if not username or not email or not role_id:
        return jsonify({'error': 'Faltan campos obligatorios en usuario.'}), 400

    cur = mysql.connection.cursor()
    try:
        # 2) Actualizar tabla users
        if password:
            pw_hash = generate_password_hash(password)
            cur.execute(
                "UPDATE users "
                "SET username = %s, email = %s, password_hash = %s, role_id = %s "
                "WHERE id = %s",
                (username, email, pw_hash, role_id, user_id)
            )
        else:
            cur.execute(
                "UPDATE users "
                "SET username = %s, email = %s, role_id = %s "
                "WHERE id = %s",
                (username, email, role_id, user_id)
            )
        mysql.connection.commit()

        # 3) Si es Cliente (role_id == 3), actualizar o insertar su fila en clients
        if int(role_id) == 3:
            first_name = data.get('first_name', '').strip()
            last_name  = data.get('last_name',  '').strip()
            dob        = data.get('dob')           # formato 'YYYY-MM-DD'
            phone      = data.get('phone', '').strip()
            address    = data.get('address', '').strip()

            if not first_name or not last_name or not dob:
                mysql.connection.rollback()
                cur.close()
                return jsonify({'error': 'Faltan datos de cliente: Nombre/Apellido/Fecha de Nacimiento.'}), 400

            # Comprobar si ya existe un registro en clients para este user_id
            cur.execute("SELECT id FROM clients WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if row:
                # Ya existe → UPDATE clients
                cur.execute(
                  "UPDATE clients "
                  "SET first_name = %s, last_name = %s, dob = %s, phone = %s, address = %s "
                  "WHERE user_id = %s",
                  (first_name, last_name, dob, phone, address, user_id)
                )
            else:
                # No existe → INSERT clients
                cur.execute(
                  "INSERT INTO clients "
                  "(user_id, first_name, last_name, dob, phone, address) "
                  "VALUES (%s, %s, %s, %s, %s, %s)",
                  (user_id, first_name, last_name, dob, phone, address)
                )
            mysql.connection.commit()
        else:
            # Si el usuario dejó de ser Cliente (por ejemplo cambió a Agente/Admin),
            # borrar su fila en clients si existiera
            cur.execute("DELETE FROM clients WHERE user_id = %s", (user_id,))
            mysql.connection.commit()

        cur.close()
        return jsonify({'message': 'Usuario actualizado correctamente'}), 200

    except Exception as e:
        mysql.connection.rollback()
        cur.close()
        return jsonify({'error': str(e)}), 500
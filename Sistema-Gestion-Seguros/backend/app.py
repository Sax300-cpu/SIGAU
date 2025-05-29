import os
from dotenv import load_dotenv
from flask import (
    Flask, render_template, request,
    redirect, url_for, flash, session
)
from models import init_db
from werkzeug.security import check_password_hash

# 1) Carga las variables de entorno
load_dotenv()

# 2) Inicializa Flask
app = Flask(
    __name__,
    static_folder="../static",
    template_folder="templates"
)
app.secret_key = os.getenv("SECRET_KEY")

# 3) Inicializa la conexión a la BD
mysql = init_db(app)

@app.route('/test-db')
def test_db():
    cur = mysql.connection.cursor()
    cur.execute("SELECT COUNT(*) FROM roles;")
    count = cur.fetchone()[0]
    cur.close()
    return f"La tabla roles tiene {count} registros."

@app.route("/")
def home():
    return render_template("login-index.html")

# ← Ruta de login actualizada para usar email
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # 1) Recoge email y contraseña del formulario
        email    = request.form['email']
        password = request.form['password']

        # 2) Busca ese email en la BD
        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT id, password_hash FROM users WHERE email = %s",
            (email,)
        )
        fila = cur.fetchone()
        cur.close()

        # 3) Verifica contraseña y maneja sesión
        if fila and check_password_hash(fila[1], password):
            session.clear()
            session['user_id'] = fila[0]
            return redirect(url_for('dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')

    # En GET o fallo de login, muestra el formulario de nuevo
    return render_template('login-index.html')
# ← Fin de la ruta /login

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return f"<h1>Bienvenido, usuario #{session['user_id']}</h1>"

if __name__ == "__main__":
    app.run(debug=True)
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

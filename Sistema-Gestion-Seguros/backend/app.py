import os
from dotenv import load_dotenv
from flask import (
    Flask, render_template, request,
    redirect, url_for, flash, session
)
from models import init_db
from werkzeug.security import check_password_hash

load_dotenv()

app = Flask(
    __name__,
    static_folder="../static",
    template_folder="templates"
)
app.secret_key = os.getenv("SECRET_KEY")
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

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        email    = request.form['email']
        password = request.form['password']

        cur = mysql.connection.cursor()
        cur.execute(
            "SELECT id, password_hash FROM users WHERE email = %s",
            (email,)
        )
        fila = cur.fetchone()
        cur.close()

        if fila and check_password_hash(fila[1], password):
            session.clear()
            session['user_id'] = fila[0]
            return redirect(url_for('dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')

    return render_template('login-index.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return f"""
      <h1>Bienvenido, usuario #{session['user_id']}</h1>
      <p><a href="{ url_for('logout') }">Cerrar sesión</a></p>
    """

# ← Mueve ESTA ruta justo aquí, antes del main
@app.route('/logout')
def logout():
    session.clear()
    flash("Has cerrado sesión correctamente.", "info")
    return redirect(url_for('login'))

if __name__ == "__main__":
    app.run(debug=True)

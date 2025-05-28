document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Aquí normalmente enviarías los datos a un servidor
    console.log('Intento de login con:', { email, password });
    
    // Para demostración, mostramos un alerta
    alert(`Intento de login con email: ${email}`);
    
    // Reseteamos el formulario
    this.reset();
});
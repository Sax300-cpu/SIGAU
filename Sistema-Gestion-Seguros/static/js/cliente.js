document.addEventListener('DOMContentLoaded', function() {
    // Aquí puedes añadir interacciones JavaScript
    // Por ejemplo, manejar clics en las opciones de la barra lateral
    
    const sidebarItems = document.querySelectorAll('.sidebar nav ul li');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Manejar clic en las opciones de seguro
    const insuranceOptions = document.querySelectorAll('.insurance-option');
    insuranceOptions.forEach(option => {
        option.addEventListener('click', function() {
            alert(`Has seleccionado: ${this.querySelector('span').textContent}`);
            // Aquí podrías redirigir a otra página o mostrar un formulario
        });
    });
    
    // Manejar clic en el botón de notificaciones
    document.querySelector('.notification').addEventListener('click', function() {
        alert('Tienes 3 notificaciones nuevas');
    });
    
    // Manejar clic en los botones de ver detalles
    document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.insurance-card');
            alert(`Mostrando detalles de: ${card.querySelector('h3').textContent}`);
        });
    });
});
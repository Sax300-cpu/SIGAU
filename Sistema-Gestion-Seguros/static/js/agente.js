document.addEventListener('DOMContentLoaded', function() {
    // Aquí puedes añadir la funcionalidad JavaScript
    

    // Seleccionar elementos
const modal = document.getElementById("modalCliente");
const btnNuevoCliente = document.querySelector(".btn-add");
const btnCerrar = document.querySelector(".close");

// Abrir el modal al hacer clic en el botón "Nuevo Cliente"
btnNuevoCliente.addEventListener("click", () => {
    modal.style.display = "block";
});

// Cerrar el modal al hacer clic en la "X"
btnCerrar.addEventListener("click", () => {
    modal.style.display = "none";
});

// Cerrar el modal al hacer clic fuera de la ventana
window.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

    // Ejemplo: Alerta al hacer clic en el botón "Nuevo Cliente"

    
    // Ejemplo: Confirmación al eliminar un cliente
    const deleteButtons = document.querySelectorAll('.btn-delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if(!confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
                e.preventDefault();
            }
        });
    });
    
    // Ejemplo: Buscar clientes
    const searchInput = document.querySelector('.search-bar input');
    if(searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('table tbody tr');
            
            rows.forEach(row => {
                const name = row.querySelector('td:first-child').textContent.toLowerCase();
                const email = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                const phone = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
                
                if(name.includes(searchTerm) || email.includes(searchTerm) || phone.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Puedes añadir más funcionalidades según sea necesario
});
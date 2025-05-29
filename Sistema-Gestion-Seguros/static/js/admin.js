document.addEventListener('DOMContentLoaded', function() {
    const menuButtons = document.querySelectorAll('.menu-btn');
    const contentTitle = document.getElementById('content-title');
    const contentSections = document.querySelectorAll('.content-section');
    const sectionTitles = {
        'roles': 'Gestión de Roles',
        'usuarios': 'Administración de Usuarios',
        'seguros': 'Gestión de Seguros'
    };

    function changeSection(section) {
        menuButtons.forEach(button => button.classList.remove('active'));
        document.querySelector(`[data-content="${section}"]`)?.classList.add('active');
        contentTitle.textContent = sectionTitles[section] || 'Plataforma de Seguros';
        contentSections.forEach(section => section.classList.remove('active'));
        document.getElementById(`${section}-content`)?.classList.add('active');
    }

    menuButtons.forEach(button => {
        button.addEventListener('click', function() {
            changeSection(this.getAttribute('data-content'));
        });
    });

    // Función para mostrar el modal
    function showModal(actionMessage, confirmCallback) {
        document.getElementById("modal-message").textContent = actionMessage;
        document.getElementById("modal").classList.remove("hidden");

        document.getElementById("modal-confirm").onclick = function() {
            confirmCallback();
            document.getElementById("modal").classList.add("hidden");
        };
        document.getElementById("modal-cancel").onclick = function() {
            document.getElementById("modal").classList.add("hidden");
        };
    }

    // Reemplazo de alert con modal para eliminar roles
    document.getElementById('eliminar-roles').addEventListener('click', function() {
        showModal("¿Estás seguro de que deseas eliminar roles?", function() {
            console.log("Roles eliminados");
        });
    });

    // Reemplazo de alert con modal para editar roles
    document.getElementById('editar-roles').addEventListener('click', function() {
        showModal("¿Estás seguro de que deseas editar roles?", function() {
            console.log("Roles editados");
        });
    });

    // Cerrar sesión con modal
    document.getElementById('salir').addEventListener('click', function() {
        showModal("¿Estás seguro de que deseas cerrar sesión?", function() {
            window.location.href = '/login'; // Simulación de cierre de sesión
        });
    });

    changeSection('roles');

    // Función para actualizar el nombre de usuario
    window.updateUsername = function(name) {
        document.getElementById('username-display').textContent = `Bienvenido, ${name}`;
    };
});
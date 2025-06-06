document.addEventListener('DOMContentLoaded', function() {
    // === (1) Lógica para resaltar la opción activa de la barra lateral ===
    const sidebarItems = document.querySelectorAll('.sidebar nav ul li');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // === (2) Selección de “Contratar Seguro” ===
    const insuranceOptions = document.querySelectorAll('.insurance-option');
    const modal = document.getElementById('modal-contratar');              // === MODIFICADO
    const modalOverlay = modal.querySelector('.modal-overlay');           // === MODIFICADO
    const inputTipo = document.getElementById('input-tipo');              // === MODIFICADO
    const formContratar = document.getElementById('form-contratar-seguro');// === MODIFICADO
    const btnCancelar = document.getElementById('btn-cancelar');          // === MODIFICADO

    insuranceOptions.forEach(option => {
        option.addEventListener('click', function() {
            const tipoTexto = this.querySelector('span').textContent.trim();
            inputTipo.value = tipoTexto;         // Autocompleta “Tipo de Póliza”
            modal.classList.remove('hidden');    // Muestra el modal
        });
    });

    // === (3) Cerrar modal si clic en overlay o “Cancelar” ===
    modalOverlay.addEventListener('click', () => {
        modal.classList.add('hidden');
        formContratar.reset();
    });
    btnCancelar.addEventListener('click', () => {
        modal.classList.add('hidden');
        formContratar.reset();
    });

    // === (4) Manejar submit del formulario de contratación ===
    formContratar.addEventListener('submit', async function(event) {
        event.preventDefault();

        // Recoger valores del formulario
        const tipo      = inputTipo.value;                       // “Seguro de Vida”, etc.
        const cobertura = document.getElementById('input-cobertura').value.trim();
        const beneficios= document.getElementById('input-beneficios').value.trim();
        const prima     = document.getElementById('input-prima').value;
        const frecuencia= document.getElementById('select-frecuencia').value;

        // Validaciones básicas (puedes ampliarlas si quieres)
        if (!tipo || !cobertura || !beneficios || !prima || !frecuencia) {
            return alert('Todos los campos son obligatorios.');
        }

        // Construir el body JSON para enviar
        const payload = {
            name: tipo + " - " + new Date().getTime(),  // Ejemplo: “Seguro de Vida - 1654323456556”
            type_name: tipo,
            coverage: cobertura,
            benefits: beneficios,
            premium_amount: prima,
            payment_frequency: frecuencia,
            status: 'active'  // Tú puedes cambiar a ‘pending’ si quieres “revisar” antes de activar
        };

        try {
            // Llamada al backend
            const resp = await fetch('/policies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                const data = await resp.json();
                alert('Póliza creada con éxito. ID = ' + data.id);
                formContratar.reset();
                modal.classList.add('hidden');
                // Aquí podrías recargar la sección “Mis Pólizas” o hacer un window.location.reload()
                // Por ejemplo:
                // window.location.href = '/client/mis_policies';
            } else {
                const error = await resp.json();
                alert('Error al crear póliza: ' + (error.error || JSON.stringify(error)));
            }
        } catch (err) {
            console.error(err);
            alert('Error de red al intentar crear la póliza.');
        }
    });

    // === (5) Notificaciones (igual que antes) ===
    document.querySelector('.notification').addEventListener('click', function() {
        alert('Tienes 3 notificaciones nuevas');
    });

    // === (6) “Ver detalles” de pólizas existentes ===
    document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.insurance-card');
            alert(`Mostrando detalles de: ${card.querySelector('h3').textContent}`);
        });
    });
});

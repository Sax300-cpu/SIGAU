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
    const modal            = document.getElementById('modal-contratar');               // ### MODIFICADO
    const modalOverlay     = modal.querySelector('.modal-overlay');                   // ### MODIFICADO
    const detallesDiv      = document.getElementById('detalles-policy');               // ### MODIFICADO
    const inputTipo        = document.getElementById('input-tipo');                    // ### MODIFICADO
    const formContratar    = document.getElementById('form-contratar-seguro');         // ### MODIFICADO
    const btnCancelar      = document.getElementById('btn-cancelar');                  // ### MODIFICADO

    insuranceOptions.forEach(option => {
        option.addEventListener('click', async function() {
            const tipoTexto = this.querySelector('span').textContent.trim(); 
inputTipo.value = tipoTexto;

// Quitamos el prefijo "Seguro de " para que coincida con p.name
let sinPrefijo = tipoTexto;
if (tipoTexto.startsWith('Seguro de ')) {
  sinPrefijo = tipoTexto.replace('Seguro de ', '').trim(); 
  // Por ejemplo: "Seguro de Salud" → "Salud"
}

// === Carga /policy_types y filtra por sinPrefijo ===
try {
  const resp = await fetch('/policy_types');
  if (!resp.ok) throw new Error('Error al obtener lista de policy_types');
  const lista = await resp.json();

  // Ahora buscamos p.name === sinPrefijo (o que contenga sinPrefijo)
  const policyInfo = lista.find(p =>
    p.name === sinPrefijo || p.name.includes(sinPrefijo)
  );
  if (!policyInfo) {
    detallesDiv.innerHTML = `<p style="color: red;">No se encontró info de “${tipoTexto}”.</p>`;
  } else {
    detallesDiv.innerHTML = `
      <h3>Detalles de ${policyInfo.name}</h3>
      <p><strong>Descripción:</strong> ${policyInfo.description}</p>
      <p><strong>Costo base:</strong> $${policyInfo.cost.toFixed(2)}</p>
      <p><strong>Frecuencia sugerida:</strong> ${policyInfo.payment_frequency}</p>
      <p><strong>Estado:</strong> ${policyInfo.status}</p>
    `;
    document.getElementById('select-frecuencia').value = policyInfo.payment_frequency;
  }
} catch (err) {
  console.error(err);
  detallesDiv.innerHTML = `<p style="color: red;">Error al cargar detalles.</p>`;
}

// Mostrar el modal al final
modal.classList.remove('hidden');

        });
    });

    // === (4) Cerrar modal si clic en overlay o “Cancelar” ===
    modalOverlay.addEventListener('click', () => {
        modal.classList.add('hidden');
        detallesDiv.innerHTML = '';   // Limpiar la sección de detalles
        formContratar.reset();
    });
    btnCancelar.addEventListener('click', () => {
        modal.classList.add('hidden');
        detallesDiv.innerHTML = '';
        formContratar.reset();
    });

    // === (5) Manejar submit del formulario de contratación ===
    formContratar.addEventListener('submit', async function(event) {
        event.preventDefault();

        // Recoger valores del formulario
        const tipo      = inputTipo.value;                       
        const cobertura = document.getElementById('input-cobertura').value.trim();
        const beneficios= document.getElementById('input-beneficios').value.trim();
        const prima     = document.getElementById('input-prima').value;
        const frecuencia= document.getElementById('select-frecuencia').value;

        // Validaciones básicas
        if (!tipo || !cobertura || !beneficios || !prima || !frecuencia) {
            return alert('Todos los campos son obligatorios.');
        }

        // Construir el body JSON para enviar
        const payload = {
            name: tipo + " - " + new Date().getTime(),
            type_name: tipo,
            coverage: cobertura,
            benefits: beneficios,
            premium_amount: prima,
            payment_frequency: frecuencia,
            status: 'active'
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
                detallesDiv.innerHTML = '';
                modal.classList.add('hidden');
                // Opcional: recargar o redirigir para ver “Mis Pólizas”
                // window.location.href = '/client/mis_policies';
            } else if (resp.status === 401 || resp.status === 403) {
                alert('No tienes permisos para crear pólizas. Debes iniciar sesión.');
            } else {
                const error = await resp.json();
                alert('Error al crear póliza: ' + (error.error || JSON.stringify(error)));
            }
        } catch (err) {
            console.error(err);
            alert('Error de red al intentar crear la póliza.');
        }
    });

    // === (6) Notificaciones (igual que antes) ===
    document.querySelector('.notification').addEventListener('click', function() {
        alert('Tienes 3 notificaciones nuevas');
    });

    // === (7) “Ver detalles” de pólizas existentes ===
    document.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.insurance-card');
            alert(`Mostrando detalles de: ${card.querySelector('h3').textContent}`);
        });
    });

    // === (MODAL COMPLETAR DOCUMENTOS) ===
    // --- MODAL COMPLETAR DOCUMENTOS ---
    const modalCompletar = document.getElementById('modal-completar');
    if (modalCompletar) {
        const overlay = modalCompletar.querySelector('.modal-overlay');
        const btnClose = document.getElementById('btn-close-modal');
        const inputCid = document.getElementById('input-contract-id');
        const formDocs = document.getElementById('form-completar');
        const signaturePadCanvas = document.getElementById('signature-pad');
        let signature = null;
        // Esperar a que SignaturePad esté disponible (por el defer)
        function initSignaturePad() {
          if (window.SignaturePad && signaturePadCanvas) {
            signature = new SignaturePad(signaturePadCanvas);
          } else {
            setTimeout(initSignaturePad, 100);
          }
        }
        initSignaturePad();
        // Abrir modal al click en cualquier “Completar documentos”
        document.querySelectorAll('.btn-completar-docs').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.contractId;
            const res = await fetch(`/contracts/${id}`);
            const data = await res.json();
            document.getElementById('detalle-cliente').textContent = data.client_name ?? '-';
            document.getElementById('detalle-seguro').textContent = data.policy_name ?? '-';
            document.getElementById('detalle-prima').textContent = (data.premium_amount !== undefined && data.premium_amount !== null) ? `$${data.premium_amount}` : '-';
            document.getElementById('detalle-frecuencia').textContent = data.payment_frequency ?? '-';
            document.getElementById('detalle-estado').textContent = data.status ?? '-';
            document.getElementById('detalle-documentos').innerHTML = (data.documents && data.documents.length)
              ? data.documents.map(d=>`<a href="${d.url||'#'}" target="_blank">${d.filename||d.path||''}</a>`).join(', ')
              : '<span style="color:#888">Ninguno</span>';
            inputCid.value = id;
            if (signature) signature.clear();
            modalCompletar.classList.remove('hidden');
          });
        });
        // Cerrar modal
        [overlay, btnClose].forEach(el => el && el.addEventListener('click', () => {
          modalCompletar.classList.add('hidden');
        }));
        // Borrar firma
        const btnClearSign = document.getElementById('btn-clear-sign');
        if (btnClearSign) {
          btnClearSign.addEventListener('click', function() {
            if (signature) signature.clear();
          });
        }
        // Enviar documentos + firma
        if (formDocs) {
          formDocs.addEventListener('submit', async e => {
            e.preventDefault();
            const fd = new FormData(formDocs);
            if (signature && !signature.isEmpty()) {
              const blob = await new Promise(res => signature.toBlob(res, 'image/png'));
              fd.append('signature', blob, 'firma.png');
            }
            const resp = await fetch('/contracts/' + inputCid.value + '/upload_docs', {
              method: 'POST',
              body: fd
            });
            if (resp.ok) {
              alert('Documentos guardados 🎉');
              modalCompletar.classList.add('hidden');
              location.reload();
            } else {
              alert('Error guardando documentos');
            }
          });
        }
      }
});

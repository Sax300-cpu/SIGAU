document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('error-message');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validación de credenciales
      if (!emailInput.value.trim() || !passwordInput.value.trim()) {
        errorMessage.classList.remove('hidden');
        emailInput.classList.add('input-error');
        passwordInput.classList.add('input-error');

        // Eliminar la clase después de un tiempo
        setTimeout(() => {
          emailInput.classList.remove('input-error');
          passwordInput.classList.remove('input-error');
        }, 1000);
        return;
      }

      errorMessage.classList.add('hidden');

      const form = e.target;
      const data = new FormData(form);
      const submitButton = form.querySelector('button');

      // Deshabilitar botón y mostrar indicador de carga
      submitButton.disabled = true;
      submitButton.textContent = "Ingresando...";

      try {
        const res = await fetch(form.action, {
          method: form.method,
          body: data
        });

        if (res.redirected) {
          window.location.href = res.url;
        } else {
          document.body.innerHTML = await res.text();
        }
      } catch (error) {
        console.error("Error en la solicitud de login:", error);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Entrar";
      }
    });

    // Validación en tiempo real para ocultar el mensaje de error si se ingresa texto
    [emailInput, passwordInput].forEach(input => {
      input.addEventListener('input', () => {
        if (emailInput.value.trim() && passwordInput.value.trim()) {
          errorMessage.classList.add('hidden');
        }
      });
    });
  }
});
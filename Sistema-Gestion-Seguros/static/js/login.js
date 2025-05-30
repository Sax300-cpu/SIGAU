document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('error-message');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validación de credenciales vacías
      if (!emailInput.value.trim() || !passwordInput.value.trim()) {
        errorMessage.textContent = "Por favor, ingresa tu correo y contraseña.";
        errorMessage.classList.remove('hidden');
        emailInput.classList.add('input-error');
        passwordInput.classList.add('input-error');

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
          const responseText = await res.text();
          
          // Buscar mensaje de error en la respuesta del servidor
          if (responseText.includes("Contraseña incorrecta")) {
            errorMessage.textContent = "Contraseña incorrecta.";
            errorMessage.classList.remove('hidden');
          } else {
            document.body.innerHTML = responseText;
          }
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
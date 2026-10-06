const form = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const passwordToggle = document.querySelector("#togglePasswordBtn");
const passwordToggleIcon = document.querySelector("#passwordToggleIcon");
const roleFeedback = document.querySelector("#roleFeedback");
const roleFeedbackText = document.querySelector("#roleFeedbackText");
const loginError = document.querySelector("#loginError");
const submitButton = document.querySelector("#submitButton");
const supportToggle = document.querySelector("#supportToggle");
const supportToast = document.querySelector("#supportToast");
let feedbackTimer;

function setRoleFeedback(role) {
  roleFeedback.classList.remove("hidden");
  roleFeedbackText.className =
    role === "cajero"
      ? "font-label-md text-label-md font-bold text-tertiary"
      : "font-label-md text-label-md font-bold text-primary";
  roleFeedbackText.textContent =
    role === "cajero"
      ? "Destino identificado: Terminal POS / Caja 01"
      : "Destino identificado: Dashboard Gerencial";
}

document.querySelectorAll("[data-demo-role]").forEach((button) => {
  button.addEventListener("click", () => {
    const isAdmin = button.dataset.demoRole === "admin";
    usernameInput.value = isAdmin ? "10849201" : "72481092";
    passwordInput.value = isAdmin ? "ADM_5678" : "POS_1234";
    loginError.classList.add("hidden");
    setRoleFeedback(isAdmin ? "admin" : "cajero");
    usernameInput.focus();
  });
});

passwordToggle.addEventListener("click", () => {
  const isVisible = passwordInput.type === "password";
  passwordInput.type = isVisible ? "text" : "password";
  passwordToggle.setAttribute("aria-pressed", String(isVisible));
  passwordToggle.setAttribute(
    "aria-label",
    isVisible ? "Ocultar contraseña" : "Mostrar contraseña",
  );
  passwordToggleIcon.textContent = isVisible ? "visibility_off" : "visibility";
});

supportToggle.addEventListener("click", () => {
  supportToast.classList.toggle("hidden");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loginError.classList.add("hidden");

  if (!form.reportValidity()) {
    return;
  }

  const username = usernameInput.value.trim();
  const isAdmin =
    username === "10849201" || username.toLocaleLowerCase("es").includes("admin");
  const role = isAdmin ? "admin" : "cajero";
  const destination = isAdmin ? "dashboard" : "ventas-cajas";
  const rememberTerminal = document.querySelector("#rememberTerminal").checked;

  window.clearTimeout(feedbackTimer);
  setRoleFeedback(role);
  submitButton.disabled = true;
  submitButton.innerHTML =
    '<span class="material-symbols-outlined animate-spin text-[20px]">sync</span><span>Validando acceso de demostración...</span>';

  if (rememberTerminal) {
    localStorage.setItem("retail-pulse-terminal", "Caja 01 - Principal");
  } else {
    localStorage.removeItem("retail-pulse-terminal");
  }

  feedbackTimer = window.setTimeout(() => {
    window.location.assign(`index.html#${destination}`);
  }, 700);
});

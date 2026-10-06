import { initPurchasingModule } from "./purchasing.js";
import { initDashboardNavigation } from "./navigation.js";

const components = [
  { target: "#sidebar-mount", source: "../../components/sidebar.html" },
  { target: "#topbar-mount", source: "../../components/topbar.html" },
  {
    target: "#purchasing-overview-mount",
    source: "../../components/purchasing-overview.html",
  },
  {
    target: "#restock-suggestions-mount",
    source: "../../components/restock-suggestions.html",
  },
];

async function mountComponent({ target, source }) {
  const mountPoint = document.querySelector(target);
  if (!mountPoint) {
    throw new Error(`No se encontró el contenedor del componente: ${target}`);
  }

  const response = await fetch(new URL(source, import.meta.url));
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar ${source}: ${response.status} ${response.statusText}`,
    );
  }

  mountPoint.innerHTML = await response.text();
}

async function initializeApplication() {
  const errorMessage = document.querySelector("#app-error");

  if (sessionStorage.getItem("retail-pulse-role") === "cajero") {
    window.location.replace("pos.html");
    return;
  }

  try {
    await Promise.all(components.map(mountComponent));
    initPurchasingModule();
    initDashboardNavigation();
  } catch (error) {
    console.error("No se pudo inicializar la aplicación:", error);
    if (errorMessage) {
      errorMessage.textContent =
        "No se pudo cargar la interfaz. Verifica que la aplicación esté abierta desde un servidor local y vuelve a intentarlo.";
      errorMessage.classList.remove("hidden");
    }
  }
}

initializeApplication();

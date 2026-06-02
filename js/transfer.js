(function () {
  const REFRESH_INTERVAL = 15000;

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.loadTickets === "function") {
      window.setInterval(() => {
        window.loadTickets();
      }, REFRESH_INTERVAL);
    }
  });
})();

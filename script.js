/* ============================================================
   NB92 — Passwort-Gate
   Einfacher, client-seitiger Schutz (kein echter Sicherheits-
   mechanismus — der Quellcode ist im Browser einsehbar, also
   technisch versierte Personen könnten das umgehen). Reicht aber,
   um zufällige Besucher und Suchmaschinen draussen zu halten.

   PASSWORT ÄNDERN: einfach den Wert unten ersetzen.
   ============================================================ */

const PAGE_PASSWORD = "save";

// Damit man nicht bei jedem Klick auf der Seite erneut das
// Passwort eingeben muss, merken wir uns den Zugang nur für
// diesen Browser-Tab (sessionStorage).
const SESSION_KEY = "nb92_unlocked";

const gate = document.getElementById("gate");
const site = document.getElementById("site");
const form = document.getElementById("gate-form");
const input = document.getElementById("gate-input");
const error = document.getElementById("gate-error");

function unlock() {
  gate.style.display = "none";
  site.hidden = false;
  sessionStorage.setItem(SESSION_KEY, "1");
}

if (sessionStorage.getItem(SESSION_KEY) === "1") {
  unlock();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value === PAGE_PASSWORD) {
    unlock();
  } else {
    error.classList.add("show");
    input.value = "";
    input.focus();
  }
});
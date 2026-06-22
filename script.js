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

(function () {
  var timelineScene = document.getElementById("timeline-scene");
  if (!timelineScene) return;

  var teams = [
    { start: 2016, end: 2020, name: "Ballwil" },
    { start: 2018, end: 2024, name: "Zug" },
    { start: 2022, end: 2026, name: "Eschenbach" },
    { start: 2025, end: 2027, name: "Zug United U21" }
  ];

  var desktopYearStep = 74;
  var mobileYearStep = 58;
  var topPadding = 28;
  var bottomPadding = 44;
  var cardExtraHeight = 54;
  var minimumCardHeight = 118;
  var overlapShiftStep = 12;

  function pruneActive(activeItems, startYear) {
    return activeItems.filter(function (item) {
      return item.end > startYear;
    });
  }

  function chooseSide(activeState, fallbackSide) {
    var leftBusy = activeState.left.length;
    var rightBusy = activeState.right.length;

    if (!leftBusy && rightBusy) return "left";
    if (!rightBusy && leftBusy) return "right";
    if (!leftBusy && !rightBusy) return fallbackSide === "left" ? "right" : "left";

    if (leftBusy < rightBusy) return "left";
    if (rightBusy < leftBusy) return "right";

    return fallbackSide === "left" ? "right" : "left";
  }

  function buildLayout() {
    var compact = window.matchMedia("(max-width: 700px)").matches;
    var yearStep = compact ? mobileYearStep : desktopYearStep;
    var cardWidth = compact ? "calc(100% - 84px)" : "clamp(210px, 27vw, 300px)";
    var sortedTeams = teams.slice().sort(function (a, b) {
      return a.start - b.start || a.end - b.end;
    });

    var sideState = {
      left: [],
      right: []
    };
    var lastSide = "left";

    var minYear = sortedTeams[0].start;
    var maxYear = sortedTeams[0].end;

    sortedTeams.forEach(function (team, index) {
      if (team.start < minYear) minYear = team.start;
      if (team.end > maxYear) maxYear = team.end;

      sideState.left = pruneActive(sideState.left, team.start);
      sideState.right = pruneActive(sideState.right, team.start);

      team.side = chooseSide(sideState, lastSide);
      team.overlap = sideState.left.length > 0 || sideState.right.length > 0;
      team.depth = sideState[team.side].length;
      sideState[team.side].push(team);
      lastSide = team.side;
    });

    var sceneHeight = topPadding + ((maxYear - minYear) * yearStep) + bottomPadding + minimumCardHeight;
    timelineScene.innerHTML = "";
    timelineScene.style.height = sceneHeight + "px";

    var fragment = document.createDocumentFragment();
    var maxBottom = 0;

    sortedTeams.forEach(function (team, index) {
      var item = document.createElement("article");
      item.className = "timeline-item timeline-item--" + team.side;

      var durationYears = Math.max(team.end - team.start, 1);
      var itemHeight = Math.max((durationYears * yearStep) + cardExtraHeight, minimumCardHeight);
      var itemTop = topPadding + ((team.start - minYear) * yearStep);
      var overlapShift = team.depth * overlapShiftStep;

      item.style.top = itemTop + "px";
      item.style.height = itemHeight + "px";
      item.style.setProperty("--timeline-card-width", cardWidth);
      item.style.setProperty("--timeline-overlap-shift", overlapShift + "px");

      if (team.overlap) {
        item.classList.add("timeline-overlap");
      }

      item.style.zIndex = 20 + index * 2 + team.depth;

      item.innerHTML =
        '<div class="timeline-card">' +
          '<span class="timeline-year">' + team.start + '</span>' +
          '<div class="timeline-team">' + team.name + '</div>' +
          '<span class="timeline-place">' + team.end + '</span>' +
        '</div>';

      fragment.appendChild(item);
      maxBottom = Math.max(maxBottom, itemTop + itemHeight);
    });

    timelineScene.style.height = (maxBottom + bottomPadding) + "px";
    timelineScene.appendChild(fragment);
  }

  var resizeTimer;
  buildLayout();

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(buildLayout, 150);
  });
})();
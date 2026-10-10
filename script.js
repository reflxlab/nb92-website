(function () {
  var primaryNav = document.querySelector(".primary-nav");
  var toggle = document.querySelector(".nav-toggle");
  var linksPanel = document.getElementById("nav-links");
  if (!primaryNav || !toggle || !linksPanel) return;

  function closeMenu() {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Menü öffnen");
    linksPanel.classList.remove("is-open");
  }

  toggle.addEventListener("click", function () {
    var isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Menü öffnen" : "Menü schliessen");
    linksPanel.classList.toggle("is-open", !isOpen);
  });

  linksPanel.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });

  var sectionLinks = Array.prototype.slice.call(linksPanel.querySelectorAll('a[href^="#"]'));
  var sections = sectionLinks.map(function (link) {
    return { link: link, section: document.querySelector(link.getAttribute("href")) };
  }).filter(function (item) { return item.section; });

  function setActiveLink(active) {
    sections.forEach(function (item) {
      if (item.link === active) item.link.setAttribute("aria-current", "location");
      else item.link.removeAttribute("aria-current");
    });
  }

  sections.forEach(function (item) {
    item.link.addEventListener("click", function () {
      setActiveLink(item.link);
    });
  });

  function updateActiveLink() {
    var threshold = primaryNav.getBoundingClientRect().bottom + 1;
    var active = null;
    sections.forEach(function (item) {
      if (item.section.getBoundingClientRect().top <= threshold) active = item.link;
    });
    setActiveLink(active);
  }

  window.addEventListener("scroll", updateActiveLink, { passive: true });
  window.addEventListener("resize", updateActiveLink);
  updateActiveLink();
})();

// Scoreboard-Ticker gemeinsam auf der Athleten- und Partner-Seite nutzen.
(function () {
  var track = document.getElementById("scoreboard-track");
  if (!track) return;
  var baseSet = track.querySelector(".scoreboard-set");
  if (!baseSet) return;

  function buildTicker() {
    Array.prototype.slice.call(track.children).forEach(function (child) {
      if (child !== baseSet) track.removeChild(child);
    });

    var containerWidth = track.parentElement.clientWidth;
    var setWidth = baseSet.getBoundingClientRect().width;
    if (!setWidth || !containerWidth) return false;

    var halfWidth = setWidth;
    while (halfWidth < containerWidth) {
      track.appendChild(baseSet.cloneNode(true));
      halfWidth += setWidth;
    }

    Array.prototype.slice.call(track.children).forEach(function (node) {
      track.appendChild(node.cloneNode(true));
    });
    return true;
  }

  var built = buildTicker();
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      built = buildTicker();
    }, 200);
  });
})();

(function () {
  var timelineScene = document.getElementById("timeline-scene");
  if (!timelineScene) return;

  var teams = [
    { start: 2015, end: 2019, name: "Ballwil" },
    { start: 2018, end: 2024, name: "Hochdorf" },
    { start: 2019, end: 2026, name: "Eschenbach" },
    { start: 2024, end: "now", name: "Zug United" } 
  ];

  var desktopYearStep = 74;
  var mobileYearStep = 58;
  var topPadding = 28;
  var bottomPadding = 44;
  var cardExtraHeight = 54;
  var minimumCardHeight = 118;
  
  // NEU: Abstand in Pixeln, wenn eine Box direkt unter eine andere rutscht
  var boxSpacing = 20;

  // GEÄNDERT: Wir prüfen jetzt auf physische Pixel statt auf Jahre
  function pruneActive(activeItems, newTopPixel) {
    return activeItems.filter(function (item) {
      // Nur in der Liste behalten, wenn das physische Ende der Box 
      // weiter unten ist als der Startpunkt der neuen Box
      return item.physicalBottom > newTopPixel;
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
    var cardWidth = compact ? "calc(50% - 18px)" : "clamp(210px, 27vw, 300px)";
    
    var currentYear = new Date().getFullYear();

    var preparedTeams = teams.map(function (team) {
      var isNow = team.end === "now";
      return {
        start: team.start,
        end: isNow ? currentYear : team.end,
        displayEnd: isNow ? "Jetzt" : team.end,
        name: team.name
      };
    });

    var sortedTeams = preparedTeams.sort(function (a, b) {
      return a.start - b.start || a.end - b.end;
    });

    var sideState = { left: [], right: [] };
    var lastSide = "right";
    var minYear = sortedTeams[0].start;
    var fragment = document.createDocumentFragment();
    var maxBottom = 0;

    timelineScene.innerHTML = "";

    sortedTeams.forEach(function (team, index) {
      var durationYears = Math.max(team.end - team.start, 1);
      
      // Der rein mathematische (imaginäre) Startpunkt
      var logicalTop = topPadding + ((team.start - minYear) * yearStep);
      var itemHeight = Math.max((durationYears * yearStep) + cardExtraHeight, minimumCardHeight);

      // 1. Prüfen, welche Boxen auf diesem physischen Level noch im Weg sind
      sideState.left = pruneActive(sideState.left, logicalTop);
      sideState.right = pruneActive(sideState.right, logicalTop);

      team.side = chooseSide(sideState, lastSide);

      // 2. KERN-LOGIK: Box nach unten verschieben, falls der Platz belegt ist
      var actualTop = logicalTop;
      if (sideState[team.side].length > 0) {
        var lastItemOnSide = sideState[team.side][sideState[team.side].length - 1];
        // Wenn das Ende der vorherigen Box noch über den imaginären Start ragt:
        if (lastItemOnSide.physicalBottom + boxSpacing > actualTop) {
          actualTop = lastItemOnSide.physicalBottom + boxSpacing;
        }
      }

      // 3. Echte physische Koordinaten für die nächste Box speichern
      team.physicalTop = actualTop;
      team.physicalHeight = itemHeight;
      team.physicalBottom = actualTop + itemHeight;
      
      sideState[team.side].push(team);
      lastSide = team.side;

      // 4. HTML Element erstellen
      var item = document.createElement("article");
      item.className = "timeline-item timeline-item--" + team.side;

      // Wir nutzen jetzt den (ggf. angepassten) physicalTop
      item.style.top = team.physicalTop + "px";
      item.style.height = team.physicalHeight + "px";
      item.style.setProperty("--timeline-card-width", cardWidth);
      
      // Seitliche Überlappungen (Shift) brauchen wir nicht mehr, 
      // da die Boxen jetzt vertikal sauber stapeln.
      item.style.setProperty("--timeline-overlap-shift", "0px"); 

      item.style.zIndex = 20 + index * 2;

      item.innerHTML =
        '<div class="timeline-card">' +
          '<span class="timeline-year">' + team.start + '</span>' +
          '<div class="timeline-team">' + team.name + '</div>' +
          '<span class="timeline-place">' + team.displayEnd + '</span>' +
        '</div>';

      fragment.appendChild(item);
      maxBottom = Math.max(maxBottom, team.physicalBottom);
    });

    // Szene an den physisch tiefsten Punkt (plus Padding) anpassen
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
/* ============================================================
   Custom Cursor — smoother orangener Punkt
   ============================================================ */
(function () {
  const dot = document.querySelector('.cursor-dot');
  if (!dot) return; // falls das Element (noch) nicht existiert, abbrechen

  let mouseX = 0, mouseY = 0;
  let dotX = 0, dotY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animate() {
    dotX += (mouseX - dotX) * 0.15;
    dotY += (mouseY - dotY) * 0.15;

    dot.style.left = dotX + 'px';
    dot.style.top = dotY + 'px';

    requestAnimationFrame(animate);
  }
  animate();

  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => dot.classList.add('hover'));
    el.addEventListener('mouseleave', () => dot.classList.remove('hover'));
  });
})();

(function () {
  var content = document.getElementById("next-match-content");
  if (!content) return;

  var timeZone = "Europe/Zurich";
  var dateFormatter = new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timeZone
  });
  var matches = [];
  var displayedMatchId = null;
  var activeMatch = null;

  function makeElement(tagName, className, text) {
    var element = document.createElement(tagName);
    element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function showStatus(message) {
    content.replaceChildren(makeElement("p", "next-match-status", message));
    activeMatch = null;
    displayedMatchId = null;
  }

  function makeCountdownUnit(label) {
    var unit = makeElement("div", "next-match-unit");
    unit.appendChild(makeElement("span", "next-match-value", "00"));
    unit.appendChild(makeElement("span", "next-match-unit-label", label));
    return unit;
  }

  function makeMatchDetail(label, value) {
    var detail = makeElement("div", "next-match-detail");
    detail.appendChild(makeElement("span", "next-match-detail-label", label));
    detail.appendChild(makeElement("span", "next-match-detail-value", value));
    return detail;
  }

  function renderMatch(match) {
    var link = makeElement("a", "next-match-link");
    link.href = match.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    var main = makeElement("div", "next-match-main");
    var details = makeElement("div", "next-match-details");
    var opponent = match.isHome ? match.awayTeam : match.homeTeam;
    var location = match.isHome ? "Heimspiel" : "Auswärtsspiel";
    var date = dateFormatter.format(new Date(match.start));
    var countdown = makeElement("div", "next-match-countdown");
    link.setAttribute("aria-label", "Spiel gegen " + opponent + ", " + location + " am " + date + ". Spielseite auf swiss unihockey in neuem Tab öffnen");

    main.appendChild(makeElement("span", "next-match-versus", "VS"));
    main.appendChild(makeElement("h3", "next-match-opponent", opponent));

    ["Tage", "Std.", "Min.", "Sek."].forEach(function (label) {
      countdown.appendChild(makeCountdownUnit(label));
    });

    main.appendChild(countdown);
    details.appendChild(makeMatchDetail("Spiel", location));
    details.appendChild(makeMatchDetail("Wann", date));
    details.appendChild(makeMatchDetail("Wo", match.venue));
    link.appendChild(main);
    link.appendChild(details);
    content.replaceChildren(link);
    activeMatch = match;
    displayedMatchId = match.id;
  }

  function updateCountdown() {
    var now = Date.now();
    var nextMatch = matches.filter(function (match) {
      return Date.parse(match.start) > now;
    }).sort(function (first, second) {
      return Date.parse(first.start) - Date.parse(second.start);
    })[0];

    if (!nextMatch) {
      showStatus("No upcoming matches");
      return;
    }

    if (nextMatch.id !== displayedMatchId) renderMatch(nextMatch);

    var remaining = Math.max(0, Date.parse(nextMatch.start) - now);
    var totalSeconds = Math.floor(remaining / 1000);
    var values = [
      Math.floor(totalSeconds / 86400),
      Math.floor((totalSeconds % 86400) / 3600),
      Math.floor((totalSeconds % 3600) / 60),
      totalSeconds % 60
    ];

    activeMatch && activeMatch.id === nextMatch.id &&
      content.querySelectorAll(".next-match-value").forEach(function (element, index) {
        element.textContent = String(values[index]).padStart(2, "0");
      });
  }

  fetch("data/nb92-matches-2026-27.json")
    .then(function (response) {
      if (!response.ok) throw new Error("Matchdaten konnten nicht geladen werden");
      return response.json();
    })
    .then(function (data) {
      matches = Array.isArray(data.matches) ? data.matches.filter(function (match) {
        return match && match.start && match.url && Number.isFinite(Date.parse(match.start));
      }) : [];
      updateCountdown();
      window.setInterval(updateCountdown, 1000);
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) updateCountdown();
      });
    })
    .catch(function () {
      showStatus("Spielplan derzeit nicht verfügbar");
    });
})();
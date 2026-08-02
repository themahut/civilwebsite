// All subject, room, and schedule data lives in subjects.json.
// This file only fetches it and renders the page.

async function loadData() {
  const res = await fetch('subjects.json');
  if (!res.ok) throw new Error('Could not load subjects.json (status ' + res.status + ')');
  return res.json();
}

function buildCards(data) {
  const grid = document.getElementById('grid');
  const total = data.subjects.length;

  data.subjects.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    const linkHtml = s.link
    ? `<a class="resource-link" href="${s.link}" target="_blank" rel="noopener noreferrer">${s.linkLabel || 'Open Drive folder'} ↗</a>`
    : '';
    const linkHtml2 = s.link2
    ? `<a class="resource-link" href="${s.link2}" target="_blank" rel="noopener noreferrer">${s.link2Label || 'Open link'} ↗</a>`
    : '';

    card.innerHTML = `
      <div>
        <div class="idx">SHEET ${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>
        <h3>${s.name}</h3>
        <div class="desc">${s.desc}<span class="room">Classroom: ${s.room}</span>${linkHtml}${linkHtml2}</div>
      </div>
      <div class="titleblock">
        <span class="code">${s.code}</span>
        <span class="plus">+</span>
      </div>
    `;
    const toggle = () => card.classList.toggle('open');
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    card.querySelectorAll('.resource-link').forEach(linkEl => {
      linkEl.addEventListener('click', (e) => e.stopPropagation());
    });

    grid.appendChild(card);
  });
}

function buildTimetable(data) {
  const subjectByCode = Object.fromEntries(data.subjects.map(s => [s.code, s]));

  // header row
  const headRow = document.getElementById('tt-head-row');
  const dayHeaderCell = document.createElement('th');
  dayHeaderCell.textContent = 'Day';
  headRow.appendChild(dayHeaderCell);
  data.times.forEach(t => {
    const th = document.createElement('th');
    th.textContent = t;
    headRow.appendChild(th);
  });

  document.getElementById('tt-note').textContent = `${data.meta.omittedCourse} omitted`;
  document.getElementById('tt-term').textContent = data.meta.term;

  // index schedule by day -> time -> entry
  const byDay = {};
  data.days.forEach(d => { byDay[d] = {}; });
  data.schedule.forEach(entry => {
    byDay[entry.day][entry.time] = entry;
  });

  const tbody = document.getElementById('tt-body');

  data.days.forEach(day => {
    const row = document.createElement('tr');
    const dayCell = document.createElement('th');
    dayCell.textContent = day;
    row.appendChild(dayCell);

    let skip = 0;
    data.times.forEach(time => {
      if (skip > 0) { skip--; return; }

      const entry = byDay[day][time];
      const td = document.createElement('td');

      if (!entry) {
        td.className = 'free';
      } else {
        const subject = subjectByCode[entry.code];
        if (entry.colspan && entry.colspan > 1) {
          td.colSpan = entry.colspan;
          td.className = 'lab-cell';
          skip = entry.colspan - 1;
        }
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.setProperty('--sc', subject.color || '#6fd6f2');
        chip.innerHTML = `<span class="scode">${subject.code}</span><span class="sroom">${subject.room}</span>`;
        td.appendChild(chip);
      }
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });
}

function buildLegend(data) {
  const legend = document.getElementById('legend');
  data.subjects
    .filter(s => data.schedule.some(e => e.code === s.code))
    .forEach(s => {
      const item = document.createElement('span');
      item.className = 'legend-item';
      item.innerHTML = `<span class="legend-dot" style="--sc:${s.color}"></span>${s.code} — ${shortName(s.name)}`;
      legend.appendChild(item);
    });
}

// keeps the legend from wrapping too aggressively on long official titles
function shortName(name) {
  const shortMap = {
    'Probability and Statistics in Civil Engineering': 'Probability & Statistics',
    'Solid Mechanics': 'Solid Mechanics',
    'Hydraulics': 'Hydraulics',
    'Geomatics': 'Geomatics',
    'Hydraulic and Water Resources Engineering Laboratory': 'Hydraulics Lab',
    'Construction Planning and Management': 'Construction Planning'
  };
  return shortMap[name] || name;
}

loadData()
  .then(data => {
    buildCards(data);
    buildTimetable(data);
    buildLegend(data);
  })
  .catch(err => {
    console.error(err);
    const grid = document.getElementById('grid');
    grid.innerHTML = `<p style="font-family:'IBM Plex Mono',monospace;color:#f2a93b;">
      Couldn't load subjects.json — ${err.message}.<br>
      If you opened this file directly (file://), your browser is blocking the fetch.
      Run a tiny local server instead, e.g. <code>python3 -m http.server</code> in this folder,
      then open http://localhost:8000/index.html.
    </p>`;
  });

// Estimate form: sends the request to watha@kepadrywall.com through FormSubmit (formsubmit.co).
// If that service is down, the visitor gets a ready-made email to send instead, so no lead is lost.
(function () {
  var TO = 'watha@kepadrywall.com';
  // FormSubmit's private alias for TO (activated 2026-10-10), so the address isn't exposed in the request URL.
  var ENDPOINT = 'https://formsubmit.co/ajax/e2ab1040946db3d5e3f580ba267f3a02';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Links to a FAQ answer (e.g. "#faq-asbestos") open that answer, not just scroll to its closed heading.
  function openDetails(id) {
    var el = id && document.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) openDetails(a.getAttribute('href').slice(1));
  });
  window.addEventListener('hashchange', function () { openDetails(location.hash.slice(1)); });
  openDetails(location.hash.slice(1));

  var form = document.getElementById('estimate-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var button = form.querySelector('button[type="submit"]');

  function setStatus(msg, kind) {
    status.className = 'form-status field-full ' + (kind || '');
    status.innerHTML = msg;
  }

  function mailtoFallback(data) {
    var lines = [
      'Name: ' + data.name,
      'Email: ' + data.email,
      'Phone: ' + (data.phone || '-'),
      'City/township: ' + data.city,
      'Type of work: ' + data.work_type,
      'Year built: ' + (data.year_built || 'Not sure'),
      'OK to text: ' + (data.ok_to_text ? 'yes' : 'no'),
      '',
      data.details
    ];
    return 'mailto:' + TO +
      '?subject=' + encodeURIComponent('Estimate request: ' + data.work_type + ' (' + data.city + ')') +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstBad = null;
    Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
      var bad = !el.value.trim() || (el.type === 'email' && !el.checkValidity());
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) {
      setStatus('Please fill in the highlighted fields.', 'err');
      firstBad.focus();
      return;
    }

    var fd = new FormData(form);
    if (fd.get('_honey')) return; // bot

    var data = {
      name: fd.get('name').trim(),
      email: fd.get('email').trim(),
      phone: (fd.get('phone') || '').trim(),
      city: fd.get('city').trim(),
      work_type: fd.get('work_type'),
      year_built: fd.get('year_built') || 'Not sure',
      ok_to_text: fd.get('ok_to_text') ? 'yes' : 'no',
      details: fd.get('details').trim()
    };

    var payload = Object.assign({}, data, {
      _subject: 'Estimate request: ' + data.work_type + ' (' + data.city + ')',
      _replyto: data.email,
      _template: 'table',
      _captcha: 'false'
    });

    button.disabled = true;
    setStatus('Sending…');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok || String(res.body.success) !== 'true') throw new Error('send failed');
        form.reset();
        setStatus('Thanks, ' + escapeHtml(data.name.split(' ')[0]) + '! Your request was sent. We\'ll reply to ' + escapeHtml(data.email) + ', usually within one business day.', 'ok');
      })
      .catch(function () {
        setStatus('Sorry, the form couldn\'t send. <a href="' + mailtoFallback(data) + '">Click here to send it as an email instead</a>, or write to <a href="mailto:' + TO + '">' + TO + '</a>.', 'err');
      })
      .then(function () { button.disabled = false; });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();

/* ==========================================================================
   CEPRO Immobilier — Lead generation form
   Vanilla JavaScript, no dependencies.

   WHAT WORKS LOCALLY (just open index.html):
     - 3-step navigation, progress bar, transitions
     - FR / AR language switch (LTR / RTL) without reload
     - Residence → apartment type dynamic options (reset on change)
     - Inline validation, Algerian mobile number validation + normalization
     - Loading state & duplicate-submission protection

   WHAT REQUIRES REAL CONFIGURATION (see CONFIG below and README.md):
     - CONFIG.API_ENDPOINT        → your backend URL that stores the lead
     - CONFIG.META_PIXEL_ID       → your Meta Pixel ID (PageView + Lead)
     - CONFIG.PRIVACY_POLICY_URL  → CEPRO's real privacy policy page

   Until API_ENDPOINT is configured, submitting shows an explicit
   "not connected" message. The success screen and the Meta "Lead" event
   are triggered ONLY after the backend answers with HTTP 2xx.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
   * 1. CONFIGURATION — edit these values before going live
   * ---------------------------------------------------------------------- */
  var CONFIG = {
    // SUPABASE INTEGRATION:
    // Direct submission to Supabase PostgREST table.
    SUPABASE_URL: 'https://ahlmqyyynwqwgxfqnsso.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_ON2oKhVMcMS1evIs4khSYQ_q-ADSW87',
    SUPABASE_TABLE: 'leads',

    // BACKEND INTEGRATION ALTERNATIVE:
    // If you prefer your own API instead of Supabase, set this endpoint.
    API_ENDPOINT: 'BACKEND_API_ENDPOINT_PLACEHOLDER',

    // META PIXEL INTEGRATION REQUIRED:
    // Replace with your numeric Pixel ID from Meta Events Manager.
    // While this placeholder is present, the Pixel is not loaded at all.
    META_PIXEL_ID: 'META_PIXEL_ID_PLACEHOLDER',

    // Replace with the URL of CEPRO's actual privacy policy.
    // While this placeholder is present, the link stays hidden.
    PRIVACY_POLICY_URL: 'INSERT_ACTUAL_CEPRO_PRIVACY_POLICY_URL',

    // Network timeout for the submission request (milliseconds).
    REQUEST_TIMEOUT_MS: 15000,

    DEFAULT_LANGUAGE: 'fr'
  };

  var PLACEHOLDERS = {
    API_ENDPOINT: 'BACKEND_API_ENDPOINT_PLACEHOLDER',
    SUPABASE_URL: 'SUPABASE_URL_PLACEHOLDER',
    SUPABASE_ANON_KEY: 'SUPABASE_KEY_PLACEHOLDER',
    META_PIXEL_ID: 'META_PIXEL_ID_PLACEHOLDER',
    PRIVACY_POLICY_URL: 'INSERT_ACTUAL_CEPRO_PRIVACY_POLICY_URL'
  };

  var TOTAL_STEPS = 3;

  /* ------------------------------------------------------------------------
   * 2. DATA — residences and apartment types
   * ---------------------------------------------------------------------- */
  var RESIDENCES = {
    prestige: {
      image: 'assets/residence-prestige-sm.jpg',
      apartments: [
        { value: 'F4', label: 'F4', desc: 'descF4' },
        { value: 'F5 Duplex', label: 'F5 Duplex', desc: 'descF5Duplex' }
      ]
    },
    signature: {
      image: 'assets/residence-signature-sm.jpg',
      apartments: [
        { value: 'F2', label: 'F2', desc: 'descF2' },
        { value: 'F3', label: 'F3', desc: 'descF3' },
        { value: 'F4', label: 'F4', desc: 'descF4' },
        { value: 'F5 Attique', label: 'F5 Attique', desc: 'descF5Attique' }
      ]
    }
  };

  /* ------------------------------------------------------------------------
   * 3. TRANSLATIONS
   * ---------------------------------------------------------------------- */
  var LRI = '⁦', PDI = '⁩'; // isolate LTR numbers inside Arabic text

  var I18N = {
    fr: {
      pageTitle: 'CEPRO Immobilier — Demande d\'information',
      metaDescription: 'Découvrez la Résidence Prestige et la Résidence Signature de CEPRO Immobilier à Alger et faites le premier pas vers votre futur appartement.',
      eyebrow: 'Programmes résidentiels · Alger',
      title: 'Votre futur appartement commence ici.',
      description: 'Découvrez nos résidences et faites le premier pas vers votre futur logement.',
      step: 'Étape',
      of: 'sur',

      step1Title: 'Choisissez votre résidence',
      step1Question: 'Quelle résidence souhaitez-vous découvrir ?',
      prestigeName: 'Résidence Prestige',
      prestigeLocation: 'Birkhadem – Les Sources',
      prestigeAlt: 'Façade de la Résidence Prestige à Birkhadem',
      signatureName: 'Résidence Signature',
      signatureLocation: 'Chéraga – Alger',
      signatureAlt: 'Façade de la Résidence Signature à Chéraga',
      availableIn: 'Appartements disponibles :',

      step2Title: 'Votre appartement idéal',
      step2Question: 'Quel type d\'appartement recherchez-vous ?',
      yourSelection: 'Votre sélection',
      change: 'Modifier',
      descF2: 'Séjour + 1 chambre',
      descF3: 'Séjour + 2 chambres',
      descF4: 'Séjour + 3 chambres',
      descF5Duplex: 'Séjour + 4 chambres · deux niveaux',
      descF5Attique: 'Séjour + 4 chambres · dernier étage',

      step3Title: 'Vos coordonnées',
      allRequired: 'Tous les champs sont obligatoires.',
      lastName: 'Nom',
      lastNamePh: 'Entrez votre nom',
      firstName: 'Prénom',
      firstNamePh: 'Entrez votre prénom',
      phone: 'Numéro de téléphone',
      phonePh: '05XX XX XX XX',
      phoneHint: 'Mobile algérien : 05, 06, 07 ou +213',
      contactTime: 'Heure idéale pour être contacté(e)',
      morning: 'Matin',
      morningHours: '09h – 12h',
      afternoon: 'Après-midi',
      afternoonHours: '12h – 16h',
      evening: 'Fin de journée',
      eveningHours: '16h – 18h',
      privacyNotice: 'Vos informations personnelles seront utilisées uniquement pour traiter votre demande et vous contacter concernant votre projet immobilier.',
      consent: 'J\'accepte d\'être contacté(e) par CEPRO Immobilier concernant ma demande.',
      privacyLink: 'Politique de confidentialité',

      next: 'Continuer',
      back: 'Retour',
      submit: 'Envoyer ma demande',
      submitting: 'Envoi en cours…',

      successTitle: 'Merci pour votre confiance !',
      successText: 'Votre demande a bien été envoyée. Notre équipe CEPRO vous contactera prochainement.',
      recapResidence: 'Résidence',
      recapApartment: 'Appartement',
      recapTime: 'Créneau',
      rights: 'Tous droits réservés.',

      // Validation errors
      errResidence: 'Veuillez choisir une résidence.',
      errApartment: 'Veuillez choisir un type d\'appartement.',
      errLastName: 'Veuillez indiquer votre nom.',
      errFirstName: 'Veuillez indiquer votre prénom.',
      errNameInvalid: 'Veuillez saisir au moins 2 lettres, sans chiffres ni symboles.',
      errPhoneRequired: 'Veuillez indiquer votre numéro de téléphone.',
      errPhoneInvalid: 'Numéro invalide. Exemple : 0555 12 34 56 ou +213 555 12 34 56.',
      errContactTime: 'Veuillez choisir un créneau.',
      errConsent: 'Votre accord est nécessaire pour que nous puissions vous contacter.',

      // Submission errors
      alertNotConfigured: 'Envoi impossible : ce formulaire n\'est pas encore relié au serveur CEPRO. Aucune donnée n\'a été transmise. (Développeur : renseignez CONFIG.API_ENDPOINT dans script.js.)',
      alertNetwork: 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.',
      alertTimeout: 'Le serveur met trop de temps à répondre. Veuillez réessayer.',
      alertServer: 'Une erreur technique est survenue. Votre demande n\'a pas été enregistrée, veuillez réessayer dans quelques instants.',
      alertRejected: 'Votre demande n\'a pas pu être validée. Vérifiez vos informations puis réessayez.',
      alertRateLimited: 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.'
    },

    ar: {
      pageTitle: 'CEPRO Immobilier — طلب معلومات',
      metaDescription: 'اكتشفوا إقامة بريستيج وإقامة سيغناتور من CEPRO Immobilier في الجزائر العاصمة واتخذوا الخطوة الأولى نحو شقتكم المستقبلية.',
      eyebrow: 'مشاريع سكنية · الجزائر العاصمة',
      title: 'شقتكم المستقبلية تبدأ من هنا.',
      description: 'اكتشفوا إقاماتنا واتخذوا الخطوة الأولى نحو منزلكم المستقبلي.',
      step: 'المرحلة',
      of: 'من',

      step1Title: 'اختاروا الإقامة التي تهمكم',
      step1Question: 'ما هي الإقامة التي ترغبون في اكتشافها؟',
      prestigeName: 'إقامة بريستيج',
      prestigeLocation: 'بئر خادم – لي سورس',
      prestigeAlt: 'واجهة إقامة بريستيج في بئر خادم',
      signatureName: 'إقامة سيغناتور',
      signatureLocation: 'الشراقة – الجزائر العاصمة',
      signatureAlt: 'واجهة إقامة سيغناتور في الشراقة',
      availableIn: 'الشقق المتوفرة:',

      step2Title: 'الشقة التي تناسبكم',
      step2Question: 'ما هو نوع الشقة التي تبحثون عنها؟',
      yourSelection: 'اختياركم',
      change: 'تغيير',
      descF2: 'صالون + غرفة واحدة',
      descF3: 'صالون + غرفتان',
      descF4: 'صالون + 3 غرف',
      descF5Duplex: 'صالون + 4 غرف · على طابقين',
      descF5Attique: 'صالون + 4 غرف · الطابق الأخير',

      step3Title: 'معلومات الاتصال',
      allRequired: 'جميع الحقول إلزامية.',
      lastName: 'اللقب',
      lastNamePh: 'أدخل لقبكم',
      firstName: 'الاسم',
      firstNamePh: 'أدخل اسمكم',
      phone: 'رقم الهاتف',
      phonePh: '05XX XX XX XX',
      phoneHint: 'رقم جوال جزائري يبدأ بـ 05 أو 06 أو 07 أو ' + LRI + '+213' + PDI,
      contactTime: 'ما هو الوقت المناسب للتواصل معكم؟',
      morning: 'صباحاً',
      morningHours: '09:00 – 12:00',
      afternoon: 'بعد الظهر',
      afternoonHours: '12:00 – 16:00',
      evening: 'نهاية اليوم',
      eveningHours: '16:00 – 18:00',
      privacyNotice: 'سيتم استخدام معلوماتكم الشخصية فقط لمعالجة طلبكم والتواصل معكم بخصوص مشروعكم العقاري.',
      consent: 'أوافق على أن تقوم شركة CEPRO Immobilier بالتواصل معي بخصوص طلبي.',
      privacyLink: 'سياسة الخصوصية',

      next: 'متابعة',
      back: 'رجوع',
      submit: 'إرسال طلبي',
      submitting: 'جارٍ الإرسال…',

      successTitle: 'شكراً لثقتكم!',
      successText: 'تم إرسال طلبكم بنجاح. سيتواصل معكم فريق CEPRO في أقرب وقت.',
      recapResidence: 'الإقامة',
      recapApartment: 'الشقة',
      recapTime: 'وقت التواصل',
      rights: 'جميع الحقوق محفوظة.',

      errResidence: 'يرجى اختيار الإقامة.',
      errApartment: 'يرجى اختيار نوع الشقة.',
      errLastName: 'يرجى إدخال اللقب.',
      errFirstName: 'يرجى إدخال الاسم.',
      errNameInvalid: 'يرجى إدخال حرفين على الأقل، دون أرقام أو رموز.',
      errPhoneRequired: 'يرجى إدخال رقم الهاتف.',
      errPhoneInvalid: 'رقم غير صالح. مثال: ' + LRI + '0555 12 34 56' + PDI + ' أو ' + LRI + '+213 555 12 34 56' + PDI + '.',
      errContactTime: 'يرجى اختيار الوقت المناسب للتواصل.',
      errConsent: 'موافقتكم ضرورية حتى نتمكن من التواصل معكم.',

      alertNotConfigured: 'تعذّر الإرسال: هذا النموذج غير مرتبط بعد بخادم CEPRO، ولم يتم إرسال أي بيانات. (للمطوّر: يرجى تحديد CONFIG.API_ENDPOINT في ملف script.js.)',
      alertNetwork: 'تعذّر الاتصال. يرجى التحقق من اتصالكم بالإنترنت ثم إعادة المحاولة.',
      alertTimeout: 'استغرق الخادم وقتاً طويلاً للرد. يرجى إعادة المحاولة.',
      alertServer: 'حدث خطأ تقني ولم يتم تسجيل طلبكم. يرجى إعادة المحاولة بعد لحظات.',
      alertRejected: 'تعذّر قبول طلبكم. يرجى التحقق من معلوماتكم ثم إعادة المحاولة.',
      alertRateLimited: 'محاولات كثيرة. يرجى الانتظار بضع دقائق قبل إعادة المحاولة.'
    }
  };

  var STEP_TITLE_KEYS = { 1: 'step1Title', 2: 'step2Title', 3: 'step3Title' };
  var CONTACT_TIME_KEYS = { morning: ['morning', 'morningHours'], afternoon: ['afternoon', 'afternoonHours'], evening: ['evening', 'eveningHours'] };

  /* ------------------------------------------------------------------------
   * 4. STATE (kept in memory only — never written to localStorage)
   * ---------------------------------------------------------------------- */
  var state = {
    lang: CONFIG.DEFAULT_LANGUAGE,
    step: 1,
    residence: '',
    apartment: '',
    errors: {},          // field name → translation key
    alertKey: '',        // form-level alert translation key
    submitting: false,
    submitted: false,
    pixelReady: false
  };

  /* ------------------------------------------------------------------------
   * 5. DOM REFERENCES
   * ---------------------------------------------------------------------- */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var form = $('#leadForm');
  var steps = $$('.step', form);
  var btnBack = $('#btnBack');
  var btnNext = $('#btnNext');
  var btnSubmit = $('#btnSubmit');
  var progressFill = $('#progressFill');
  var progressBar = $('#progressBar');
  var stepNumber = $('#stepNumber');
  var stepName = $('#stepName');
  var availability = $('#availability');
  var apartmentOptions = $('#apartmentOptions');
  var formAlert = $('#formAlert');
  var successScreen = $('#successScreen');
  var progress = $('#progress');

  var inputs = {
    last_name: $('#last_name'),
    first_name: $('#first_name'),
    phone: $('#phone'),
    consent: $('#consent')
  };

  /* ------------------------------------------------------------------------
   * 6. HELPERS
   * ---------------------------------------------------------------------- */
  function t(key) {
    var dict = I18N[state.lang] || I18N.fr;
    return dict[key] != null ? dict[key] : (I18N.fr[key] != null ? I18N.fr[key] : key);
  }

  function isConfigured(value, placeholder) {
    return typeof value === 'string' && value.trim() !== '' && value.trim() !== placeholder;
  }

  function radioValue(name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : '';
  }

  function generateEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'lead-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // Sync a .is-selected class (fallback for browsers without CSS :has())
  function syncSelectedClasses(name) {
    $$('input[name="' + name + '"]', form).forEach(function (input) {
      var card = input.closest('label');
      if (card) card.classList.toggle('is-selected', input.checked);
    });
  }

  /* ------------------------------------------------------------------------
   * 7. PHONE NUMBER — validation & normalization (Algerian mobile)
   *    Accepted: 05/06/07 + 8 digits, +213 / 00213 / 213 + 5|6|7 + 8 digits
   *    (a superfluous 0 after +213 is tolerated: +213 0555…).
   *    Output (sent to backend): E.164 → +2135XXXXXXXX
   * ---------------------------------------------------------------------- */
  function toLatinDigits(str) {
    return String(str)
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); }) // Arabic-Indic
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); }); // Eastern Arabic-Indic
  }

  function normalizePhone(raw) {
    var s = toLatinDigits(raw).replace(/[\s \-.()\/]/g, '');
    if (s.indexOf('00213') === 0) s = '+213' + s.slice(5);
    else if (/^213\d{9,10}$/.test(s)) s = '+' + s;

    var m = s.match(/^\+2130?([567]\d{8})$/) || s.match(/^0([567]\d{8})$/);
    return m ? '+213' + m[1] : null;
  }

  // Readable display: "0555 12 34 56" (local) or "+213 555 12 34 56" (international)
  function formatPhoneForDisplay(raw) {
    var e164 = normalizePhone(raw);
    if (!e164) return raw;
    var n = e164.slice(4); // 9 national digits
    var grouped = n.slice(0, 3) + ' ' + n.slice(3, 5) + ' ' + n.slice(5, 7) + ' ' + n.slice(7, 9);
    var typed = toLatinDigits(raw).trim();
    return (typed.charAt(0) === '+' || typed.indexOf('00') === 0 || typed.indexOf('213') === 0)
      ? '+213 ' + grouped
      : '0' + grouped;
  }

  /* ------------------------------------------------------------------------
   * 8. LANGUAGE
   * ---------------------------------------------------------------------- */
  function applyLanguage(lang) {
    if (!I18N[lang]) lang = CONFIG.DEFAULT_LANGUAGE;
    state.lang = lang;

    var html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('pageTitle');
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('metaDescription'));

    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-placeholder]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    $$('[data-i18n-alt]').forEach(function (el) { el.setAttribute('alt', t(el.getAttribute('data-i18n-alt'))); });

    $$('.lang-switch__btn').forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // Re-render every dynamic, language-dependent part
    stepName.textContent = t(STEP_TITLE_KEYS[state.step]);
    renderAvailability();
    renderApartmentOptions();
    renderSelectionSummary();
    Object.keys(state.errors).forEach(function (field) { showError(field, state.errors[field]); });
    if (state.alertKey) showAlert(state.alertKey);
    if (state.submitting) setSubmitting(true);
    if (state.submitted) renderRecap();

    // Only the language preference is remembered (no personal data).
    try { window.localStorage.setItem('cepro_lang', lang); } catch (e) { /* storage unavailable */ }
  }

  function initialLanguage() {
    // Priority: ?lang=ar in the URL (useful for Arabic ad sets) → saved preference → default
    var fromUrl = '';
    try { fromUrl = new URLSearchParams(window.location.search).get('lang') || ''; } catch (e) { /* old browser */ }
    if (I18N[fromUrl]) return fromUrl;
    try {
      var saved = window.localStorage.getItem('cepro_lang');
      if (I18N[saved]) return saved;
    } catch (e) { /* storage unavailable */ }
    return CONFIG.DEFAULT_LANGUAGE;
  }

  /* ------------------------------------------------------------------------
   * 9. DYNAMIC RENDERING
   * ---------------------------------------------------------------------- */
  function renderAvailability() {
    var r = RESIDENCES[state.residence];
    if (!r) { availability.hidden = true; availability.textContent = ''; return; }

    availability.textContent = '';
    var label = document.createElement('span');
    label.className = 'availability__label';
    label.textContent = t('availableIn');
    var chips = document.createElement('span');
    chips.className = 'availability__chips';
    r.apartments.forEach(function (apt) {
      var chip = document.createElement('bdi');
      chip.className = 'chip';
      chip.textContent = apt.label;
      chips.appendChild(chip);
    });
    availability.appendChild(label);
    availability.appendChild(chips);
    availability.hidden = false;
  }

  function renderApartmentOptions() {
    var r = RESIDENCES[state.residence];
    apartmentOptions.textContent = '';
    if (!r) return;

    r.apartments.forEach(function (apt) {
      var label = document.createElement('label');
      label.className = 'option-card';

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'apartment_type';
      input.value = apt.value;
      input.className = 'choice-input';
      input.required = true;
      input.checked = state.apartment === apt.value;

      var name = document.createElement('bdi');
      name.className = 'option-card__name';
      name.textContent = apt.label;

      var desc = document.createElement('span');
      desc.className = 'option-card__desc';
      desc.textContent = t(apt.desc);

      var check = document.createElement('span');
      check.className = 'choice-check choice-check--sm';
      check.setAttribute('aria-hidden', 'true');
      check.innerHTML = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

      label.appendChild(input);
      label.appendChild(name);
      label.appendChild(desc);
      label.appendChild(check);
      label.classList.toggle('is-selected', input.checked);
      apartmentOptions.appendChild(label);
    });
  }

  function renderSelectionSummary() {
    var r = RESIDENCES[state.residence];
    if (!r) return;
    $('#selectionThumb').src = r.image;
    $('#selectionName').textContent = t(state.residence + 'Name');
    $('#selectionLocation').textContent = t(state.residence + 'Location');
  }

  function renderRecap() {
    $('#recapResidence').textContent = t(state.residence + 'Name');
    $('#recapApartment').textContent = state.apartment;
    var tk = CONTACT_TIME_KEYS[radioValue('contact_time')];
    $('#recapTime').textContent = tk ? t(tk[0]) + ' (' + LRI + t(tk[1]) + PDI + ')' : '';
  }

  function renderPrivacyLink() {
    var link = $('#privacyLink');
    if (isConfigured(CONFIG.PRIVACY_POLICY_URL, PLACEHOLDERS.PRIVACY_POLICY_URL)) {
      link.href = CONFIG.PRIVACY_POLICY_URL;
      link.hidden = false;
    } else {
      link.hidden = true; // no fake/broken link
    }
  }

  /* ------------------------------------------------------------------------
   * 10. ERRORS
   * ---------------------------------------------------------------------- */
  function fieldControl(field) {
    return inputs[field] || null;
  }

  function showError(field, key) {
    state.errors[field] = key;
    var el = form.querySelector('[data-error-for="' + field + '"]');
    if (el) { el.textContent = t(key); el.hidden = false; }
    var control = fieldControl(field);
    if (control) control.setAttribute('aria-invalid', 'true');
    var group = document.getElementById('group-' + field);
    if (group) {
      group.classList.add('is-invalid');
      if (group.tagName === 'FIELDSET') group.setAttribute('aria-invalid', 'true');
    }
  }

  function clearError(field) {
    delete state.errors[field];
    var el = form.querySelector('[data-error-for="' + field + '"]');
    if (el) { el.textContent = ''; el.hidden = true; }
    var control = fieldControl(field);
    if (control) control.removeAttribute('aria-invalid');
    var group = document.getElementById('group-' + field);
    if (group) { group.classList.remove('is-invalid'); group.removeAttribute('aria-invalid'); }
  }

  function showAlert(key) {
    state.alertKey = key;
    formAlert.textContent = t(key);
    formAlert.hidden = false;
  }

  function hideAlert() {
    state.alertKey = '';
    formAlert.textContent = '';
    formAlert.hidden = true;
  }

  /* ------------------------------------------------------------------------
   * 11. VALIDATION
   * ---------------------------------------------------------------------- */
  var NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ؀-ۿݐ-ݿ'’\- ]{2,60}$/;

  // Each validator returns an error key or '' when valid
  var validators = {
    residence: function () { return RESIDENCES[radioValue('residence')] ? '' : 'errResidence'; },
    apartment_type: function () { return radioValue('apartment_type') ? '' : 'errApartment'; },
    last_name: function () {
      var v = inputs.last_name.value.trim();
      if (!v) return 'errLastName';
      return NAME_PATTERN.test(v) && /[^\s'’\-]{2,}/.test(v) ? '' : 'errNameInvalid';
    },
    first_name: function () {
      var v = inputs.first_name.value.trim();
      if (!v) return 'errFirstName';
      return NAME_PATTERN.test(v) && /[^\s'’\-]{2,}/.test(v) ? '' : 'errNameInvalid';
    },
    phone: function () {
      var v = inputs.phone.value.trim();
      if (!v) return 'errPhoneRequired';
      return normalizePhone(v) ? '' : 'errPhoneInvalid';
    },
    contact_time: function () { return CONTACT_TIME_KEYS[radioValue('contact_time')] ? '' : 'errContactTime'; },
    consent: function () { return inputs.consent.checked ? '' : 'errConsent'; }
  };

  var STEP_FIELDS = {
    1: ['residence'],
    2: ['apartment_type'],
    3: ['last_name', 'first_name', 'phone', 'contact_time', 'consent']
  };

  function validateField(field) {
    var key = validators[field]();
    if (key) showError(field, key); else clearError(field);
    return !key;
  }

  function validateStep(n) {
    var firstInvalid = null;
    STEP_FIELDS[n].forEach(function (field) {
      if (!validateField(field) && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) focusField(firstInvalid);
    return !firstInvalid;
  }

  function focusField(field) {
    var target = fieldControl(field) ||
      form.querySelector('input[name="' + field + '"]:checked') ||
      form.querySelector('input[name="' + field + '"]');
    if (target) {
      target.focus({ preventScroll: true });
      var box = target.closest('.field, .group, .consent') || target;
      box.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ------------------------------------------------------------------------
   * 12. NAVIGATION
   * ---------------------------------------------------------------------- */
  function goToStep(n, moveFocus) {
    n = Math.max(1, Math.min(TOTAL_STEPS, n));
    state.step = n;
    hideAlert();

    steps.forEach(function (section) {
      var isActive = Number(section.getAttribute('data-step')) === n;
      section.hidden = !isActive;
      section.classList.remove('is-entering');
      if (isActive) {
        void section.offsetWidth; // restart the CSS animation
        section.classList.add('is-entering');
      }
    });

    progressFill.style.width = (n / TOTAL_STEPS * 100) + '%';
    progressBar.setAttribute('aria-valuenow', String(n));
    stepNumber.textContent = String(n);
    stepName.textContent = t(STEP_TITLE_KEYS[n]);

    btnBack.hidden = n === 1;
    btnNext.hidden = n === TOTAL_STEPS;
    btnSubmit.hidden = n !== TOTAL_STEPS;

    if (n === 2) { renderSelectionSummary(); renderApartmentOptions(); }

    if (moveFocus) {
      var heading = $('#step' + n + 'Title');
      if (heading) heading.focus({ preventScroll: true });
      var card = $('#formCard');
      if (card.getBoundingClientRect().top < 0) {
        card.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }

  function goNext() {
    if (!validateStep(state.step)) return;
    goToStep(state.step + 1, true);
  }

  function goBack() {
    goToStep(state.step - 1, true);
  }

  /* ------------------------------------------------------------------------
   * 13. META PIXEL
   *     Loaded only when CONFIG.META_PIXEL_ID holds a real numeric ID.
   *     No personal data (name, phone) is ever sent to the Pixel.
   * ---------------------------------------------------------------------- */
  function initMetaPixel() {
    var id = String(CONFIG.META_PIXEL_ID || '').trim();
    if (!isConfigured(id, PLACEHOLDERS.META_PIXEL_ID) || !/^\d{5,20}$/.test(id)) return;

    /* Official Meta Pixel base code */
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq('init', id);
    window.fbq('track', 'PageView');   // PageView on page load
    state.pixelReady = true;
  }

  // Called ONLY after a successful (2xx) backend response.
  function trackLead(payload) {
    if (!state.pixelReady || typeof window.fbq !== 'function') return;
    window.fbq('track', 'Lead', {
      content_name: payload.residence,
      content_category: payload.apartment_type
    }, {
      // Same ID is sent to the backend → lets you deduplicate with the Conversions API
      eventID: payload.event_id
    });
  }

  /* ------------------------------------------------------------------------
   * 14. SUBMISSION
   * ---------------------------------------------------------------------- */
  function collectTracking() {
    var out = {};
    try {
      var params = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) {
        var v = params.get(k);
        if (v) out[k] = v.slice(0, 200);
      });
    } catch (e) { /* old browser */ }
    out.page_url = window.location.origin + window.location.pathname;
    return out;
  }

  function buildPayload() {
    return {
      last_name: inputs.last_name.value.trim().replace(/\s+/g, ' '),
      first_name: inputs.first_name.value.trim().replace(/\s+/g, ' '),
      phone: normalizePhone(inputs.phone.value),      // E.164, e.g. +213555123456
      residence: state.residence,                     // "prestige" | "signature"
      apartment_type: state.apartment,                // e.g. "F5 Duplex"
      preferred_contact_time: radioValue('contact_time'), // "morning" | "afternoon" | "evening"
      language: state.lang,                           // "fr" | "ar"
      consent: inputs.consent.checked === true,
      // Extra (non-personal) fields useful for Meta Ads attribution & dedup:
      event_id: generateEventId(),
      submitted_at: new Date().toISOString(),
      tracking: collectTracking()
    };
  }

  function setSubmitting(on) {
    state.submitting = on;
    btnSubmit.disabled = on;
    btnBack.disabled = on;
    btnSubmit.classList.toggle('is-loading', on);
    btnSubmit.setAttribute('aria-busy', on ? 'true' : 'false');
    $('.btn__label', btnSubmit).textContent = t(on ? 'submitting' : 'submit');
  }

  function submitLead() {
    // Duplicate-submission guard
    if (state.submitting || state.submitted) return;

    hideAlert();
    if (!validateStep(3)) return;            // never submit (or track) invalid data
    if (!RESIDENCES[state.residence] || !state.apartment) { goToStep(1, true); return; }

    // ---------------------------------------------------------------------
    // BACKEND / SUPABASE INTEGRATION
    // Accepts either Supabase (URL + Anon/Publishable Key) or standard API_ENDPOINT
    // ---------------------------------------------------------------------
    var isSupabase = isConfigured(CONFIG.SUPABASE_URL, PLACEHOLDERS.SUPABASE_URL) &&
                     isConfigured(CONFIG.SUPABASE_ANON_KEY, PLACEHOLDERS.SUPABASE_ANON_KEY);
    var isApiEndpoint = isConfigured(CONFIG.API_ENDPOINT, PLACEHOLDERS.API_ENDPOINT);

    if (!isSupabase && !isApiEndpoint) {
      showAlert('alertNotConfigured');
      return;
    }

    var endpoint = isSupabase
      ? CONFIG.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + (CONFIG.SUPABASE_TABLE || 'leads')
      : CONFIG.API_ENDPOINT;

    var headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (isSupabase) {
      headers['apikey'] = CONFIG.SUPABASE_ANON_KEY;
      headers['Authorization'] = 'Bearer ' + CONFIG.SUPABASE_ANON_KEY;
      headers['Prefer'] = 'return=minimal';
    }

    var payload = buildPayload();
    setSubmitting(true);

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, CONFIG.REQUEST_TIMEOUT_MS);

    fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      credentials: 'omit',
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) {
          // Log server response details to browser console for easy diagnosis
          res.json().then(function (errBody) {
            if (window.console && console.warn) {
              console.warn('[CEPRO Form] Server submission error:', errBody);
            }
          }).catch(function () {});

          var type = res.status === 429 ? 'alertRateLimited'
            : (res.status >= 400 && res.status < 500 ? 'alertRejected' : 'alertServer');
          throw { alert: type };
        }
        // 2xx. If the backend returns JSON with { "success": false }, treat it as a rejection.
        return res.text().then(function (body) {
          if (body) {
            var data = null;
            try { data = JSON.parse(body); } catch (e) { data = null; }
            if (data && data.success === false) throw { alert: 'alertRejected' };
          }
        });
      })
      .then(function () {
        clearTimeout(timer);
        state.submitted = true;               // keeps the guard closed for good
        trackLead(payload);                   // Meta "Lead" — success only
        showSuccess();
      })
      .catch(function (err) {
        clearTimeout(timer);
        var key = (err && err.alert) ? err.alert
          : (err && err.name === 'AbortError') ? 'alertTimeout'
          : 'alertNetwork';
        setSubmitting(false);
        showAlert(key);
        // Intentionally no console logging of the payload (personal data).
      });
  }

  function showSuccess() {
    renderRecap();
    form.hidden = true;
    progress.hidden = true;
    successScreen.hidden = false;
    var title = $('#successTitle');
    title.focus({ preventScroll: true });
    $('#formCard').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  /* ------------------------------------------------------------------------
   * 15. EVENT LISTENERS
   * ---------------------------------------------------------------------- */
  function bindEvents() {
    // Language switch
    $$('.lang-switch__btn').forEach(function (btn) {
      btn.addEventListener('click', function () { applyLanguage(btn.getAttribute('data-lang')); });
    });

    // Residence selection → update availability, reset apartment if changed
    $$('input[name="residence"]', form).forEach(function (input) {
      input.addEventListener('change', function () {
        var next = radioValue('residence');
        if (next !== state.residence) {
          state.residence = next;
          state.apartment = '';
          clearError('apartment_type');
          renderApartmentOptions();
          renderSelectionSummary();
        }
        syncSelectedClasses('residence');
        renderAvailability();
        clearError('residence');
      });
    });

    // Apartment selection (delegated — options are rendered dynamically)
    apartmentOptions.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'apartment_type') {
        state.apartment = e.target.value;
        syncSelectedClasses('apartment_type');
        clearError('apartment_type');
      }
    });

    // Contact time
    $$('input[name="contact_time"]', form).forEach(function (input) {
      input.addEventListener('change', function () {
        syncSelectedClasses('contact_time');
        clearError('contact_time');
      });
    });

    // Text inputs: re-validate live once an error is displayed
    ['last_name', 'first_name', 'phone'].forEach(function (field) {
      inputs[field].addEventListener('input', function () {
        if (state.errors[field]) validateField(field);
      });
      inputs[field].addEventListener('blur', function () {
        if (inputs[field].value.trim()) validateField(field);
      });
    });

    // Phone: tidy formatting on blur when valid
    inputs.phone.addEventListener('blur', function () {
      var v = inputs.phone.value.trim();
      if (v && normalizePhone(v)) inputs.phone.value = formatPhoneForDisplay(v);
    });

    inputs.consent.addEventListener('change', function () {
      if (inputs.consent.checked) clearError('consent');
    });

    // Navigation
    btnNext.addEventListener('click', goNext);
    btnBack.addEventListener('click', goBack);
    $('#changeResidence').addEventListener('click', function () { goToStep(1, true); });

    // Enter key / submit button
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (state.step < TOTAL_STEPS) goNext();
      else submitLead();
    });
  }

  /* ------------------------------------------------------------------------
   * 16. INIT
   * ---------------------------------------------------------------------- */
  function init() {
    // Restore radio state if the browser kept it (back/forward cache)
    state.residence = RESIDENCES[radioValue('residence')] ? radioValue('residence') : '';
    syncSelectedClasses('residence');
    syncSelectedClasses('contact_time');

    $('#year').textContent = String(new Date().getFullYear());
    renderPrivacyLink();
    bindEvents();
    applyLanguage(initialLanguage());
    goToStep(1, false);
    initMetaPixel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

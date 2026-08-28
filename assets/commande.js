/* =============================================================================
   Pro Remorque — RESERVATION
   Formulaire court, recapitulatif colle, envoi vers CFG.endpoint. Sans
   endpoint configure, on retombe sur le client courriel du visiteur : le site
   est fonctionnel des la premiere minute en ligne, sans backend.

   BRANCHEMENT D'UN VRAI PAIEMENT
   -----------------------------
   Le depot n'est pas encaisse ici : aucun numero de carte n'est demande ni
   transmis. Pour encaisser, remplacez envoyer() par un appel a votre
   fournisseur (Stripe Checkout, Square, Moneris) qui renvoie ensuite vers
   merci.html. Le contenu de la commande est deja assemble dans charge().
   ============================================================================= */
(function () {
  'use strict';

  var CAT = window.PR_CATALOGUE, S = window.PRShop;
  if (!CAT || !S) { return; }
  var CFG = CAT.config;
  var e = S.echapper;
  var racine = document.getElementById('commande-racine');
  if (!racine) { return; }

  var SUCCURSALES = [
    { id: 'quebec', nom: 'Québec · Lévis', adr: '1020 Chemin Olivier, Lévis' },
    { id: 'thetford', nom: 'Thetford Mines', adr: '410 boul. Frontenac Ouest' },
    { id: 'alma', nom: 'Alma', adr: 'Lac-Saint-Jean' }
  ];

  /* ===== panier vide : on n'affiche pas un formulaire inutile ============= */
  if (!S.lignes().length) {
    racine.innerHTML =
      '<div class="vide-etat"><b>Rien à réserver pour l’instant.</b>' +
      '<p>Choisissez une remorque dans l’inventaire, puis revenez ici. Le dépôt l’immobilise à votre nom le temps que vous veniez la voir.</p>' +
      '<a class="btn btn-solid" href="inventaire.html"><span>Voir l’inventaire</span></a></div>';
    return;
  }

  function champ(id, label, type, ph, requis, largeur) {
    return '<div class="field' + (largeur === 'plein' ? ' plein' : '') + '">' +
      '<label for="' + id + '">' + label + (requis ? '' : ' <span class="opt">(facultatif)</span>') + '</label>' +
      '<input id="' + id + '" name="' + id + '" type="' + type + '" placeholder="' + ph + '"' +
      (requis ? ' required' : '') +
      (type === 'tel' ? ' autocomplete="tel"' : '') +
      (type === 'email' ? ' autocomplete="email"' : '') +
      '><p class="err-msg"></p></div>';
  }

  function rendre() {
    var t = S.totaux();

    racine.className = 'co';
    racine.innerHTML =
      '<form id="co-form" novalidate>' +

        '<div class="co-bloc">' +
          '<h2>Vos coordonnées</h2>' +
          '<p class="sous">C’est ce qui nous permet de vous rappeler pour fixer la date. Rien d’autre.</p>' +
          '<div class="co-grille">' +
            champ('prenom', 'Prénom', 'text', 'Jean', true) +
            champ('nom', 'Nom', 'text', 'Tremblay', true) +
            champ('tel', 'Téléphone', 'tel', '418 555-0123', true) +
            champ('courriel', 'Courriel', 'email', 'jean@exemple.ca', true) +
          '</div>' +
        '</div>' +

        '<div class="co-bloc">' +
          '<h2>Comment vous la récupérez</h2>' +
          '<p class="sous">Le ramassage est gratuit. La livraison se confirme par téléphone selon la distance.</p>' +
          '<div class="modes">' +
            '<label class="mode"><input type="radio" name="mode" value="ramassage" checked>' +
            '<span><b>Ramassage en succursale</b><p>Vous venez la chercher. On la sort, on vérifie l’attelage et les freins avec vous.</p></span>' +
            '<span class="px">Gratuit</span></label>' +
            '<label class="mode"><input type="radio" name="mode" value="livraison">' +
            '<span><b>Livraison à votre adresse</b><p>Grand Montréal et Montérégie au tarif affiché. Ailleurs au Québec, on vous rappelle avec le prix exact.</p></span>' +
            '<span class="px">dès ' + S.fmt(CFG.livraisonBase) + '</span></label>' +
          '</div>' +
          '<div class="co-grille" style="margin-top:1.2rem">' +
            '<div class="field plein" id="bloc-succ">' +
              '<label for="succursale">Succursale</label>' +
              '<select id="succursale" name="succursale">' +
              SUCCURSALES.map(function (s) {
                return '<option value="' + s.id + '">' + e(s.nom) + ' — ' + e(s.adr) + '</option>';
              }).join('') +
              '</select><p class="err-msg"></p></div>' +
            '<div class="field plein" id="bloc-adr" hidden>' +
              '<label for="adresse">Adresse de livraison</label>' +
              '<input id="adresse" name="adresse" type="text" placeholder="123 rue Principale, Ville, code postal" autocomplete="street-address">' +
              '<p class="err-msg"></p></div>' +
          '</div>' +
        '</div>' +

        '<div class="co-bloc">' +
          '<h2>Le dépôt</h2>' +
          '<p class="sous">Ce que vous confirmez ici, c’est la réservation. Aucun numéro de carte n’est demandé sur cette page.</p>' +
          '<div class="field plein">' +
            '<label for="note">Une précision pour le conseiller</label>' +
            '<textarea id="note" name="note" placeholder="Le véhicule qui va la tirer, une date qui vous arrange, une question sur l’attelage…"></textarea>' +
          '</div>' +
          '<p class="co-legal">En confirmant, vous réservez ' +
            (t.nbRemorques ? 'les unités listées' : 'les articles listés') +
            ' à votre nom. Un conseiller vous appelle le jour ouvrable suivant pour percevoir le dépôt de ' +
            S.fmt(CFG.depot) + ' par remorque et convenir de la suite. Le dépôt est remboursable sept jours, sans justification. ' +
            'Les droits d’immatriculation de la SAAQ ne sont pas inclus.</p>' +
          '<div class="form-fail" id="co-fail" hidden></div>' +
          '<button type="submit" class="btn btn-solid" id="co-submit" style="width:100%;margin-top:1.3rem">' +
            '<span>Confirmer la réservation</span></button>' +
        '</div>' +

      '</form>' +

      '<aside class="recap">' +
        '<h2>Récapitulatif</h2>' +
        t.lignes.map(function (l) {
          var vig = l.estRemorque
            ? '<img src="' + l.article.jpg + '" alt="" loading="lazy" width="52" height="39">'
            : '<span class="drawer-ico" aria-hidden="true" style="width:52px;text-align:center">+</span>';
          return '<div class="co-recap-l">' + vig +
            '<span class="n">' + e(l.nom) + (l.qte > 1 ? ' <span style="color:var(--text-secondary)">×' + l.qte + '</span>' : '') + '</span>' +
            '<span class="p">' + (l.surDemande ? '—' : S.fmt(l.estRemorque ? CFG.depot * l.qte : l.prix * l.qte)) + '</span></div>';
        }).join('') +
        '<div style="height:.8rem"></div>' +
        '<div class="recap-l"><span>Sous-total</span><b>' + S.fmt(t.sousTotal) + '</b></div>' +
        '<div class="recap-l"><span>TPS (5 %)</span><b>' + S.fmt(t.tps) + '</b></div>' +
        '<div class="recap-l"><span>TVQ (9,975 %)</span><b>' + S.fmt(t.tvq) + '</b></div>' +
        '<div class="recap-sep"></div>' +
        '<div class="recap-total"><span>À payer aujourd’hui</span><b>' + S.fmt(t.total) + '</b></div>' +
        (t.solde > 0
          ? '<p class="recap-solde">Solde à la récupération : <b>' + S.fmt(t.solde) + '</b> avant taxes.</p>'
          : '') +
        '<p class="recap-secure">Aucune carte demandée sur cette page</p>' +
      '</aside>';

    brancher();
  }

  /* ===== interactions ===================================================== */
  function brancher() {
    var form = document.getElementById('co-form');
    var blocSucc = document.getElementById('bloc-succ');
    var blocAdr = document.getElementById('bloc-adr');

    form.querySelectorAll('input[name="mode"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var livraison = form.mode.value === 'livraison';
        blocSucc.hidden = livraison;
        blocAdr.hidden = !livraison;
      });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!valider(form)) { return; }
      envoyer(form);
    });
  }

  function erreur(champEl, message) {
    var boite = champEl.closest('.field');
    boite.classList.add('err');
    boite.querySelector('.err-msg').textContent = message;
  }
  function nettoyer(form) {
    form.querySelectorAll('.field.err').forEach(function (f) { f.classList.remove('err'); });
  }

  function valider(form) {
    nettoyer(form);
    var ok = true, premier = null;
    function ko(el, msg) {
      erreur(el, msg); ok = false; if (!premier) { premier = el; }
    }
    if (!form.prenom.value.trim()) { ko(form.prenom, 'On a besoin de votre prénom.'); }
    if (!form.nom.value.trim()) { ko(form.nom, 'On a besoin de votre nom.'); }

    var tel = form.tel.value.replace(/\D/g, '');
    if (tel.length < 10) { ko(form.tel, 'Un numéro à 10 chiffres, pour qu’on puisse vous rappeler.'); }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.courriel.value.trim())) {
      ko(form.courriel, 'Ce courriel a l’air incomplet.');
    }
    if (form.mode.value === 'livraison' && !form.adresse.value.trim()) {
      ko(form.adresse, 'Où est-ce qu’on la livre ?');
    }
    if (premier) {
      premier.focus();
      premier.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return ok;
  }

  /* ===== contenu de la commande =========================================== */
  function numero() {
    /* PR-AAMMJJ-XXXX : lisible au telephone, unique en pratique */
    var d = new Date();
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var suffixe = Math.floor(Math.random() * 9000 + 1000);
    return 'PR-' + String(d.getFullYear()).slice(2) + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + suffixe;
  }

  function charge(form) {
    var t = S.totaux();
    var succ = SUCCURSALES.filter(function (s) { return s.id === form.succursale.value; })[0];
    return {
      numero: numero(),
      date: new Date().toISOString(),
      client: {
        prenom: form.prenom.value.trim(),
        nom: form.nom.value.trim(),
        tel: form.tel.value.trim(),
        courriel: form.courriel.value.trim()
      },
      mode: form.mode.value,
      succursale: form.mode.value === 'ramassage' ? (succ ? succ.nom : '') : '',
      adresse: form.mode.value === 'livraison' ? form.adresse.value.trim() : '',
      note: form.note.value.trim(),
      articles: t.lignes.map(function (l) {
        return {
          id: l.id, nom: l.nom, qte: l.qte,
          prix: l.surDemande ? null : l.prix,
          type: l.estRemorque ? 'remorque' : 'accessoire'
        };
      }),
      depotAujourdhui: Math.round(t.total * 100) / 100,
      soldeEstime: Math.round(t.solde * 100) / 100
    };
  }

  function texte(c) {
    return 'RESERVATION ' + c.numero + '\n\n' +
      c.client.prenom + ' ' + c.client.nom + '\n' +
      c.client.tel + '\n' + c.client.courriel + '\n\n' +
      (c.mode === 'livraison' ? 'Livraison : ' + c.adresse : 'Ramassage : ' + c.succursale) + '\n\n' +
      'ARTICLES\n' + c.articles.map(function (a) {
        return '- ' + a.nom + ' x' + a.qte + (a.prix == null ? ' (prix sur demande)' : ' — ' + a.prix + ' $');
      }).join('\n') + '\n\n' +
      'A payer aujourd\'hui : ' + c.depotAujourdhui + ' $ (taxes incluses)\n' +
      'Solde estime : ' + c.soldeEstime + ' $\n' +
      (c.note ? '\nNote du client :\n' + c.note + '\n' : '');
  }

  function envoyer(form) {
    var bouton = document.getElementById('co-submit');
    var fail = document.getElementById('co-fail');
    var c = charge(form);
    bouton.disabled = true;
    bouton.innerHTML = '<span>Envoi…</span>';
    fail.hidden = true;

    function reussite() {
      try { sessionStorage.setItem('pr_derniere_commande', JSON.stringify(c)); } catch (err) { /* sans suite */ }
      S.vider();
      location.href = 'merci.html';
    }

    if (!CFG.endpoint) {
      /* Aucun endpoint : on ouvre le client courriel, pre-rempli. */
      var lien = 'mailto:' + CFG.courriel +
        '?subject=' + encodeURIComponent('Réservation ' + c.numero) +
        '&body=' + encodeURIComponent(texte(c));
      var a = document.createElement('a');
      a.href = lien; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(reussite, 700);
      return;
    }

    fetch(CFG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c)
    }).then(function (r) {
      if (!r.ok) { throw new Error(r.status); }
      reussite();
    }).catch(function () {
      bouton.disabled = false;
      bouton.innerHTML = '<span>Confirmer la réservation</span>';
      fail.hidden = false;
      fail.innerHTML = '<b>L’envoi n’a pas passé.</b>' +
        'Votre panier est intact. Réessayez, ou appelez-nous directement au ' +
        '<a href="tel:' + CFG.telHref + '">' + CFG.tel + '</a> — on prend la réservation au téléphone en deux minutes.';
    });
  }

  rendre();
})();

/* =============================================================================
   Pro Remorque — MOTEUR BOUTIQUE
   Panier persistant, calcul des taxes du Quebec, estimation de financement,
   tiroir de panier, barre d'action mobile, produits vus recemment.

   Depend de assets/data/catalogue.js (doit etre charge avant).
   Expose window.PRShop.
   ============================================================================= */
(function () {
  'use strict';

  var CAT = window.PR_CATALOGUE;
  if (!CAT) { return; }
  var CFG = CAT.config;
  var CLE_PANIER = 'pr_panier_v1';
  var CLE_VUS = 'pr_vus_v1';

  /* ===== stockage tolerant (mode prive, cookies bloques) ================== */
  function lire(cle, defaut) {
    try {
      var brut = localStorage.getItem(cle);
      return brut ? JSON.parse(brut) : defaut;
    } catch (e) { return defaut; }
  }
  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) { /* sans suite */ }
  }

  /* ===== formatage ======================================================== */
  var nbsp = ' ';
  function fmt(n) {
    var arrondi = Math.round(n * 100) / 100;
    var entier = Math.floor(Math.abs(arrondi));
    var cents = Math.round((Math.abs(arrondi) - entier) * 100);
    var s = String(entier).replace(/\B(?=(\d{3})+(?!\d))/g, nbsp);
    if (cents) { s += ',' + (cents < 10 ? '0' : '') + cents; }
    return (arrondi < 0 ? '-' : '') + s + nbsp + '$';
  }

  /* ===== financement ====================================================== */
  function mensualite(prix, opts) {
    opts = opts || {};
    var taux = opts.taux == null ? CFG.taux : opts.taux;
    var mois = opts.mois == null ? CFG.termeMois : opts.mois;
    var mise = opts.mise == null ? prix * CFG.miseDeFondsPct : opts.mise;
    var capital = (prix - mise) * (1 + CFG.tps + CFG.tvq);
    if (capital <= 0 || mois <= 0) { return 0; }
    var r = taux / 12;
    if (!r) { return capital / mois; }
    return capital * r / (1 - Math.pow(1 + r, -mois));
  }

  /* ===== panier =========================================================== */
  function lignes() {
    var brut = lire(CLE_PANIER, []);
    if (!Array.isArray(brut)) { return []; }
    var out = [];
    brut.forEach(function (l) {
      var article = CAT.parId(l.id);
      if (!article) { return; }               /* article retire du catalogue */
      var estRemorque = article.cat != null;
      var qte = Math.max(1, parseInt(l.qte, 10) || 1);
      if (estRemorque) { qte = Math.min(qte, article.stock || 1); }
      out.push({
        id: l.id,
        qte: qte,
        article: article,
        estRemorque: estRemorque,
        nom: estRemorque ? article.titre : article.nom,
        prix: estRemorque ? article.prix : article.prix,
        surDemande: !!article.surDemande
      });
    });
    return out;
  }

  function sauver(lst) {
    ecrire(CLE_PANIER, lst.map(function (l) { return { id: l.id, qte: l.qte }; }));
    diffuser();
  }

  function ajouter(id, qte) {
    var article = CAT.parId(id);
    if (!article) { return null; }
    var lst = lignes();
    var existante = lst.filter(function (l) { return l.id === id; })[0];
    var ajout = Math.max(1, parseInt(qte, 10) || 1);
    if (existante) {
      existante.qte += ajout;
      if (existante.estRemorque) { existante.qte = Math.min(existante.qte, article.stock || 1); }
    } else {
      lst.push({ id: id, qte: ajout, estRemorque: article.cat != null });
    }
    sauver(lst);
    return article;
  }

  function definirQte(id, qte) {
    var lst = lignes();
    lst.forEach(function (l) { if (l.id === id) { l.qte = Math.max(1, parseInt(qte, 10) || 1); } });
    sauver(lst);
  }

  function retirer(id) {
    sauver(lignes().filter(function (l) { return l.id !== id; }));
  }

  function vider() { sauver([]); }

  function compte() {
    return lignes().reduce(function (n, l) { return n + l.qte; }, 0);
  }

  /* ===== totaux ===========================================================
     Ce qu'on encaisse en ligne :
       - une remorque -> le depot de reservation (le solde se paie sur place)
       - un accessoire ou un service -> le plein montant
     Les taxes s'appliquent sur ce qui est effectivement paye aujourd'hui.
     Les remorques « prix sur demande » n'entrent dans aucun total.
     ======================================================================== */
  function totaux() {
    var lst = lignes();
    var valeurRemorques = 0, nbRemorques = 0, aDemande = false, accessoires = 0;

    lst.forEach(function (l) {
      if (l.estRemorque) {
        nbRemorques += l.qte;
        if (l.surDemande) { aDemande = true; }
        else { valeurRemorques += l.prix * l.qte; }
      } else {
        accessoires += l.prix * l.qte;
      }
    });

    var depot = nbRemorques * CFG.depot;
    var livraison = 0;
    var sousTotal = depot + accessoires;
    var tps = sousTotal * CFG.tps;
    var tvq = sousTotal * CFG.tvq;

    return {
      lignes: lst,
      nbRemorques: nbRemorques,
      aDemande: aDemande,
      valeurRemorques: valeurRemorques,
      accessoires: accessoires,
      depot: depot,
      livraison: livraison,
      sousTotal: sousTotal,
      tps: tps,
      tvq: tvq,
      total: sousTotal + tps + tvq,
      solde: valeurRemorques - depot
    };
  }

  /* ===== diffusion : tout ce qui affiche le panier se remet a jour ======== */
  var abonnes = [];
  function surChangement(fn) { abonnes.push(fn); fn(); }
  function diffuser() {
    majPastilles();
    abonnes.forEach(function (fn) { try { fn(); } catch (e) { /* sans suite */ } });
  }

  function majPastilles() {
    var n = compte();
    document.querySelectorAll('[data-panier-compte]').forEach(function (el) {
      el.textContent = n;
      el.classList.toggle('vide', n === 0);
    });
    document.querySelectorAll('[data-panier-lien]').forEach(function (el) {
      el.setAttribute('aria-label', n === 0 ? 'Panier, vide' : 'Panier, ' + n + ' article' + (n > 1 ? 's' : ''));
    });
  }

  /* ===== notification d'ajout ============================================= */
  var minuterieToast = null;
  function toast(html) {
    var t = document.getElementById('pr-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pr-toast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.innerHTML = html;
    t.classList.add('on');
    clearTimeout(minuterieToast);
    minuterieToast = setTimeout(function () { t.classList.remove('on'); }, 4200);
  }

  /* ===== tiroir de panier ================================================= */
  function construireTiroir() {
    if (document.getElementById('pr-drawer')) { return; }
    var d = document.createElement('div');
    d.id = 'pr-drawer';
    d.className = 'drawer';
    d.innerHTML =
      '<div class="drawer-fond" data-fermer-tiroir></div>' +
      '<aside class="drawer-panneau" role="dialog" aria-modal="true" aria-label="Votre panier">' +
      '<header class="drawer-tete">' +
      '<h2>Votre panier</h2>' +
      '<button type="button" class="drawer-x" data-fermer-tiroir aria-label="Fermer le panier">&times;</button>' +
      '</header>' +
      '<div class="drawer-corps" id="pr-drawer-corps"></div>' +
      '<footer class="drawer-pied" id="pr-drawer-pied"></footer>' +
      '</aside>';
    document.body.appendChild(d);

    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-fermer-tiroir]')) { fermerTiroir(); }
    });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { fermerTiroir(); }
    });
  }

  function rendreTiroir() {
    var corps = document.getElementById('pr-drawer-corps');
    var pied = document.getElementById('pr-drawer-pied');
    if (!corps || !pied) { return; }
    var t = totaux();

    if (!t.lignes.length) {
      corps.innerHTML = '<p class="drawer-vide">Votre panier est vide.<br><a href="inventaire.html">Voir les remorques disponibles</a></p>';
      pied.innerHTML = '';
      return;
    }

    corps.innerHTML = t.lignes.map(function (l) {
      var vignette = l.estRemorque
        ? '<picture><source srcset="' + l.article.webp + '" type="image/webp"><img src="' + l.article.jpg + '" alt="" width="120" height="90" loading="lazy"></picture>'
        : '<span class="drawer-ico" aria-hidden="true">+</span>';
      var prix = l.surDemande ? 'Prix sur demande'
        : fmt(l.prix * l.qte) + (l.estRemorque ? '' : (l.qte > 1 ? ' <small>(' + l.qte + ' x ' + fmt(l.prix) + ')</small>' : ''));
      return '<div class="drawer-ligne">' +
        '<div class="drawer-vignette">' + vignette + '</div>' +
        '<div class="drawer-info"><p class="drawer-nom">' + echapper(l.nom) + '</p>' +
        '<p class="drawer-prix">' + prix + '</p></div>' +
        '<button type="button" class="drawer-retirer" data-retirer="' + l.id + '" aria-label="Retirer ' + echapper(l.nom) + '">&times;</button>' +
        '</div>';
    }).join('');

    pied.innerHTML =
      (t.nbRemorques
        ? '<p class="drawer-note">Réservation de ' + t.nbRemorques + ' remorque' + (t.nbRemorques > 1 ? 's' : '') +
          ' : <b>' + fmt(CFG.depot) + '</b> par unité aujourd’hui, le solde à la livraison.</p>'
        : '') +
      '<div class="drawer-total"><span>À payer aujourd’hui</span><b>' + fmt(t.total) + '</b></div>' +
      '<p class="drawer-taxes">taxes incluses</p>' +
      '<a class="btn btn-solid drawer-cta" href="commande.html">Passer à la réservation</a>' +
      '<a class="drawer-lien" href="panier.html">Voir le panier en détail</a>';

    corps.querySelectorAll('[data-retirer]').forEach(function (b) {
      b.addEventListener('click', function () { retirer(b.getAttribute('data-retirer')); });
    });
  }

  function ouvrirTiroir() {
    construireTiroir();
    rendreTiroir();
    document.getElementById('pr-drawer').classList.add('on');
    document.body.classList.add('drawer-ouvert');
  }
  function fermerTiroir() {
    var d = document.getElementById('pr-drawer');
    if (d) { d.classList.remove('on'); }
    document.body.classList.remove('drawer-ouvert');
  }

  /* ===== produits vus recemment =========================================== */
  function noterVu(id) {
    var vus = lire(CLE_VUS, []);
    if (!Array.isArray(vus)) { vus = []; }
    vus = vus.filter(function (v) { return v !== id; });
    vus.unshift(id);
    ecrire(CLE_VUS, vus.slice(0, 8));
  }
  function vusRecemment(saufId) {
    var vus = lire(CLE_VUS, []);
    if (!Array.isArray(vus)) { return []; }
    return vus.filter(function (v) { return v !== saufId; })
      .map(function (v) { return CAT.parId(v); })
      .filter(function (p) { return p && p.cat != null; });
  }

  /* ===== carte produit (partagee boutique / suggestions) ================== */
  function echapper(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function carte(p) {
    var mens = p.surDemande ? null : mensualite(p.prix);
    var rareté = p.stock <= 1
      ? '<span class="veh-rare">Dernière en stock</span>'
      : (p.stock <= 2 ? '<span class="veh-rare">Plus que ' + p.stock + ' en stock</span>' : '');
    return '' +
      '<article class="veh rv" data-cat="' + p.cat + '" data-price="' + p.prix + '" data-year="' + p.annee + '" data-brand="' + echapper(p.marque) + '" data-id="' + p.id + '">' +
      '<a class="veh-lien" href="' + p.url + '">' +
      '<div class="ph"><span class="tag badge" aria-hidden="true"><span>' + echapper(p.catLabel) + '</span></span>' + rareté +
      '<picture><source srcset="' + p.webp + '" type="image/webp">' +
      '<img src="' + p.jpg + '" alt="' + echapper(p.titre) + '" loading="lazy" decoding="async" width="900" height="675"></picture></div>' +
      '<div class="body">' +
      '<span class="yr">' + p.annee + '</span>' +
      '<h3>' + echapper(p.marque) + '</h3>' +
      '<span class="model">' + echapper(p.modele) + '</span>' +
      '<span class="foot"><span class="price">' + (p.surDemande ? 'Prix sur demande' : fmt(p.prix)) + '</span></span>' +
      (mens ? '<span class="veh-mens">ou ' + fmt(Math.round(mens)) + ' / mois<span class="veh-mens-i" title="Estimation : ' + (CFG.taux * 100).toFixed(2).replace('.', ',') + ' % sur ' + CFG.termeMois + ' mois, ' + (CFG.miseDeFondsPct * 100) + ' % comptant, taxes incluses. Sous réserve d’approbation.">?</span></span>' : '') +
      '</div></a>' +
      '<div class="veh-actions">' +
      (p.surDemande
        ? '<a class="btn btn-ghost veh-btn" href="contact.html?produit=' + p.id + '">Demander le prix</a>'
        : '<button type="button" class="btn btn-solid veh-btn" data-ajouter="' + p.id + '">Réserver</button>') +
      '<a class="veh-detail" href="' + p.url + '">Détails</a>' +
      '</div></article>';
  }

  /* ===== delegation globale : [data-ajouter] marche sur toutes les pages == */
  document.addEventListener('click', function (e) {
    var btnAjout = e.target.closest('[data-ajouter]');
    if (btnAjout) {
      e.preventDefault();
      var article = ajouter(btnAjout.getAttribute('data-ajouter'), btnAjout.getAttribute('data-qte') || 1);
      if (article) {
        var nom = article.cat != null ? article.titre : article.nom;
        toast('<b>Ajouté au panier</b><span>' + echapper(nom) + '</span>' +
          '<a href="commande.html">Réserver &rarr;</a>');
        if (btnAjout.hasAttribute('data-ouvrir-tiroir')) { ouvrirTiroir(); }
        btnAjout.classList.add('ajoute');
        setTimeout(function () { btnAjout.classList.remove('ajoute'); }, 1400);
      }
      return;
    }
    if (e.target.closest('[data-ouvrir-panier]')) {
      e.preventDefault();
      ouvrirTiroir();
    }
  });

  /* ===== injection de la pastille panier dans la barre de navigation ====== */
  function injecterNav() {
    document.querySelectorAll('.nav-panel').forEach(function (panneau) {
      if (panneau.querySelector('[data-panier-lien]')) { return; }
      var a = document.createElement('a');
      a.className = 'nav-panier';
      a.href = 'panier.html';
      a.setAttribute('data-panier-lien', '');
      a.setAttribute('data-ouvrir-panier', '');
      a.innerHTML = '<span class="nav-panier-ico" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="9" cy="20" r="1.6"></circle><circle cx="18" cy="20" r="1.6"></circle>' +
        '<path d="M2 3h3l2.6 12.2a1.6 1.6 0 0 0 1.6 1.3h8.5a1.6 1.6 0 0 0 1.6-1.3L21 7H6"></path></svg>' +
        '</span><span class="nav-panier-n" data-panier-compte>0</span>';
      panneau.appendChild(a);
    });
  }

  /* ===== demarrage ======================================================== */
  function demarrer() {
    injecterNav();
    construireTiroir();
    /* diffuser() plutot que surChangement() : la pastille doit refleter le
       panier stocke des le chargement, pas seulement apres une modification. */
    abonnes.push(rendreTiroir);
    diffuser();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else { demarrer(); }

  window.PRShop = {
    config: CFG,
    fmt: fmt,
    echapper: echapper,
    mensualite: mensualite,
    lignes: lignes,
    ajouter: ajouter,
    retirer: retirer,
    definirQte: definirQte,
    vider: vider,
    compte: compte,
    totaux: totaux,
    surChangement: surChangement,
    ouvrirTiroir: ouvrirTiroir,
    fermerTiroir: fermerTiroir,
    toast: toast,
    carte: carte,
    noterVu: noterVu,
    vusRecemment: vusRecemment
  };
})();

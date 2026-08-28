/* =============================================================================
   Pro Remorque — PAGE PANIER
   ============================================================================= */
(function () {
  'use strict';

  var CAT = window.PR_CATALOGUE, S = window.PRShop;
  if (!CAT || !S) { return; }
  var CFG = CAT.config;
  var e = S.echapper;
  var racine = document.getElementById('panier-racine');
  if (!racine) { return; }

  function ligne(l) {
    var vignette = l.estRemorque
      ? '<picture><source srcset="' + l.article.webp + '" type="image/webp">' +
        '<img src="' + l.article.jpg + '" alt="" width="160" height="120" loading="lazy"></picture>'
      : '<span class="drawer-ico" aria-hidden="true">+</span>';

    var meta = l.estRemorque
      ? e(l.article.catLabel) + '<span class="sep">·</span>' + l.article.annee +
        '<span class="sep">·</span>' + e(l.article.condition) +
        (l.article.stock <= 1 ? '<span class="sep">·</span><span style="color:var(--amber)">dernière en stock</span>' : '')
      : (l.article.type === 'service' ? 'Service' : 'Accessoire');

    var nom = l.estRemorque
      ? '<a href="' + l.article.url + '">' + e(l.nom) + '</a>'
      : e(l.nom);

    var prix = l.surDemande
      ? '<span style="font-size:1rem;color:var(--text-secondary)">Prix sur demande</span>'
      : S.fmt(l.prix * l.qte);

    /* Une remorque est une unite physique : la quantite ne bouge pas.
       Un accessoire, oui. */
    var quantite = l.estRemorque ? '' :
      '<div class="qty">' +
      '<button type="button" data-moins="' + l.id + '"' + (l.qte <= 1 ? ' disabled' : '') + ' aria-label="Retirer un">−</button>' +
      '<span>' + l.qte + '</span>' +
      '<button type="button" data-plus="' + l.id + '" aria-label="Ajouter un">+</button></div>';

    return '<div class="cart-ligne">' +
      '<div class="cart-vignette">' + vignette + '</div>' +
      '<div><p class="cart-nom">' + nom + '</p><p class="cart-meta">' + meta + '</p>' +
      (l.estRemorque && !l.surDemande
        ? '<p class="cart-meta">Dépôt aujourd’hui : <b style="color:var(--text-primary)">' + S.fmt(CFG.depot) + '</b></p>'
        : '') +
      '</div>' +
      '<div class="cart-droite"><span class="cart-px">' + prix + '</span>' + quantite +
      '<button type="button" class="cart-retirer" data-retirer="' + l.id + '">Retirer</button></div>' +
      '</div>';
  }

  function rendre() {
    var t = S.totaux();

    if (!t.lignes.length) {
      racine.innerHTML =
        '<div class="vide-etat"><b>Votre panier est vide.</b>' +
        '<p>Vingt-trois remorques attendent dans la cour. Filtrez par catégorie, par prix ou par capacité — et réservez celle qui vous convient en deux clics.</p>' +
        '<a class="btn btn-solid" href="inventaire.html"><span>Voir l’inventaire</span></a></div>';
      var sa = document.getElementById('addons-sect');
      if (sa) { sa.hidden = true; }
      return;
    }

    racine.className = 'cart';
    racine.innerHTML =
      '<div class="cart-lignes">' + t.lignes.map(ligne).join('') + '</div>' +
      '<aside class="recap">' +
        '<h2>Votre réservation</h2>' +
        (t.nbRemorques
          ? '<div class="recap-l"><span>Dépôt · ' + t.nbRemorques + ' remorque' + (t.nbRemorques > 1 ? 's' : '') +
            '</span><b>' + S.fmt(t.depot) + '</b></div>'
          : '') +
        (t.accessoires
          ? '<div class="recap-l"><span>Accessoires et services</span><b>' + S.fmt(t.accessoires) + '</b></div>'
          : '') +
        '<div class="recap-sep"></div>' +
        '<div class="recap-l"><span>Sous-total</span><b>' + S.fmt(t.sousTotal) + '</b></div>' +
        '<div class="recap-l"><span>TPS (5 %)</span><b>' + S.fmt(t.tps) + '</b></div>' +
        '<div class="recap-l"><span>TVQ (9,975 %)</span><b>' + S.fmt(t.tvq) + '</b></div>' +
        '<div class="recap-sep"></div>' +
        '<div class="recap-total"><span>À payer aujourd’hui</span><b>' + S.fmt(t.total) + '</b></div>' +
        (t.solde > 0
          ? '<p class="recap-solde">Solde à régler à la succursale, au ramassage ou à la livraison : <b>' +
            S.fmt(t.solde) + '</b> avant taxes. Comptant, virement ou financement approuvé.</p>'
          : '') +
        (t.aDemande
          ? '<p class="recap-solde">Une unité de votre panier est en pré-arrivage : son prix vous sera confirmé par téléphone avant tout engagement.</p>'
          : '') +
        '<a class="btn btn-solid" href="commande.html"><span>Passer à la réservation</span></a>' +
        '<p class="recap-secure">Dépôt remboursable 7 jours</p>' +
      '</aside>';

    var sect = document.getElementById('addons-sect');
    if (sect) {
      var dejaLa = t.lignes.map(function (l) { return l.id; });
      var cats = t.lignes.filter(function (l) { return l.estRemorque; })
        .map(function (l) { return l.article.cat; });
      var proposables = CAT.accessoires.filter(function (a) {
        if (dejaLa.indexOf(a.id) >= 0) { return false; }
        if (!a.pertinent.length) { return true; }
        return a.pertinent.some(function (c) { return cats.indexOf(c) >= 0; });
      }).slice(0, 4);

      sect.hidden = !proposables.length;
      if (proposables.length) {
        document.getElementById('addons').innerHTML = proposables.map(function (a) {
          return '<div class="addon"><b>' + e(a.nom) + '</b><p>' + e(a.desc) + '</p>' +
            '<div class="pied"><span class="px">' + S.fmt(a.prix) + '</span>' +
            '<button type="button" data-ajouter="' + a.id + '">Ajouter</button></div></div>';
        }).join('');
      }
    }
  }

  racine.addEventListener('click', function (ev) {
    var b;
    if ((b = ev.target.closest('[data-retirer]'))) { S.retirer(b.getAttribute('data-retirer')); }
    else if ((b = ev.target.closest('[data-plus]'))) {
      var idP = b.getAttribute('data-plus');
      S.definirQte(idP, (S.lignes().filter(function (l) { return l.id === idP; })[0] || {}).qte + 1);
    } else if ((b = ev.target.closest('[data-moins]'))) {
      var idM = b.getAttribute('data-moins');
      S.definirQte(idM, (S.lignes().filter(function (l) { return l.id === idM; })[0] || {}).qte - 1);
    }
  });

  S.surChangement(rendre);
})();

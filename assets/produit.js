/* =============================================================================
   Pro Remorque — FICHE PRODUIT
   Rend la fiche a partir de ?id=, injecte le balisage Product pour Google,
   pilote le calculateur de mensualite et la barre d'achat collante.
   ============================================================================= */
(function () {
  'use strict';

  var CAT = window.PR_CATALOGUE, S = window.PRShop;
  if (!CAT || !S) { return; }
  var CFG = CAT.config;
  var e = S.echapper;

  var id = new URLSearchParams(location.search).get('id');
  var p = id ? CAT.parId(id) : null;
  var racine = document.getElementById('pdp-racine');
  if (!racine) { return; }

  /* ===== produit inconnu : on ne laisse pas le visiteur dans le vide ====== */
  if (!p || p.cat == null) {
    racine.className = '';
    racine.innerHTML =
      '<div class="vide-etat"><b>Cette remorque n’est plus affichée.</b>' +
      '<p>Elle est peut-être vendue, ou le lien est incomplet. L’inventaire complet est à jour à la minute près.</p>' +
      '<a class="btn btn-solid" href="inventaire.html"><span>Voir l’inventaire</span></a></div>';
    document.title = 'Remorque introuvable | Pro Remorque Québec';
    return;
  }

  S.noterVu(p.id);

  /* ===== metadonnees ====================================================== */
  document.title = p.titre + ' | Pro Remorque Québec';
  var desc = p.argument + ' ' + (p.surDemande ? 'Prix sur demande.' : 'À partir de ' + S.fmt(p.prix) + '.');
  var md = document.querySelector('meta[name="description"]');
  if (md) { md.setAttribute('content', desc); }

  var fil = document.getElementById('fil');
  if (fil) {
    fil.innerHTML = '<a href="index.html">Accueil</a> <span aria-hidden="true">/</span> ' +
      '<a href="inventaire.html">Inventaire</a> <span aria-hidden="true">/</span> ' +
      '<a href="inventaire.html#' + p.cat + '">' + e(p.catLabel) + '</a> <span aria-hidden="true">/</span> ' +
      '<span aria-current="page">' + e(p.marque + ' ' + p.modele) + '</span>';
  }

  /* Balisage Product : c'est ce qui fait apparaitre le prix dans Google. */
  var ld = document.createElement('script');
  ld.type = 'application/ld+json';
  var offre = {
    '@type': 'Offer',
    availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    priceCurrency: 'CAD',
    seller: { '@type': 'AutoDealer', name: 'Pro Remorque Québec' }
  };
  if (!p.surDemande) { offre.price = p.prix; }
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.titre,
    brand: { '@type': 'Brand', name: p.marque },
    model: p.modele,
    sku: p.id,
    category: p.catLabel,
    description: p.argument,
    image: ['https://www.proremorque.com/' + p.jpg],
    offers: offre
  });
  document.head.appendChild(ld);

  /* ===== fiche ============================================================ */
  var mens = p.surDemande ? 0 : S.mensualite(p.prix);
  var bas = p.stock <= 2;

  var lignesSpecs = [
    ['Année', p.annee], ['Condition', p.condition], ['Catégorie', p.catLabel],
    ['Longueur', p.specs.longueur], ['Largeur', p.specs.largeur],
    ['Essieux', p.specs.essieux], ['Capacité de charge', p.specs.capacite],
    ['Freins', p.specs.freins], ['Plancher', p.specs.plancher]
  ].filter(function (r) { return r[1]; });

  racine.innerHTML =
    '<div class="pdp-media">' +
      '<div class="pdp-vue">' +
        '<span class="tag" aria-hidden="true"><span>' + e(p.catLabel) + '</span></span>' +
        '<span class="pdp-etat">' + e(p.condition) + '</span>' +
        '<picture><source srcset="' + p.webp + '" type="image/webp">' +
        '<img src="' + p.jpg + '" alt="' + e(p.titre) + '" width="900" height="675" fetchpriority="high"></picture>' +
      '</div>' +
      '<table class="pdp-specs"><caption class="sr-only">Spécifications</caption><tbody>' +
      lignesSpecs.map(function (r) {
        return '<tr><th scope="row">' + e(r[0]) + '</th><td>' + e(r[1]) + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      (p.atouts && p.atouts.length
        ? '<div class="pdp-atouts">' + p.atouts.map(function (a) {
            return '<span class="pdp-atout">' + e(a) + '</span>';
          }).join('') + '</div>'
        : '') +
      (p.surDemande ? '' :
        '<div class="calcbox">' +
        '<h3>Ça donne quoi par mois<span class="dot-red">?</span></h3>' +
        '<div class="rangee"><label for="c-mise">Comptant <output id="o-mise"></output></label>' +
        '<input type="range" id="c-mise" min="0" max="' + Math.round(p.prix * 0.5) + '" step="250" value="' + Math.round(p.prix * CFG.miseDeFondsPct) + '"></div>' +
        '<div class="rangee"><label for="c-terme">Durée <output id="o-terme"></output></label>' +
        '<input type="range" id="c-terme" min="24" max="120" step="12" value="' + CFG.termeMois + '"></div>' +
        '<div class="sortie"><span>Estimation mensuelle</span><b id="o-mens">—</b></div>' +
        '<p class="legal">Estimation à titre indicatif, taxes incluses, au taux de ' +
        (CFG.taux * 100).toFixed(2).replace('.', ',') + '&nbsp;%. Le taux réel dépend de votre dossier de crédit et du prêteur. Sous réserve d’approbation. Ce n’est pas une offre de financement.</p>' +
        '</div>') +
    '</div>' +

    '<div class="pdp-achat">' +
      '<p class="pdp-marque">' + e(p.marque) + '</p>' +
      '<h1 class="pdp-titre">' + e(p.marque + ' ' + p.modele) + '</h1>' +
      '<p class="pdp-modele">' + p.annee + ' · ' + e(p.catLabel) + '</p>' +
      '<div class="pdp-prix-bloc">' +
        '<p class="pdp-prix' + (p.surDemande ? ' demande' : '') + '">' +
          (p.surDemande ? 'Prix sur demande' : S.fmt(p.prix)) + '</p>' +
        '<p class="pdp-taxes">' + (p.surDemande ? 'millésime en pré-arrivage' : 'avant taxes et droits de la SAAQ') + '</p>' +
        (mens ? '<p class="pdp-mens"><b>' + S.fmt(Math.round(mens)) + '</b><span>/ mois estimé</span>' +
          '<a href="financement.html">Financement &rarr;</a></p>' : '') +
      '</div>' +
      '<p class="pdp-stock"><span class="pdp-pastille' + (bas ? ' bas' : '') + '" aria-hidden="true"></span>' +
        (p.stock <= 0 ? 'Non disponible actuellement'
          : (p.stock === 1 ? 'Dernière unité en stock' : p.stock + ' unités en stock')) + '</p>' +
      '<p style="margin-top:1rem;color:var(--text-secondary);font-size:.93rem;line-height:1.55">' + e(p.argument) + '</p>' +
      '<div class="pdp-actions">' +
        (p.surDemande
          ? '<a class="btn btn-solid" href="contact.html?produit=' + p.id + '"><span>Demander le prix</span></a>'
          : '<button type="button" class="btn btn-solid" data-ajouter="' + p.id + '" data-ouvrir-tiroir><span>Réserver pour ' + S.fmt(CFG.depot) + '</span></button>') +
        '<a class="btn btn-ghost" href="tel:' + CFG.telHref + '"><span>Parler à un conseiller</span></a>' +
      '</div>' +
      '<ul class="pdp-rassure">' +
        '<li><span class="ck" aria-hidden="true">✓</span><span>Dépôt de ' + S.fmt(CFG.depot) + ' remboursable pendant 7 jours, sans justification.</span></li>' +
        '<li><span class="ck" aria-hidden="true">✓</span><span>Le solde se paie à la succursale, une fois que vous l’avez vue.</span></li>' +
        '<li><span class="ck" aria-hidden="true">✓</span><span>Ramassage gratuit à Lévis, Thetford ou Alma. Livraison partout au Québec.</span></li>' +
        '<li><span class="ck" aria-hidden="true">✓</span><span>Attelage, freins et lumières vérifiés avant que vous partiez.</span></li>' +
      '</ul>' +
    '</div>';

  /* ===== calculateur ====================================================== */
  var iMise = document.getElementById('c-mise'), iTerme = document.getElementById('c-terme');
  if (iMise && iTerme) {
    var recalculer = function () {
      var mise = +iMise.value, mois = +iTerme.value;
      document.getElementById('o-mise').textContent = S.fmt(mise);
      document.getElementById('o-terme').textContent = mois + ' mois';
      document.getElementById('o-mens').textContent =
        S.fmt(Math.round(S.mensualite(p.prix, { mise: mise, mois: mois })));
    };
    iMise.addEventListener('input', recalculer);
    iTerme.addEventListener('input', recalculer);
    recalculer();
  }

  /* ===== accessoires pertinents =========================================== */
  var pertinents = CAT.accessoires.filter(function (a) {
    return !a.pertinent.length || a.pertinent.indexOf(p.cat) >= 0;
  }).slice(0, 4);
  var boiteAcc = document.getElementById('addons');
  if (boiteAcc && pertinents.length) {
    document.getElementById('accessoires-sect').hidden = false;
    boiteAcc.innerHTML = pertinents.map(function (a) {
      return '<div class="addon"><b>' + e(a.nom) + '</b><p>' + e(a.desc) + '</p>' +
        '<div class="pied"><span class="px">' + S.fmt(a.prix) + '</span>' +
        '<button type="button" data-ajouter="' + a.id + '">Ajouter</button></div></div>';
    }).join('');
  }

  /* ===== barre d'achat collante (mobile) ================================== */
  var barre = document.getElementById('sticky-buy');
  if (barre) {
    /* La barre d'appel du site vit au meme endroit : on reprend son role ici
       (voir .a-sticky-buy dans shop.css) plutot que de l'empiler par-dessus. */
    barre.innerHTML =
      '<a class="sb-tel" href="tel:' + CFG.telHref + '" aria-label="Appeler Pro Remorque">' +
      '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></a>' +
      '<span class="sb-prix"><b>' + (p.surDemande ? 'Sur demande' : S.fmt(p.prix)) + '</b>' +
      '<span>' + e(p.marque + ' ' + p.modele) + '</span></span>' +
      (p.surDemande
        ? '<a class="btn btn-solid" href="contact.html?produit=' + p.id + '"><span>Demander</span></a>'
        : '<button type="button" class="btn btn-solid" data-ajouter="' + p.id + '" data-ouvrir-tiroir><span>Réserver</span></button>');
    barre.removeAttribute('aria-hidden');
    document.body.classList.add('a-sticky-buy');

    var ancre = document.querySelector('.pdp-actions');
    if (ancre && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entrees) {
        barre.classList.toggle('on', !entrees[0].isIntersecting);
      }, { rootMargin: '-90px 0px 0px 0px' }).observe(ancre);
    } else {
      barre.classList.add('on');
    }
  }

  /* ===== vus recemment ==================================================== */
  var vus = S.vusRecemment(p.id).slice(0, 4);
  if (vus.length) {
    document.getElementById('vus-sect').hidden = false;
    document.getElementById('vus-grid').innerHTML = vus.map(S.carte).join('');
  }
})();

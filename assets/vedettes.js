/* =============================================================================
   Pro Remorque — SELECTION DE LA PAGE D'ACCUEIL
   Six unites reellement en stock, une par categorie tant qu'il y en a, pour
   que la vitrine montre l'etendue du parc plutot que six fois la meme chose.
   ============================================================================= */
(function () {
  'use strict';
  var CAT = window.PR_CATALOGUE, S = window.PRShop;
  var cible = document.getElementById('vedettes-grid');
  if (!CAT || !S || !cible) { return; }

  var dispo = CAT.produits.filter(function (p) { return p.stock > 0 && !p.surDemande; });
  var vues = {}, choix = [];

  /* premier passage : une par categorie, la plus chere (la plus vendeuse en vitrine) */
  dispo.slice().sort(function (a, b) { return b.prix - a.prix; }).forEach(function (p) {
    if (!vues[p.cat]) { vues[p.cat] = 1; choix.push(p); }
  });
  /* second passage : on complete jusqu'a six */
  dispo.forEach(function (p) {
    if (choix.length < 6 && choix.indexOf(p) < 0) { choix.push(p); }
  });

  cible.innerHTML = choix.slice(0, 6).map(S.carte).join('');
})();

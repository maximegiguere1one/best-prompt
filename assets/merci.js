/* =============================================================================
   Pro Remorque — CONFIRMATION
   Relit la commande deposee par commande.js et personnalise la page.
   ============================================================================= */
(function () {
  'use strict';
  var S = window.PRShop;
  var c = null;
  try { c = JSON.parse(sessionStorage.getItem('pr_derniere_commande') || 'null'); } catch (e) { c = null; }

  var elNum = document.getElementById('merci-num');
  var elLigne = document.getElementById('merci-ligne');

  if (!c) {
    /* Arrivee directe sur la page, sans commande : on ne montre pas un faux numero. */
    if (elNum) { elNum.closest('.merci-num').hidden = true; }
    if (elLigne) {
      elLigne.textContent = 'Si vous venez de réserver, un courriel de confirmation est déjà parti. Sinon, l’inventaire est juste en dessous.';
    }
    return;
  }

  if (elNum) { elNum.textContent = c.numero; }

  if (elLigne) {
    var quoi = c.articles.filter(function (a) { return a.type === 'remorque'; });
    var ou = c.mode === 'livraison'
      ? 'On la livre au ' + c.adresse + '.'
      : 'Elle vous attend à la succursale ' + c.succursale + '.';
    elLigne.textContent = (quoi.length === 1
      ? 'Votre ' + quoi[0].nom + ' porte votre nom. On ne la montre plus à personne d’autre. '
      : 'Votre sélection est mise de côté. ') + ou;
  }

  var titre = document.querySelector('.merci h1');
  if (titre && c.client && c.client.prenom) {
    titre.innerHTML = 'C’est réservé, ' + (S ? S.echapper(c.client.prenom) : c.client.prenom) +
      '<span class="dot-red">.</span>';
  }
})();

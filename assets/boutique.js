/* =============================================================================
   Pro Remorque — BOUTIQUE
   Grille rendue depuis le catalogue, facettes multi-criteres (categorie,
   marque, budget, disponibilite), tri, recherche, etat vide utile.
   L'etat vit dans l'URL : un filtre se partage et se met en favori.
   ============================================================================= */
(function () {
  'use strict';

  var CAT = window.PR_CATALOGUE, S = window.PRShop;
  if (!CAT || !S) { return; }
  var e = S.echapper;

  var grille = document.getElementById('inv-grid');
  var boiteFacettes = document.getElementById('facets');
  if (!grille || !boiteFacettes) { return; }

  var PRODUITS = CAT.produits;
  var PRIX_MAX = Math.max.apply(null, PRODUITS.map(function (p) { return p.prix; }));

  var etat = { cats: [], marques: [], prixMax: PRIX_MAX, dispo: false, q: '', tri: 'pertinence' };

  /* ===== lecture de l'URL (#cargo depuis le pied de page, ?cat=...) ======= */
  function lireURL() {
    var h = (location.hash || '').replace('#', '');
    if (h && CAT.categories.some(function (c) { return c.id === h; })) { etat.cats = [h]; }
    var q = new URLSearchParams(location.search);
    if (q.get('cat')) { etat.cats = q.get('cat').split(','); }
    if (q.get('q')) { etat.q = q.get('q'); }
    if (q.get('tri')) { etat.tri = q.get('tri'); }
  }

  function ecrireURL() {
    var q = new URLSearchParams();
    if (etat.cats.length) { q.set('cat', etat.cats.join(',')); }
    if (etat.q) { q.set('q', etat.q); }
    if (etat.tri !== 'pertinence') { q.set('tri', etat.tri); }
    var s = q.toString();
    try {
      history.replaceState(null, '', s ? location.pathname + '?' + s : location.pathname);
    } catch (err) { /* sans suite */ }
  }

  /* ===== filtrage ========================================================= */
  function filtres(saufFacette) {
    return PRODUITS.filter(function (p) {
      if (saufFacette !== 'cats' && etat.cats.length && etat.cats.indexOf(p.cat) < 0) { return false; }
      if (saufFacette !== 'marques' && etat.marques.length && etat.marques.indexOf(p.marque) < 0) { return false; }
      /* Une unite « prix sur demande » ne doit pas disparaitre a cause du budget. */
      if (saufFacette !== 'prix' && !p.surDemande && p.prix > etat.prixMax) { return false; }
      if (etat.dispo && p.stock <= 0) { return false; }
      if (etat.q) {
        var foin = (p.marque + ' ' + p.modele + ' ' + p.catLabel + ' ' + p.annee).toLowerCase();
        if (foin.indexOf(etat.q.toLowerCase()) < 0) { return false; }
      }
      return true;
    });
  }

  function trier(lst) {
    var a = lst.slice();
    if (etat.tri === 'asc') { a.sort(function (x, y) { return (x.prix || 1e9) - (y.prix || 1e9); }); }
    else if (etat.tri === 'desc') { a.sort(function (x, y) { return (y.prix || 0) - (x.prix || 0); }); }
    else if (etat.tri === 'annee') { a.sort(function (x, y) { return y.annee - x.annee; }); }
    else {
      /* Pertinence : par categorie dans l'ordre du menu, puis prix decroissant. */
      var ordre = CAT.categories.map(function (c) { return c.id; });
      a.sort(function (x, y) {
        var d = ordre.indexOf(x.cat) - ordre.indexOf(y.cat);
        return d || (y.prix - x.prix);
      });
    }
    return a;
  }

  /* ===== facettes ========================================================= */
  function compter(champ, valeur) {
    return filtres(champ === 'cat' ? 'cats' : 'marques').filter(function (p) {
      return champ === 'cat' ? p.cat === valeur : p.marque === valeur;
    }).length;
  }

  function rendreFacettes() {
    var marques = PRODUITS.map(function (p) { return p.marque; })
      .filter(function (m, i, t) { return t.indexOf(m) === i; }).sort();

    boiteFacettes.innerHTML =
      '<div class="facet">' +
        '<p class="facet-h">Recherche</p>' +
        '<div class="field" style="margin:0"><label for="f-q" class="sr-only">Rechercher</label>' +
        '<input id="f-q" type="search" placeholder="Marque, modèle, format…" value="' + e(etat.q) + '" ' +
        'style="width:100%;background:rgba(0,0,0,.28);border:1px solid var(--line-strong);border-radius:10px;' +
        'color:var(--text-primary);font-family:var(--body);font-size:.95rem;padding:.7rem .9rem"></div>' +
      '</div>' +

      '<div class="facet"><p class="facet-h">Catégorie</p><div class="facet-opts">' +
      CAT.categories.map(function (c) {
        var n = compter('cat', c.id);
        return '<label class="facet-opt"><input type="checkbox" data-cat="' + c.id + '"' +
          (etat.cats.indexOf(c.id) >= 0 ? ' checked' : '') + (n ? '' : ' disabled') + '>' +
          '<span>' + e(c.label) + '</span><span class="n">' + n + '</span></label>';
      }).join('') + '</div></div>' +

      '<div class="facet"><p class="facet-h">Marque</p><div class="facet-opts">' +
      marques.map(function (m) {
        var n = compter('marque', m);
        return '<label class="facet-opt"><input type="checkbox" data-marque="' + e(m) + '"' +
          (etat.marques.indexOf(m) >= 0 ? ' checked' : '') + (n ? '' : ' disabled') + '>' +
          '<span>' + e(m) + '</span><span class="n">' + n + '</span></label>';
      }).join('') + '</div></div>' +

      '<div class="facet facet-prix"><p class="facet-h">Budget</p>' +
        '<output id="f-prix-o">jusqu’à ' + S.fmt(etat.prixMax) + '</output>' +
        '<label for="f-prix" class="sr-only">Budget maximum</label>' +
        '<input id="f-prix" type="range" min="2500" max="' + PRIX_MAX + '" step="500" value="' + etat.prixMax + '">' +
      '</div>' +

      '<div class="facet"><div class="facet-opts">' +
        '<label class="facet-opt"><input type="checkbox" id="f-dispo"' + (etat.dispo ? ' checked' : '') + '>' +
        '<span>En stock seulement</span></label></div></div>' +

      '<button type="button" class="facet-raz" id="f-raz">Tout réinitialiser</button>';
  }

  /* ===== grille =========================================================== */
  function rendreGrille() {
    var lst = trier(filtres());
    var n = document.getElementById('inv-n');
    if (n) { n.textContent = lst.length; }

    if (!lst.length) {
      grille.innerHTML =
        '<div class="inv-empty"><b>Aucune remorque ne correspond.</b>' +
        '<p>Élargissez le budget ou retirez un filtre. Et si le format que vous cherchez n’est pas là, ' +
        'appelez-nous : on la commande ou on vous dit qui l’a.</p>' +
        '<p style="margin-top:1.5rem"><button type="button" class="btn btn-ghost" id="f-raz2"><span>Réinitialiser les filtres</span></button></p>' +
        '</div>';
      var b = document.getElementById('f-raz2');
      if (b) { b.addEventListener('click', reinitialiser); }
      return;
    }
    grille.innerHTML = lst.map(S.carte).join('');
  }

  function reinitialiser() {
    etat = { cats: [], marques: [], prixMax: PRIX_MAX, dispo: false, q: '', tri: etat.tri };
    tout();
  }

  function tout() { rendreFacettes(); rendreGrille(); ecrireURL(); }

  /* ===== evenements ======================================================= */
  boiteFacettes.addEventListener('change', function (ev) {
    var c = ev.target;
    if (c.hasAttribute('data-cat')) {
      var idc = c.getAttribute('data-cat');
      etat.cats = c.checked ? etat.cats.concat([idc]) : etat.cats.filter(function (x) { return x !== idc; });
      tout();
    } else if (c.hasAttribute('data-marque')) {
      var m = c.getAttribute('data-marque');
      etat.marques = c.checked ? etat.marques.concat([m]) : etat.marques.filter(function (x) { return x !== m; });
      tout();
    } else if (c.id === 'f-dispo') {
      etat.dispo = c.checked; tout();
    }
  });

  boiteFacettes.addEventListener('input', function (ev) {
    if (ev.target.id === 'f-prix') {
      etat.prixMax = +ev.target.value;
      document.getElementById('f-prix-o').textContent = 'jusqu’à ' + S.fmt(etat.prixMax);
      rendreGrille();
    } else if (ev.target.id === 'f-q') {
      etat.q = ev.target.value;
      clearTimeout(rendreGrille._t);
      rendreGrille._t = setTimeout(function () { rendreGrille(); ecrireURL(); }, 180);
    }
  });

  boiteFacettes.addEventListener('click', function (ev) {
    if (ev.target.id === 'f-raz') { reinitialiser(); }
  });

  var tri = document.getElementById('inv-sort');
  if (tri) {
    tri.addEventListener('change', function () { etat.tri = tri.value; rendreGrille(); ecrireURL(); });
  }

  var bascule = document.getElementById('facets-bascule');
  if (bascule) {
    bascule.addEventListener('click', function () {
      var ouvert = boiteFacettes.classList.toggle('on');
      bascule.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
  }

  addEventListener('hashchange', function () { lireURL(); tout(); });

  lireURL();
  if (tri && etat.tri) { tri.value = etat.tri; }
  tout();
})();

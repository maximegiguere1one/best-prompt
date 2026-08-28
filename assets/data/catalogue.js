/* =============================================================================
   Pro Remorque — CATALOGUE
   -----------------------------------------------------------------------------
   Source unique de verite du site. Toutes les pages (boutique, fiche produit,
   panier, commande) lisent d'ici. Pour ajouter, retirer ou corriger une
   remorque, il n'y a que ce fichier a toucher.

   ATTENTION AVANT LA MISE EN LIGNE
   --------------------------------
   Marque, modele, annee, categorie, prix et photo proviennent de l'inventaire
   reel. Les champs marques « VERIFIER » ci-dessous ont ete deduits du code de
   modele (ex. « SC8.5X18 » -> 8,5 pi x 18 pi) ou fixes a une valeur de depart :

     - specs.*        deduits du code de modele quand il est explicite,
                      laisses a null quand le code est ambigu (la fiche
                      n'affiche alors tout simplement pas la ligne)
     - stock          fixe a une valeur de depart, a brancher sur le vrai stock
     - condition      « Neuf » pour les millesimes 2026-2027,
                      « Neuf, millesime anterieur » avant
     - msrp           laisse a null volontairement : aucun prix barre n'est
                      affiche tant qu'un vrai prix de detail suggere n'est pas
                      saisi (un rabais invente est une pratique trompeuse)
     - config.taux    taux de financement affiche a titre d'estimation

   Un prix a 0 s'affiche « Prix sur demande » et remplace le bouton d'achat par
   une demande de soumission.
   ============================================================================= */
(function () {
  'use strict';

  var CONFIG = {
    /* Taxes du Quebec */
    tps: 0.05,
    tvq: 0.09975,

    /* Reservation : ce qu'on encaisse en ligne pour immobiliser l'unite.
       Le solde se regle a la succursale, au ramassage ou a la livraison. */
    depot: 500,

    /* Financement — estimation affichee sur les fiches. VERIFIER. */
    taux: 0.0899,
    termeMois: 84,
    miseDeFondsPct: 0.1,

    /* Livraison */
    livraisonBase: 249,
    livraisonGratuiteDes: 15000,

    /* Contact */
    tel: '1 877 939-9494',
    telHref: '+18779399494',
    courriel: 'info@proremorque.com',

    /* Ou partent les commandes. Vide = ouverture du client courriel du
       visiteur, pre-rempli. Voir assets/shop.js. */
    endpoint: ''
  };

  /* Libelles des categories, dans l'ordre d'affichage de la boutique */
  var CATEGORIES = [
    { id: 'cargo', nom: 'Cargo fermee', label: 'Cargo fermée' },
    { id: 'plateforme', nom: 'Plateforme', label: 'Plateforme' },
    { id: 'dompeur', nom: 'Dompeur', label: 'Dompeur' },
    { id: 'goose', nom: 'Col de cygne', label: 'Col de cygne' },
    { id: 'utilitaire', nom: 'Utilitaire / VTT', label: 'Utilitaire / VTT' },
    { id: 'landscape', nom: 'Landscape', label: 'Landscape' },
    { id: 'tilt', nom: 'Tilt', label: 'Tilt' },
    { id: 'equipement', nom: 'Voiture / equipement', label: 'Voiture / équipement' }
  ];

  /* --------------------------------------------------------------------------
     LES REMORQUES
     specs : longueur / largeur / essieux / capacite / freins / plancher
             null = donnee non deduite du code de modele, la ligne est masquee
     -------------------------------------------------------------------------- */
  var PRODUITS = [
    {
      id: 'edge-sc85x18-a', marque: 'Edge', modele: 'SC8.5X18', annee: 2026,
      cat: 'cargo', prix: 18999, img: 'inv-03', stock: 1,
      argument: 'Le format qui fait le plus de kilomètres au Québec : assez grand pour un atelier mobile, assez court pour reculer dans une entrée.',
      specs: { longueur: '18 pi', largeur: '8,5 pi', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques sur 2 essieux', plancher: 'Contreplaqué 3/4 po' },
      atouts: ['Porte arrière rampe', 'Hauteur intérieure 7 pi', 'Parois lisses', 'Prise 12 V + éclairage DEL']
    },
    {
      id: 'edge-sc85x18-b', marque: 'Edge', modele: 'SC8.5X18', annee: 2026,
      cat: 'cargo', prix: 18999, img: 'inv-04', stock: 1,
      argument: 'Deuxième unité identique en cour. Si la première part, celle-ci prend sa place sans délai de commande.',
      specs: { longueur: '18 pi', largeur: '8,5 pi', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques sur 2 essieux', plancher: 'Contreplaqué 3/4 po' },
      atouts: ['Porte arrière rampe', 'Hauteur intérieure 7 pi', 'Parois lisses', 'Prise 12 V + éclairage DEL']
    },
    {
      id: 'xcel-x716hctw', marque: 'Xcel', modele: 'X716HCTW + 6″', annee: 2026,
      cat: 'cargo', prix: 10499, img: 'inv-17', stock: 2,
      argument: 'Le 7 x 16 avec 6 pouces de hauteur en plus : on y rentre un VTT côte à côte sans plier l’antenne.',
      specs: { longueur: '16 pi', largeur: '7 pi', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Contreplaqué 3/4 po' },
      atouts: ['+6 po de hauteur', 'Porte arrière rampe', 'Ventilation de toit', 'Anneaux d’arrimage']
    },
    {
      id: 'xcel-x710hcsw', marque: 'Xcel', modele: 'X710HCSW', annee: 2026,
      cat: 'cargo', prix: 9999, img: 'inv-16', stock: 1,
      argument: 'Un essieu, 10 pieds, sous les 10 000 $ : la porte d’entrée la plus rentable dans la cargo fermée.',
      specs: { longueur: '10 pi', largeur: '7 pi', essieux: '1 essieu', capacite: '3 500 lb', freins: null, plancher: 'Contreplaqué 3/4 po' },
      atouts: ['Se tire avec un VUS', 'Porte arrière rampe', 'Porte latérale', 'Éclairage DEL']
    },
    {
      id: 'ideal-ev716ta2sz', marque: 'Ideal', modele: 'Cargo EV716TA2SZ', annee: 2027,
      cat: 'cargo', prix: 0, img: 'inv-00', stock: 1,
      argument: 'Millésime 2027 en pré-arrivage. Le prix se confirme à la commande — réservez pour bloquer la place dans l’envoi.',
      specs: { longueur: '16 pi', largeur: '7 pi', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Contreplaqué 3/4 po' },
      atouts: ['Millésime 2027', 'Construction soudée', 'Porte arrière rampe']
    },
    {
      id: 'ideal-ev8516ta3sz', marque: 'Ideal', modele: 'Cargo EV8516TA3SZ', annee: 2027,
      cat: 'cargo', prix: 0, img: 'inv-01', stock: 1,
      argument: '8,5 pi de large sur essieux de 3 500 lb : la configuration que demandent les entrepreneurs qui transportent des échafauds.',
      specs: { longueur: '16 pi', largeur: '8,5 pi', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Contreplaqué 3/4 po' },
      atouts: ['Millésime 2027', '8,5 pi de large', 'Porte arrière rampe']
    },
    {
      id: 'ideal-ev7514ta2sz', marque: 'Ideal', modele: 'Cargo EV7514TA2SZ', annee: 2026,
      cat: 'cargo', prix: 0, img: 'inv-02', stock: 1,
      argument: 'Le 7,5 x 14 : le compromis entre le 7 x 16 trop long pour le garage et le 6 x 12 trop petit pour l’outillage.',
      specs: { longueur: '14 pi', largeur: '7,5 pi', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Contreplaqué 3/4 po' },
      atouts: ['Format garage', 'Porte arrière rampe', 'Construction soudée']
    },
    {
      id: 'ktrail-dko20-3-14rd', marque: 'K-Trail', modele: 'DKO20+3-14-RD', annee: 2026,
      cat: 'plateforme', prix: 13999, img: 'inv-07', stock: 1,
      argument: '20 pieds plus 3 de col : on charge une pelle compacte sans que la flèche dépasse.',
      specs: { longueur: '20 pi + 3 pi', largeur: '82 po', essieux: '2 essieux', capacite: '14 000 lb', freins: 'Freins électriques sur 2 essieux', plancher: 'Bois traité' },
      atouts: ['Rampes doubles escamotables', 'Capacité 14 000 lb', 'Anneaux D soudés', 'Cric à manivelle laterale']
    },
    {
      id: 'ktrail-dko20-16', marque: 'K-Trail', modele: 'DKO20-16', annee: 2026,
      cat: 'plateforme', prix: 12999, img: 'inv-08', stock: 1,
      argument: '16 000 lb de capacité sur 20 pieds : la plateforme qui ne demande pas de permis spécial et qui prend quand même la machinerie.',
      specs: { longueur: '20 pi', largeur: '82 po', essieux: '2 essieux', capacite: '16 000 lb', freins: 'Freins électriques sur 2 essieux', plancher: 'Bois traité' },
      atouts: ['Capacité 16 000 lb', 'Rampes escamotables', 'Anneaux D soudés']
    },
    {
      id: 'ktrail-dge16-10', marque: 'K-Trail', modele: 'DGE16-10', annee: 2026,
      cat: 'plateforme', prix: 7499, img: 'inv-10', stock: 2,
      argument: 'La plateforme polyvalente sous les 7 500 $ : bois de chauffage l’automne, tracteur à gazon l’été.',
      specs: { longueur: '16 pi', largeur: '82 po', essieux: '2 essieux', capacite: '10 000 lb', freins: 'Freins électriques', plancher: 'Bois traité' },
      atouts: ['Capacité 10 000 lb', 'Rampes escamotables', 'Prix d’entrée']
    },
    {
      id: 'ktrail-dgon821614ps', marque: 'K-Trail', modele: 'DGON821614PS', annee: 2024,
      cat: 'dompeur', prix: 20999, img: 'inv-13', stock: 1,
      argument: 'Dompeur 82 po x 16 pi à 14 000 lb. Une benne de cette taille se rentabilise en deux contrats d’excavation.',
      specs: { longueur: '16 pi', largeur: '82 po', essieux: '2 essieux', capacite: '14 000 lb', freins: 'Freins électriques sur 2 essieux', plancher: 'Acier' },
      atouts: ['Vérin à ciseaux', 'Porte grange + rampe', 'Bâche incluse', 'Télécommande']
    },
    {
      id: 'maxiroule-dt72120ta3', marque: 'Maxi-Roule', modele: 'DT72120TA3', annee: 2026,
      cat: 'dompeur', prix: 11799, img: 'inv-11', stock: 1,
      argument: 'Le dompeur 6 x 10 tandem : assez petit pour l’entrée du client, assez fort pour une pleine charge de pierre.',
      specs: { longueur: '120 po', largeur: '72 po', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Acier' },
      atouts: ['Vérin hydraulique', 'Porte grange', 'Télécommande', 'Batterie + chargeur']
    },
    {
      id: 'ktrail-d610-10ps', marque: 'K-Trail', modele: 'D610-10PS', annee: 2026,
      cat: 'dompeur', prix: 11495, img: 'inv-09', stock: 1,
      argument: '10 000 lb sur un 6 x 10 : le rapport capacité/encombrement le plus serré de la cour.',
      specs: { longueur: '10 pi', largeur: '6 pi', essieux: '2 essieux', capacite: '10 000 lb', freins: 'Freins électriques sur 2 essieux', plancher: 'Acier' },
      atouts: ['Vérin à ciseaux', 'Porte grange + rampe', 'Télécommande']
    },
    {
      id: 'maxiroule-dt60120ta3lt', marque: 'Maxi-Roule', modele: 'DT60120-TA3-LT', annee: 2027,
      cat: 'dompeur', prix: 10499, img: 'inv-12', stock: 2,
      argument: 'Version allégée en 5 pi de large : se tire avec un demi-tonne sans forcer.',
      specs: { longueur: '120 po', largeur: '60 po', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Acier' },
      atouts: ['Millésime 2027', 'Version allégée', 'Vérin hydraulique', 'Télécommande']
    },
    {
      id: 'ktrail-dgon821616', marque: 'K-Trail', modele: 'DGON821616', annee: 2025,
      cat: 'goose', prix: 23999, img: 'inv-14', stock: 1,
      argument: 'Col de cygne 16 000 lb : le pivot au-dessus de l’essieu change tout en marche arrière et en côte.',
      specs: { longueur: '16 pi', largeur: '82 po', essieux: '2 essieux', capacite: '16 000 lb', freins: 'Freins électriques sur 2 essieux', plancher: 'Acier' },
      atouts: ['Attelage col de cygne', 'Capacité 16 000 lb', 'Vérins avant doubles', 'Porte grange + rampe']
    },
    {
      id: 'maxiroule-uto66123d', marque: 'Maxi-Roule', modele: 'UTO66123-D', annee: 2027,
      cat: 'utilitaire', prix: 3899, img: 'inv-05', stock: 3,
      argument: 'Version avec rampe rabattable : on monte le VTT seul, sans planches ni acrobaties.',
      specs: { longueur: '123 po', largeur: '66 po', essieux: '1 essieu', capacite: '3 500 lb', freins: null, plancher: 'Bois traité' },
      atouts: ['Rampe rabattable', 'Millésime 2027', 'Se tire avec un VUS', 'Ridelles amovibles']
    },
    {
      id: 'maxiroule-uto66123s', marque: 'Maxi-Roule', modele: 'UTO66123-S', annee: 2027,
      cat: 'utilitaire', prix: 3299, img: 'inv-06', stock: 3,
      argument: 'Même plateau, sans la rampe : 600 $ de moins si vous chargez déjà à la main.',
      specs: { longueur: '123 po', largeur: '66 po', essieux: '1 essieu', capacite: '3 500 lb', freins: null, plancher: 'Bois traité' },
      atouts: ['Millésime 2027', 'Se tire avec un VUS', 'Ridelles amovibles', 'Prix d’entrée']
    },
    {
      id: 'maxxa-mxr45', marque: 'Maxxa', modele: 'MXR45', annee: 2024,
      cat: 'utilitaire', prix: 2595, img: 'inv-20', stock: 2,
      argument: 'La plus petite de la cour, et celle qui part le plus vite au printemps. Moins de 2 600 $.',
      specs: { longueur: null, largeur: null, essieux: '1 essieu', capacite: null, freins: null, plancher: 'Bois traité' },
      atouts: ['Format compact', 'Se range dans un garage', 'Se tire avec une berline']
    },
    {
      id: 'maxiroule-ls80192', marque: 'Maxi-Roule', modele: 'LS80192TA2R6032', annee: 2024,
      cat: 'landscape', prix: 8999, img: 'inv-22', stock: 1,
      argument: 'Landscape 16 pi avec ridelles hautes : le gazon, les branches et les bacs restent dedans.',
      specs: { longueur: '192 po', largeur: '80 po', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Bois traité' },
      atouts: ['Ridelles 32 po', 'Rampe 60 po', 'Support à outils', 'Anneaux d’arrimage']
    },
    {
      id: 'maxiroule-ls80216', marque: 'Maxi-Roule', modele: 'LS80216TA2R6019', annee: 2023,
      cat: 'landscape', prix: 8499, img: 'inv-21', stock: 1,
      argument: '18 pieds de plateau pour les équipes d’entretien paysager qui transportent deux tondeuses à siège.',
      specs: { longueur: '216 po', largeur: '80 po', essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Bois traité' },
      atouts: ['Ridelles 19 po', 'Rampe 60 po', '18 pi de plateau', 'Anneaux d’arrimage']
    },
    {
      id: 'weberlane-wl2400tldo', marque: 'Weberlane', modele: 'WL2400TLDO', annee: 2025,
      cat: 'tilt', prix: 18499, img: 'inv-19', stock: 1,
      argument: 'Plateau basculant : aucune rampe à manipuler, on recule et on charge. Le dos vous dira merci.',
      specs: { longueur: '24 pi', largeur: '102 po', essieux: '2 essieux', capacite: '14 000 lb', freins: 'Freins électriques sur 2 essieux', plancher: 'Bois traité' },
      atouts: ['Plateau basculant', 'Aucune rampe à manipuler', 'Amortisseur hydraulique', 'Anneaux D soudés']
    },
    {
      id: 'metavic-wd714', marque: 'Metavic', modele: 'WD714', annee: 2026,
      cat: 'equipement', prix: 36765, img: 'inv-15', stock: 1,
      argument: 'La pièce maîtresse de la cour. Conçue pour la machinerie lourde, construite pour durer deux décennies.',
      specs: { longueur: null, largeur: null, essieux: '2 essieux', capacite: null, freins: 'Freins électriques sur 2 essieux', plancher: 'Acier' },
      atouts: ['Construction lourde', 'Pour machinerie', 'Anneaux D soudés', 'Sur commande spéciale']
    },
    {
      id: 'weberlane-awl2000a', marque: 'Weberlane', modele: 'AWL2000A', annee: 2025,
      cat: 'equipement', prix: 8999, img: 'inv-18', stock: 1,
      argument: 'Porte-voiture en aluminium : 400 lb de moins qu’un équivalent en acier, donc 400 lb de charge utile en plus.',
      specs: { longueur: null, largeur: null, essieux: '2 essieux', capacite: '7 000 lb', freins: 'Freins électriques', plancher: 'Aluminium' },
      atouts: ['Aluminium', 'Ne rouille pas', 'Rampes incluses', 'Treuil en option']
    }
  ];

  /* --------------------------------------------------------------------------
     ACCESSOIRES ET SERVICES — la vente additionnelle
     Proposés sur la fiche produit et dans le panier. « pertinent » limite
     l'affichage a certaines categories (vide = toutes).
     -------------------------------------------------------------------------- */
  var ACCESSOIRES = [
    { id: 'acc-boule', nom: 'Boule d’attelage 2 5/16 po', prix: 49.99, type: 'piece',
      desc: 'Acier chromé, capacité de 14 000 lb. Le mauvais diamètre de boule est la première cause de décrochage.', pertinent: [] },
    { id: 'acc-sangles', nom: 'Sangles à cliquet 2 po x 27 pi (4)', prix: 89.99, type: 'piece',
      desc: 'Quatre sangles homologuées, 10 000 lb de résistance à la rupture.', pertinent: ['plateforme', 'utilitaire', 'landscape', 'tilt', 'equipement'] },
    { id: 'acc-cadenas', nom: 'Cadenas d’attelage antivol', prix: 64.99, type: 'piece',
      desc: 'Se barre sur le coupleur. Exigé par plusieurs assureurs pour couvrir le vol.', pertinent: [] },
    { id: 'acc-roue', nom: 'Roue de secours + support', prix: 249.99, type: 'piece',
      desc: 'Montée, équilibrée, avec le support soudé installé en atelier.', pertinent: [] },
    { id: 'acc-faisceau', nom: 'Faisceau 7 broches + installation', prix: 189.99, type: 'service',
      desc: 'Posé sur votre véhicule par nos techniciens, avec test de freins.', pertinent: [] },
    { id: 'acc-bache', nom: 'Bâche de dompeur à manivelle', prix: 219.99, type: 'piece',
      desc: 'Obligatoire pour le transport de granulat sur la route.', pertinent: ['dompeur', 'goose'] },
    { id: 'acc-garantie', nom: 'Garantie prolongée 3 ans', prix: 599, type: 'service',
      desc: 'Couvre essieux, freins et système hydraulique au-delà de la garantie du fabricant.', pertinent: [] },
    { id: 'acc-livraison', nom: 'Livraison à domicile', prix: 249, type: 'service',
      desc: 'Grand Montréal et Montérégie. Ailleurs au Québec, on vous rappelle avec le tarif.', pertinent: [] }
  ];

  /* --------------------------------------------------------------------------
     Derives — calcules une fois au chargement
     -------------------------------------------------------------------------- */
  PRODUITS.forEach(function (p) {
    var cat = CATEGORIES.filter(function (c) { return c.id === p.cat; })[0];
    p.catLabel = cat ? cat.label : p.cat;
    p.condition = p.annee >= 2026 ? 'Neuf' : 'Neuf, millésime antérieur';
    p.msrp = null; /* aucun prix barre tant qu'un vrai PDSF n'est pas saisi */
    p.titre = p.annee + ' ' + p.marque + ' ' + p.modele;
    p.url = 'produit.html?id=' + p.id;
    p.jpg = 'assets/inv/' + p.img + '.jpg';
    p.webp = 'assets/inv/' + p.img + '.webp';
    p.surDemande = !p.prix;
  });

  window.PR_CATALOGUE = {
    config: CONFIG,
    categories: CATEGORIES,
    produits: PRODUITS,
    accessoires: ACCESSOIRES,
    parId: function (id) {
      return PRODUITS.filter(function (p) { return p.id === id; })[0] ||
        ACCESSOIRES.filter(function (a) { return a.id === id; })[0] || null;
    }
  };
})();

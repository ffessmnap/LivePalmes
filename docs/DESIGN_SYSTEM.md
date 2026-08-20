# Design system LivePalmes

<!-- description: Référence du langage visuel, des composants d’interface et des règles responsive déjà présents dans LivePalmes. -->

## Objet du document

Ce document décrit le design system **tel qu’il existe dans l’application au 3 août 2026**. Il ne crée pas de nouvelle architecture CSS et ne remplace pas les feuilles de styles : celles-ci restent la source de vérité technique.

L’objectif est de faciliter les évolutions cohérentes de l’interface en donnant une lecture commune des couleurs, de la typographie, des composants, des états et du comportement responsive déjà utilisés.

LivePalmes possède une identité partagée, déclinée dans quatre contextes :

- l’accueil et les pages publiques de compétition ;
- les consoles de compétition ;
- les pages publiques de performances ;
- le portail administratif.

## Principes de design observés

### Fiabilité avant décoration

L’interface doit rendre immédiatement visibles l’état des données, la connexion, les alertes et les actions disponibles. Les codes couleur accompagnent toujours un libellé, une icône ou une différence de forme.

### Densité maîtrisée

Les consoles et le portail affichent beaucoup d’informations. La densité repose sur des panneaux compacts, des tableaux structurés, des libellés courts et une hiérarchie typographique forte, sans multiplier les effets décoratifs.

### Identité aquatique et fédérale

Le turquoise constitue la couleur de marque principale. Les en-têtes publics et Performances utilisent un dégradé sombre vers turquoise, complété par un motif de vagues. Les logos LivePalmes et FFESSM Nage avec palmes assurent l’identification institutionnelle.

### Mobile utilisable, ordinateur efficace

Les mises en page passent progressivement de plusieurs colonnes à une colonne. Les actions restent utilisables au toucher, les groupes de boutons se replient et les tableaux larges sont soit compactés, soit placés dans un conteneur défilant.

## Sources de référence

| Zone | Feuilles de styles principales | Pages représentatives |
|---|---|---|
| Socle et consoles | `styles.css`, `console.css` | `pilotage-livepalmes.html` et consoles dédiées |
| Public compétition | `styles.css`, `public.css` | `index.html`, `resultats.html`, `series-public.html`, `medailles.html`, `archives.html` |
| Performances | `performances/public/styles.css` | `performances/records.html`, `performances/mpf.html`, `performances/tops.html`, `performances/nageur.html` |
| Portail | `styles.css`, `assets/livepalmes-admin-portal.css` | `portail.html` |
| Compléments ciblés | `assets/livepalmes-admin-session-badge.css`, `performances/public/import-competitions.css` | Badge de session et import de compétitions |

Les consoles dédiées étant générées depuis `pilotage-livepalmes.html`, ce socle doit rester la référence pour leur structure et leurs composants partagés.

## Fondations

### Palette principale

Deux jeux de variables très proches existent actuellement dans le socle et dans Performances.

| Rôle | Socle et consoles | Performances | Usage |
|---|---:|---:|---|
| Texte principal | `#172026` | `#17211f` | Titres, valeurs et texte fort |
| Texte secondaire | `#66717a` | `#5f6966` | Libellés, aides et métadonnées |
| Séparateur | `#d8e0e5` | `#dce4df` | Bordures, lignes de tableaux |
| Surface | `#ffffff` | `#ffffff` | Cartes, panneaux, champs |
| Fond de page | `#f3f6f7` | `#f4f7f5` | Arrière-plan général |
| Accent | `#0b7285` | `#0f8b8d` | Action principale, sélection, repère de marque |
| Accent fort | `#075866` | `#0b6668` | Texte accentué, survol, contraste renforcé |

Le portail reprend principalement `#0b7285`, avec un texte plus vert sombre (`#12312d`) et un fond `#f5f8f7`.

#### Jetons du portail

Le socle du portail centralise ses valeurs visuelles récurrentes sur `.admin-portal-page`. Les sélecteurs spécialisés doivent consommer ces jetons lorsqu’ils reprennent exactement le même rôle, sans modifier les couleurs métier propres aux statuts, sexes, catégories ou alertes.

| Famille | Jetons principaux | Usage |
|---|---|---|
| Surfaces | `--portal-color-background`, `--portal-color-surface`, `--portal-color-field-background` | Fond général, cartes et champs |
| Texte | `--portal-color-text`, `--portal-color-brand`, `--portal-color-heading`, `--portal-color-muted` | Texte courant, marque, titres et texte secondaire |
| Accent | `--portal-color-accent`, `--portal-color-accent-strong` | Action principale, navigation active et survol |
| Bordures | `--portal-color-border`, `--portal-color-header-border`, `--portal-color-border-soft`, `--portal-color-field-border`, `--portal-color-hover-border` | Séparation des surfaces et états interactifs |
| Rayons | `--portal-radius-card`, `--portal-radius-large`, `--portal-radius-control` | Cartes, grands panneaux et contrôles |
| Focus | `--portal-focus-ring` | Halo de focus clavier du portail |
| Espacements | `--portal-page-gutter`, `--portal-card-gutter`, `--portal-panel-gutter` | Marges extérieures, respiration des cartes et contenu des panneaux imbriqués |

Les gouttières du portail sont responsives : `16 px` sur grand écran, `12 px` au niveau tablette et `8 px` sous `700 px` pour la marge extérieure. Les cartes et panneaux imbriqués descendent à `10 px`, puis `8 px`, afin de ne pas cumuler plusieurs grandes respirations. La racine réserve en permanence la place de la barre de défilement verticale : passer d’un onglet court à un onglet long ne doit pas modifier la largeur du contenu. Ces jetons sont locaux au portail. Ils ne doivent pas être imposés aux pages publiques, aux consoles ou à Performances, dont les variantes actuelles restent intentionnelles.

### Couleurs sémantiques

| État | Couleurs observées | Signification |
|---|---|---|
| Succès / validé | verts `#2b8a3e`, `#176232`, fonds `#eefaf1` ou `#dcfce7` | Donnée valide, action confirmée, connexion établie |
| Attention / attente | orange `#f59f00`, bruns `#8a6200`, fonds `#fff8db` ou `#fff6dc` | Chargement, brouillon, information à vérifier |
| Erreur / danger | rouges `#c92a2a`, `#9f1d16`, fonds `#fff0f0` ou `#fff1f0` | Erreur, suppression, alerte bloquante |
| Information | bleus et turquoise, fonds très clairs | État informatif, référence ou contexte |
| Médaille | or, argent et bronze en dégradé | Classement sportif uniquement |

Une couleur sémantique ne doit pas être détournée pour une simple décoration.

### Couleurs de rôle des consoles

La variable `--role-accent` adapte les consoles sans modifier leur structure.

| Rôle | Couleur | Fond doux |
|---|---:|---:|
| Live | `#0b7285` | `#e7f5f7` |
| Speaker | `#d71920` | `#fff0f0` |
| Juge arbitre | `#2b8a3e` | `#eefaf1` |
| Vidéo | `#6741d9` | `#f0ecff` |
| Bureau des performances | `#e67700` | `#fff4e6` |
| Secrétariat | `#0b7285` | `#e7f8fb` |

La couleur de rôle sert aux repères, sélections et accents. Elle ne remplace pas les couleurs sémantiques de succès, d’attention ou d’erreur.

### Couleurs liées aux performances

Dans les vues Performances, le féminin utilise `#b01762` avec le fond `#fff2f7`, et le masculin `#1769aa` avec le fond `#eff7ff`. Ces couleurs identifient un filtre ou un groupe de données ; elles ne servent pas à indiquer un état fonctionnel.

### Typographie

La famille déclarée est `Inter`, avec repli sur les polices système : `Segoe UI`, `Arial`, `system-ui` et `sans-serif` selon les zones. Aucun fichier de police ni import web n’est chargé actuellement ; le rendu dépend donc de la présence locale d’Inter, sinon de la police système.

Dans le portail, la taille racine est fixée explicitement à `16 px` : `1rem = 16px`. Toute nouvelle taille de texte ou dimension typographique exprimée en `rem` doit utiliser cette référence et ne doit pas redéfinir localement la valeur du `rem`.

Hiérarchie observée :

- titre de page publique : `clamp(1.7rem, 3vw, 3rem)`, interligne serré ;
- titre principal de console : environ `1.1rem` à `1.55rem` ;
- titre de section : environ `1rem` à `2rem` selon le contexte ;
- texte courant : environ `0.82rem` à `0.98rem` ;
- métadonnée et libellé : environ `0.68rem` à `0.82rem` ;
- poids historiquement présents : 700 à 950 dans les consoles et certains modules denses.

Le portail utilise une échelle plus sobre, centralisée par `--portal-font-weight-regular`, `--portal-font-weight-medium`, `--portal-font-weight-semibold` et `--portal-font-weight-bold` :

- `400` pour le texte courant, les champs et les descriptions ;
- `500` pour la navigation, les métadonnées et les liens secondaires ;
- `600` pour les libellés, boutons, états actifs et informations mises en avant ;
- `700` pour les titres de page et de section.

Les graisses supérieures à `700` ne doivent plus être introduites dans le portail. Un changement de couleur, de taille, de position ou de surface doit être préféré à l’accumulation de texte gras. Les valeurs métier réellement critiques peuvent conserver une emphase, mais les paragraphes, listes, filtres et sous-navigation restent en graisse normale ou moyenne.

Dans les tableaux du portail, les cellules courantes restent en `400` et les en-têtes, temps, compteurs ou identifiants mis en avant utilisent au maximum `500`. Les onglets inactifs restent en `400` ; l’onglet sélectionné passe en `500`, son état étant d’abord porté par la couleur, le fond et la bordure. Les titres de panneaux DTN intégrés aux tableaux suivent également cette graisse moyenne.

Les surtitres et libellés de statut sont souvent en capitales. Le texte courant conserve une casse naturelle. Les temps, rangs et valeurs alignées utilisent lorsque nécessaire des chiffres tabulaires avec `font-variant-numeric: tabular-nums`.

### Espacement et dimensions

Le code n’emploie pas encore de variables d’espacement globales. L’échelle dominante observée est :

- `4–6 px` : espacement interne très compact ;
- `8–10 px` : écart entre contrôles ou éléments liés ;
- `12–14 px` : espacement standard d’un bloc compact ;
- `16–18 px` : padding de panneau et séparation de groupes ;
- `22–28 px` : respiration des en-têtes et grandes cartes.

Les contrôles tactiles standards mesurent généralement `38–44 px` de haut. Les contrôles compacts descendent à `28–34 px` lorsqu’ils sont regroupés dans une console dense.

### Formes et profondeur

- rayon standard : `8 px` ;
- rayon compact : `6–7 px` ;
- grande modale : `10 px` ;
- badge, pastille et interrupteur : `999 px` ;
- ombre de panneau : douce et diffuse, par exemple `0 14px 40px rgba(18, 38, 48, 0.11)` ;
- ombre de modale : plus profonde, par exemple `0 22px 60px rgba(8, 31, 42, 0.28)`.

Les bordures légères structurent l’interface avant les ombres. Les ombres sont réservées aux cartes importantes, panneaux flottants, menus et modales.

### Iconographie et logos

Les icônes sont principalement :

- des SVG intégrés au HTML pour les rubriques publiques ;
- des caractères simples pour les actions compactes ;
- des images dédiées à certains profils de console.

Ressources de marque principales :

- `logo-livepalmes.png` : marque produit ;
- `logo-ffessm-nage-avec-palmes.png` : identité fédérale sur les pages principales ;
- `performances/public/assets/ffessm-nap-logo-quadri.png` : variante utilisée dans Performances ;
- `favicon.svg` et les icônes PWA : identification du site et de l’application installée.

Un logo informatif possède un texte alternatif. Un logo ou pictogramme purement décoratif utilise un `alt` vide.

## Mise en page

### En-têtes publics

Les pages publiques de compétition et Performances utilisent un bandeau sombre vers turquoise avec motif de vagues. Il contient :

1. un retour vers l’accueil ;
2. un surtitre de contexte ;
3. le titre principal et ses métadonnées ;
4. le logo fédéral ;
5. les actions ou la navigation.

Le titre reste le point focal. Les boutons du bandeau sont translucides, bordés de blanc, puis deviennent blancs au survol ou à la sélection.

### Accueil public

L’accueil emploie une grande zone de marque puis une grille de cartes thématiques : direct, performances et archives. Chaque carte combine une icône, un titre, une description courte et un groupe d’actions.

### Consoles

Sur grand écran, la structure principale est une grille composée d’une barre latérale de `260–340 px` et d’une zone de travail flexible. La barre latérale peut rester fixe pendant le défilement. Sous `1040 px`, la structure passe sur une seule colonne.

La barre supérieure est collante et reçoit une bordure haute de la couleur du rôle. Les informations de course, les actions et les états sont regroupés dans des panneaux immédiatement identifiables.

### Portail

Le portail utilise une largeur fluide plafonnée à `1720 px`, avec des gouttières latérales d’au moins `16 px`. Son en-tête blanc, compact et collant sépare clairement la marque, le club et le compte : logo fédéral et « Portail LivePalmes » à gauche, code court du club dans une capsule centrale, puis menu et compte à droite. Le code du club est enrichi du nom complet au survol ; le niveau régional ou national reste dans « Mon compte », sans encombrer le bandeau. Pour une personne habilitée au changement national de club, cette capsule devient un bouton ouvrant une fenêtre de recherche ; l’action équivalente reste présente dans le menu du compte sur mobile, où la capsule centrale est masquée. Le changement est signalé comme temporaire à la session et le retour au club d’appartenance reste explicite. Pendant la restauration de la session, un indicateur neutre masque simultanément le formulaire de connexion et le contenu protégé ; la connexion ne s’affiche qu’après confirmation d’une session absente. Sous `420 px`, le mot « Portail » s’efface. La hauteur reste bornée à environ `48 px` sur mobile et `60 px` sur écran plus large.

Sur ordinateur, le contenu combine une navigation latérale de `232 px` et une zone de gestion flexible. La navigation emploie des pictogrammes linéaires dans des carrés pastel, des libellés textuels et un repère turquoise vertical pour la page active. Les sous-menus restent indentés et alignés avec les libellés principaux.

Le rail organise les outils par responsabilité : Espace club, Organisation des compétitions, Données sportives, Suivi DTN, Administration nationale et Administration du portail. Une rubrique dont toutes les destinations sont interdites au profil est entièrement masquée, titre compris : elle ne doit pas subsister sous forme d’élément désactivé. L’Administration nationale constitue un espace autonome et ne doit pas être placée dans l’Organisation des compétitions. Ces six espaces fonctionnent comme un accordéon : un seul groupe peut être déployé à la fois, le groupe de la page active s’ouvre automatiquement et chaque groupe peut être replié manuellement. Un clic sur son intitulé ouvre d’abord un accueil d’espace composé de cartes, sur le modèle de la Vue d’ensemble. Sur ces accueils, l’en-tête non interactif utilise un fond turquoise très léger et un liseré d’accent afin de se distinguer des cartes blanches cliquables. Il reste compact grâce à un padding vertical de `10 px`, un titre resserré et une description à interligne réduit. Les cartes suivent directement cet en-tête, sans bandeau introductif répétant son rôle ou le filtrage des droits. Ces accueils ne présentent que les destinations déjà autorisées pour le profil ; ils n’ajoutent aucun droit ni traitement métier.

L’accueil Club regroupe les compétitions et engagements, les nageurs et les officiels du club. L’accueil Organisation des compétitions regroupe le calendrier et la création. L’accueil Données sportives réunit Records/MPF, import et correction. L’accueil Administration nationale est organisé par intention : « À traiter » réunit les corrections de nageurs et les suppressions en attente, « Référentiels » donne accès aux clubs, aux nageurs et aux officiels, puis « Suivi » ouvre le journal d’activité. L’accueil Gestion du portail regroupe les demandes d’accès des clubs et les utilisateurs avec leurs habilitations. Les libellés décrivent une responsabilité stable plutôt qu’un rôle technique ou un niveau de permission.

La Vue d’ensemble reprend les espaces métier sous forme de cartes explorables. Le compte personnel n’y occupe pas une carte dédiée : il reste accessible depuis le menu de profil et le groupe Général de la navigation. Le lien principal de chaque carte ouvre l’accueil de l’espace ; un volet secondaire révèle les destinations autorisées au survol sur ordinateur et par un bouton explicite au clavier, au clic ou au toucher. Le volet s’ouvre dans le flux de la page, sans menu flottant, et ne doit jamais contenir une destination absente du profil. Sur un appareil sans survol, le bouton « Voir les outils » reste le mécanisme principal et son état est communiqué avec `aria-expanded` ; la simple prise de focus du lien principal ne doit pas déplacer la carte avant l’activation.

Hors page d’accueil, un fil d’Ariane compact rappelle le chemin depuis l’accueil, puis l’espace et enfin l’outil actif. Pour un profil limité à la gestion de son club, « Accueil club » remplace la Vue d’ensemble comme racine du fil d’Ariane ; l’étape intermédiaire « Espace club » n’est alors pas répétée. Chaque destination Club, Organisation des compétitions, Administration nationale ou Gestion du portail possède un fragment d’URL distinct afin que l’actualisation, les favoris et les boutons Précédent/Suivant restaurent le bon outil. Les intitulés du rail, des accueils et des écrans détaillés doivent employer le même vocabulaire : « Organisation des compétitions », « Données sportives », « Suivi DTN », « Administration nationale » et « Administration du portail ». Les termes historiques « Administration des compétitions » et « Performances » ne doivent plus désigner ces espaces dans le portail.

À partir de `1440 px`, la navigation latérale reste entièrement déployée sur `248 px` : les icônes, groupes, libellés et sous-menus sont directement lisibles. Entre `1081 px` et `1439 px`, elle se présente au repos comme un rail de `64 px` laissant visibles les pictogrammes et le repère de page active. Elle s’élargit temporairement à `248 px` au survol ou dès qu’un de ses éléments reçoit le focus clavier, en se superposant au contenu pour éviter un décalage à chaque passage. Après la sélection d’une destination, le rail se referme immédiatement, même si le pointeur se trouve encore au-dessus ; il se rouvre au prochain survol ou focus. Un bouton permet de conserver la navigation ouverte ; l’état épinglé désactive cette fermeture automatique et la grille réserve `248 px` afin de ne masquer aucun contenu. Ce choix est mémorisé localement dans le navigateur. Les libellés restent présents dans le DOM et sont également exposés comme infobulles lorsque le rail est compact. Sous `1080 px`, le menu repliable mobile reste la seule interaction : aucun accès essentiel ne dépend du survol.

Sous `1080 px`, la navigation est entièrement retirée du flux lorsqu’elle est fermée. Un bouton carré compact avec pictogramme « menu » est placé dans l’en-tête, à côté du profil, et ouvre le rail au-dessus du contenu uniquement à la demande. Son libellé accessible indique l’action d’ouverture ou de fermeture. La sélection d’un espace, d’un sous-onglet ou d’une destination referme immédiatement le menu afin que le changement de vue reste visible au toucher. Les surfaces utilisent des bordures légères, un rayon de `9–10 px` et peu ou pas d’ombre. L’ombre reste admise pour la connexion, les menus flottants et les éléments réellement superposés.

Les liens, boutons, onglets et résumés utilisent une activation tactile directe avec `touch-action: manipulation`. Le fil d’Ariane généré ne doit pas être reconstruit lorsque son contenu n’a pas changé : remplacer un élément entre le début et la fin d’un toucher peut annuler son premier clic.

La Vue d’ensemble est la page d’entrée après connexion pour les profils disposant de plusieurs espaces métier. Elle présente une grille responsive contenant uniquement les espaces déjà autorisés pour le profil courant : Club, Organisation des compétitions, Données sportives, Suivi DTN, Administration nationale et Administration du portail. Un profil dont le seul espace métier est la gestion Club arrive directement sur l’accueil Club ; le premier lien de navigation devient alors « Accueil club ». Cette adaptation ne change ni les capacités ni les règles d’accès. Les cartes servent principalement de raccourcis vers les vues existantes. Les demandes en attente sont signalées par un compteur rouge compact sur le parent du rail, la carte correspondante de la Vue d’ensemble et la carte d’action de l’accueil concerné. Le compteur est masqué à zéro et affiche `99+` au-delà de 99, avec le total exact dans son libellé accessible. « Gestion du portail » compte les demandes d’accès de la région pour un administrateur régional et toutes les demandes pour un administrateur national. « Administration nationale » compte uniquement les corrections de nageurs et suppressions réservées au national. Un résumé agrégé unique est chargé après l’identification du profil, conservé pour la session puis actualisé après le traitement d’une demande ; il ne charge aucun document de liste, n’installe aucun listener et n’effectue aucune lecture par ligne.

Les vues simples, comme « Mon compte », utilisent un en-tête autonome suivi de cartes blanches sur le fond général du portail. Le formulaire public de demande d’accès reste réservé à l’écran de connexion. Le traitement des demandes reçues appartient à la Gestion du portail et n’apparaît plus dans l’Organisation des compétitions. Chaque fonction importante reçoit un pictogramme linéaire dans un carré pastel, toujours accompagné d’un titre et d’une explication. Les formulaires conservent leurs libellés au-dessus des champs, des surfaces légèrement grisées et une disposition en deux colonnes qui passe à une colonne sous `720 px`.

Toutes les pages-outils du portail utilisent le même en-tête compact blanc : une bordure légère, un padding vertical de `8–9 px` et un titre unique limité à environ `1,3rem`. Elles n’affichent ni surtitre d’espace ni description générale sous ce titre ; le fil d’Ariane et la navigation portent déjà ce contexte. La première carte de contenu ne répète pas à l’identique ce titre ni son espace. Une action directement liée à la page peut rester alignée à droite de l’en-tête, puis passer sous le titre sur mobile. Les pages d’accueil et accueils d’espace conservent en revanche leur bandeau descriptif, nécessaire pour orienter vers plusieurs destinations. Sous `760 px`, le fil d’Ariane reste toujours visible mais resserré et tous ces en-têtes perdent bordure, fond et ombre : le titre rejoint directement le contenu, comme dans « Engagements en compétition ». Les cartes de destination des accueils deviennent des lignes tactiles d’environ `58 px` avec icône, titre et chevron ; leurs surtitres et descriptions sont masqués, tandis que les compteurs d’actions en attente restent visibles. Les filtres d’annuaire utilisent des champs de `34 px`, une recherche pleine largeur puis une grille compacte pour les contrôles secondaires. Cette densité ne s’applique pas aux formulaires de saisie, fenêtres, matrices sportives ni décisions sensibles, qui conservent leurs dimensions tactiles et leurs explications. Dans la première carte de « Mon compte », le nom complet constitue l’information principale ; l’email et la licence sont secondaires. Le périmètre est formulé comme une phrase et le club est toujours présenté par son nom lisible, jamais par son identifiant technique ; le nom du club et celui de la région sont renforcés en gras. Les habilitations sont fermées par défaut sous « Voir le détail de mes accès ». La ligne de modification de l’email rappelle l’adresse actuelle. Les formulaires email et mot de passe forment un accordéon : l’ouverture de l’un referme automatiquement l’autre.

Dans les annuaires nationaux, le menu d’actions à trois points s’ouvre vers l’intérieur du tableau : son bord droit reste aligné sur le déclencheur afin que les libellés ne débordent pas de la zone visible.

Le module Records/MPF conserve son parcours métier en trois temps : sélection du référentiel, consultation du tableau, puis édition de la ligne. Son en-tête suit la variante commune à titre unique ; l’action « Journal des mises à jour » reste alignée à droite. La recherche, le tableau, les brouillons, l’historique et l’éditeur utilisent des cartes blanches à bordure légère. Les filtres et l’éditeur passent de quatre ou trois colonnes à deux sous `1180 px`, puis à une colonne sous `680 px`. Les couleurs féminin, masculin, brouillon, validation et alerte restent réservées à leur signification sportive ou fonctionnelle existante.

Les modules Import et Correction reprennent le même langage visuel sans modifier leur parcours métier. L’import distingue clairement le chargement, la prévisualisation et l’historique ; la correction sépare la recherche, la sélection de la ligne et le formulaire de correction motivée. Les étapes, filtres, résumés et tableaux reposent sur des cartes blanches à bordure légère. Les formulaires passent à deux colonnes sous `1120 px`, puis à une colonne sous `680 px`. Les actions destructives ou irréversibles conservent leur traitement rouge afin de ne pas banaliser le risque. Les formats de fichiers, règles de validation, états métier et traitements de données ne relèvent pas du design system et doivent rester indépendants de cette présentation.

Les opérations longues du portail utilisent un bandeau commun ambre et collant : analyse et publication d’un import, correction avec republication, recalcul DTN, génération groupée des PDF clubs et préparation ou envoi groupé de courriels. Le bandeau présente l’action réelle, une progression indéterminée et le temps écoulé ; il ne simule jamais un pourcentage que le serveur ne fournit pas. Les actions concernées restent verrouillées jusqu’à la réponse. Le bandeau revient ensuite dans le flux et prend la couleur sémantique de la réussite ou de l’erreur. Lorsqu’un calcul serveur continue après la réponse, il devient bleu et indique explicitement que le traitement se poursuit en arrière-plan.

L’Espace DTN utilise l’en-tête commun à titre unique ; le sélecteur de saison sans libellé visible est placé à droite du titre, car il pilote toutes les vues DTN. Les sous-en-têtes ne répètent pas la saison. Le filtre Sexe et le recalcul des qualifications Équipe de France sont regroupés à droite de l’en-tête « Équipe de France » ; dans la Mise en liste, « Recalculer la mise en liste » occupe directement la droite de l’en-tête « Sportifs éligibles ». Les périmètres de qualification et les règles saisonnières sont placés après les tableaux, tout en bas de leur module. L’export Équipe de France reste replié tant qu’il n’est pas utilisé. Les référentiels, synthèses, exports et listes de sportifs sont présentés dans des cartes plates à bordure légère. La Mise en liste utilise une barre à deux onglets pleine largeur Relève et Espoir. Relève propose les filtres Sexe, Club et Épreuve ; Espoir ajoute en premier un filtre Performance limité à Tous, TEP et TEC1. Le sexe reste un sélecteur segmenté Tous, Femmes et Hommes, tandis que les autres filtres utilisent des listes compactes ; leurs choix génériques sont abrégés en Tous pour Club et Toutes pour Épreuve. Les onglets et les choix de sexe affichent leurs effectifs calculés depuis la réponse déjà chargée, sans lecture supplémentaire ; aucun compteur autonome ne les répète sous les filtres. Le dernier onglet ainsi que le dernier sexe choisis sont mémorisés pour la session. Le détail repliable d’un sportif regroupe ses performances qualificatives sans dupliquer sa ligne et l'ouverture d'un détail referme le précédent. Les lignes féminines reprennent le rose très pâle et le repère framboise de LivePalmes ; les lignes masculines reprennent le bleu très pâle et le repère bleu existants. La colonne Sexe reste affichée afin que l’information ne dépende jamais uniquement de la couleur. Dans ce tableau, la colonne Détail réserve en permanence la largeur nécessaire aux performances dépliées afin que l’ouverture d’une ligne ne redimensionne aucune colonne. À toutes les largeurs, cette liste reste un tableau compact et n'est jamais transformée en fiches verticales. Elle conserve son défilement horizontal et, sous `620 px`, sa colonne Nom fixe. Sous `820 px`, les actions peuvent revenir à la ligne ; sous `620 px`, les filtres, boutons et en-têtes de panneaux occupent toute la largeur. Les teintes associées au sexe, aux catégories Équipe de France, aux seuils et aux états de qualification conservent leur signification métier existante.

La Gestion du portail possède un accueil à deux destinations : « Demandes d’accès » et « Utilisateurs et habilitations ». Les demandes conservent leurs cartes de vérification et le compteur d’attente dans le sous-menu. Dans la vue des utilisateurs, le titre unique porte à droite une action secondaire « Ajouter » ; la liste ne répète pas son titre et ne propose aucun bouton « Actualiser ». L’annuaire s’inspire de la densité de l’ancien logiciel fédéral tout en conservant les conventions LivePalmes : aucune carte extérieure autour de la liste, une barre de recherche et de filtres sur une seule ligne, un compteur discret puis un tableau à en-tête fixe. La ligne fermée reste strictement consacrée à l’identification : Nom, Prénom, Email, Club, Connexion et État, puis un chevron de détail. Licence, périmètre complet, habilitations et actions ne sont affichés que dans le détail repliable de l’utilisateur ; une seule ligne peut être ouverte à la fois. Les lignes fermées visent environ `38 px`. Dans le détail, Modifier, Désactiver/Réactiver et Supprimer redeviennent des boutons explicitement libellés afin d’éviter trois icônes répétées sous chaque personne. Un index alphabétique A–Z n’est pas affiché tant que l’annuaire repose sur une pagination serveur, car il donnerait une impression de filtrage exhaustif trompeuse. Le premier chargement est conservé en mémoire pendant la session ; revenir sur l’onglet ne déclenche pas une nouvelle lecture. Une lecture bornée à 25 comptes reste déclenchée par une recherche, un changement de filtre, la pagination ou une modification réellement enregistrée. Ajouter ou modifier un compte ouvre le même formulaire dans une fenêtre modale native, sans déplacer l’annuaire vers le bas. Son titre indique l’action en cours ; elle se ferme avec la croix, « Annuler », la touche Échap ou après un enregistrement réussi. Une erreur d’enregistrement conserve la fenêtre et ses valeurs. Le formulaire d’identité utilise trois colonnes et les habilitations restent des choix explicites dans une grille, sans modifier leur portée ni leur comportement. Sous `1120 px`, le formulaire et les habilitations passent à deux colonnes. Sous `760 px`, chaque utilisateur devient une ligne tactile compacte avec son nom au format `NOM Prénom`, son email et son statut ; le même chevron déplie Licence, périmètre, habilitations et actions. Les filtres et le formulaire passent alors à une colonne, tandis que la fenêtre reste bornée à la hauteur de l’écran et défile intérieurement. Les statuts actif et inactif restent des badges sémantiques, et les actions de désactivation ou de suppression conservent leur traitement d’alerte existant.

Les calendriers Club et organisateur reprennent le même système visuel : un unique en-tête compact blanc, immédiatement suivi d’un bandeau de filtres gris clair puis d’une liste tabulaire responsive. Côté Club, le titre reste « Engagements en compétition » ; côté organisateur, le titre unique devient « Compétitions à administrer ». Le surtitre, la description générale et l’ancien en-tête interne « Calendrier organisateur » sont retirés de ces deux calendriers afin que les filtres commencent immédiatement sous le titre. Le statut est un contrôle segmenté dont « Toutes » constitue la vue initiale côté Club et un sélecteur compact côté organisateur ; la saison reste immédiatement visible, tandis que la région organisatrice et le niveau sont rangés sous « Plus de filtres ». Le caractère « invité » d’une région ne limite pas l’inscription d’un club : il concerne uniquement la notification d’ouverture et n’est pas utilisé comme filtre d’accès au calendrier. Le nombre de compétitions affichées n’est pas répété. Dans la vue organisateur, l’heure de dernière actualisation reste disponible sur ordinateur ; sur mobile, elle s’efface au profit d’un bouton d’actualisation carré de `36 px`, affiché sous forme d’icône dans l’en-tête. Les chargements et erreurs utiles conservent un message dédié. Côté Club, le calendrier est préchargé dès l’identification du profil et conservé pendant toute la session ; l’actualisation automatique réussie reste silencieuse. Avant la première réponse, trois lignes neutres de chargement remplacent tout faux état vide. Les compétitions ouvertes apparaissent toujours en premier, triées par échéance d’engagement ; viennent ensuite les compétitions à venir par ordre chronologique, puis les compétitions fermées de la plus récente à la plus ancienne. La liste est révélée progressivement par lots de 24 pour préserver une saison longue. Le libellé « Engagements ouverts » n’est pas répété lorsque le filtre correspondant est déjà actif. Sur ordinateur, une compétition occupe une ligne compacte structurée en cinq colonnes : Date, Compétition avec le lieu en information secondaire, Niveau/région, Engagements et Action. Le statut et l’échéance partagent une colonne réservée ; le bouton ne peut donc pas recouvrir le décompte. Ce dernier emploie les unités compactes `j`, `h` et `min`, par exemple « Ferme dans 1 j 12 h 59 min ». Une compétition ne peut jamais être enregistrée avec des engagements ouverts lorsque sa date de clôture est atteinte ou dépassée ; l’interface bloque l’action avant confirmation et le serveur applique la même précondition. Le niveau est un badge discret et l’action associe une icône à son libellé métier. Sous `1120 px`, les cinq colonnes se resserrent sans séparer le lieu du nom. Sous `760 px`, le fil d’Ariane est conservé mais resserré et le titre perd son cadre. Côté Club, Saison et les statuts Toutes, Ouvertes, À venir et Fermées tiennent sur une barre horizontale compacte ; côté organisateur, Saison et Statut partagent une même ligne. Dans les deux vues, Région organisatrice et Niveau restent repliés sous « Plus de filtres », les séparateurs mensuels disparaissent et chaque compétition devient une ligne tactile d’environ `66 px` : date, état et échéance en tête, puis nom et métadonnées sur une seconde zone ; un chevron remplace le bouton pleine largeur tout en conservant une action clavier accessible. Pour une compétition ouverte, le calendrier indique « Mes engagements » lorsqu’un dossier existe réellement pour le club et « S’engager » sinon. L’existence du dossier est contrôlée côté serveur par lots bornés sur les seules compétitions affichées ; la mémoire locale conserve uniquement la dernière étape consultée, par club et compétition. Les filtres segmentés restent sur une seule ligne défilable. Dans la fiche Club, les onglets sont regroupés en quatre étapes numérotées sans modifier leur comportement métier : Informations, Participants, Engagements, puis Vérification et envoi. La navigation reste horizontale et défilable sur ordinateur, sous forme de boutons compacts dont l’onglet actif est turquoise. Sous `700 px`, elle conserve ces quatre étapes dans une barre tactile compacte. Aucun pied de navigation précédente/suivante n’est répété sous le contenu ; les étapes et sous-onglets du haut constituent l’unique navigation de la fiche. Les couleurs ouvert, échéance proche, échéance dépassée et fermé restent exclusivement liées aux états métier existants.

Les données des calendriers Club et organisateur utilisent deux caches strictement séparés par utilisateur, périmètre et saison. Seul le calendrier Club est préchargé après l’identification d’un profil qui possède ce droit ; le calendrier organisateur reste chargé à sa première ouverture. Une liste déjà connue est restaurée immédiatement depuis le cache de session, puis actualisée silencieusement lorsqu’elle a plus de cinq minutes. Une création, une modification ou une suppression de compétition invalide les deux caches afin qu’aucun ancien état ne réapparaisse lors d’un changement d’espace.

Une fiche compétition, côté Club comme côté organisateur, commence directement par le nom de la compétition, suivi de la date et du lieu. Le niveau — National, Régional ou Départemental — et l’état des engagements sont présentés comme deux badges distincts. Les libellés techniques « Fiche compétition club », « Fiche compétition organisateur » et « Consultation » ne sont pas affichés. L’action « Retour aux compétitions » rejoint l’en-tête principal à droite sur ordinateur et sous le titre sur mobile. L’en-tête de la fiche ne possède pas de cadre extérieur supplémentaire : les onglets assurent la séparation avec le contenu.

Les nageurs, officiels et chefs d’équipe sont présentés comme des rôles cumulables d’une même personne. Lorsqu’un nageur devient officiel ou chef d’équipe, son identité et sa licence sont reprises depuis sa fiche nageur et restent non ressaisies ; l’interface conserve un lien vers cette source. Une personne non nageuse peut toujours être saisie manuellement. Dans l’onglet Officiels, un sélecteur repliable permet d’ajouter directement un nageur du club comme officiel puis enregistre son rôle et sa sélection pour la compétition. Les nageurs sont réutilisés depuis le roster déjà chargé, sans lecture individuelle.

Une personne non nageuse créée comme officiel ou chef d’équipe utilise la même identité complète : Nom, Prénom, Date de naissance, Sexe et Licence. La création compare la licence et l’identité normalisée avec les membres du club déjà chargés. Une licence identique, une identité identique ou un nom et un prénom inversés avec la même naissance empêchent une nouvelle fiche et proposent la personne existante. Une ressemblance affiche le nom du candidat et demande soit de le réutiliser, soit de confirmer expressément la nouvelle fiche. La fonction serveur répète les contrôles bloquants depuis le roster agrégé du club, sans lecture par membre. Dans Chef d’équipe, la recherche et le sélecteur occupent la première ligne, puis les cinq données d’identité utilisent la grille compacte ; choisir un membre complet enregistre immédiatement, tandis que le bouton reste visible pour une saisie manuelle ou pour compléter une ancienne fiche. La création interne enregistre d’abord la personne commune puis lui attribue le rôle Chef d’équipe. Un chef d’équipe hors club conserve volontairement le formulaire minimal Nom, Prénom, Licence et Club. Dans Mes officiels, un champ unique recherche localement sur le nom, le prénom ou la licence et affiche immédiatement jusqu’à huit propositions cliquables sous la saisie, sans second menu « Résultat ». Cliquer une proposition ou valider la première avec Entrée reprend automatiquement son identité ; la saisie manuelle reste toujours possible. La recherche réutilise l’effectif déjà chargé et n’ajoute aucune lecture distante. Elle applique ensuite exactement le même formulaire d’identité et les mêmes contrôles de rapprochement. Ces formulaires repassent à une colonne sous `700 px`.

Dans l’onglet Général de la fiche Club, le résumé du programme reste factuel et compact : il affiche uniquement le nombre d’épreuves et le nombre de sessions, sans qualification « choisies », état de complétude ni compteur d’épreuves restant à placer. Une ligne « Temps d’engagement » explique que le meilleur temps est recherché dans tout l’historique ou dans la période inclusive configurée, puis indique si la saisie manuelle est autorisée. La ligne « Frais d’engagement » se limite aux montants par nageur, course et relais ; l’état de publication HelloAsso demeure porté uniquement par sa ligne dédiée. Les valeurs de la colonne droite utilisent une taille de `0,82 rem` et une graisse normale. Le statut des engagements n’est pas répété dans ce tableau : un badge « Engagements à venir / ouverts / fermés » est placé dans l’en-tête de la fiche. Côté organisateur, ce badge est actionnable et ouvre directement le formulaire Général sur le sélecteur de statut ; côté Club, il reste informatif.

Les barres de filtres des calendriers, qualifications DTN et historiques d’import restent collantes sur ordinateur afin de conserver le contexte pendant le défilement. Elles affichent un résultat quantifié lorsqu’il est déjà disponible côté client et utilisent l’action explicite « Réinitialiser les filtres ». Aucun compteur ne justifie une nouvelle lecture distante. Lorsqu’un bouton « Actualiser » est nécessaire, le statut ou le compteur associé indique l’heure de la dernière lecture réussie. Un fonctionnement normal sans information utile supplémentaire ne laisse pas de message technique permanent. Les messages `aria-live` en cours de chargement reçoivent un indicateur animé discret, désactivé lorsque l’utilisateur préfère réduire les animations.

Le Journal d’activité utilise une liste chronologique compacte plutôt qu’un grand tableau. Chaque ligne indique la date, l’action, le nom lisible de l’acteur et l’objet concerné, puis se déplie au toucher ou au clavier pour présenter un résumé métier. Lorsqu’une trace contient réellement l’ancienne et la nouvelle valeur, le détail les présente sous la forme « avant → après » ; aucune valeur antérieure ne doit être déduite ou reconstruite côté interface. Aucun identifiant brut d’utilisateur, de club ou de compétition ne doit apparaître dans la ligne fermée. Les modifications rapprochées d’un même engagement sont regroupées sur une fenêtre de dix minutes pour le même acteur, club et compétition, même si une autre action s’intercale ; les actions critiques restent isolées. Le détail d’un groupe ne répète pas chaque sauvegarde : il indique en une phrase qui a modifié les engagements, agrège les traces par type d’action et présente le dernier état enregistré. Le volet « Détails complémentaires » reste fermé par défaut mais demeure rédigé pour un humain : les références connues y sont remplacées par les noms des acteurs, personnes, clubs ou compétitions, les rôles sont traduits et seuls les états actifs sont énumérés. Les anciennes personnes sont résolues par lots bornés ; les nouvelles traces enregistrent directement leur nom afin d’éviter cette lecture. Les filtres Période, Club et Utilisateur relancent automatiquement une lecture distante bornée ; Catégorie, Origine et recherche filtrent immédiatement les traces déjà chargées. Le filtre Club reprend tout le référentiel déjà chargé par le portail, sans lecture par club. Le filtre Utilisateur interroge l’annuaire complet à partir de deux caractères et propose au plus 25 comptes par recherche : il ne dépend donc pas des seuls acteurs présents dans la page de traces et ne charge jamais tous les profils. Une coche et une bordure discrète confirment qu’un utilisateur proposé a bien été sélectionné ; une saisie libre ne doit pas être interprétée comme un identifiant. Sur ordinateur, les six filtres tiennent sur une seule ligne. « Recharger le journal » est une petite action secondaire alignée à droite du titre sans augmenter la hauteur de l’en-tête ; « Effacer » reste une action texte très discrète à l’extrémité de la ligne des filtres, sans créer de seconde rangée. Les filtres passent à deux colonnes sous `620 px`, puis à une colonne sous `440 px`. La liste est paginée par une action « Charger plus » et devient une fiche verticale sous `520 px`.

Sous `620 px`, les tableaux de résultats et d’administration adaptés reçoivent des libellés de colonnes et deviennent des fiches verticales. Les matrices sportives qui nécessitent une comparaison par colonnes, comme les grilles de temps DTN, conservent leur défilement horizontal et leur première colonne fixe.

Le contenu d’une fiche compétition suit une même structure pour tous ses onglets : un résumé ou une barre de contexte, puis des sections blanches bordées et enfin les actions. Sa marge dans la carte et le retrait du panneau actif consomment les gouttières responsives communes ; ils ne recréent pas deux espacements fixes de `16 px` et `14 px` sur les écrans étroits. Le formulaire général conserve une présentation libellé-valeur sur ordinateur et passe à une disposition verticale sous `700 px`. Le programme utilise des sections repliables, avec un fond turquoise léger pour la session active ; ses groupes restent en deux colonnes jusqu’à `520 px`, puis passent en une colonne sur les plus petits écrans. Dans l’en-tête d’une session, « Session », « Date » et « Début » restent toujours alignés sur trois colonnes, y compris sur mobile, tandis que les éventuelles actions passent sur la ligne suivante. Chaque course tient sur une seule ligne : en piscine, son premier passage conserve le marqueur de sexe et un bouton compact dont la largeur suit la phase affichée ; son menu flottant propose Course directe, Séries + finale(s) et Séries lentes / série rapide sans élargir la ligne. La ligne montre seulement la phase qui y est nagée et le second passage affiche automatiquement Finale(s) ou Série rapide sans sélecteur indépendant. En Eau libre, les courses directes n’affichent aucun format ; seul le 150 m élimination propose Course directe ou Séries + finale(s). Les marqueurs féminin, masculin, mixte et combiné conservent leurs couleurs métier. L’onglet Frais est réservé à la vue organisateur, où ses champs restent regroupés en cartes et sa note de paiement reste jaune ; côté Club, les mêmes informations sont consultées directement dans Général afin d’éviter un onglet redondant. Les documents utilisent des cartes compactes avec un badge d’état. En lecture seule, les valeurs restent visuellement distinctes sans masquer l’état désactivé des champs.

Les onglets Chef d’équipe, Officiels et Nageurs partagent une barre de contexte. Dans Chef d’équipe, choisir « Déclarer » affiche une recherche bornée aux membres actifs déjà connus du club, par nom, prénom ou licence, ainsi que le sélecteur des résultats. Cette recherche est également rétablie après une renonciation déjà enregistrée. Choisir un membre existant reprend son identité et enregistre immédiatement le chef d’équipe ; le bouton « Valider le chef d’équipe » reste réservé à la saisie manuelle. Les membres sont réutilisés depuis la liste du club déjà chargée, sans lecture individuelle. Le prénom, le nom et la licence sont alignés sur trois colonnes compactes sur ordinateur ; le formulaire repasse à une colonne sous `700 px`. Le choix « Ne pas déclarer de chef d’équipe » ouvre une confirmation rappelant que le club renonce au droit de réclamation ; confirmer déclenche immédiatement l’enregistrement, sans case ni bouton supplémentaire, tandis qu’annuler restaure la déclaration d’une personne. Les choix restent de grandes zones tactiles et la confirmation de renonciation conserve sa fonction d’avertissement. Dans la fiche Club, l’onglet Officiels est entièrement masqué lorsque la compétition indique que les officiels ne sont pas requis ; il reste disponible dans la vue organisateur et pour les compétitions qui les exigent. Lorsqu’il est présent, les officiels restent regroupés par fonction dans des tableaux compacts, avec une ligne turquoise lorsqu’ils sont sélectionnés. Dans Nageurs, aucun bloc ne répète le titre, le compteur et une action Enregistrer : la liste « Nageurs engagés » précède directement la recherche et l’action secondaire « Nageur introuvable ? Ajouter un nageur absent de la base » reste en fin de parcours, en graisse normale. Cocher ou décocher un nageur enregistre immédiatement ce seul changement ; les clics rapides sont traités dans l’ordre. Un retour serveur conserve les autres sélections locales encore en attente, notamment lorsqu’une licence doit être complétée, sans les marquer comme déjà persistées. Le retrait d’un nageur possédant des courses conserve sa confirmation et supprime ses engagements après validation. Une licence manquante suspend l’ajout jusqu’à la saisie d’une valeur valide. Seuls l’écriture en cours et les échecs produisent un message ; l’interface revient à l’état serveur en cas d’erreur. Les nageuses précèdent les nageurs dans la liste engagée comme dans les résultats de recherche, puis chaque groupe est trié par nom et prénom. Les nageurs déjà enregistrés apparaissent immédiatement, même pendant le chargement du reste de l’effectif. Aucun autre nageur ni texte d’attente n’est affiché spontanément sous la recherche : la liste correspondante est remplacée par des résultats de recherche limités à 50 lignes dès la saisie, et une recherche trop large invite à préciser les critères. Seul le nombre de nageurs engagés est affiché. La recherche et l’ajout d’un nageur utilisent des cartes distinctes. Sur ordinateur, la liste reste tabulaire et ses lignes compactes visent environ `32 px` ; le libellé d’engagement s’étire sur toute leur hauteur afin de conserver une zone tactile confortable. Le numéro de licence reste dans sa colonne et un état utile apparaît juste en dessous, en plus petit. L’état normal « Vérifiée » n’est pas affiché ; « Saison à contrôler » et les anomalies restent visibles. Le nom, la naissance, le sexe, la catégorie et la licence utilisent la même taille de texte. Une licence déjà connue est une donnée en lecture seule sans apparence de champ ; si elle manque, le club doit la saisir au format `A-12-34567` avant d’enregistrer le nageur engagé. Entre `521 px` et `700 px`, les colonnes se resserrent mais la présentation tabulaire est conservée. Sous `521 px` seulement, chaque nageur devient une ligne tactile compacte présentant le nom, le sexe et la catégorie calculée ; un bouton `+` ouvre en accordéon Naissance, Sexe, Catégorie et Licence, avec une seule ligne ouverte à la fois. Les formulaires passent à une colonne.

L’onglet Courses utilise une matrice défilable horizontalement : chaque ligne correspond à un nageur et présente séparément nom, prénom, naissance et catégorie ; chaque course du programme occupe une colonne. Les nageuses sont affichées avant les nageurs, puis chaque groupe est trié par nom et prénom. Un en-tête sur deux niveaux regroupe visuellement les courses par session, avec une séparation verticale discrète au début de chaque groupe. La colonne Nom reste fixe à gauche et l’action Temps reste fixe à droite pendant le défilement. Les cellules incompatibles avec le sexe ou une catégorie explicitement restreinte sont grisées et non interactives. Dans une cellule cochée, le temps d’engagement est affiché sous la case sans élargir la colonne. Cocher ou décocher une course programme automatiquement l’enregistrement de la ligne et le serveur renvoie son temps calculé. Les changements effectués dans une fenêtre de `500 ms` sont regroupés dans un seul appel, y compris lorsqu’ils concernent plusieurs nageurs ; seul le dernier état complet de chaque ligne est transmis. Les lots successifs restent sérialisés. Quitter la fiche force l’envoi immédiat du lot encore différé ; une réouverture attend les écritures déjà parties et reconstruit la matrice depuis l’inscription serveur, même si la liste Nageurs n’a pas encore été rendue. Le bouton crayon en fin de ligne ouvre une fenêtre propre au nageur, limitée aux courses cochées, et réutilise les temps déjà chargés. Lorsque la saisie manuelle est autorisée, le temps enregistré devient directement un sélecteur compact avec sa flèche native, sans bouton supplémentaire : il conserve sa valeur actuelle et propose au maximum les dix derniers temps connus sur la même épreuve. Les options affichent uniquement le temps ; la date et le lieu de l’option choisie sont indiqués sous le champ. Les valeurs identiques sont dédoublonnées en conservant la réalisation la plus récente. En l’absence d’alternative, la flèche disparaît et la valeur redevient une information simple. Ces propositions respectent uniquement la période de qualification éventuelle ; elles acceptent les temps intermédiaires et ne sont pas filtrées par le bassin ni le type de chronométrage de la compétition. Choisir une proposition ne modifie rien avant « Valider les temps » et ne déclenche aucun recalcul du temps enregistré. Le bouton « Saisie libre » permet une valeur manuelle, signalée sous le champ ; « Valider les temps » enregistre immédiatement la ligne. Les champs de temps Courses et Relais acceptent une saisie compacte sans séparateurs puis la normalisent à la sortie en `MM:SS.CC` ; par exemple `5912` devient `00:59.12` et `12345` devient `01:23.45`. Un temps automatique ne devient jamais manuel au seul motif qu’il possède déjà une valeur. Chaque écriture Courses transmet uniquement les nageurs modifiés du lot ; elle ne relit ni l’effectif complet ni les licences du club. Les références Records/MPF ne sont chargées que pour contrôler un temps manuel. L’onglet ne répète ni son titre, ni un compteur, ni un bouton global ou une barre de modifications. La fiche affiche un retour commun « Enregistrement… », « Enregistré ✓ » ou une erreur persistante pour les étapes Club, sans nouvelle lecture ; la confirmation s’efface après un bref délai. Les temps connus, manuels et par défaut conservent leurs états visuels distincts. Sur mobile, la matrice conserve ses colonnes et son défilement horizontal au lieu de devenir une succession de cartes. Tant que des colonnes restent hors champ, un léger fondu latéral et une indication temporaire « Faites glisser pour voir les autres courses » rendent ce geste explicite ; l’indication disparaît après le premier défilement de la compétition. Dans l’onglet Relais, aucun bandeau ne répète le titre ou le nombre de relais : l’action « Ajouter un relais » suit directement le dernier relais de la liste. Ajouter ou modifier ouvre une fenêtre compacte unique ; la liste ne contient que les relais déjà enregistrés en lecture seule. La première ligne de la fenêtre regroupe Distance, Catégorie, Sexe et Temps, puis un accordéon « Choisir les relayeurs » ou « Choisir les relayeuses » contient la composition. Un nouveau relais laisse obligatoirement la distance, la catégorie et le sexe à choisir. Lorsqu’une distance n’autorise que le mixte, « Mixte » est sélectionné automatiquement et le champ Sexe reste verrouillé. Changer de distance efface le temps et les participants devenus propres à l’ancienne distance, conserve la catégorie et le sexe lorsqu’ils restent compatibles et affiche une information locale. Les changements de catégorie ou de sexe ne retirent que les participants devenus incompatibles. Dans l’accordéon, les quatre sélecteurs sont affichés sur deux colonnes sur ordinateur et empilés sur mobile. Chaque emplacement tient sur une seule ligne : son numéro est placé à gauche et la valeur vide indique « Relayeur » ou « Relayeuse » selon le sexe attendu. Une personne choisie disparaît immédiatement des autres propositions et une action secondaire « RAZ » vide les quatre choix. Son résumé indique discrètement le nombre de participants renseignés. « Valider le relais » contrôle puis enregistre immédiatement toutes les informations avec la fonction existante ; la fenêtre et le brouillon local restent ouverts avec l’erreur en cas d’échec, et la liste n’est remplacée qu’après confirmation du serveur. Annuler ou fermer la fenêtre ne modifie jamais le relais enregistré. Une fois enregistré, le relais présente un participant par ligne au format `NOM P.`, quelle que soit la largeur d’affichage ; le crayon rouvre la même fenêtre préremplie. La suppression d’un relais déjà enregistré demande confirmation puis est immédiatement persistée. Ces opérations réutilisent les nageurs déjà chargés et n’ajoutent aucune lecture distante. La session issue du programme est indiquée discrètement sous la distance. Les relais Femmes utilisent un repère rose et les relais Hommes un repère bleu, en complément de leurs fonds très légers ; le mixte reste vert. L’alerte rouge regroupe les incohérences avant enregistrement. Le Récapitulatif commence directement par le titre « Récapitulatif club » puis le tableau compact, sans description permanente ni bloc séparé pour le détail des relais. Ses valeurs utilisent la même taille de `0,82 rem` et la même graisse normale que Général. L’action « Télécharger le PDF » est placée après le tableau et occupe toute la largeur sur mobile. Le statut général de la fiche ne montre aucun message permanent lorsque le chargement a réussi ; il reste réservé aux chargements, erreurs et confirmations d’action. Sous `700 px`, les actions occupent toute la largeur et les totaux passent en lecture verticale. Le PDF récapitulatif est en A4 portrait : le chef d’équipe précède les matrices Femmes puis Hommes, qui reprennent les quatorze courses du programme en colonnes et affichent seulement le temps d’engagement dans chaque case engagée. Les relais et les officiels suivent les engagements, et les frais restent la dernière rubrique ; les en-têtes sont répétés lorsqu’un tableau se poursuit sur une autre page.

À la première ouverture d’une fiche Club non encore conservée en mémoire, son nom, sa date et son lieu sont repris immédiatement depuis le calendrier. Les onglets et leurs états vides restent masqués derrière le message « Chargement de vos engagements enregistrés… » jusqu’à la réponse serveur, afin de ne jamais suggérer que les inscriptions ont disparu. Une fiche déjà consultée est affichée immédiatement depuis le cache de la session puis actualisée sans effacer son contenu. L’annuaire complet des membres n’est pas inclus dans cette lecture prioritaire ; il est demandé uniquement lors de l’ouverture de Chef d’équipe ou Officiels.

Les annuaires Mes officiels et Mes nageurs utilisent le même en-tête compact à titre unique qu’« Engagements en compétition » : la carte de contenu ne répète ni l’espace ni le titre actif et commence directement par une barre d’actions ou de recherche, son état et sa liste. Dans Mes officiels, l’action « Ajouter » est placée à droite du titre de page. Aucun bouton « Actualiser », compteur de personnes actives ni heure de dernière lecture ne sont affichés ; seuls un chargement ou une erreur utile occupent temporairement la zone de message. Le tableau commence donc immédiatement sous l’en-tête. Mes officiels reprend la densité de Mes nageurs : sur ordinateur, une table à en-tête fixe présente Personne, Licence, Rôle, Statut et Actions dans des lignes d’environ `42 px`, entourées d’une seule bordure. Une personne inactive reste volontairement atténuée. Sous `700 px`, chaque officiel devient une ligne tactile avec son nom et un badge de rôle ; un chevron déplie Licence, Rôle, Statut et Actions, avec une seule ligne ouverte à la fois. Dans Mes nageurs, la liste est chargée automatiquement à l’ouverture : aucun bouton d’actualisation ni aucune heure de dernière lecture ne sont affichés. Le champ de recherche avec son icône occupe seul toute la largeur disponible, sans libellé visible « Rechercher » ni filtre secondaire. La liste est ordonnée alphabétiquement et présente toujours le nom avant le prénom. Seuls le chargement, une erreur ou un état vide utile donnent lieu à un message. Une licence absente est signalée par « Licence à renseigner », jamais par un simple tiret. Le nom est accompagné d’une petite icône de fiche afin de rendre explicite son ouverture ; son activation demande confirmation avant d’ouvrir la fiche publique du nageur dans un nouvel onglet. Un crayon compact de `32 px` sur ordinateur, disponible pour toute source, reste centré dans la ligne sans en modifier la hauteur et ouvre une fenêtre « Demander une correction » préremplie avec Nom, Prénom, Date de naissance, Sexe et Licence ; le club doit indiquer un motif et ne modifie jamais directement l’identité. Tant que la demande est en attente, le crayon est remplacé par la pastille orange « Correction en attente ». Une fiche créée depuis le portail propose aussi « Demander la suppression » dans sa colonne Action ; cette action n’est jamais affichée pour une fiche issue des performances. Sans performance ni inscription, la suppression est immédiate. Dès qu’un historique existe ou que le contrôle borné ne peut être exhaustif, le nageur est désactivé et la demande rejoint Administration nationale > Suppressions ; l’approbation conserve l’archive désactivée et le refus réactive la fiche. La page ne dessine qu’une bordure autour de la liste, sans carte extérieure supplémentaire. Sur ordinateur, l’en-tête du tableau reste visible dans une longue liste. Les lignes reprennent les fonds féminins et masculins très légers déjà employés dans les engagements, accompagnés d’un repère coloré. Sous `700 px`, chaque nageur occupe une seule ligne tactile présentant son nom, son accès à la fiche publique, une pastille unique combinant le sexe et la catégorie au format `F · S` ou `H · C`, les actions disponibles et le chevron. Cette information textuelle complète le repère coloré sans dépendre uniquement de la couleur. Le détail ne répète pas ces informations : il affiche seulement Naissance et Licence sur deux colonnes, avec une seule ligne ouverte à la fois. Les formulaires et fenêtres occupent alors toute la largeur.

Dans Général, la ligne Bassin associe la longueur et le nombre de lignes d’eau, par exemple « 50 m · 8 lignes d’eau » ; une ancienne compétition incomplète indique explicitement que ce nombre n’est pas renseigné. Les libellés utilisent une graisse moyenne et les valeurs une graisse courante, le gras soutenu restant réservé aux titres, statuts ou décisions importantes. Dans Chef d’équipe, l’action légère « Retirer » est disponible uniquement tant que le dossier ne contient ni nageur, ni officiel, ni relais ; elle supprime alors le dossier vide après confirmation. Dès qu’un participant ou un officiel existe, cette action reste visible mais désactivée avec une explication et seul le remplacement est autorisé. Un document contenant seulement un chef d’équipe n’est pas considéré comme un club engagé et est exclu des statistiques, récapitulatifs et courriels correspondants ; un officiel seul constitue en revanche une participation réelle. Dans Nageurs, une action légère « Ajouter ou récupérer un nageur » partage le bloc de recherche et ouvre le formulaire dans une fenêtre dédiée, sans déplacer la liste. La fenêtre rappelle discrètement que la récupération depuis un autre club est réservée à la première compétition de la saison et demande confirmation avant d’abandonner une saisie commencée. Les nageuses sélectionnées précèdent les nageurs, puis chaque groupe est trié par nom et prénom ; les repères rose et bleu accompagnent toujours le libellé F/M. Sous `620 px`, Courses conserve uniquement le nom fixe, resserré à `96 px`, tandis que l’action Temps rejoint le défilement horizontal. Après une autosauvegarde, seule la matrice est reconstruite et sa position horizontale ainsi que le focus sont restaurés à l’identique. Dès que la zone Relais dispose de moins de `760 px`, chaque relais devient une carte compacte avant qu’un défilement horizontal n’apparaisse : la distance et la session occupent la première rangée, puis Catégorie, Sexe et Temps restent alignés sur une même rangée. Pour un relais enregistré, la liste verticale des participants reste à droite de Catégorie, Sexe et Temps tant que la zone dépasse `520 px`, puis passe dessous sur les écrans plus étroits. Les actions crayon et poubelle restent alignées horizontalement dans l’angle supérieur droit. Dans la fenêtre d’ajout ou de modification, les quatre informations principales restent sur une ligne sur ordinateur et passent sur deux colonnes sur mobile ; les participants sont empilés lorsque l’espace devient étroit.

La création d’une compétition reprend la structure des formulaires de fiche : en-tête blanc, sections bordées, présentation libellé-valeur et action principale alignée à droite. Le nombre de lignes d’eau est obligatoire, limité aux entiers de 4 à 10, et placé avec les paramètres sportifs du bassin. La limite d’épreuves par nageur propose explicitement « Aucune limite d’épreuves par nageur » ; cette option désactive le champ numérique et conserve la valeur métier `0`, tandis qu’une limite active reste comprise entre 1 et 20. Les demandes d’accès sont affichées en cartes contenant identité, périmètre et actions, avec un formulaire de vérification distinct lorsqu’une demande est éditée. L’administration nationale ne possède pas de seconde barre d’onglets dans son contenu : ses cinq destinations sont portées par le rail, l’accueil et l’URL. « Demandes à traiter » regroupe dans trois accordéons les corrections de nageurs, suppressions de données et suppressions de comptes ; les groupes vides disparaissent et un état vide unique les remplace. « Clubs » commence par une barre de recherche et affiche des fiches compactes avec sigle, nom, numéro fédéral, région, localité, statut, administrateurs disposant des droits d’engagement et action de modification. La création et la modification utilisent une fenêtre responsive ; la correction d’un numéro fédéral existant demande une confirmation explicite rappelant l’ancienne et la nouvelle valeur. « Nageurs » et « Officiels » commencent directement par une barre compacte de recherche et un tableau défilable dont les lignes fermées visent `34 px`. Les actions d’une ligne sont regroupées sous un menu à trois points ; les colonnes Conserver, Fusionner et Alerte n’apparaissent qu’après activation explicite de « Gérer les doublons ». « Journal d’activité » propose recherche et catégorie, affiche des libellés compréhensibles dans le tableau et réserve les codes techniques au détail repliable. Les demandes de correction restent fermées par défaut avec leur compteur ; l’ouverture compare uniquement les champs modifiés sous la forme ancienne valeur → nouvelle valeur, puis propose un commentaire national, Refuser et Valider. « Modifier la fiche » ouvre la même fenêtre d’identité que la demande club, avec un motif obligatoire. Une correction qui rejoint une identité existante est refusée et renvoie vers la fusion. Les choix de fusion, suppressions et actions sensibles conservent leurs alertes et confirmations métier existantes. Sous `780 px`, les barres passent à deux colonnes, puis à une seule sous `520 px`; les tableaux conservent leur défilement horizontal.

L’écran de connexion est une carte centrée de `680 px` au maximum. Son intitulé est un titre de niveau 2. Le formulaire principal reste immédiatement visible, le mot de passe peut être affiché ou masqué et la réinitialisation est présentée comme une action secondaire légère. La demande « Demander un accès pour mon club » est placée dans une section repliable. Sous `700 px`, les champs et actions passent à une colonne. Dans « Mon compte », les notifications de compétition utilisent un interrupteur ON/OFF enregistré immédiatement, activé par défaut ; le passage sur OFF demande confirmation et le passage sur ON est direct. Dans tout le portail, les messages de chargement sont gris, les confirmations vertes, les avertissements jaunes et les erreurs rouges. Les états vides utilisent une surface gris clair à bordure discrète. Les documents avancés, suivis de fermeture et historiques de mails reprennent les mêmes cartes, tableaux et badges d’état que le reste du portail.

Le statut d’activité des nageurs du club est persistant. Dans Mes nageurs, les actifs précèdent les inactifs ; le groupe « Nageurs inactifs » est masqué par défaut derrière un intitulé d’accordéon sans bloc ni fond, reprenant exactement la typographie du titre « Nageurs actifs » et complété uniquement par son compteur et un chevron. Son ouverture masque ou révèle directement les lignes déjà rendues, sans reconstruire le tableau ni modifier sa position de défilement. Chaque groupe reste alphabétique et les lignes inactives sont visuellement atténuées. Le survol met en évidence la ligne entière. Le champ de recherche affiche une action d’effacement dès qu’il contient une valeur et se combine avec le filtre segmenté `Tous / Femmes / Hommes`, placé à sa droite sur ordinateur et dessous sur mobile. Le contrôle compact en forme de pastille associe une icône marche/arrêt à l’état actuel « Actif » ou « Inactif », qui qualifie le profil sans varier selon le sexe ; son intitulé accessible précise « Profil actif » ou « Profil inactif » et décrit l’action inverse. Cliquer sur « Actif » demande confirmation avant de rendre le nageur inactif et rappelle qu’il ne sera plus proposé spontanément dans les engagements ; cliquer sur « Inactif » le réactive directement. La colonne Actions reste bornée à `166 px` sur ordinateur et la correction en attente y emploie son libellé court. Dans la sélection des engagements, la vue sans recherche montre tous les nageurs actifs sous le volet d’ajout et reprend le même accordéon typographique pour les inactifs, sans répéter son titre dans le tableau déployé ; une recherche saisie continue de couvrir actifs et inactifs. Le filtre segmenté `Tous / Femmes / Hommes`, indépendant de la liste des nageurs déjà engagés, est aligné à droite du titre de cette liste disponible et passe sous le titre sur petit mobile. Avec `Tous`, les femmes et les hommes sont mélangés dans un ordre alphabétique unique ; les deux autres choix conservent le même tri alphabétique dans leur sexe respectif. Une lecture réussie reste silencieuse une fois la liste affichée ; seuls le chargement en cours et les erreurs conservent un message dédié.

Lorsqu'une recherche de la Gestion des accès atteint sa borne serveur, le compteur de la liste doit l'indiquer en texte et inviter à affiner les filtres ; cet état ne doit pas être signalé uniquement par une couleur.

Dans Mes officiels comme dans Mes nageurs, chaque personne est affichée et triée au format `NOM Prénom`.

Dans une fiche compétition, aucun bandeau permanent ne répète la phase de préparation ou l’état des engagements déjà visible dans l’en-tête. L’en-tête aligne sur ordinateur le nom de la compétition à gauche et les badges de niveau et d’état à droite, avec la date et le lieu immédiatement sous le nom ; les badges partagent exactement les mêmes hauteur, padding et taille de texte. Sur mobile, ils repassent sous la date et le lieu. Dans la fiche Club uniquement, la phrase compacte « Vous effectuez les engagements pour le club » affiche le seul code du club juste au-dessus du nom de la compétition ; elle disparaît dans les vues organisateur, régionale et nationale. Les onglets commencent directement sous cet en-tête ; seuls les retours ponctuels utiles de chargement, d’enregistrement ou d’erreur apparaissent lorsque nécessaire. La navigation compacte reste fixée sous l’en-tête principal pendant le défilement. Dans l’espace Club, quatre grandes étapes numérotées restent visibles sur la première ligne : Informations, Participants, Engagements et Récapitulatif. La rubrique Informations regroupe les sous-onglets Général, Programme et Documents ; Documents reste accessible avant l'ouverture comme après la fermeture des engagements. Une seconde ligne ne montre les sous-onglets de l’étape active que lorsqu’il en existe plusieurs ; Récapitulatif ne répète donc pas son bouton sous la navigation. Dans l’espace organisateur, la fiche n’est pas présentée comme un parcours obligatoire : les rubriques non numérotées « Paramétrage », « Statistiques », « GED » et « Diffusion » séparent la configuration, le suivi des engagements, les téléchargements et les courriels envoyés. La GED commence par les documents destinés aux clubs, présentés en liste compacte avec catégorie, format, taille et description. L'ajout multiple ouvre un formulaire dans la fiche ; sur mobile, ses champs et actions occupent toute la largeur. Les fichiers techniques proposent ensuite directement l’export TXT et le PDF du club choisi, sans exposer l’étape technique de génération. Les statistiques utilisent des indicateurs compacts puis des tableaux défilables par course et par club. Cette navigation ne repose ni sur un menu déroulant ni sur un défilement horizontal. Les intitulés « Programme » et « Courses individuelles » distinguent clairement la configuration des épreuves de l’engagement des nageurs.

#### PDF récapitulatif club

Le PDF récapitulatif est en A4 portrait et privilégie la vérification rapide : une bande neutre résume le club, le chef d’équipe et les totaux, puis les matrices Femmes et Hommes occupent l’essentiel de la première page. Les quatorze courses individuelles tiennent sur la largeur d’une matrice unique. Les cases engagées affichent seulement le temps ; les grilles restent gris-vert très pâles et les en-têtes emploient un rose poudré pour les femmes, un bleu gris pour les hommes. Un premier niveau d’en-tête fusionne les courses par session et un trait plus marqué sépare les sessions. Les titres de rubrique restent sur fond blanc, en gras sombre avec un séparateur fin ; les aplats sont réservés aux véritables en-têtes de tableaux et aux informations à mettre en évidence. Un petit effectif conserve l’ensemble du récapitulatif sur une page ; lorsque les lignes de nageuses ou nageurs dépassent la hauteur disponible, la matrice continue sur les pages suivantes avec son en-tête répété. Les pages suivantes rappellent discrètement le nom de la compétition et du club. Un astérisque discret indique un temps manuel et un point d’interrogation un temps à vérifier, sans signal couleur. Relais, officiels et frais restent après les engagements, les frais clôturant le document. Une rubrique vide affiche une phrase métier explicite sans en-tête de tableau inutile. Les frais payants forment un tableau `Type / Quantité / Tarif / Sous-total`, suivi d’un total estimé mis en évidence puis d’un encadré distinct pour le paiement, l’échéance et le supplément tardif. Les lignes à quantité nulle restent visibles pour permettre la vérification du club.

#### Tableaux Femmes et Hommes dans Courses

La matrice de l’onglet Courses est présentée en deux tableaux successifs, Femmes puis Hommes. Un tableau ne conserve que les nageurs de son sexe et les colonnes féminines ou masculines correspondantes ; une course commune apparaît dans les deux tableaux avec le même code, la même session et le même numéro de programme. Chaque groupe est trié par nom et prénom et n’est pas affiché lorsqu’il est vide. Une fiche exceptionnelle sans sexe renseigné reste accessible dans un groupe « Sexe à vérifier » afin de ne masquer aucun engagement existant. Les restrictions de catégorie restent grisées dans le tableau concerné et chaque tableau possède son propre défilement horizontal. L’identité est regroupée dans une seule colonne fixe, intitulée « Nageuse » dans le tableau Femmes et « Nageur » dans le tableau Hommes : le nom est affiché en premier et le prénom sur une seconde ligne discrète. Naissance et catégorie conservent deux colonnes resserrées afin que les premières courses apparaissent plus tôt, notamment sur mobile.

Dans le référentiel national « Clubs », les fiches sont révélées par lots de 48. La recherche, les filtres de région et de statut, ainsi que « Afficher plus de clubs » restent locaux et ne déclenchent aucune lecture serveur supplémentaire. La suppression définitive est réservée aux clubs créés nationalement sans donnée liée ; les clubs historiques restent désactivables.

### Contenu Performances

Le contenu est centré dans une largeur maximale de `1440 px`. Les filtres sont présentés dans une barre d’outils en grille, puis les résultats dans un panneau tabulaire. La grille se réduit progressivement à deux colonnes puis une colonne.

Dans les fiches de compétition, le formulaire de déclaration du chef d’équipe reste replié tant que l’option correspondante n’est pas choisie ; la case « hors club » reste alignée avant son libellé. Retirer un nageur qui possède des courses sélectionnées exige une confirmation explicitant que ses engagements seront aussi supprimés. Après confirmation, le nageur et ses courses sont retirés immédiatement du brouillon local et ne doivent pas réapparaître lors d’une autre sélection ; les tableaux Courses et Relais sont rafraîchis dans le même mouvement. L’état « Aucun frais d’engagement » masque les montants, le paiement tardif et HelloAsso dans les vues Club, les récapitulatifs, les PDF et les mails. Lors d’une réouverture, le choix de renvoyer le mail est indépendant de la réouverture elle-même. Dans la matrice du programme, chaque en-tête de catégorie contient une case compacte qui sélectionne ou désélectionne cette catégorie sur toutes les courses actuellement choisies et compatibles ; son état intermédiaire signale une sélection partielle. La case « Plusieurs » des relais conserve la même taille compacte que les autres cases de la matrice.

## Composants existants

### Boutons

| Variante | Classes courantes | Usage |
|---|---|---|
| Primaire | `.primary-button`, bouton de formulaire principal | Action principale d’un bloc |
| Secondaire | `.ghost-button`, `.file-button` | Navigation, action complémentaire, import |
| Icône | `.icon-button`, boutons carrés spécialisés | Action courte avec libellé accessible |
| Compact | `.compact` ajouté à une variante | Barre d’outils ou espace dense |
| Confirmation | `.confirm-button` | Validation positive explicite |
| Danger | `.danger-button` | Suppression ou opération risquée |

Une zone ne devrait présenter qu’une action primaire dominante. Une action uniquement représentée par une icône doit recevoir un `aria-label` ou un libellé visible équivalent.

### Liens de navigation

La navigation principale des pages Performances et les changements de page publics reprennent la forme d’un bouton. L’état courant est matérialisé par `.active`, une surface blanche et un texte sombre dans les en-têtes colorés.

### Panneaux et cartes

Les classes `.panel`, `.quick-card`, `.performance-link`, `.public-home-card` et `.admin-portal-card` partagent les mêmes principes : surface blanche, bordure claire, rayon de `8 px`, contenu structuré et ombre éventuelle.

Un panneau fonctionnel peut contenir :

- un en-tête avec titre, sous-titre et actions ;
- un corps de formulaire, une liste ou un tableau ;
- un pied avec statut ou actions secondaires.

### Badges et pastilles

Les `.badge`, `.status-pill`, `.firebase-header-status`, `.series-chip` et `.session-chip` présentent une information courte ou un choix. Les badges informatifs sont arrondis en capsule. Les puces de session et de série utilisent plutôt le rayon standard de `8 px` afin de conserver leur aspect interactif.

Les badges ne doivent pas contenir une phrase longue ni devenir le seul support d’une information critique.

### Formulaires

Les champs partagent une surface blanche, une bordure claire et un rayon de `8 px`. Leur hauteur courante est de `40–44 px`. Les libellés sont placés au-dessus, en texte secondaire et en graisse forte.

Les formulaires complexes sont organisés en grille sur ordinateur puis en une ou deux colonnes sur les écrans étroits. L’état désactivé reste lisible, avec un fond plus terne et un curseur adapté lorsque nécessaire.

### Contrôles segmentés

Le conteneur `.segmented` regroupe deux à quatre boutons `.segment`. L’option active utilise l’accent sur fond plein. Les segments liés au sexe emploient les couleurs féminin et masculin propres aux performances.

Ce composant convient à un petit nombre de choix mutuellement exclusifs. Un `select` reste préférable pour une liste longue.

### Tableaux

Le calendrier public utilise une liste compacte groupée par mois. Sur ordinateur, chaque ligne aligne date, nom/ville/type, périmètre et badge de statut. Sous 820 px, elle devient une carte à deux colonnes et le statut passe sur sa propre ligne. Les filtres Saison, Région, Niveau et Type sont regroupés dans un panneau blanc ; ils restent collants uniquement sur ordinateur afin de préserver la surface utile sur mobile. Sur mobile, les quatre filtres occupent impérativement une grille de deux colonnes sur deux lignes : Saison/Région, puis Niveau/Type. Le filtre Période n’est pas affiché : pour la saison actuelle, une section « En cours et à venir » précède la section toujours visible « Depuis le début de la saison », qui regroupe les événements passés dans l’ordre chronologique. Un raccourci « Voir les événements passés » est placé près du compteur lorsque cette seconde section existe, afin de rester accessible même avec une longue liste d’événements à venir. Pour toute autre saison, tous les événements sont visibles immédiatement dans l’ordre de la saison sportive, de septembre à août. Le calendrier et les fiches publiques partagent l’intitulé d’en-tête sur une ligne « LivePalmes – Calendrier fédéral » ; les libellés des actions de navigation sont raccourcis sur mobile sans modifier leur destination. Les deux bandeaux turquoise privilégient une hauteur contenue : celui du calendrier réduit son logo fédéral et ses marges, tandis que celui de la fiche resserre ses espacements sans diminuer la taille du titre. Dans la fiche publique d’une compétition, l’en-tête remplace l’action « Accueil » par « Retour au calendrier ». Le contexte y est formulé explicitement, par exemple « Compétition piscine · Niveau national », plutôt que sous forme de deux mots isolés. La colonne principale d’environ 58 % regroupe une carte « Informations pratiques » puis une carte « Documents » volontairement compacte ; le programme synthétique occupe les 42 % restants. Sous 820 px, les blocs sont empilés dans l’ordre Informations pratiques, Documents puis Programme. Au-delà de deux sessions, le programme devient une liste d’accordéons, avec le nom de session, sa date et ses horaires visibles ; avec quatre sessions ou plus, ils sont tous refermés à l’ouverture. L’accès aux engagements constitue l’action principale du panneau pratique et est séparé des informations par une marge dédiée ; la précision indiquant qu’ils sont réservés à un responsable de club est affichée juste en dessous, dans un texte secondaire discret. Lorsque des résultats sont disponibles, la pastille « Résultats publiés » n’est pas répétée dans la fiche : sur ordinateur, les actions occupent une zone dédiée à droite des informations de l’en-tête et proposent directement la consultation en ligne ainsi que le protocole PDF lorsqu’il existe. Le même protocole est ajouté automatiquement en tête de la carte Documents, sauf si son URL y est déjà présente. Lorsqu’un fichier public de résultats structurés est associé, un bloc pleine largeur « Résultats de la compétition » apparaît sous la grille principale. Un sélecteur permet de choisir l’épreuve et le sexe ; les lignes affichent nageur, club, catégorie et temps sans reconstruire un classement absent de la source. Lorsqu’un même nageur possède plusieurs temps dans l’épreuve affichée, ils sont tous conservés ; une note discrète renvoie vers le protocole, qui fait foi pour le classement officiel. Sous 620 px, chaque temps devient une ligne à deux colonnes sans défilement horizontal. Sous 820 px, les actions du bandeau repassent sous les informations et, sur mobile, occupent chacune une ligne complète. Les dates de session utilisent le format français en toutes lettres.

Son introduction prend la forme d'un bandeau aquatique bleu-turquoise avec une accroche courte et le logo fédéral Nage avec Palmes dans une carte blanche. Le fond de page utilise un dégradé très clair, tandis que les contenus restent sur des cartes blanches pour conserver contraste et lisibilité.

Les tableaux utilisent :

- une surface blanche ;
- des séparateurs horizontaux fins ;
- des en-têtes compacts, souvent en capitales ;
- un alignement tabulaire pour les temps et données chiffrées ;
- un conteneur `.table-wrap` pour maîtriser le défilement.

Dans les consoles, certains en-têtes restent visibles pendant le défilement vertical. Dans Performances, les tableaux peuvent conserver une largeur minimale et défiler horizontalement. Les colonnes prioritaires doivent rester lisibles avant les métadonnées secondaires.

### États vides, chargement et erreurs

Un état vide est centré dans le composant concerné, avec un texte secondaire et, si utile, une action de résolution. Le chargement est signalé par un libellé explicite et un état `pending` ou `loading`. Les erreurs utilisent un message lisible et la palette rouge ; elles ne reposent pas uniquement sur un point coloré.

### Modales et panneaux superposés

Les modales utilisent un fond d’occultation sombre, une carte blanche centrée, une largeur bornée et un défilement interne. Leur structure comprend un titre, un bouton de fermeture, un contenu focalisé et un groupe d’actions aligné en fin de bloc.

Les implémentations existantes incluent notamment `.decision-modal`, les fiches nageurs publiques et la modale d’administration des performances.

### Pieds de page

Les pages publiques affichent la nature bénévole du projet et un lien de contact. Cette signature doit rester discrète, lisible et cohérente entre l’accueil, le live et Performances.

## États interactifs

### Survol et sélection

Le survol renforce généralement la bordure, éclaircit ou assombrit le fond et conserve le contraste du texte. La sélection utilise une classe `.active`, une couleur pleine ou un contour interne. Aucune action essentielle ne dépend uniquement du survol.

### Focus clavier

Plusieurs composants spécialisés définissent déjà `:focus-visible`, notamment les liens publics, les listes de performances et les actions du portail. Toute évolution doit conserver un focus visible sur les liens, boutons, champs, onglets et lignes interactives. Dans le portail, les groupes `role="tablist"` utilisent un focus mobile unique : les flèches gauche et droite changent d’onglet, tandis que Début et Fin atteignent respectivement le premier et le dernier onglet disponible.

### Désactivation

Un contrôle désactivé doit rester identifiable sans pouvoir être confondu avec un contrôle actif : contraste réduit, fond neutre et absence de réaction au pointeur. Le texte explicatif à proximité précise la raison lorsque celle-ci n’est pas évidente.

## Responsive

Les points de rupture observés ne forment pas encore une échelle unique. Ils correspondent aux besoins de chaque zone :

| Largeur | Usage actuel |
|---:|---|
| `1080–1100 px` | Réorganisation du portail et de certaines vues Performances |
| `980–1040 px` | Passage des grandes grilles et consoles vers moins de colonnes |
| `920 px` | Réorganisation des pages publiques de compétition |
| `720–760 px` | Passage mobile principal, empilement des contrôles |
| `620–640 px` | Simplification des formulaires et en-têtes |
| `520–560 px` | Navigation et composants administratifs compacts |
| `380–420 px` | Ajustements pour très petits écrans |

Règles à préserver :

- empiler plutôt que masquer un contenu essentiel ;
- permettre le retour à la ligne des groupes d’actions ;
- conserver des cibles tactiles confortables ;
- donner aux tableaux larges un défilement contrôlé ;
- éviter toute interaction dépendant du survol ;
- vérifier le mode paysage lorsque la hauteur est limitée.

## Accessibilité et contenu

- conserver un ordre de titres logique, avec un seul titre principal de page ;
- associer chaque champ à un libellé visible ou accessible ;
- fournir un nom accessible aux boutons icône ;
- utiliser `aria-live="polite"` pour les retours asynchrones importants ;
- conserver les attributs `aria-expanded`, `aria-controls` et `aria-current` sur les composants concernés ;
- ne jamais transmettre une information uniquement par la couleur ;
- écrire des libellés d’action directs : « Actualiser », « Voir les séries », « Connexion » ;
- réserver les capitales aux surtitres, statuts courts et en-têtes de tableaux.

## Variantes par zone

### Public compétition

Plus expressif visuellement : bandeau avec vagues, titres plus grands, cartes de navigation, contenus espacés. Les actions essentielles sont visibles sans connaissance métier préalable.

### Consoles

Plus compact et opérationnel : barre supérieure collante, accent par rôle, nombreux états, navigation rapide entre séries et sessions. Les informations de course et décisions priment sur la décoration.

### Performances

Orienté recherche et comparaison : filtres segmentés, tableaux larges, identité féminin/masculin, chiffres tabulaires et outils de progression dans de longues listes.

### Portail

Orienté gestion : navigation hiérarchique iconnée, en-tête applicatif compact, formulaires denses, cartes administratives, états de droits et menus de compte. La sobriété et la clarté des responsabilités priment.

La couleur turquoise identifie la navigation active, les actions principales et le focus clavier. Les icônes restent décoratives et ne remplacent jamais leur libellé. Les titres de vues suivent une structure commune : surtitre turquoise, titre principal sombre, puis description secondaire facultative.

## Règles d’évolution

### Maintenance obligatoire

Toute modification qui change l’interface ou son rendu visuel doit être accompagnée, dans la même intervention, d’une mise à jour de ce document. La documentation doit refléter les règles, composants, états, variantes, points de rupture ou usages visuels réellement ajoutés ou modifiés.

Une modification purement technique sans effet sur le rendu ou l’usage de l’interface ne nécessite pas de mise à jour du design system.

Avant de créer un nouveau composant :

1. rechercher un composant de même fonction dans la zone concernée ;
2. réutiliser sa structure HTML, ses classes et ses états ;
3. employer les variables existantes lorsqu’elles sont disponibles ;
4. conserver le rayon standard de `8 px` et les hauteurs de contrôles existantes ;
5. prévoir dès le départ le clavier, le tactile, le chargement, l’état vide et l’erreur ;
6. vérifier la cohérence sur mobile et ordinateur.

Pour le portail, le contrôle reproductible s’exécute avec :

```powershell
node tools/capture-portal-design.js
```

La commande ouvre la version locale sans écrire dans Firebase, bloque les appels HTTPS et produit dans `tmp/portal-design-captures/` les vues Connexion, Vue d’ensemble repliée et avec un espace déployé, accueils Club, Données sportives, DTN, Organisation des compétitions, Administration nationale et Gestion du portail, calendrier, création et fiche organisateur, Mon compte, Records/MPF, Import, Correction, Engagements, Mes nageurs, demande de correction d’un nageur, Mes officiels et le formulaire d’ajout d’un officiel, DTN détaillé, Demandes d’accès, Utilisateurs et habilitations, ainsi que les cinq destinations nationales : demandes ouvertes, clubs, nageurs en consultation ou en mode doublons, modification nationale, officiels et journal d’activité. Ces vues sont capturées en `1920 × 1080`, `1280 × 720`, `1024 × 768` et `390 × 844`. La commande vérifie aussi la vue active, l’absence de débordement horizontal global, les libellés accessibles des contrôles, la présence d’un seul `h1`, l’absence des composants retirés, le fonctionnement des sections repliables du compte et l’absence de graisses excessives dans les tableaux et onglets actifs. Les captures sont temporaires et ignorées par Git ; elles doivent être examinées visuellement lorsqu’un changement touche le portail.

À éviter :

- introduire une nouvelle teinte principale sans besoin sémantique ;
- créer une variante de bouton pour une différence purement locale ;
- utiliser une ombre forte sur tous les panneaux ;
- masquer une action essentielle sur mobile ;
- ajouter une largeur fixe sans comportement de repli ;
- dupliquer un composant existant sous un autre nom ;
- considérer ce document comme supérieur aux feuilles CSS effectivement chargées par la page.

## Points de vigilance actuels

Le design est cohérent visuellement, mais n’est pas encore centralisé dans une couche unique de jetons ou de composants pour l’ensemble du projet :

- les palettes du socle et de Performances sont proches mais distinctes ;
- le portail dispose désormais de jetons locaux pour ses rôles récurrents, mais plusieurs couleurs métier, espacements et ombres restent volontairement écrits dans les sélecteurs spécialisés ;
- les points de rupture varient selon les feuilles ;
- les poids de police élevés reposent sur la police disponible localement ;
- le portail possède une règle de focus commune, tandis que les autres zones conservent encore plusieurs définitions spécialisées.

Ces éléments décrivent l’existant ; ils ne constituent pas à eux seuls une demande de refactorisation. Toute harmonisation future devra rester progressive, ciblée et compatible avec les pages actuelles.

## Checklist de validation d’une interface

- Le composant réutilise-t-il un modèle déjà présent ?
- La couleur choisie correspond-elle à une signification existante ?

- Une seule action principale ressort-elle clairement ?
- Les états chargement, vide, erreur, succès et désactivé sont-ils prévus ?
- Le focus clavier est-il visible ?
- Les actions fonctionnent-elles au toucher ?
- Les informations restent-elles accessibles sur petit écran ?
- Les tableaux conservent-ils leurs colonnes essentielles et un défilement utilisable ?
- Les logos, icônes et boutons possèdent-ils un nom accessible adapté ?
- Le rendu a-t-il été contrôlé sur ordinateur et mobile ?
- Pour le portail, les captures de référence ont-elles été régénérées et examinées ?

### Type de compétition dans le calendrier

Le type Piscine ou Eau libre est toujours écrit en toutes lettres et accompagné d'une fine bordure colorée, jamais d'une pastille. La bordure reste un repère secondaire : l'information demeure compréhensible sans couleur.

Dans le programme Eau libre, la bibliothèque prend la forme d'un tableau compact : une ligne par distance et une colonne par spécialité. Chaque cellule utilise un bouton « + » pour ajouter la course et un symbole de validation lorsqu'elle est déjà retenue. Sur petit écran, les en-têtes Surface, Bi-palmes et Support deviennent SF, BI et SP. Le formulaire de création conserve Distance, Spécialité et l'action principale sur une seule ligne tant que la largeur le permet. Lorsqu'un changement d'onglet risque de perdre une saisie, une fenêtre à trois décisions distingue clairement l'enregistrement, l'abandon réel et le maintien sur l'onglet.

### Choix du chef d’équipe

Avant la première validation, deux cartes proposent « Chef d’équipe de mon club » et « Aucun chef d’équipe ». Le cas moins fréquent d’un chef d’équipe hors du club reste accessible par un lien secondaire placé sous ces choix. Le choix Club révèle la recherche des membres et une action compacte « + Ajouter une personne » ; le choix hors club conserve sa fenêtre dédiée. Après enregistrement, les choix disparaissent au profit du résumé et de l’action « Modifier le chef d’équipe », qui rétablit le sélecteur. La renonciation au droit de réclamation reste soumise à confirmation.

### Chargement des officiels engagés

Tant que les membres et nageurs nécessaires à la liste ne sont pas tous chargés, un état de préparation remplace les tableaux de l’onglet Officiels. Une sélection enregistrée ne doit jamais apparaître temporairement décochée.

### Rapprochement lors de la création d’un nageur

Chaque alerte affiche le nom de la fiche existante proposée. Une ressemblance ordinaire reste confirmable. Une correspondance avec le nom et le prénom exactement inversés et la même date de naissance bloque la création, sans fusion ni correction automatique.

Le formulaire compact place Nom puis Prénom sur une première ligne, Date de naissance et Sexe sur une deuxième, et la licence sur toute la largeur. Il utilise des champs espacés sans quadrillage ni cellules, un fond de saisie très léger et un pied d’actions séparé par un trait discret ; sur ordinateur, la licence est limitée à la largeur d’une colonne. Le nom est converti réellement en majuscules pendant la saisie et au collage, tandis que le prénom conserve sa casse. La licence ajoute automatiquement les deux tirets du format fédéral pendant la saisie. Les actions « RAZ » et « Créer le nageur » sont regroupées en fin de formulaire ; la RAZ efface aussi les alertes locales sans refermer le volet. Dans « Mes nageurs », la demande de suppression est représentée par une poubelle compacte : le texte complet reste disponible comme nom accessible et infobulle, et la zone tactile mesure au moins `40 px`.

### Filtres du calendrier Club

La règle actuelle remplace l’ancienne présentation segmentée du statut et le repli des filtres avancés : les boutons Toutes, Ouvertes, À venir et Fermées ne sont plus affichés dans le calendrier Club. Saison, Type, Région et Niveau restent toujours visibles dans quatre colonnes compactes sur une seule ligne, y compris sur mobile. Le calendrier organisateur conserve son sélecteur de statut et son comportement propre.

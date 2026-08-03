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

Ces jetons sont locaux au portail. Ils ne doivent pas être imposés aux pages publiques, aux consoles ou à Performances, dont les variantes actuelles restent intentionnelles.

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

Hiérarchie observée :

- titre de page publique : `clamp(1.7rem, 3vw, 3rem)`, interligne serré ;
- titre principal de console : environ `1.1rem` à `1.55rem` ;
- titre de section : environ `1rem` à `2rem` selon le contexte ;
- texte courant : environ `0.82rem` à `0.98rem` ;
- métadonnée et libellé : environ `0.68rem` à `0.82rem` ;
- poids courants : 700 à 950 pour rendre les informations compactes très lisibles.

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

Le portail utilise une largeur maximale de `1460 px`. Son en-tête blanc, compact et collant est organisé en trois colonnes : identité fédérale à gauche, marque LivePalmes au centre et compte à droite.

Sur ordinateur, le contenu combine une navigation latérale de `232 px` et une zone de gestion flexible. La navigation emploie des pictogrammes linéaires dans des carrés pastel, des libellés textuels et un repère turquoise vertical pour la page active. Les sous-menus restent indentés et alignés avec les libellés principaux.

Sous `1080 px`, la navigation précède le contenu et se replie derrière un bouton indiquant la vue active. Les surfaces utilisent des bordures légères, un rayon de `9–10 px` et peu ou pas d’ombre. L’ombre reste admise pour la connexion, les menus flottants et les éléments réellement superposés.

La vue d’ensemble est la page d’entrée après connexion. Elle ne présente que les outils déjà autorisés pour le profil courant. Un bandeau informatif rappelle ce principe, puis une grille responsive de cartes donne accès aux fonctions : compte, Records/MPF, imports et corrections, DTN, engagements et gestion des accès. Ces cartes ne portent aucune donnée métier ni compteur supplémentaire ; elles servent uniquement de raccourcis vers les vues existantes.

Les vues simples, comme « Mon compte » et « Demander un accès », utilisent un en-tête autonome suivi de cartes blanches sur le fond général du portail. Chaque fonction importante reçoit un pictogramme linéaire dans un carré pastel, toujours accompagné d’un titre et d’une explication. Les formulaires conservent leurs libellés au-dessus des champs, des surfaces légèrement grisées et une disposition en deux colonnes qui passe à une colonne sous `720 px`.

Le module Records/MPF conserve son parcours métier en trois temps : sélection du référentiel, consultation du tableau, puis édition de la ligne. Son en-tête reprend le surtitre turquoise et la description des autres vues. La recherche, le tableau, les brouillons, l’historique et l’éditeur utilisent des cartes blanches à bordure légère. Les filtres et l’éditeur passent de quatre ou trois colonnes à deux sous `1180 px`, puis à une colonne sous `680 px`. Les couleurs féminin, masculin, brouillon, validation et alerte restent réservées à leur signification sportive ou fonctionnelle existante.

Les modules Import et Correction reprennent le même langage visuel sans modifier leur parcours métier. L’import distingue clairement le chargement, la prévisualisation et l’historique ; la correction sépare la recherche, la sélection de la ligne et le formulaire de correction motivée. Les étapes, filtres, résumés et tableaux reposent sur des cartes blanches à bordure légère. Les formulaires passent à deux colonnes sous `1120 px`, puis à une colonne sous `680 px`. Les actions destructives ou irréversibles conservent leur traitement rouge afin de ne pas banaliser le risque. Les formats de fichiers, règles de validation, états métier et traitements de données ne relèvent pas du design system et doivent rester indépendants de cette présentation.

L’Espace DTN utilise le même en-tête descriptif et regroupe la saison, le sexe et l’action de recalcul dans une barre de filtres blanche. Les référentiels, synthèses, exports et listes de sportifs sont présentés dans des cartes plates à bordure légère. Les grands tableaux restent défilables horizontalement, avec leur première colonne et leur en-tête visibles lorsque le contenu défile. Sous `820 px`, les actions peuvent revenir à la ligne ; sous `620 px`, les filtres, boutons et en-têtes de panneaux occupent toute la largeur. Les teintes associées au sexe, aux catégories Équipe de France, aux seuils et aux états de qualification conservent leur signification métier existante.

La Gestion des accès distingue la consultation des utilisateurs et l’édition d’un compte dans deux cartes autonomes. Sur ordinateur, la liste reste un tableau compact et le formulaire d’identité utilise trois colonnes. Les habilitations sont présentées comme des choix explicites dans une grille, sans modifier leur portée ni leur comportement. Sous `1120 px`, le formulaire et les habilitations passent à deux colonnes. Sous `760 px`, chaque utilisateur devient une fiche verticale dont chaque valeur conserve son libellé ; les filtres et le formulaire passent à une colonne. Sous `520 px`, les groupes d’actions occupent toute la largeur. Les statuts actif et inactif restent des badges sémantiques, et les actions de désactivation ou de suppression conservent leur traitement d’alerte existant.

Le calendrier des Engagements utilise une carte blanche unique contenant son titre, les filtres et la liste des compétitions. Chaque ligne met en avant la date, le nom, le niveau, le statut opérationnel et l’action principale, tandis que la fiche sélectionnée est signalée par un fond turquoise très léger. Sous `1120 px`, une compétition est réorganisée sur deux lignes ; sous `700 px`, elle devient une fiche verticale et les filtres passent à une colonne. Dans la fiche compétition, la navigation entre Général, Programme, Frais, acteurs, courses, relais, récapitulatif et documents reste horizontale et défilable, sous forme de boutons compacts dont l’onglet actif est turquoise. Les couleurs ouvert, échéance proche, échéance dépassée et fermé restent exclusivement liées aux états métier existants.

Le contenu d’une fiche compétition suit une même structure pour tous ses onglets : un résumé ou une barre de contexte, puis des sections blanches bordées et enfin les actions. Le formulaire général conserve une présentation libellé-valeur sur ordinateur et passe à une disposition verticale sous `700 px`. Le programme utilise des sections repliables, avec un fond turquoise léger pour la session active ; les marqueurs féminin, masculin, mixte et combiné conservent leurs couleurs métier. Les frais sont regroupés en cartes de champs et leur note de paiement reste jaune. Les documents utilisent des cartes compactes avec un badge d’état. En lecture seule, les valeurs restent visuellement distinctes sans masquer l’état désactivé des champs.

Les onglets Chef d’équipe, Officiels et Nageurs partagent une barre de contexte et d’enregistrement. Les choix de chef d’équipe sont de grandes zones tactiles ; la renonciation conserve un fond jaune d’avertissement. Les officiels restent regroupés par fonction dans des tableaux compacts, avec une ligne turquoise lorsqu’ils sont sélectionnés. La recherche et l’ajout d’un nageur utilisent des cartes distinctes. La matrice des nageurs reste défilable horizontalement afin de préserver les licences, catégories et sélections de courses ; ses lignes et cases disposent toutefois de zones tactiles renforcées. Sous `700 px`, les formulaires passent à une colonne et les tableaux conservent un défilement horizontal accessible.

Les onglets Courses et Relais utilisent des matrices défilables horizontalement avec des lignes bordées et des champs tactiles. Une sélection de course active reçoit une bordure et un fond turquoise léger. Les temps connus restent verts, les temps saisis manuellement jaunes et les valeurs par défaut grises. Les lignes féminin, masculin et mixte conservent leurs fonds métier très légers. Les incohérences de relais restent regroupées dans une alerte rouge distincte. Le Récapitulatif est une carte autonome composée d’un en-tête, d’une liste de totaux et d’un bloc dédié aux relais. Sous `700 px`, les actions occupent toute la largeur et les totaux passent en lecture verticale.

Les annuaires Mes officiels et Mes nageurs utilisent des cartes autonomes avec un en-tête d’action, une zone de recherche ou d’édition et une liste. Une fiche d’officiel présente l’identité, le rôle, l’état actif et les actions associées ; une personne inactive reste volontairement atténuée. La liste des nageurs reste tabulaire sur ordinateur. Sous `700 px`, chaque nageur devient une fiche verticale où les libellés Nageur, Naissance, Sexe, Catégorie et Licence sont répétés afin de préserver le sens des valeurs. Les formulaires et groupes d’actions occupent alors toute la largeur.

La création d’une compétition reprend la structure des formulaires de fiche : en-tête blanc, sections bordées, présentation libellé-valeur et action principale alignée à droite. Les demandes d’accès sont affichées en cartes contenant identité, périmètre et actions, avec un formulaire de vérification distinct lorsqu’une demande est éditée. L’administration nationale utilise une barre d’onglets horizontale défilable, des filtres sur fond gris clair, une barre turquoise très légère pour les opérations groupées et des tableaux larges défilables. Les choix de fusion, suppressions et actions sensibles conservent leurs alertes et confirmations métier existantes.

L’écran de connexion est une carte centrée de `680 px` au maximum. Le formulaire principal reste immédiatement visible ; la demande d’accès club est placée dans une section repliable. Sous `700 px`, les champs et actions passent à une colonne. Dans tout le portail, les messages de chargement sont gris, les confirmations vertes, les avertissements jaunes et les erreurs rouges. Les états vides utilisent une surface gris clair à bordure discrète. Les documents avancés, suivis de fermeture et historiques de mails reprennent les mêmes cartes, tableaux et badges d’état que le reste du portail.

### Contenu Performances

Le contenu est centré dans une largeur maximale de `1440 px`. Les filtres sont présentés dans une barre d’outils en grille, puis les résultats dans un panneau tabulaire. La grille se réduit progressivement à deux colonnes puis une colonne.

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

Plusieurs composants spécialisés définissent déjà `:focus-visible`, notamment les liens publics, les listes de performances et les actions du portail. Toute évolution doit conserver un focus visible sur les liens, boutons, champs, onglets et lignes interactives.

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

La commande ouvre la version locale sans écrire dans Firebase, bloque les appels HTTPS et produit dans `tmp/portal-design-captures/` les vues Connexion, Vue d’ensemble, Records/MPF, Engagements, DTN et Gestion des accès en `1280 × 720` et `390 × 844`. Elle vérifie aussi la vue active, l’absence de débordement horizontal global, les libellés accessibles des contrôles et la présence d’un seul `h1`. Les captures sont temporaires et ignorées par Git ; elles doivent être examinées visuellement lorsqu’un changement touche le portail.

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

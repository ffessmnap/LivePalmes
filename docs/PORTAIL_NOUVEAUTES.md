# Nouveautés du portail

<!-- description: Consultation régionale et gestion nationale des nouveautés du portail, stockage Firestore, reprise de la première publication et budget borné. -->

## Fonctionnement

L’entrée « Nouveautés », sous « Aide et retours », ouvre `#nouveautes` pour les capacités existantes `engagements.region.manage`, `engagements.national.manage` ou `admin.full`. Le menu du compte conserve le même accès sur mobile. Les autres profils n’accèdent pas à cette vue.

Le format reste une date et une heure en gras, puis une liste de modifications, les publications les plus récentes en premier. Aucun titre supplémentaire, suivi de lecture, badge ou notification. Le niveau régional consulte uniquement. Le niveau national et les administrateurs complets peuvent ajouter, modifier et supprimer directement depuis la page. Une ligne de texte produit une puce ; le texte est affiché littéralement, jamais interprété comme HTML. La date est initialisée à l’heure courante lors d’un ajout et conservée lors d’une correction ; l’affichage utilise Europe/Paris.

## Stockage et autorisation

`functions/portal-news.js` utilise le document `engagementConfigurations/portalNews` de la collection existante, via la seule callable `managePortalNews`. Aucun changement de règle Firestore, d’index, de capacité ou de collection. Les accès directs client restent interdits. Le profil actif en base prévaut sur les claims et les informations transmises par le navigateur ; les administrateurs historiques de la configuration serveur conservent leur accès.

Chaque entrée conserve identifiant, date de publication, lignes de texte et, après modification, auteur/date de mise à jour. La révision de création départage les publications écrites à la même minute, sans faire remonter une ancienne publication lors de sa correction. Le document porte une révision : toute sauvegarde ou suppression exige la révision chargée et se déroule dans une transaction. Un conflit conserve le brouillon et demande une actualisation explicite ; aucune écriture n’est relancée automatiquement par le navigateur.

TEST utilise exclusivement le Firestore du projet `livepalmes-test`. Le futur déploiement PROD utilisera son propre document dans `livepalmes`, sans copie TEST → PROD. Aucun texte de recette TEST ne se retrouve automatiquement en PROD.

## Première publication et suppressions

La publication du 30 octobre 2026 à 19 h 39 est définie une seule fois dans le module serveur comme amorce. Tant que le document n’existe pas, la lecture retourne cette publication sans aucune écriture. La première sauvegarde ou suppression nationale crée atomiquement le document et applique l’action à cette amorce. Les consultations suivantes utilisent uniquement le document existant : une publication modifiée ou supprimée ne revient jamais, même après suppression de la dernière entrée. Aucune migration de données ni invocation métier n’est nécessaire au déploiement.

## Budget de lectures et limites

- Ouverture réelle de l’écran ou Actualiser : une lecture du profil actif et une lecture de contenu ; aucune requête de nouveautés au démarrage d’un autre écran. Les administrateurs historiques reconnus côté serveur n’exigent pas la lecture de profil.
- Retour dans les 60 secondes : cache de session, zéro appel. Une requête déjà en cours est mutualisée. Changement de compte ou perte des droits : purge et invalidation des réponses en vol.
- Ajout/correction/suppression : une lecture du profil, une lecture transactionnelle et une écriture. Cinq tentatives transactionnelles au maximum : six lectures et une écriture dans le pire cas. La réponse suffit à actualiser la liste, sans relecture supplémentaire.
- Le document est borné à 200 entrées et 512 Kio sérialisés UTF-8 ; chaque publication à 8 000 caractères et 80 puces. Une limite atteinte demande de réduire le texte ou supprimer d’anciennes entrées ; aucun effacement automatique. Affichage par groupes de 20 à partir du document déjà lu, sans requête par ligne ou page. Le coût ne dépend pas du volume des clubs, comptes, performances ou compétitions. Aucun listener ni scan/reconstruction.

## Vérification et publication

`node tests/portal-news-tests.js` couvre le serveur réel avec stockage fictif : droits actuels, CRUD de l’amorce, ordre, conflits, suppressions persistantes et plafonds. `node tests/portal-news-browser-tests.js` couvre la navigation réelle, l’éditeur, les refus, le cache, le texte littéral, les confirmations et les deux thèmes à 390/1280 px, HTTPS externe bloqué. La CI globale obligatoire reste nécessaire avant intégration et TEST commun.

Antoine publie les textes depuis son compte national, après avoir vérifié la réalité des changements annoncés. La mise en PROD du dispositif suit le circuit Infra habituel ; une livraison sur TEST n’est pas une validation utilisateur ni un accord PROD.

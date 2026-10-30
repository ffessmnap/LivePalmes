# Références NAP manquantes pour le parcours eau libre

<!-- description: Preuve de l'ajout 1000 m Support et périmètre autorisé de création des références eau libre manquantes lors de l'ajout explicite d'une distance par un administrateur. -->

## État et périmètre

La maquette puis le développement TEST ont été demandés et validés dans la conversation Eau libre. Le 30 octobre 2026, Antoine a autorisé la consultation en lecture seule du seul catalogue technique NAP, puis demandé de préparer l'ajout des références manquantes. Il a ensuite donné son accord explicite : « Oui, tu peux ajouter les deux références 1000 m Support Femmes et Hommes avec sauvegarde et vérification, puis terminer la livraison sur TEST. » Cet accord concerne uniquement les deux références du bilan présenté.

Avant l'ajout, le catalogue contenait 275 références. Les couples Femmes/Hommes des 150 m élimination Surface et Bi-palmes existent ; aucune création n'est nécessaire pour eux. Les références des 1000, 3000 et 5000 m Surface/Bi-palmes et des 3000/5000 m Support existent aussi. Le couple 1000 m Support manquait. TEST utilise la même base NAP : le catalogue est commun aux environnements.

## Ajout approuvé et exécuté

Ajout de **deux références seulement** dans `course_dispo` : 1000 m Support Femmes et 1000 m Support Hommes. Les identifiants ont été attribués par l'auto-incrément, sans identifiant inventé. Les modèles sont les deux références existantes 5000 m Support, dont les champs techniques ont été lus. Seuls `course` (`1000 SUPPORT`), `longueur` (`1000`) et le nouveau code technique approuvé `wplabel` (`LD1000SUP`) diffèrent des modèles correspondants. Ce code reprend la convention de `LD5000SUP` et ne réécrit aucun ancien code.

Les autres valeurs sont conservées : `sexe=F/M`, `final=0`, `relais=0`, `categorie=0`, `p=0`, `ld=1`, `bi=0`, `_order=null`, `mixte=0`, `style=SF`, `type_=1`, `nbnageur=1`, `validation=1`, `actif=1`. Le champ technique `style=SF` est celui des références Support NAP existantes ; il ne change pas la spécialité affichée.

Le plan pur `tools/plan-open-water-support-reference.js` produit les lignes proposées et les empreintes attendues, sans connexion, SQL exécutable ni mode d'application. L'exécuteur séparé `tools/apply-open-water-support-reference.js` exige la confirmation précise, le plan approuvé et une sauvegarde durable vérifiée. Les tests refusent les dérives, collisions et déclencheurs ; ils vérifient aussi la reprise après insertion partielle et la conservation des anciennes lignes.

Exécution le 30 octobre 2026 à 11 h 18 (Paris) : références natives **465 (Femmes)** et **466 (Hommes)**, `1000 SUPPORT`, `LD1000SUP`. Relecture sous verrou : 277 références, deux ajouts exacts, empreinte des 275 anciennes lignes inchangée. Aucune compétition ni aucun engagement modifié. Aucun changement de schéma.

Sauvegarde du catalogue et de sa structure chiffrée avec le mécanisme AES-256-GCM existant, relue, déchiffrée et comparée avant écriture ; archive et reçu conservés dans l'espace durable de cette conversation. Empreinte SHA-256 de l'archive : `871bd47c84e61b9f48870e8db85aa7ee284db6e8e77fdbb527d6a3bac26e7b2e`. Le fichier de métadonnées identifie la version exacte du secret servant au déchiffrement ; aucune valeur du secret n'est incluse dans le dépôt ni dans le reçu.

## Conditions avant écriture

- Accord explicite d'Antoine sur ces deux références et le code proposé. Cette autorisation ne s'étendra à aucune autre distance ni spécialité.
- Relecture fraîche de la structure, du moteur MyISAM, des modèles et du catalogue borné ; arrêt en cas de dérive, doublon, déclencheur ou référence contradictoire.
- Sauvegarde vérifiée du catalogue avant insertion et conservation du reçu. Écriture groupée sous protection contre les ajouts concurrents ; relecture de vérification des deux lignes et des anciennes références.
- Aucune modification de compétition, d'engagement, de performance, de règle, de compte ou d'envoi. Aucun déploiement PROD. Aucun changement de schéma.

L'accord initial ci-dessus ne couvrait aucune autre distance. L'extension ultérieure possède son propre accord explicite ci-dessous ; aucun ajout massif ni migration au chargement n'en découle.

## Extension autorisée après la recette du 30 octobre

Après le retour sur Descente de l'Oise du 1er mai 2027, la lecture bornée du catalogue confirme 277 références et tous les couples F/H de Surface, Bi-palmes et Support pour 1000, 2000, 3000, 4000, 5000 et 6000 m. Les absences du 2000 m dans l'écran provenaient de la bibliothèque historique partielle, pas du catalogue natif. Les propositions fixes sont complétées en mémoire sans nouvelle écriture NAP.

Pour les distances réellement nouvelles, Antoine a accepté la demande précise : création automatique des seules références F/H manquantes dans le catalogue commun, uniquement lorsqu'un administrateur ajoute explicitement la distance, au maximum six références, avec sauvegarde vérifiée et aucune modification des références existantes. Réponse : « Oui, autoriser cette création automatique encadrée ». La livraison applicative reste limitée à TEST ; l'administrateur est averti dans cette conversation que le catalogue NAP est commun à TEST et PROD. Aucun ajout réel supplémentaire n'est exécuté par les tests de l'assistant.

Le mécanisme réutilise le contrôle régional/national de l'ajout de distance, sans nouveau droit, endpoint, secret, collection ni schéma. Il prévalide la capacité et la version de la bibliothèque avant l'ajout natif. Les références existantes sont réutilisées, y compris leurs libellés natifs en m/km ; un couple ambigu, une référence désactivée ou une distance contradictoire bloque l'ajout avant écriture. Le 150 m élimination réutilise ses références déclarées ; aucune variante élimination n'est inventée.

Chaque référence manquante reprend les champs techniques du partenaire F/H déjà existant, ou, à défaut, du modèle 5000 m de sa spécialité et de son sexe (98/99, 273/274, 405/406), dont la lecture complète a été effectuée. Distance, libellé, sexe et identifiant technique sont explicités ; l'ordre technique est laissé NULL. Un partenaire existant conserve son libellé et son code commun ; les nouveaux couples utilisent `LD<distance>`, `LD<distance>BI` ou `LD<distance>SUP`. Les indicateurs natifs Surface/Bi-palmes/Support sont repris des modèles contrôlés, sans nouvelle règle sportive. Les imports, résultats et performances ne sont ni générés ni modifiés ; leurs contrôles existants restent applicables.

Avant INSERT, le catalogue et sa structure sont sauvegardés chiffrés AES-256-GCM dans un document privé de la collection d'audit existante, puis relus, déchiffrés et comparés octet par octet. L'enveloppe est compatible avec le mécanisme de sauvegarde déjà utilisé. Le secret NAP existant sert au chiffrement sans être stocké ni affiché ; projet, nom du secret, révision d'exécution et date permettent d'identifier sa version historique lors d'une restauration autorisée. Préserver cette version du secret et le document d'audit ; aucune purge ou restauration automatique n'est ajoutée.

Le verrou WRITE MyISAM est pris après la sauvegarde. Structure, moteur, absence de déclencheur et état exact du catalogue sont revérifiés sous verrou. Une seule insertion groupée ajoute les lignes manquantes, puis la relecture compare chaque ancienne ligne et le couple F/H de chaque spécialité. Aucun échange Firestore n'a lieu sous ce verrou ; le reçu d'audit est écrit après libération. Les ajouts sont plafonnés à six par action et à 300 références au total, plafond déjà appliqué par les consommateurs du catalogue. Atteindre ce plafond impose un examen distinct, sans élargissement automatique des lectures.

Une reprise conserve les ajouts déjà réalisés et ne crée pas de doublon. Un ajout simultané complet identique peut être réutilisé ; une dérive différente impose une nouvelle tentative sans écriture. Si le catalogue est créé mais que la bibliothèque ou le reçu échoue, le message signale la reprise nécessaire. L'ajout de bibliothèque est idempotent : une réponse perdue ne réécrit pas la même distance. Aucun engagement ni course de compétition n'est créé par cette action ; aucune spécialité n'est cochée automatiquement. Une restauration éventuelle exige un nouvel accord et la vérification des usages des références, sans DELETE implicite.

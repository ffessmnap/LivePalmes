# Références NAP manquantes pour le parcours eau libre

<!-- description: Bilan de préparation du seul ajout 1000 m Support Femmes/Hommes dans le catalogue NAP commun ; aucune autorisation d'écriture ni exécution implicite. -->

## État et périmètre

La maquette puis le développement TEST ont été demandés et validés dans la conversation Eau libre. Le 30 octobre 2026, Antoine a autorisé la consultation en lecture seule du seul catalogue technique NAP, puis demandé de préparer l'ajout des références manquantes, **sans écriture avant son accord sur le bilan**. Ce document ne constitue pas cet accord.

Le catalogue contient 275 références. Les couples Femmes/Hommes des 150 m élimination Surface et Bi-palmes existent ; aucune création n'est nécessaire pour eux. Les références des 1000, 3000 et 5000 m Surface/Bi-palmes et des 3000/5000 m Support existent aussi. Le couple 1000 m Support manque. TEST utilise la même base NAP : le catalogue est commun aux environnements.

## Ajout proposé, à approuver

Créer **deux références seulement** dans `course_dispo` : 1000 m Support Femmes et 1000 m Support Hommes. Les identifiants seront attribués par l'auto-incrément, sans identifiant inventé. Les modèles sont les deux références existantes 5000 m Support, dont les champs techniques ont été lus. Seuls `course` (`1000 SUPPORT`), `longueur` (`1000`) et le nouveau code technique `wplabel` (`LD1000SUP`) diffèrent des modèles correspondants. Ce nouveau code est une proposition à approuver ; il reprend la convention de `LD5000SUP` et ne réécrit aucun ancien code.

Les autres valeurs sont conservées : `sexe=F/M`, `final=0`, `relais=0`, `categorie=0`, `p=0`, `ld=1`, `bi=0`, `_order=null`, `mixte=0`, `style=SF`, `type_=1`, `nbnageur=1`, `validation=1`, `actif=1`. Le champ technique `style=SF` est celui des références Support NAP existantes ; il ne change pas la spécialité affichée.

Le plan pur `tools/plan-open-water-support-reference.js` produit les lignes proposées et les empreintes attendues, sans connexion, SQL exécutable ni mode d'application. Les tests refusent un modèle différent, les collisions et les correspondances ambiguës. Aucune référence réelle n'a été ajoutée.

## Conditions avant écriture

- Accord explicite d'Antoine sur ces deux références et le code proposé. Cette autorisation ne s'étendra à aucune autre distance ni spécialité.
- Relecture fraîche de la structure, du moteur MyISAM, des modèles et du catalogue borné ; arrêt en cas de dérive, doublon, déclencheur ou référence contradictoire.
- Sauvegarde vérifiée du catalogue avant insertion et conservation du reçu. Écriture groupée sous protection contre les ajouts concurrents ; relecture de vérification des deux lignes et des anciennes références.
- Aucune modification de compétition, d'engagement, de performance, de règle, de compte ou d'envoi. Aucun déploiement PROD. Aucun changement de schéma.

La demande d'une autre distance absente du catalogue demandera un plan distinct : la préparation actuelle n'autorise pas la génération massive ou automatique de références natives. L'ajout d'une distance à la bibliothèque LivePalmes n'est pas une autorisation implicite de création dans le catalogue NAP réel.

# Nouveautés du portail

<!-- description: Ajouter les prochains textes des nouveautés du portail après validation d’Antoine et confirmation de leur publication PROD. -->

## Fonctionnement

L’entrée « Nouveautés », sous « Aide et retours », ouvre `#nouveautes` pour les capacités existantes `engagements.region.manage`, `engagements.national.manage` ou `admin.full`. Le lien et la navigation directe appliquent la même condition. Aucun droit serveur n’est ajouté. Les autres profils reviennent à la vue d’ensemble s’ils utilisent cette adresse.

Sur mobile, le menu latéral est masqué par l’interface existante : le même lien est disponible dans le menu du compte, sous son aide, avec la même condition d’accès.

Le contenu est statique dans `portail.html`, section `adminNewsView`. Le dispositif commence vide, sans historique reconstitué. Aucun suivi de lecture, badge ou notification. Budget supplémentaire : zéro lecture Firestore/NAP, zéro écriture et zéro appel serveur à l’ouverture, par action, au retour/rafraîchissement et au pire cas ; seul le HTML déjà chargé est affiché.

## Ajouter un texte

1. Préparer dans le bilan de la publication PROD un court texte compréhensible et la date prévue. Le faire valider explicitement par Antoine dans cette publication ; conserver le lien de cet accord et le périmètre dans la PR/le registre. Un brouillon reste dans le bilan, jamais dans la liste affichée sur TEST.
2. Après réussite confirmée de la publication PROD, ajouter le texte validé dans `adminNewsPublishedEntries`, en tête (plus récent d’abord). Employer la date réelle de livraison, sans anticiper une date future. Conserver la preuve de publication et l’accord dans la PR/le registre. En cas de report, d’échec ou de retrait du périmètre, ne pas ajouter le texte.
3. Pour le premier texte, remplacer le paragraphe d’état vide. Réutiliser un simple `<article>` avec un `<h3>`, un `<time datetime="AAAA-MM-JJ">` et un court `<p>`, sans nouveau composant ni dépendance. Les textes sont publics dans les sources : aucune information personnelle ou confidentielle.
4. Livrer cette mise à jour par le circuit commun. Sur TEST, seuls les changements dont la PROD est déjà prouvée sont ainsi annoncés ; le texte devient visible en PROD lors de la publication Hosting suivante autorisée. Ce léger décalage évite toute annonce de livraison avant sa réussite effective. Vérifier les deux thèmes et les largeurs mobile/ordinateur. Ne jamais déduire une validation utilisateur d’un déploiement TEST.

Le dispositif initial utilise uniquement l’état vide pour la recette TEST. La publication PROD du dispositif reste soumise à l’accord Infra habituel.

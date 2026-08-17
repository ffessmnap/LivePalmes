# L'ecosysteme LivePalmes

<!-- description: Présentation vulgarisée des composantes, outils, échanges de données, comptes et protections de l'écosystème LivePalmes. -->

## En une phrase

LivePalmes est un ecosysteme numerique dedie a la nage avec palmes. Il aide a preparer les competitions et les engagements, a gerer les donnees sportives et les acces, puis a rendre les performances consultables par le public.

Son portail principal est actuellement en cours de finalisation et de test. Il continue d'etre ameliore et peut recevoir de petits modules complementaires selon les besoins confirmes.

## Les trois composantes

### 1. Le Portail LivePalmes

Le portail est le coeur fonctionnel de l'ecosysteme. C'est l'espace de travail des clubs et des responsables habilites.

Il permet notamment :

- de creer et preparer les competitions ;
- de definir leur programme et leurs parametres ;
- aux clubs de gerer leurs nageurs et officiels ;
- de realiser les engagements individuels et les relais ;
- de produire des recapitulatifs PDF et des exports WinPalme ;
- de gerer les comptes, les demandes d'acces et les droits ;
- d'importer ou corriger des performances ;
- de mettre a jour les Records de France et les MPF ;
- d'acceder aux espaces DTN et d'administration autorises.

Le portail prepare donc la competition en amont. Il n'est pas la console utilisee au bord du bassin pour toutes les competitions.

### 2. L'espace public LivePalmes

Cet espace est accessible sans compte. Il permet de consulter toute l'annee :

- les Records de France ;
- les meilleures performances francaises ou MPF ;
- les classements TOP ;
- les performances historiques ;
- les fiches nageurs.

Les informations affichees sont preparees sous forme de fichiers legers pour que les pages restent rapides, meme avec plusieurs centaines de milliers de performances.

### 3. LivePalmes Direct

LivePalmes Direct est un dispositif separe, utilise uniquement lors des competitions nationales qui en ont besoin.

Il comprend les consoles du speaker, du Live, du juge arbitre, de la video, du bureau des performances et du secretariat. Il permet aussi de publier en direct les series, resultats, medailles, PDF et archives de la competition.

LivePalmes Direct partage certains outils techniques avec le portail, mais il ne doit pas etre confondu avec la preparation des competitions et les engagements.

## Comment les informations circulent

Pour le portail et les performances :

```text
Clubs et responsables habilites
        -> Portail LivePalmes
        -> base de donnees protegee
        -> fichiers publics prepares
        -> Records, MPF, TOP et fiches nageurs
```

Pour une competition nationale equipee du Direct :

```text
Consoles LivePalmes Direct
        -> donnees et publications de la competition
        -> series, resultats, medailles et archives publics
```

Ces deux parcours appartiennent au meme ecosysteme, mais l'utilisation du Direct n'est pas obligatoire pour les competitions preparees dans le portail.

## Les outils, expliques simplement

### HTML, CSS et JavaScript

Ce sont les materiaux de construction des pages :

- HTML organise le contenu ;
- CSS gere l'apparence ;
- JavaScript realise les actions et les controles.

LivePalmes utilise ces technologies directement, sans gros cadre logiciel supplementaire comme React ou Vue.

### GitHub

GitHub est l'atelier et l'historique du logiciel. Il conserve le code, permet de suivre les modifications et de retrouver une ancienne version.

GitHub n'est pas la base active de LivePalmes. Une modification conservee sur GitHub doit encore etre publiee vers Firebase pour devenir visible sur le site.

### Firebase et Google Cloud

Firebase regroupe plusieurs services Google utilises par LivePalmes :

- **Hosting** est la vitrine qui rend les pages accessibles sur Internet ;
- **Firestore** est le cahier central partage qui conserve les donnees actives ;
- **Authentication** verifie l'identite des personnes connectees ;
- **Cloud Functions** realise les controles et traitements sensibles en coulisses ;
- **Storage** est l'armoire a fichiers pour les PDF et les gros fichiers publics.

Les regles Firebase jouent le role de portes et de serrures : elles empechent un utilisateur de lire ou modifier ce qui ne correspond pas a ses droits.

### Node.js

Node.js fait fonctionner les traitements techniques : tests, imports, controles, generation des fichiers publics, PDF et operations executees sur les serveurs Firebase.

### INTRANAP, WinPalme, PDF, TXT et Excel

Ces outils et formats relient LivePalmes aux donnees sportives existantes :

- INTRANAP fournit l'archive historique des nageurs, clubs, competitions et performances ;
- les fichiers TXT federaux et les trames Excel permettent d'importer de nouveaux resultats ;
- les PDF servent notamment aux documents de competition ;
- les exports WinPalme permettent de transmettre les engagements dans un format exploitable par le logiciel de gestion de competition.

L'archive INTRANAP est conservee intacte. Les corrections sont appliquees dans la base active LivePalmes en gardant une trace de leur origine.

### Google Sheets et la messagerie

Un Google Sheets fournit certaines informations complementaires utilisees par le speaker dans LivePalmes Direct.

Le portail peut aussi preparer et envoyer des courriels. Les identifiants techniques de la messagerie sont gardes cote serveur dans un espace protege et ne sont pas places dans les pages publiques.

## Les comptes et les protections a connaitre

Plusieurs acces differents doivent etre distingues :

- le compte ou l'organisation GitHub qui administre le code ;
- le compte Google qui administre le projet Firebase, la base et le stockage ;
- les comptes LivePalmes des utilisateurs du portail ;
- le compte de messagerie utilise pour les courriels LivePalmes ;
- les comptes autorises a modifier le Google Sheets du speaker ;
- les comptes autorises a publier ou maintenir les donnees.

Dans LivePalmes, un compte peut cumuler plusieurs droits. Chaque droit indique ce que la personne peut faire et dans quel perimetre : son club, sa region ou le niveau national.

Pour LivePalmes Direct, un compte autorise doit en plus saisir le PIN temporaire du role utilise pendant la competition nationale.

## Authenticator, cles et secrets

Google Authenticator, les cles de securite physiques et les codes de secours ne font pas partie du code de LivePalmes. Ils protegent les comptes humains Google ou GitHub qui donnent acces a l'infrastructure.

Le depot permet de connaitre les services utilises, mais pas de savoir qui possede actuellement un telephone Authenticator, une cle physique ou les codes de recuperation. Cette information doit etre tenue dans un inventaire organisationnel separe et securise.

Il faut egalement distinguer :

- les informations publiques qui indiquent au navigateur a quel projet Firebase se connecter ;
- les mots de passe, identifiants de messagerie et autres secrets, qui doivent rester dans les coffres serveur ;
- les codes de recuperation et doubles authentifications des administrateurs, qui ne doivent jamais etre enregistres dans GitHub.

La configuration publique Firebase visible dans les pages est une plaque d'identification du projet, pas une cle donnant tous les pouvoirs. La securite repose surtout sur l'authentification, les droits, les regles Firestore et les controles des Cloud Functions.

## A retenir

LivePalmes n'est plus seulement un outil de direct. Le Portail LivePalmes en est le coeur fonctionnel en cours de finalisation et de test. L'espace public rend les performances consultables toute l'annee. LivePalmes Direct reste un dispositif national specialise, utilise seulement lorsque la competition en a besoin.

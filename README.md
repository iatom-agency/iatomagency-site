# IATom Agency — Site vitrine

Site vitrine statique (HTML/CSS) pour IATom Agency (Thomas Blachère),
conseil et formation en IA pour PME, collectivités et syndics des
Alpes-Maritimes et de Monaco.

## Structure

- `index.html`, `offre.html`, `methode.html`, `a-propos.html`, `contact.html` — pages principales
- `mentions-legales.html`, `cgv.html`, `politique-confidentialite.html`, `plan-du-site.html` — pages légales
- `merci.html` — page de remerciement après envoi du formulaire de contact
- `assets/` — feuilles de style (`styles.css` : design system IATom, `fonts.css`, `site.css` : mise en page du site réel), polices (`assets/fonts/`) et images (`assets/img/`)

## Déploiement

Site 100% statique, sans étape de build : prêt à être déployé tel quel sur Netlify
(glisser-déposer le dossier ou connecter ce dépôt GitHub).

Le formulaire de contact (`contact.html`) est câblé pour **Netlify Forms**
(`data-netlify="true"`) — la détection se fait automatiquement au déploiement
sur Netlify, sans configuration supplémentaire.

## Origine

Converti à partir de la maquette Claude Design (composants IATomDS) en HTML/CSS
statique, page par page, en conservant fidèlement le design approuvé.

⚠️ Point encore ouvert : le numéro SIRET (mentions-legales.html) est à compléter
dès l'immatriculation auto-entrepreneur de Thomas Blachère.

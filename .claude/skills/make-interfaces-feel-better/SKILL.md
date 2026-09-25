---
name: make-interfaces-feel-better
description: Checklist de fit-and-finish à appliquer avant toute passe de détail/polish UI — corrections petites et justifiées (rayons, alignement optique, ombres, text-wrap, tabular-nums, contours d'image, transitions explicites, hit areas) plutôt qu'une refonte. Utiliser avant d'auditer ou de peaufiner une interface existante, pour repérer les détails qui « clochent » sans jamais changer pour changer.
metadata:
  author: kilio
  version: "1.0.0"
---

# Make interfaces feel better

Avant toute passe de détail/polish sur une interface existante, vérifier chacun des principes ci-dessous. Chaque correction doit se justifier par un avant/après concret sur un écran réel de l'app — jamais une réécriture ou une refonte au passage.

## La checklist

1. **Rayon concentrique** — quand un élément à coins arrondis est imbriqué dans un autre (carte dans carte, bouton dans toolbar, pastille dans un conteneur avec padding), le rayon intérieur doit être égal au rayon extérieur moins le padding entre les deux, jamais une valeur arbitraire plus petite ou identique au rayon extérieur. Un rayon interne mal calculé fait paraître l'élément imbriqué « flottant » dans son coin au lieu de suivre naturellement le contour du parent.

2. **Alignement optique** — les icônes (flèches, étoiles, glyphes non parfaitement symétriques) doivent être ajustées visuellement au centre de leur zone, pas seulement centrées géométriquement. Une flèche pointant à droite, centrée au pixel près, paraît décalée à gauche à l'œil ; un léger décalage manuel corrige cette illusion.

3. **Bordures et ombres cohérentes pour la profondeur** — une seule échelle de profondeur (le token existant, ex. `--shadow-card`) réutilisée de façon cohérente entre cards, popovers, dropdowns. Pas de mélange ad hoc de `box-shadow` custom à côté du token déjà en place : chaque nouvelle valeur d'ombre est une dette de cohérence visuelle.

4. **Text wrapping** — `text-wrap: balance` sur les titres courts (1 à 3 lignes, ex. titres de card, titres d'écran), `text-wrap: pretty` sur les paragraphes courts/moyens (descriptions, sous-titres), pour éviter les veuves et orphelines qui cassent la lecture d'un bloc de texte par ailleurs soigné.

5. **tabular-nums** — `font-variant-numeric: tabular-nums` (ou la classe utilitaire équivalente) sur tout nombre qui change dans le temps à la même position visuelle : montants, macros, compteurs, dates dans un widget qui se met à jour. Sans ça, les chiffres « sautent » en largeur à chaque changement et le reste de la ligne tremble.

6. **Font smoothing** — antialiasing cohérent sur le texte, en particulier texte clair sur fond sombre ou l'inverse. Vérifier qu'un `-webkit-font-smoothing: antialiased` (ou équivalent) existe déjà globalement avant d'en ajouter un autre localement — ne jamais dupliquer un réglage déjà posé au niveau racine.

7. **Contours neutres sur les images** — une bordure fine neutre (1px, couleur proche du fond) autour des images/vignettes dont on ne contrôle pas le contenu (photos utilisateur, imports). Sans ce contour, une image à bord clair « fuit » visuellement dans un fond clair et perd sa limite de carte.

8. **Transitions explicites** — jamais `transition: all` ni `will-change: all` : lister les propriétés animées explicitement (`transition-property`, ou des classes ciblées type `transition-colors` / `transition-transform`). Une transition non ciblée anime des propriétés qu'on ne veut pas animer (coûteux en perf) et rend le comportement imprévisible au moindre changement de style voisin.

9. **États enter/exit distincts et interruptibles** — quand c'est pertinent (menus, popovers, toasts), l'animation de sortie ne doit pas être un simple retour arrière de l'entrée si l'utilisateur peut interrompre le geste en plein milieu. Ne pas refondre une animation qui fonctionne déjà bien : ne corriger que ce qui est visiblement cassé ou grossier (à-coup, saut, sens qui se contredit).

10. **Hit areas ≥ 40×40px (idéalement 44×44px)** — tout contrôle interactif (bouton icône, item de nav, checkbox) doit avoir une zone de tap d'au moins 40×40px, sans forcément grossir le visuel du contrôle. Étendre la zone de tap via un pseudo-élément qui déborde du contrôle visible (voir le pattern `zoneTap44` / `zoneTap44Icone` du design system) plutôt que d'agrandir le contrôle lui-même quand l'espace autour est contraint.

## Comment l'utiliser

- N'appliquer un principe que là où un avant/après concret est justifiable sur l'écran réel concerné — jamais une correction générique appliquée « au cas où ».
- Ne jamais changer pour changer : si un principe ne s'applique nulle part dans l'écran audité, ne rien modifier et le dire explicitement plutôt que d'inventer une correction.
- Réutiliser les tokens et patterns déjà en place (`--shadow-card`, rayons existants, couleurs, pattern `zoneTap44`) au lieu d'introduire de nouvelles valeurs ad hoc, sauf si aucun token existant ne convient — et dans ce cas, le dire explicitement.
- Préférer corriger un fragment partagé (ex. une classe commune type `ui.ts`) plutôt que de répéter le même correctif dans chaque fichier, quand le correctif est vraiment commun à tous les appels de ce fragment.

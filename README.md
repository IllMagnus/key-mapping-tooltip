- import json: quando vengono calcolati i centri, si basano sulle dimensioni dell'immagine precedenti, non sul quelle nuove
- toast "Errore importazione: Riga 6: coordinate x non valida" preferisco diventi "Errore import: Riga 6"
- check calcolo numero righe (è sbagliato)
- sia csv che json hanno un ordine specifico per quanto riguarda i primi campi obbligatori: id,x,y,text,color,letter
- sia csv che json: tranne i campi id,x,y,color,letter, tutti gli altri campi compreso text non devono fare nessun trim di spazi o a capo etc, ne iniziali ne finali.
- errore: importo questo json, esporto il csv, e importo il csv di nuovo, a importare il csv si rompe.
{
  "tooltips": [
    {
      "id": 1,
      "x": 150,
      "y": 250,
      "text": "Testo, con virgola e a\ncapo e \" virgolette \"",
      "color": "#ff0000",
      "letter": "A"
    }
  ],
  "image": {
    "width": 880,
    "height": "auto",
    "inverted": false
  }
}
- se importo un json con due tooltip che hanno stesso id (esempio: entrambi id 1): il secondo tooltip sta a x 0 y 0, e questo attiva il primo tooltip per quanto riguarda drag etc.. (anche se nel json viene esportato come id 2 dopo. quindi va rifatto importa dell'esporta auto-sistemato per farlo workare)
- inverti anche in html il fatto che il blocca proporzioni viene prima visualizzato sbloccato e poi si blocca, preferisco visualizzarlo bloccato come stato di partenza anche per html, e sbloccarlo e ribloccarlo a mano.
- quando faccio nuovo pulisce tutti i listener?
- check commento in manager.js: // Verrà corretto a center automaticamente
- crea constanti per i valori default di tooltip e riferisciti a loro
- crea costanti per lockBtn.textContent e riferisciti a loro
-     const lineNumber = index + 6; // Numero riga approssimativo nel file JSON
- commenta parseCSV() e confrontalo rispetto a regole standard dei csv. non esiste una classe csv default già creata per questo tipo di cose (come per JSON)?
- validators.js: unica stringa valida per campi numerici: "auto" (per le dimensioni immagini ma anche per x e y(fallback centro immagine))
- ad ogni import/export e reload pagina voglio che il panel resize venga chiuso, così non c'è bisogno di aggiornare input HTML se panel visibile dopop queste azioni, semplicemente si chiude e ad aprirlo si aggiorna (per evitare inutili check e pulizie anche in caso di error su import)
- check round di x y e image dimensions
-       Manager.closeEditorUI(); saveTooltipsToStorage();





quando fai una modifica ad un file forniscimi il file completo aggiornato (non tutti i file ma solo quello modificato), è sufficiente che mi scrivi come semplice testo codice il file modificato.

sto creando un tool usando html. di seguito lo stato attuale, spiega in poche parole cosa serve. poi mi aiuterai a fare delle modifiche, 

image-annotator/
├── index.html
├── assets/
│ └── mk.jpg
│ styles/
│ ├── variables.css         (colori, spacing, font, ombre, animazioni)
│ ├── base.css             (reset, typography, form base)
│ ├── layout.css           (container, grid, flexbox, page-wrapper)
│ ├── components.css       (buttons, cards, control-group)
│ ├── tooltip.css          (tooltip-point-overlay, tooltip-text-overlay, delete-zone)
│ ├── editor.css           (editor-resize-panel, editor-*)
│ ├── manager.css          (btn-manager, toast notifications)
│ └── responsive.css       (media queries centralizzate)
│ js/
│ ├── app.js              (Bootstrap + init + event listeners + UI helpers)
│ ├── core.js             (State management + Storage)
│ ├── tooltip.js          (Tooltip logic + render)
│ ├── toast.js            (Toast notifications)
│ ├── image.js            (Image editing)
│ ├── validators.js       (all the validators here)
│ └── manager.js          (JSON/CSV import-export + data conversion)
│ 
└── README.md



 sto checkando se il plan finito è buono (confrontando anche col plan bozza)
 
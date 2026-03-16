"""
Script per ricostruire il progetto dal file progetto_completo.txt
Ricrea tutti i file HTML, JS e CSS nelle cartelle corrette.
"""

import sys
from pathlib import Path

# Configura UTF-8 per Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def is_valid_separator_block(lines, index):
    """
    Verifica se linea[index] è davvero inizio di un blocco file valido.
    
    Valida la struttura rigida:
    ====
    [percorso/file.ext]
    ----
    
    Args:
        lines: Lista di tutte le linee del file
        index: Indice della linea da verificare
        
    Returns:
        bool: True se è un separatore valido, False altrimenti
    """
    # Verifico che ci siano almeno 3 righe
    if index + 2 >= len(lines):
        return False
    
    line_1 = lines[index].rstrip('\n')
    line_2 = lines[index + 1].rstrip('\n')
    line_3 = lines[index + 2].rstrip('\n')
    
    # Controllo 1: Prima riga ESATTAMENTE "====" (nient'altro)
    if line_1 != "====":
        return False
    
    # Controllo 2: Seconda riga è un percorso valido
    valid_paths = [
        line_2 == "index.html",
        line_2.startswith("js/") and line_2.endswith(".js"),
        line_2.startswith("styles/") and line_2.endswith(".css"),
    ]
    if not any(valid_paths):
        return False
    
    # Controllo 3: Terza riga ESATTAMENTE "----" (nient'altro)
    if line_3 != "----":
        return False
    
    # ✅ Blocco valido!
    return True


def find_next_valid_separator(lines, start_index):
    """
    Trova il prossimo separatore valido a partire da start_index.
    
    Args:
        lines: Lista di tutte le linee del file
        start_index: Indice da cui iniziare la ricerca
        
    Returns:
        int: Indice del prossimo separatore, o -1 se non trovato
    """
    for i in range(start_index, len(lines)):
        if is_valid_separator_block(lines, i):
            return i
    return -1


def extract_file_path_and_content(lines, separator_index):
    """
    Estrae il percorso del file e il suo contenuto da un blocco valido.
    
    Args:
        lines: Lista di tutte le linee del file
        separator_index: Indice della riga con "===="
        
    Returns:
        tuple: (file_path, content) oppure (None, None) se invalido
    """
    # Recupera il percorso (linea dopo "====")
    file_path = lines[separator_index + 1].rstrip('\n')
    
    # Il contenuto inizia dalla linea dopo "----" (separator_index + 3)
    content_start = separator_index + 3
    
    # Trova il prossimo separatore valido (contenuto termina lì)
    next_separator = find_next_valid_separator(lines, content_start)
    
    if next_separator == -1:
        # Non c'è un prossimo separatore, il contenuto va fino alla fine
        content_end = len(lines)
    else:
        # Il contenuto va fino al prossimo separatore
        content_end = next_separator
    
    # Raccogli le linee di contenuto
    content_lines = lines[content_start:content_end]
    
    # Rimuovi i doppi newline finali (\n\n) che separano i blocchi
    while content_lines and content_lines[-1].strip() == "":
        content_lines.pop()
    
    # Ricomponi il contenuto
    content = "\n".join(line.rstrip('\n') for line in content_lines)
    
    # Aggiungi un newline finale se il contenuto non è vuoto
    if content:
        content += "\n"
    
    return file_path, content


def recreate_project_from_file(input_file="progetto_completo.txt"):
    """
    Ricostruisce il progetto completo dal file di dump.
    
    Args:
        input_file (str): Nome del file di input
    """
    
    # Ottieni il percorso dello script
    script_dir = Path(__file__).parent.absolute()
    input_path = script_dir / input_file
    
    # Verifica che il file esista
    if not input_path.exists():
        print(f"❌ Errore: {input_path} non trovato")
        return
    
    print(f"📖 Lettura del file: {input_path}")
    
    # Leggi il file completo
    with open(input_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Dividi in linee (preservando i newline per parsing preciso)
    lines = content.split('\n')
    
    # Salta le prime 2 linee (intestazione + blank line)
    # "tutti i file del progetto image-annotation:"
    # ""
    current_index = 2
    
    files_created = []
    errors = []
    
    print("\n🔍 Parsing dei blocchi file...\n")
    
    # Percorri il file cercando separatori validi
    while current_index < len(lines):
        # Cerca il prossimo separatore valido
        separator_index = find_next_valid_separator(lines, current_index)
        
        if separator_index == -1:
            # Nessun altro separatore trovato
            break
        
        # Estrai il percorso e il contenuto
        file_path, file_content = extract_file_path_and_content(lines, separator_index)
        
        if file_path is None:
            errors.append(f"❌ Errore nell'estrazione del blocco a linea {separator_index}")
            current_index = separator_index + 3
            continue
        
        # Determina il percorso di destinazione
        dest_path = script_dir / file_path
        
        # Crea le cartelle se necessarie
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Scrivi il file
        try:
            with open(dest_path, "w", encoding="utf-8") as f:
                f.write(file_content)
            
            file_size = dest_path.stat().st_size
            print(f"✅ {file_path:<30} ({file_size:>6} bytes)")
            files_created.append((file_path, file_size))
            
        except Exception as e:
            errors.append(f"❌ Errore scrittura {file_path}: {e}")
        
        # Continua dalla linea dopo questo blocco
        next_separator = find_next_valid_separator(lines, separator_index + 3)
        if next_separator == -1:
            break
        current_index = next_separator
    
    # Stampa report finale
    print("\n" + "="*60)
    print(f"✨ PROGETTO RICOSTRUITO CON SUCCESSO!")
    print("="*60)
    print(f"📊 File creati: {len(files_created)}")
    
    if files_created:
        print("\n📁 Dettagli dei file:")
        total_size = 0
        
        # Raggruppa per tipo
        html_files = [f for f in files_created if f[0].endswith('.html')]
        js_files = [f for f in files_created if f[0].startswith('js/')]
        css_files = [f for f in files_created if f[0].startswith('styles/')]
        
        if html_files:
            print("\n  🌐 HTML:")
            for path, size in html_files:
                print(f"     └─ {path} ({size} bytes)")
                total_size += size
        
        if js_files:
            print("\n  📜 JavaScript:")
            for path, size in js_files:
                print(f"     └─ {path} ({size} bytes)")
                total_size += size
        
        if css_files:
            print("\n  🎨 Stylesheets:")
            for path, size in css_files:
                print(f"     └─ {path} ({size} bytes)")
                total_size += size
        
        print(f"\n💾 Dimensione totale: {total_size:,} bytes")
    
    if errors:
        print("\n⚠️  ERRORI RISCONTRATI:")
        for error in errors:
            print(f"  {error}")
    
    print(f"\n✅ Cartelle create: ./js/ e ./styles/")
    print(f"📍 Posizione: {script_dir}")


if __name__ == "__main__":
    # Personalizza il nome del file di input se necessario
    recreate_project_from_file("progetto_completo.txt")

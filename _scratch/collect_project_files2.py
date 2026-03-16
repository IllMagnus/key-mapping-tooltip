"""
Script per raccogliere tutti i file di un progetto (HTML, JS, CSS)
in un unico file di output con struttura organizzata.
tipo2: escludi css
"""

import sys
from pathlib import Path

# Configura UTF-8 per Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def collect_project_files(output_file="project_files.txt"):
    """
    Raccoglie index.html e tutti i file da js/ e non styles/
    e li trascrive in un unico file.
    
    Args:
        output_file (str): Nome del file di output
    """
    
    # Ottieni il percorso dello script
    script_dir = Path(__file__).parent.parent.absolute()    # project root
    scratch_dir = Path(__file__).parent.absolute()          # _scratch/
    output_path = scratch_dir / output_file
    
    # Definisci i percorsi
    index_path = script_dir / "index.html"
    js_dir = script_dir / "js"
    # styles_dir = script_dir / "styles"
    
    # Verifica che i percorsi esistano
    if not index_path.exists():
        print(f"❌ Errore: {index_path} non trovato")
        return
    
    if not js_dir.exists():
        print(f"⚠️  Attenzione: {js_dir} non trovato")
    
    # if not styles_dir.exists():
    #     print(f"⚠️  Attenzione: {styles_dir} non trovato")
    
    # Apri il file di output
    with open(output_path, "w", encoding="utf-8") as outfile:
        outfile.write("tutti i file del progetto key-mapping-tooltip:\n\n")
        
        # 1. Scrivi index.html
        print("📝 Elaborazione index.html...")
        outfile.write("====\n")
        outfile.write("index.html\n")
        outfile.write("----\n")
        with open(index_path, "r", encoding="utf-8") as f:
            outfile.write(f.read())
        outfile.write("\n\n")
        
        # 2. Raccogli tutti i file JS in ordine alfabetico
        if js_dir.exists():
            js_files = sorted([f for f in js_dir.iterdir() if f.suffix == ".js"])
            
            for js_file in js_files:
                print(f"📝 Elaborazione {js_file.name}...")
                outfile.write("====\n")
                outfile.write(f"js/{js_file.name}\n")
                outfile.write("----\n")
                with open(js_file, "r", encoding="utf-8") as f:
                    outfile.write(f.read())
                outfile.write("\n\n")
        
        # 3. non Raccogliere tutti i file CSS in ordine alfabetico

    print(f"\n✅ File creato con successo: {output_path}")
    print(f"📊 Dimensione: {output_path.stat().st_size:,} bytes")


if __name__ == "__main__":
    # Personalizza il nome del file di output se necessario
    collect_project_files("progetto_html_js.txt")

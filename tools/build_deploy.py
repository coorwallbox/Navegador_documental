"""Arma la carpeta de publicación de la Consulta Documental con la configuración real.

Uso:
    python tools/build_deploy.py [--config config.local.json] [--out dist]

Copia la aplicación (HTML, CSS, JS e img/) a la carpeta de salida y escribe allí un
config.js con los valores de config.local.json (excluido de Git). El config.js del
repositorio no se toca: sigue vacío (modo demo). Falla si falta la configuración o si
una URL no es válida (https, o http solo para pruebas en localhost).
"""
import argparse
import json
import os
import shutil
import stat
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
APP_FILES = ['index.html', 'styles.css', 'catalog.js', 'utils.js', 'demo-data.js', 'main.js']
APP_DIRS = ['img']
LOCAL_HOSTS = {'localhost', '127.0.0.1'}


def valid_url(value, required):
    """URL vacía (si no es obligatoria), https, o http solo en localhost."""
    if not value:
        return not required
    parts = urlparse(value)
    if parts.scheme == 'https' and parts.netloc:
        return '<' not in value  # rechaza la plantilla de ejemplo sin completar
    return parts.scheme == 'http' and parts.hostname in LOCAL_HOSTS


def load_config(path):
    if not path.exists():
        sys.exit(f'ERROR: no existe {path}. Copia config.local.example.json a config.local.json y complétalo.')
    config = json.loads(path.read_text(encoding='utf-8'))
    config.setdefault('URL_UPLOAD', '')  # opcional hasta la Fase 13
    errors = []
    if not valid_url(config.get('URL_DOCUMENTS', ''), required=True):
        errors.append('URL_DOCUMENTS es obligatoria y debe ser una URL https válida')
    if not valid_url(config.get('URL_UPLOAD', ''), required=False):
        errors.append('URL_UPLOAD debe estar vacía o ser una URL https válida')
    for key, default in (('REVIEW_DAYS', 15), ('MAX_UPLOAD_MB', 20)):
        value = config.get(key, default)
        if not isinstance(value, int) or value <= 0:
            errors.append(f'{key} debe ser un entero positivo')
        config[key] = value
    if errors:
        sys.exit('ERROR en la configuración:\n  - ' + '\n  - '.join(errors))
    return config


def _remove_readonly(func, path, _exc):
    """En Windows, una carpeta copiada puede quedar de solo lectura: se quita el atributo y se reintenta."""
    os.chmod(path, stat.S_IWRITE)
    func(path)


def build(config, out):
    if out.resolve() == ROOT:
        sys.exit('ERROR: la carpeta de salida no puede ser la raíz del proyecto.')
    if out.exists():
        shutil.rmtree(out, onexc=_remove_readonly)
    out.mkdir(parents=True)
    for name in APP_FILES:
        shutil.copyfile(ROOT / name, out / name)
    for name in APP_DIRS:
        # Sin copiar atributos (evita heredar solo lectura de la carpeta original)
        shutil.copytree(ROOT / name, out / name, copy_function=shutil.copyfile)
    values = {k: config[k] for k in ('URL_DOCUMENTS', 'URL_UPLOAD', 'REVIEW_DAYS', 'MAX_UPLOAD_MB')}
    body = ',\n'.join(f'  {k}: {json.dumps(v)}' for k, v in values.items())
    (out / 'config.js').write_text(
        '/* Generado por tools/build_deploy.py — configuración real. NO subir a Git. */\n'
        f'const APP_CONFIG = Object.freeze({{\n{body},\n}});\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--config', type=Path, default=ROOT / 'config.local.json')
    parser.add_argument('--out', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    config = load_config(args.config)
    build(config, args.out)
    print(f'Publicación lista en {args.out} (subir esa carpeta al destino interno).')


if __name__ == '__main__':
    main()

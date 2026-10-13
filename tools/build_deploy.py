"""Arma la carpeta de publicación de la Consulta Documental con la configuración real.

Uso:
    python tools/build_deploy.py [--config config.local.json] [--out dist]

Copia la aplicación (consulta index.html y página de cargue cargue.html, CSS, JS e img/)
a la carpeta de salida y escribe allí config.js (URL de F1) y config-cargue.js (URL de F2 y
parámetros del cargue, incluida la aplicación de Entra ID del inicio de sesión, que solo carga cargue.html)
con los valores de config.local.json
(excluido de Git). Los archivos de configuración del repositorio no se tocan: siguen vacíos. Falla si falta la configuración o si
una URL no es válida (https, o http solo para pruebas en localhost).
"""
import argparse
import json
import os
import re
import shutil
import stat
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
APP_FILES = ['index.html', 'cargue.html', 'auth-redirect.html', 'styles.css', 'catalog.js', 'utils.js', 'demo-data.js',
             'auth.js', 'upload.js', 'main.js']
APP_DIRS = ['img', 'ds', 'vendor']
GUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
TENANT_DOMAIN = re.compile(r'^[a-z0-9-]+(\.[a-z0-9-]+)+$', re.I)
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
    config.setdefault('URL_UPLOAD', '')  # opcional hasta la Fase 15
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
    domains = config.setdefault('ALLOWED_EMAIL_DOMAINS', [])
    if not isinstance(domains, list) or not all(
            isinstance(d, str) and d and '<' not in d and '@' not in d for d in domains):
        errors.append('ALLOWED_EMAIL_DOMAINS debe ser una lista de dominios (ej. ["empresa.com"])')
    else:
        config['ALLOWED_EMAIL_DOMAINS'] = [d.lower() for d in domains]
    # Inicio de sesión del cargue (Fase 13): obligatorio si hay URL de F2, porque F2 solo acepta usuarios del inquilino
    for key in ('AUTH_CLIENT_ID', 'AUTH_TENANT_ID', 'AUTH_SCOPE'):
        config[key] = str(config.get(key) or '').strip()
    if config['URL_UPLOAD'] or config['AUTH_CLIENT_ID'] or config['AUTH_TENANT_ID']:
        if not GUID.match(config['AUTH_CLIENT_ID']):
            errors.append('AUTH_CLIENT_ID debe ser el id (GUID) de la aplicación registrada en Entra ID')
        if not (GUID.match(config['AUTH_TENANT_ID']) or TENANT_DOMAIN.match(config['AUTH_TENANT_ID'])):
            errors.append('AUTH_TENANT_ID debe ser el id (GUID) o el dominio del inquilino')
    if config['AUTH_SCOPE'] and ('<' in config['AUTH_SCOPE'] or ' ' in config['AUTH_SCOPE']):
        errors.append('AUTH_SCOPE debe estar vacío o ser un permiso (ej. https://service.flow.microsoft.com//.default)')
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
    # config.js (consulta y cargue): solo F1. config-cargue.js (solo cargue.html): F2 y sus parámetros.
    _write_config(out / 'config.js', 'APP_CONFIG', config, ('URL_DOCUMENTS',))
    _write_config(out / 'config-cargue.js', 'UPLOAD_CONFIG', config,
                  ('URL_UPLOAD', 'REVIEW_DAYS', 'MAX_UPLOAD_MB', 'ALLOWED_EMAIL_DOMAINS',
                   'AUTH_CLIENT_ID', 'AUTH_TENANT_ID', 'AUTH_SCOPE'))


def _write_config(path, name, config, keys):
    body = ',\n'.join(f'  {k}: {json.dumps(config[k])}' for k in keys)
    path.write_text('/* Generado por tools/build_deploy.py — configuración real. NO subir a Git. */\n'
                    f'const {name} = Object.freeze({{\n{body},\n}});\n', encoding='utf-8')


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

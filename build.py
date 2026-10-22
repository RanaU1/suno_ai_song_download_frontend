"""
build.py
Build the site.   src/*.html + src/_base.html  ->  docs/

Usage:
    pip install jinja2
    python3 build.py
"""

import shutil
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "docs"  # GitHub Pages serves this folder AS the site root

SITE_URL = "https://sunoaisongdownload.online"
SITE_NAME = "Suno Ai Song Download"

env = Environment(loader=FileSystemLoader(SRC))


def page_path(filename: str) -> str:
    stem = Path(filename).stem
    return "/" if stem == "index" else f"/{stem}"  # faq.html -> /faq


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
        print(f"The {OUT} Has Been Removed Completely...")
        print(f"Creating New Directory with New File Again...")
    OUT.mkdir()

    # 1. build every page (files starting with "_" are templates, not pages)
    for f in sorted(SRC.glob("*.html")):
        if f.name.startswith("_"):
            continue
        html = env.get_template(f.name).render(
            site_url=SITE_URL,
            site_name=SITE_NAME,
            page_path=page_path(f.name),
        )
        (OUT / f.name).write_text(html, encoding="utf-8")
        print("built", f.name)

    # 2. copy files that are served as they are
    shutil.copytree(ROOT / "static", OUT / "static")
    if (ROOT / "CNAME").exists():
        shutil.copy(ROOT / "CNAME", OUT / "CNAME")
    (OUT / ".nojekyll").touch()

    print(f"\nDone. Output is in {OUT}")


if __name__ == "__main__":
    main()

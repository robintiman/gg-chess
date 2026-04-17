from pathlib import Path

from flask import Flask

from ..db import init_db, migrate_v2


def create_app(db_path: Path | None = None) -> Flask:
    dist_dir = Path(__file__).parent / "static" / "dist"
    assets_dir = dist_dir / "assets"
    app = Flask(__name__, static_folder=str(assets_dir), static_url_path="/assets")

    if db_path is None:
        from ..config import DB_PATH
        db_path = DB_PATH

    app.config["DB_PATH"] = db_path

    db = init_db(db_path)
    migrate_v2(db)
    db.close()

    from .routes import bp
    app.register_blueprint(bp)

    @app.route("/")
    def index():
        from flask import send_from_directory
        return send_from_directory(str(dist_dir), "index.html")

    return app

from datetime import datetime, timezone

class TycService:
    CURRENT_VERSION = "v1.0"
    CURRENT_TEXT = "Al utilizar esta plataforma, aceptas las condiciones de uso, políticas de privacidad y normas de convivencia establecidas para garantizar un entorno seguro y confiable para todos los usuarios."
    CURRENT_EXPIRES_AT = datetime(2030, 1, 1, tzinfo=timezone.utc).isoformat()

    @classmethod
    def get_current_terms(cls):
        return {
            "version": cls.CURRENT_VERSION,
            "text": cls.CURRENT_TEXT,
            "expires_at": cls.CURRENT_EXPIRES_AT
        }

    @classmethod
    def requires_acceptance(cls, user_data: dict) -> bool:
        tyc = user_data.get("tyc")
        if not tyc:
            return True
        if tyc.get("accepted") is not True:
            return True
        if tyc.get("version") != cls.CURRENT_VERSION:
            return True

        expires_at_str = tyc.get("expires_at")
        if not expires_at_str:
            return True
            
        if datetime.now(timezone.utc).isoformat() > expires_at_str:
            return True

        return False

    @classmethod
    def accept_terms(cls) -> dict:
        return {
            "accepted": True,
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "version": cls.CURRENT_VERSION,
            "expires_at": cls.CURRENT_EXPIRES_AT
        }

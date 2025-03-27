class RatingService:
    def __init__(self, rating_repository):
        self.rating_repository = rating_repository

    def agregar_calificacion(self, rating_data: dict):
        if "id" not in rating_data or "profesional_id" not in rating_data or "puntuacion" not in rating_data:
            raise ValueError("Faltan campos obligatorios")
        if not (1 <= rating_data["puntuacion"] <= 5):
            raise ValueError("La puntuación debe estar entre 1 y 5")
        self.rating_repository.save_rating(rating_data)

    def obtener_calificaciones_por_profesional(self, profesional_id: str) -> list:
        return self.rating_repository.get_ratings_by_professional(profesional_id)

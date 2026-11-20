"""Protein sizing and cost. Pure functions."""
from .config import GUIDELINE_G_PER_KG, MEALS_PER_DAY


def target_protein_per_meal(weight_kg: float) -> float:
    if weight_kg <= 0:
        raise ValueError("weight_kg must be positive")
    return GUIDELINE_G_PER_KG * weight_kg / MEALS_PER_DAY


def as_sold_g(target_protein_g: float, protein_g_per_100g: float) -> float:
    if protein_g_per_100g <= 0:
        raise ValueError("protein_g_per_100g must be positive")
    return target_protein_g / (protein_g_per_100g / 100.0)


def cost_ngn(sold_g: float, price_ngn_per_kg: float) -> float:
    if price_ngn_per_kg < 0:
        raise ValueError("price_ngn_per_kg must not be negative")
    return sold_g / 1000.0 * price_ngn_per_kg

"""Initialize scrapers package."""

# Only LinkedIn enrichment is used
from .linkedin import enrich_linkedin_profile, search_linkedin_profile

__all__ = [
    "enrich_linkedin_profile",
    "search_linkedin_profile"
]

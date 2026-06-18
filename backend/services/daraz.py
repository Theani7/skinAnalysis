"""
Daraz Nepal Product Search Service

Searches Daraz.com.np for real skincare products via their AJAX JSON endpoint.
Returns product name, price (NPR), image, URL, rating, and review count.
Results are cached to avoid redundant requests.
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# Daraz Nepal AJAX search endpoint
DARAZ_SEARCH_URL = "https://www.daraz.com.np/catalog/"

# Default headers to avoid bot detection
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.daraz.com.np/",
}

# In-memory cache: {query_lower: (timestamp, results)}
_cache: Dict[str, tuple] = {}
CACHE_TTL = 1800  # 30 minutes

# Search queries mapped to recommendation IDs
# These are the search terms sent to Daraz for each product type
RECOMMENDATION_SEARCH_QUERIES: Dict[str, str] = {
    "acne_bpo": "benzoyl peroxide cream",
    "acne_bha": "salicylic acid serum",
    "acne_adapalene": "adapalene gel acne",
    "acne_niacinamide": "niacinamide serum",
    "acne_teatree": "tea tree oil spot treatment",
    "pig_retinol": "retinol serum face",
    "pig_vitc": "vitamin c serum face",
    "pig_alpha_arbutin": "alpha arbutin serum",
    "pig_sunscreen": "spf 50 sunscreen face",
    "pig_kojic": "kojic acid cream",
    "dry_ha_ceramide": "hyaluronic acid ceramide moisturizer",
    "dry_ha": "hyaluronic acid serum",
    "dry_urea": "urea moisturizer cream",
    "dry_aha_lactic": "lactic acid serum",
    "dry_occlusive": "barrier repair balm",
}


def _get_cache_key(query: str, limit: int) -> str:
    return f"{query.lower().strip()}:{limit}"


def _is_cache_valid(entry: tuple) -> bool:
    return (time.time() - entry[0]) < CACHE_TTL


async def search_products(query: str, limit: int = 3) -> List[Dict]:
    """
    Search Daraz Nepal for products matching the query.

    Args:
        query: Search term (e.g., "salicylic acid serum")
        limit: Max products to return (default 3)

    Returns:
        List of dicts with keys: name, price, price_show, original_price,
        discount, image, url, rating, reviews, sold, in_stock
    """
    cache_key = _get_cache_key(query, limit)

    # Check cache
    if cache_key in _cache:
        ts, cached = _cache[cache_key]
        if _is_cache_valid((ts,)):
            logger.debug(f"Cache hit for Daraz query: {query}")
            return cached

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(
                DARAZ_SEARCH_URL,
                params={"q": query, "ajax": "true", "page": "1"},
                headers=HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()

        items = data.get("mods", {}).get("listItems", [])
        products = []

        for item in items[:limit]:
            if not item.get("inStock", False):
                continue

            # Normalize URL
            item_url = item.get("itemUrl", "")
            if item_url.startswith("//"):
                item_url = "https:" + item_url
            elif not item_url.startswith("http"):
                item_url = "https://www.daraz.com.np" + item_url

            # Parse price
            try:
                price = int(float(item.get("price", "0")))
            except (ValueError, TypeError):
                price = 0

            try:
                original_price = int(float(item.get("originalPrice", "0")))
            except (ValueError, TypeError):
                original_price = 0

            # Parse rating
            try:
                rating = round(float(item.get("ratingScore", "0")), 1)
            except (ValueError, TypeError):
                rating = 0.0

            # Parse review count
            try:
                reviews = int(item.get("review", "0"))
            except (ValueError, TypeError):
                reviews = 0

            products.append({
                "name": item.get("name", "Unknown Product"),
                "price": price,
                "price_show": item.get("priceShow", f"Rs. {price}"),
                "original_price": original_price,
                "discount": item.get("discount", ""),
                "image": item.get("image", ""),
                "url": item_url,
                "rating": rating,
                "reviews": reviews,
                "sold": item.get("itemSoldCntShow", ""),
                "in_stock": True,
            })

        # Cache results
        _cache[cache_key] = (time.time(), products)
        logger.info(f"Daraz search '{query}': found {len(products)} products")
        return products

    except httpx.HTTPStatusError as e:
        logger.warning(f"Daraz HTTP error for '{query}': {e.response.status_code}")
        return []
    except Exception as e:
        logger.warning(f"Daraz search failed for '{query}': {e}")
        return []


async def search_products_for_recommendations(
    recommendation_ids: List[str],
    limit_per_query: int = 2,
) -> Dict[str, List[Dict]]:
    """
    Batch search Daraz for multiple recommendation IDs.
    Runs searches concurrently for speed.

    Args:
        recommendation_ids: List of recommendation IDs (e.g., ["acne_bpo", "pig_vitc"])
        limit_per_query: Max products per recommendation (default 2)

    Returns:
        Dict mapping recommendation ID -> list of products
    """
    # Filter to only skincare recommendations that have search queries
    searchable = [
        rid for rid in recommendation_ids
        if rid in RECOMMENDATION_SEARCH_QUERIES
    ]

    if not searchable:
        return {}

    async def _search_one(rid: str):
        query = RECOMMENDATION_SEARCH_QUERIES[rid]
        products = await search_products(query, limit=limit_per_query)
        return rid, products

    # Run all searches concurrently
    tasks = [_search_one(rid) for rid in searchable]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    product_map = {}
    for result in results:
        if isinstance(result, Exception):
            logger.warning(f"Batch search error: {result}")
            continue
        rid, products = result
        if products:
            product_map[rid] = products

    return product_map


def get_search_query(recommendation_id: str) -> Optional[str]:
    """Get the Daraz search query for a recommendation ID."""
    return RECOMMENDATION_SEARCH_QUERIES.get(recommendation_id)

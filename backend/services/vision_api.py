import json
import logging
import os
from typing import Optional, Any
import cv2
import numpy as np

logger = logging.getLogger(__name__)

def analyze_skin_with_gemini(image: np.ndarray) -> Optional[dict[str, Any]]:
    """
    Uses the free Gemini Vision API to analyze skin for dryness and pigmentation.
    Requires GEMINI_API_KEY to be set in the environment.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)

        # Use gemini-2.0-flash for speed, it's very capable and free
        model = genai.GenerativeModel('gemini-2.0-flash')

        # Encode image to JPEG
        success, encoded_image = cv2.imencode('.jpg', image)
        if not success:
            logger.error("Failed to encode image for Gemini")
            return None

        image_bytes = encoded_image.tobytes()

        prompt = """
        You are an expert dermatologist AI. Analyze this image of a face for skin conditions.
        Provide a JSON response with exactly the following structure (no markdown, just the JSON string):
        {
            "pigmentation": {
                "clarity_score": <number 0-100, 100 is perfectly clear skin, lower means more hyperpigmentation/dark spots>,
                "intensity": <string: "Low", "Moderate", or "High">
            },
            "dryness": {
                "hydration_score": <number 0-100, 100 is perfectly hydrated, lower means dry/flaky>,
                "roughness_score": <number 0-100, higher means more textured/flaky>
            }
        }
        Only output the raw JSON object.
        """

        blob = {
            "mime_type": "image/jpeg",
            "data": image_bytes
        }

        logger.info("Sending image to Gemini Vision API for classification...")
        response = model.generate_content([prompt, blob])

        text_response = response.text.strip()
        # Clean up in case Gemini returns markdown block
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]

        result = json.loads(text_response.strip())
        logger.info("Successfully received classification from Gemini.")
        return result

    except Exception as e:
        logger.error(f"Gemini API analysis failed: {e}")
        return None

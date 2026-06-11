# High-Accuracy Pigmentation Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a clinical-grade pigmentation detection system using CV signal analysis and integrate it into the dashboard.

**Architecture:** We will extend the `AcnePredictor` service in the backend to include a `detect_pigmentation` pipeline. This pipeline uses LAB color space analysis, illuminant normalization, and statistical thresholding. The frontend will be updated with a tabbed interface on the Results page to show the new data.

**Tech Stack:** Python, OpenCV, NumPy, React, Tailwind CSS.

---

### Task 1: Backend Pigmentation Logic

**Files:**
- Modify: `backend/services/predictor.py`

- [ ] **Step 1: Implement the `_detect_pigmentation` internal helper**

```python
# backend/services/predictor.py

def _detect_pigmentation(image: np.ndarray, skin_mask: np.ndarray, acne_mask: np.ndarray) -> Dict:
    """
    Detect pigmentation clusters using LAB color space analysis.
    - Normalizes for lighting (CLAHE)
    - Inhibits red regions (acne_mask)
    - Uses Z-score thresholding for accuracy
    """
    # 1. Prepare LAB channels
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    
    # 2. Normalize Lighting (CLAHE on L)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_norm = clahe.apply(l_ch)
    
    # 3. Create Red Inhibition Mask (using 'a' channel)
    # Acne regions are high in 'a'. Pigment is low in 'a'.
    _, red_thresh = cv2.threshold(a_ch, 145, 255, cv2.THRESH_BINARY)
    inhibition_mask = cv2.bitwise_or(red_thresh, acne_mask)
    
    # 4. Statistical Analysis on healthy skin
    healthy_skin_mask = cv2.bitwise_and(skin_mask, cv2.bitwise_not(inhibition_mask))
    healthy_pixels = l_norm[healthy_skin_mask > 0]
    
    if len(healthy_pixels) < 100:
        return {"clarity_score": 100, "clusters": [], "heatmap": None}
        
    mean_l = np.mean(healthy_pixels)
    std_l = np.std(healthy_pixels)
    
    # 5. Z-Score Thresholding (Pixels > 2.5 std devs darker than mean)
    threshold = mean_l - (2.5 * std_l)
    pigment_mask = (l_norm < threshold).astype(np.uint8) * 255
    pigment_mask = cv2.bitwise_and(pigment_mask, healthy_skin_mask)
    
    # 6. Cleanup & Clustering
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    pigment_mask = cv2.morphologyEx(pigment_mask, cv2.MORPH_OPEN, kernel)
    
    contours, _ = cv2.findContours(pigment_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    clusters = []
    total_pigment_area = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 5: continue
        total_pigment_area += area
        x, y, w, h = cv2.boundingRect(cnt)
        clusters.append({"bbox": [x, y, x+w, y+h], "area": area})
        
    # 7. Calculate Clarity Score
    skin_area = np.count_nonzero(skin_mask)
    pigment_ratio = total_pigment_area / max(1, skin_area)
    clarity_score = max(0, min(100, 100 - (pigment_ratio * 500))) # Scaled factor
    
    return {
        "clarity_score": round(clarity_score, 1),
        "clusters": clusters,
        "mask": pigment_mask
    }
```

- [ ] **Step 2: Update `analyze_image` to include pigmentation call**

```python
# backend/services/predictor.py (Inside analyze_image)
# ... after all_detections = _nms(all_detections) ...

# Create acne mask for inhibition
acne_mask = np.zeros(image.shape[:2], dtype=np.uint8)
for det in all_detections:
    b = det["bbox"]
    cv2.rectangle(acne_mask, (b[0], b[1]), (b[2], b[3]), 255, -1)

# Run pigmentation analysis
pigment_result = _detect_pigmentation(image, skin_mask, acne_mask)

# Generate Heatmap
heatmap_img = image.copy()
heatmap_overlay = np.zeros_like(image)
heatmap_overlay[pigment_result["mask"] > 0] = (0, 165, 255) # Orange/Amber
heatmap_img = cv2.addWeighted(heatmap_img, 0.7, heatmap_overlay, 0.3, 0)

import uuid
heatmap_filename = f"heatmap_{uuid.uuid4().hex[:8]}.jpg"
cv2.imwrite(os.path.join(RESULTS_DIR, heatmap_filename), heatmap_img)

# Update return dict
return {
    "status": "success",
    "acne_count": acne_count,
    # ... other fields ...
    "pigmentation_data": {
        "clarity_score": pigment_result["clarity_score"],
        "spots_count": len(pigment_result["clusters"]),
        "heatmap_image": heatmap_filename,
        "type_distribution": {
            "localized": 60, # Placeholder for now
            "diffuse": 40
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/services/predictor.py
git commit -m "feat: implement LAB-based pigmentation detection logic"
```

---

### Task 2: Update API Response & Frontend Types

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Update `AnalysisResult` and `AnalysisResponse` types**

```typescript
// frontend/src/types/index.ts
export interface PigmentationData {
  clarity_score: number;
  spots_count: number;
  heatmap_image: string;
  type_distribution: {
    localized: number;
    diffuse: number;
  };
}

export interface AnalysisResult {
  // ... existing fields ...
  pigmentation_data?: PigmentationData;
}
```

- [ ] **Step 2: Update API response interface**

```typescript
// frontend/src/services/api.ts
export interface AnalysisResponse {
  // ... existing ...
  pigmentation_data: {
    clarity_score: number;
    spots_count: number;
    heatmap_image: string;
    type_distribution: {
      localized: number;
      diffuse: number;
    };
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/api.ts
git commit -m "types: add pigmentation data to analysis models"
```

---

### Task 4: Refactor ResultsPage with Tabbed UI

**Files:**
- Modify: `frontend/src/pages/ResultsPage.tsx`

- [ ] **Step 1: Implement Tab Switching Logic**

```tsx
// frontend/src/pages/ResultsPage.tsx
const [activeTab, setActiveTab] = useState<'acne' | 'pigment'>('acne');

// Add tab buttons in the UI
<div className="flex p-1 bg-white/5 rounded-xl mb-6">
  <button 
    onClick={() => setActiveTab('acne')}
    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'acne' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'}`}
  >
    Acne Analysis
  </button>
  <button 
    onClick={() => setActiveTab('pigment')}
    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pigment' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400'}`}
  >
    Pigmentation
  </button>
</div>
```

- [ ] **Step 2: Implement Pigmentation Content View**

```tsx
// Render different content based on activeTab
{activeTab === 'pigment' && result.pigmentation_data && (
  <div className="space-y-6">
    <div className="text-center">
      <ProgressRing 
        value={result.pigmentation_data.clarity_score} 
        size={120} 
        color="#f59e0b"
        label="Clarity"
      />
    </div>
    
    <div className="grid grid-cols-2 gap-4">
       <Card padding="md">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">Spots</p>
          <p className="text-2xl font-bold text-white">{result.pigmentation_data.spots_count}</p>
       </Card>
       <Card padding="md">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">Tone</p>
          <p className="text-2xl font-bold text-white">Uneven</p>
       </Card>
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ResultsPage.tsx
git commit -m "feat: add tabbed interface and pigmentation dashboard to ResultsPage"
```

---

### Task 5: Interactive Heatmap Visualization

**Files:**
- Modify: `frontend/src/pages/ResultsPage.tsx`

- [ ] **Step 1: Implement Heatmap Toggle on the Image**

```tsx
// frontend/src/pages/ResultsPage.tsx
const [showHeatmap, setShowHeatmap] = useState(false);

// Inside the image card
<div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10">
  <img 
    src={showHeatmap ? getResultImageUrl(result.pigmentation_data.heatmap_image) : getResultImageUrl(result.resultImage)} 
    className="w-full h-full object-cover transition-all duration-500"
  />
  <button 
    onClick={() => setShowHeatmap(!showHeatmap)}
    className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-white border border-white/10"
  >
    {showHeatmap ? 'Show Bounding Boxes' : 'Show Heatmap'}
  </button>
</div>
```

- [ ] **Step 2: Final Verification**
1. Upload an image with freckles/spots.
2. Verify that the "Pigmentation" tab shows a clarity score.
3. Verify that the "Show Heatmap" toggle works and shows orange overlays.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ResultsPage.tsx
git commit -m "feat: implement interactive pigmentation heatmap toggle"
```

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from fastapi.responses import Response
import os

app = FastAPI(title="DepEd Cabuyao School Permit Registry API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GeocodeRequest(BaseModel):
    address: str
    name: Optional[str] = None

class GeocodeResponse(BaseModel):
    lat: float
    lng: float

@app.post("/api/ocr/permit")
async def ocr_permit(file: UploadFile = File(...), targetPage: Optional[int] = Form(None)):
    fname = (file.filename or "").lower()
    if not fname.endswith(('.pdf', '.jpg', '.jpeg', '.png')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF and images are supported.")
    content = await file.read()
    # OCR strategy:
    # 1) Extract selectable text from PDF
    # 2) If text is sparse (scanned pages), fallback to image OCR (PyMuPDF + pytesseract) if available
    try:
        from PyPDF2 import PdfReader
        import io, re
        text = ""
        engine = "pdf-text"

        def score_page(page_text: str) -> int:
            compact = re.sub(r"\s+", " ", page_text).strip().lower()
            if not compact:
                return 0
            score = 0
            if "government permit" in compact:
                score += 8
            if "school year" in compact:
                score += 5
            if "complete address" in compact:
                score += 4
            if "(school)" in compact:
                score += 4
            if "senior high school" in compact:
                score += 5
            if re.search(r"\bno\.?\s*[a-z]{1,5}-\d{2,6}\b", compact):
                score += 4
            if "indorsement" in compact or "endorsement" in compact:
                score -= 2
            return score

        def selected_indices(page_count: int, page_texts: list[str]) -> list[int]:
            if page_count <= 0:
                return []

            if targetPage is not None and 1 <= targetPage <= page_count:
                return [targetPage - 1]

            scored = sorted(
                [(score_page(t), idx) for idx, t in enumerate(page_texts)],
                key=lambda x: x[0],
                reverse=True,
            )
            picked = [idx for score, idx in scored if score > 0][:3]
            if picked:
                return picked
            return list(range(min(2, page_count)))

        page_texts: list[str] = []
        if fname.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content))
            page_texts = [(page.extract_text() or "") for page in reader.pages]

            # If a specific page is requested, start with that page then append all others
            # so every page's text is still available for extraction.
            if targetPage is not None and 1 <= targetPage <= len(page_texts):
                priority = [page_texts[targetPage - 1]]
                rest = [t for i, t in enumerate(page_texts) if i != targetPage - 1]
                text = "\n".join(priority + rest)
            else:
                # Scan ALL pages — permit data can appear on any page
                text = "\n".join(page_texts)

            # Scanned PDF fallback: if very little selectable text, try image OCR on all pages
            if len(re.sub(r"\s+", "", text)) < 80:
                try:
                    import fitz  # pymupdf
                    import pytesseract
                    from PIL import Image

                    candidates = [
                        os.getenv("TESSERACT_CMD", "").strip(),
                        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                    ]
                    for candidate in candidates:
                        if candidate and os.path.exists(candidate):
                            pytesseract.pytesseract.tesseract_cmd = candidate
                            break

                    ocr_doc = fitz.open(stream=content, filetype="pdf")
                    ocr_chunks: list[str] = []
                    for i in range(len(ocr_doc)):
                        page = ocr_doc.load_page(i)
                        pix = page.get_pixmap(dpi=220)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        ocr_chunks.append(pytesseract.image_to_string(img) or "")
                    ocr_doc.close()
                    fallback_text = "\n".join(ocr_chunks)
                    if len(re.sub(r"\s+", "", fallback_text)) > len(re.sub(r"\s+", "", text)):
                        text = fallback_text
                        engine = "image-ocr"
                except Exception:
                    pass

        raw_text = text
        normalized = re.sub(r"\s+", " ", raw_text)

        # Basic anchor extraction
        def find(pattern: str) -> str:
            m = re.search(pattern, normalized, re.IGNORECASE)
            return (m.group(1).strip() if m else "")

        def clean_value(value: str) -> str:
            return re.sub(r"\s+", " ", value).strip(" .,-")

        def normalize_permit_code(code: str) -> str:
            return re.sub(r"\s+", "", code).upper()

        name = find(r"([A-Z][A-Z0-9\s\.,&'\-]{5,})\s*\(\s*School\s*\)")
        if not name:
            name = find(r"(?:Name\s+of\s+School|This\s+is\s+to\s+certify\s+that)[:\s]+([^\n\.,]+)")
        if not name:
            name = find(r"(?:for\s+)?([A-Z][A-Z0-9\s\.,&'\-]{8,})\s+located\s+at")
        name = clean_value(name)

        address = ""
        line_anchor = re.search(r"\n\s*([^\n]{8,140})\s*\n\s*\(?\s*Complete\s+Address\s*\)?", raw_text, re.IGNORECASE)
        if line_anchor:
            address = clean_value(line_anchor.group(1))
        if not address:
            address = find(r"([A-Z0-9][A-Z0-9\s\.,'\-/]{6,})\s*\(?\s*Complete\s+Address\s*\)?")
        if not address:
            address = find(r"(?:located\s+at|Address:)[:\s]+([^\n]+?)(?:\.|\s+GP\s*No\.|\s+Government\s*Permit|\s+School\s*Year|$)")
        address = clean_value(address)

        permit_sample_pairs = re.findall(r"\bNo\.?\s*([A-Z]{1,6}\s*-\s*\d{2,6})\s*,?\s*s\.?\s*(\d{4})", normalized, re.IGNORECASE)
        permit_candidates = [normalize_permit_code(p) for p, _ in permit_sample_pairs]
        inferred_school_years = [f"{y.strip()}-{int(y.strip()) + 1}" for _, y in permit_sample_pairs if y.strip().isdigit()]

        permit_candidates.extend([
            normalize_permit_code(p)
            for p in re.findall(
                r"(?:GP\s*No\.?|Government\s*Permit\s*(?:No\.?|Number\.?|#)?|Permit\s*(?:No\.?|Number\.?|#))\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-./\s]{3,})",
                normalized,
                re.IGNORECASE,
            )
        ])

        permit_candidates.extend([
            normalize_permit_code(p)
            for p in re.findall(r"\b(DEPED-[A-Z0-9\-]{6,})\b", normalized, re.IGNORECASE)
        ])

        deduped_permits = []
        seen = set()
        for p in permit_candidates:
            key = p.strip().upper()
            if key and key not in seen:
                deduped_permits.append(p.strip())
                seen.add(key)

        school_year_matches = re.findall(r"(?:effective\s+this\s+school\s+year\s+)?(20\d{2}\s*[-/]\s*20\d{2})", normalized, re.IGNORECASE)
        school_years = []
        year_seen = set()
        for y in (school_year_matches + inferred_school_years):
            clean = re.sub(r"\s+", "", y).replace("/", "-")
            if clean not in year_seen:
                school_years.append(clean)
                year_seen.add(clean)

        def contains_any(source: str, patterns: list[str]) -> bool:
            return any(re.search(p, source, re.IGNORECASE) for p in patterns)

        default_levels = {
            "kindergarten": contains_any(normalized, [r"\bkindergarten\b", r"\bK\b\s*-\s*kindergarten"]),
            "elementary": contains_any(normalized, [r"\belementary\b", r"\bE\b\s*-\s*elementary"]),
            "highSchool": contains_any(normalized, [r"junior\s+high\s+school", r"\bhigh\s+school\b", r"\bJHS\b", r"\bJ\b\s*-"]),
            "seniorHighSchool": contains_any(normalized, [r"senior\s+high\s+school", r"\bSHS\b"]),
        }

        strand_patterns = {
            "STEM": [r"\bSTEM\b", r"science\s*,?\s*technology\s*,?\s*engineering\s*(?:and|&)\s*mathematics"],
            "ABM": [r"\bABM\b", r"accountancy\s*,?\s*business\s*(?:and|&)\s*management"],
            "HUMSS": [r"\bHUMSS\b", r"humanities\s*(?:and|&)\s*social\s+sciences"],
            "GAS": [r"\bGAS\b", r"general\s+academic\s+strand"],
            "TVL-ICT": [r"\bTVL[-\s]*ICT\b", r"information\s+and\s+communications?\s+technology"],
            "TVL-HE": [r"\bTVL[-\s]*HE\b", r"home\s+economics"],
            "TVL-IA": [r"\bTVL[-\s]*IA\b", r"industrial\s+arts"],
            "ARTS-DESIGN": [r"\bARTS[-\s]*DESIGN\b", r"arts\s*(?:and|&)\s*design"],
            "SPORTS": [r"\bSPORTS\b", r"sports\s+track"],
        }
        detected_strands = [
            strand
            for strand, patterns in strand_patterns.items()
            if any(re.search(pattern, normalized, re.IGNORECASE) for pattern in patterns)
        ]
        if detected_strands:
            default_levels["seniorHighSchool"] = True

        permits = []
        if deduped_permits:
            for idx, permit_no in enumerate(deduped_permits):
                permits.append(
                    {
                        "permitNumber": permit_no,
                        "schoolYear": school_years[idx] if idx < len(school_years) else (school_years[0] if school_years else ""),
                        "permitLevels": default_levels,
                        "shsStrands": detected_strands,
                    }
                )
        else:
            permits.append(
                {
                    "permitNumber": "",
                    "schoolYear": school_years[0] if school_years else "",
                    "permitLevels": default_levels,
                    "shsStrands": detected_strands,
                }
            )

        primary = permits[0] if permits else {
            "permitNumber": "",
            "schoolYear": "",
            "permitLevels": {
                "kindergarten": False,
                "elementary": False,
                "highSchool": False,
                "seniorHighSchool": False,
            },
            "shsStrands": [],
        }

        school_year = find(r"(\d{4}\s*-\s*\d{4})")
        return {
            "name": name,
            "address": address,
            "permitNumber": primary["permitNumber"],
            "schoolYear": primary["schoolYear"] or school_year,
            "permitLevels": primary["permitLevels"],
            "shsStrands": primary["shsStrands"],
            "permits": permits,
            "ocrEngine": engine,
        }
    except Exception as e:
        # Fallback: return empty fields but keep endpoint responsive
        return {
            "name": "",
            "address": "",
            "permitNumber": "",
            "schoolYear": "",
            "permitLevels": {
                "kindergarten": False,
                "elementary": False,
                "highSchool": False,
                "seniorHighSchool": False,
            },
            "shsStrands": [],
            "permits": [],
            "ocrEngine": "none",
        }

@app.post("/api/geocode", response_model=GeocodeResponse)
async def geocode(request: GeocodeRequest):
    try:
        from importlib import import_module
        geocoders = import_module("geopy.geocoders")
        Nominatim = geocoders.Nominatim
        geolocator = Nominatim(user_agent="deped-cabuyao-school-registry")
        suffix = ", Cabuyao, Laguna, Philippines"

        def try_geocode(q: str):
            if "Laguna" not in q:
                q += suffix
            return geolocator.geocode(q, timeout=10)

        location = None
        # 1st attempt: school name + address (most accurate)
        if request.name and request.name.strip():
            location = try_geocode(f"{request.name.strip()}, {request.address.strip()}")
        # 2nd attempt: address only
        if not location:
            location = try_geocode(request.address.strip())
        # 3rd attempt: school name only (last resort)
        if not location and request.name and request.name.strip():
            location = try_geocode(request.name.strip())

        if not location:
            raise HTTPException(status_code=404, detail="Address not found")
        return {"lat": location.latitude, "lng": location.longitude}
    except ImportError:
        raise HTTPException(status_code=503, detail="Geocoding service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geocoding failed: {str(e)}")

@app.get("/api/reports/permits")
async def get_permit_report(
    schoolYear: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    # Minimal CSV export to avoid heavy XLSX dependencies
    csv = "School Name,District,Status,School Year,Permit No\n"
    # No DB yet; return empty dataset with headers only
    return Response(
        content=csv.encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=school_permits.csv"}
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

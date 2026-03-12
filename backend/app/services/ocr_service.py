import PyPDF2
import re
from typing import Dict, Any, List
import io

def process_permit_pdf(file_content: bytes, filename: str) -> Dict[str, Any]:
    """
    Processes a PDF file content, extracting text via PyPDF2.
    Searches for anchors: School Name, Address, Permit No, School Year, Education Level.
    """
    
    all_text = ""
    
    if filename.endswith('.pdf'):
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        for page in pdf_reader.pages:
            all_text += page.extract_text() + "\n"
    
    # 3. Anchor-Based Extraction Logic
    result = {
        "name": extract_anchor_text(all_text, ["Name of School", "This is to certify that"]),
        "address": extract_anchor_text(all_text, ["located at", "Address:", "City of Cabuyao"]),
        "permitNumber": extract_pattern(all_text, r"GP No\.\s*([\w\d\-]+)"),
        "schoolYear": extract_pattern(all_text, r"(\d{4}\s*-\s*\d{4})"),
        "permitLevels": {
            "kindergarten": "Kindergarten" in all_text,
            "elementary": "Elementary" in all_text,
            "highSchool": "Junior High School" in all_text or "High School" in all_text,
            "seniorHighSchool": "Senior High School" in all_text
        },
        "shsStrands": []
    }
    
    # 4. SHS Strand Logic
    if result["permitLevels"]["seniorHighSchool"]:
        strands = ["STEM", "ABM", "HUMSS", "GAS", "TVL"]
        for strand in strands:
            if strand in all_text:
                result["shsStrands"].append(strand)
                
    return result

def extract_anchor_text(text: str, anchors: List[str]) -> str:
    """Helper to extract text following an anchor string."""
    for anchor in anchors:
        # Use regex to find the anchor and take the following line/segment
        pattern = re.escape(anchor) + r"[:\s]+([^\n\.,]+)"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return ""

def extract_pattern(text: str, regex_pattern: str) -> str:
    """Helper to extract text matching a regex pattern."""
    match = re.search(regex_pattern, text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ""

import pandas as pd
from typing import List, Dict, Any, Optional
import io

def generate_permit_report(school_year: Optional[str] = None, status: Optional[str] = None) -> bytes:
    """
    Generates an Excel (.xlsx) report based on "School Year" and "Status" filters.
    """
    
    # In a real app, you'd fetch this from a DB
    # For now, we'll use dummy data for demonstration
    schools_data = [
        {"School Name": "Cabuyao Central School", "District": "Cabuyao East", "Status": "Operational", "School Year": "2024-2025", "Permit No": "GP No. 123-2024"},
        {"School Name": "Laguna Science High School", "District": "Cabuyao West", "Status": "For Renewal", "School Year": "2023-2024", "Permit No": "GP No. 456-2023"},
        {"School Name": "St. John Academy", "District": "Cabuyao North", "Status": "Operational", "School Year": "2024-2025", "Permit No": "GP No. 789-2024"},
        {"School Name": "Bigaa Elementary School", "District": "Cabuyao South", "Status": "Not Operational", "School Year": "2022-2023", "Permit No": "GP No. 012-2022"}
    ]
    
    df = pd.DataFrame(schools_data)
    
    # Filter the dataframe
    if school_year:
        df = df[df["School Year"] == school_year]
    if status:
        df = df[df["Status"].str.lower() == status.lower()]
        
    # Create an in-memory buffer for the Excel file
    output = io.BytesIO()
    
    # Write to Excel with formatting
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='School Permits')
        
        # Access the worksheet to add styling if needed
        workbook = writer.book
        worksheet = writer.sheets['School Permits']
        
        # Adjust column widths for better readability
        for column_cells in worksheet.columns:
            length = max(len(str(cell.value)) for cell in column_cells)
            worksheet.column_dimensions[column_cells[0].column_letter].width = length + 5
            
    # Seek to start of buffer and return content
    output.seek(0)
    return output.getvalue()

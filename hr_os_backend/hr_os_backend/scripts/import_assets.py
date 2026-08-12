import pandas as pd
import requests

def import_assets():
    print("Loading excel file...")
    file_path = r"C:\Users\DUBEY\Downloads\Untitled spreadsheet (3).xlsx"
    df = pd.read_excel(file_path)
    
    # Drop rows that are completely empty
    df = df.dropna(how="all")
    
    headers = {"Authorization": "Bearer bypass-token"}
    
    count = 0
    for index, row in df.iterrows():
        try:
            asset_doc = {
                "asset_tag": str(row.get("Serial Number")) if not pd.isna(row.get("Serial Number")) else "",
                "asset_type": str(row.get("Asset Type")) if not pd.isna(row.get("Asset Type")) else "",
                "brand": str(row.get("Brand")) if not pd.isna(row.get("Brand")) else "",
                "desktop_name": str(row.get("Desktop name")) if not pd.isna(row.get("Desktop name")) else "",
                "model": str(row.get("Model")) if not pd.isna(row.get("Model")) else "",
                "processor": str(row.get("Processor")) if not pd.isna(row.get("Processor")) else "",
                "ram": str(row.get("RAM")) if not pd.isna(row.get("RAM")) else "",
                "storage": str(row.get("Storage")) if not pd.isna(row.get("Storage")) else "",
                "operating_system": str(row.get("Operating System")) if not pd.isna(row.get("Operating System")) else "",
                "location": str(row.get("Location")) if not pd.isna(row.get("Location")) else "",
                "issue": str(row.get("Issue")) if not pd.isna(row.get("Issue")) else "",
                "gpu": str(row.get("GPU")) if not pd.isna(row.get("GPU")) else "",
                "assigned_to": str(row.get(" Assigned To")) if not pd.isna(row.get(" Assigned To")) else "",
                "status": str(row.get("Status")) if not pd.isna(row.get("Status")) else "AVAILABLE"
            }
            
            # Skip empty rows
            if not asset_doc["asset_tag"] and not asset_doc["model"]:
                continue
                
            res = requests.post("http://127.0.0.1:8000/it-assets/", json=asset_doc, headers=headers)
            if res.status_code == 200:
                count += 1
            else:
                print(f"Failed to insert row {index}: {res.text}")
        except Exception as e:
            print(f"Error on row {index}: {e}")
            
    print(f"Successfully inserted {count} assets via API!")

if __name__ == "__main__":
    import_assets()

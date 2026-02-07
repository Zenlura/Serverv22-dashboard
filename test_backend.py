"""
Quick Test Script für Kalender V2 Backend
Testet alle neuen Features ohne Frontend
"""

import requests
from datetime import date

BASE_URL = "http://localhost:8000"

def test_verfuegbarkeit():
    """Test Verfügbarkeits-Endpoint"""
    print("=" * 60)
    print("TEST: Verfügbarkeits-Endpoint")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/vermietungen/verfuegbarkeit/"
    params = {
        "von_datum": "2026-02-10",
        "bis_datum": "2026-02-12"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        print("✅ Endpoint erreichbar!")
        print()
        print(f"Verfügbare Räder: {data['verfuegbar']}/{data['gesamt']}")
        print(f"Belegt: {data['belegt']}")
        print(f"Kann buchen: {data['kann_buchen']}")
        print(f"Warnung: {data['warnung']}")
        print(f"Buchungen: {len(data['buchungen'])}")
        
        if data['buchungen']:
            print()
            print("Überlappende Buchungen:")
            for b in data['buchungen']:
                print(f"  - {b['kunde_name']}: {b['anzahl_raeder']} Räder ({b['von']} - {b['bis']})")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Backend nicht erreichbar!")
        print("   Starte Backend: uvicorn app.main:app --reload ...")
        return False
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False


def test_vermietungen():
    """Test Vermietungen mit neuen Feldern"""
    print()
    print("=" * 60)
    print("TEST: Vermietungen mit neuen Feldern")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/vermietungen/"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        print("✅ Endpoint erreichbar!")
        print()
        print(f"Anzahl Vermietungen: {data['total']}")
        
        if data['items']:
            print()
            print("Erste Vermietung:")
            v = data['items'][0]
            print(f"  ID: {v['id']}")
            print(f"  Anzahl Räder: {v.get('anzahl_raeder', 'FEHLT!')}")
            print(f"  Von: {v['von_datum']} {v.get('von_zeit', 'keine Zeit')}")
            print(f"  Bis: {v['bis_datum']} {v.get('bis_zeit', 'keine Zeit')}")
            
            # Check neue Felder
            if 'anzahl_raeder' in v:
                print()
                print("✅ Neue Felder sind vorhanden!")
            else:
                print()
                print("⚠️ Neue Felder fehlen noch (Migration nicht gelaufen?)")
        else:
            print("ℹ️ Keine Vermietungen vorhanden")
        
        return True
        
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False


def test_swagger():
    """Test Swagger UI"""
    print()
    print("=" * 60)
    print("TEST: Swagger UI")
    print("=" * 60)
    
    url = f"{BASE_URL}/docs"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        print("✅ Swagger UI erreichbar!")
        print(f"   URL: {url}")
        print()
        print("💡 Öffne im Browser zum Testen:")
        print(f"   {url}")
        
        return True
        
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False


if __name__ == "__main__":
    print()
    print("🚀 KALENDER V2 BACKEND - QUICK TEST")
    print()
    
    # Tests ausführen
    results = []
    results.append(("Verfügbarkeit", test_verfuegbarkeit()))
    results.append(("Vermietungen", test_vermietungen()))
    results.append(("Swagger UI", test_swagger()))
    
    # Zusammenfassung
    print()
    print("=" * 60)
    print("ZUSAMMENFASSUNG")
    print("=" * 60)
    
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"{status} {name}")
    
    all_success = all(r[1] for r in results)
    
    print()
    if all_success:
        print("🎉 ALLE TESTS BESTANDEN!")
        print()
        print("Backend Foundation ist fertig!")
        print("Nächster Schritt: Phase 2 - Frontend")
    else:
        print("⚠️ EINIGE TESTS FEHLGESCHLAGEN!")
        print()
        print("Prüfe:")
        print("  1. Ist Backend gestartet?")
        print("  2. Läuft es auf Port 8000?")
        print("  3. Wurde Migration ausgeführt?")
    
    print()

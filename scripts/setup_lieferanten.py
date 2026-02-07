# Datei: scripts/setup_lieferanten.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models.lieferant import Lieferant

session = SessionLocal()
for name in ['Hartje', 'BBF', 'Magura', 'VALK']:
    if not session.query(Lieferant).filter_by(name=name).first():
        session.add(Lieferant(name=name, kurzname=name, aktiv=True))
session.commit()
print(f"✅ {session.query(Lieferant).count()} Lieferanten vorhanden")
session.close()
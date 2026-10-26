Website für die Schacholympiade

Statisches Archiv des abgeschlossenen Turnierstands. Keine Server-/Datenbank-Anbindung mehr — alle Ergebnisse sind fest in `index.html` eingebettet.

## Live-Schach (`live/`)

Eigene Unterseite für Partien 1 gegen 1 per Einladungslink: Bedenkzeit (mit Zuschlag), Premove, Eval-Balken (Stockfish im Browser), Remis/Aufgabe, Revanche, Zuschauer.
Es gibt keinen eigenen Server: Die Browser verbinden sich direkt per WebRTC (PeerJS-Vermittlungsserver `0.peerjs.com`, nur zum Verbinden). Wer die Partie erstellt, hält den Spielstand und muss die Seite offen lassen.
Tests: `node live/test.mjs` (Spiellogik). Eingebundene Fremdbausteine und ihre Lizenzen: `live/vendor/README.txt`.

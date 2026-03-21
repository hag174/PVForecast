# Erkenntnisse Aus Dem Quality Check

- Gruene Unit-Tests reichen nicht aus, wenn die eigentliche Adapterklasse `Pvforecast` nicht direkt getestet wird.
- Die wichtigsten Laufzeitpfade in `src/main.ts` brauchen eigene Tests: Timer, Fehlerbehandlung, State-Writes und Cleanup alter Hourly-States.
- `npm test` deckt aktuell nur Unit-Tests und Package-Checks ab; der Integrationstest laeuft getrennt und sollte regelmaessig mitgeprueft werden.
- Eine Coverage-Ausgabe von `0/0` ist ein Warnsignal, weil sie keine belastbare Aussage ueber die echte Testabdeckung liefert.
- Netzwerkzugriffe sollten ein Timeout oder Abort-Handling haben, damit haengende API-Requests keine ueberlappenden Refresh-Laeufe verursachen.
- `refreshIntervalMinutes` ist derzeit totes Konfigurationsgepaeck: vorhanden im Typ und in Tests, aber ohne Nutzung im Adapter.
- Project Memory sollte nur Aussagen enthalten, die durch den aktuellen Code oder durch Tests abgesichert sind.
- Die Project-Memory war inhaltlich weitgehend passend, musste aber um den aktuellen Review-Stand ergaenzt werden.
- Bei Dateinamen auf Linux ist die exakte Schreibweise wichtig; hier existiert `AGENTS.MD`, nicht `AGENTS.md`.
- Fuer die reale Sicherheitsbewertung ist zwischen Runtime-Dependencies und reinem Dev-Tooling zu unterscheiden; die Audit-Funde lagen hier nur im Dev-Bereich.

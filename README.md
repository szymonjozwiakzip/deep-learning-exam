# deep-learning-exam

Baza pytań egzaminacyjnych z kursu Deep Learning oraz platforma do nauki.

## Platforma webowa

Aplikacja umożliwia:

- testy z pełnej bazy lub wybranego pliku źródłowego (kafelki),
- losową kolejność odpowiedzi (z zapisem poprawnej),
- renderowanie wzorów LaTeX (KaTeX),
- zapis postępu w `localStorage` przeglądarki,
- podsumowanie testu z opcją powtórki błędnych pytań,
- przegląd notebooków wykładowych z `lectures/`.

### Uruchomienie

Z katalogu głównego repozytorium:

```bash
python -m http.server 8080
```

Następnie otwórz w przeglądarce:

```
http://localhost:8080/
```

> **Uwaga:** Aplikacja musi być serwowana przez HTTP (nie `file://`), aby wczytać `questions.json` i notebooki.

## Struktura

- `index.html` — aplikacja do nauki
- `questions.json` — baza pytań wielokrotnego wyboru
- `lectures/` — materiały wykładowe (notebooki, PDF)
- `additional/` — skrócone syntezy egzaminacyjne (Grali.pdf, Palub.pdf)
- `css/`, `js/` — zasoby front-endu

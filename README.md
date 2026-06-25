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

### GitHub Pages

Strona jest hostowana na GitHub Pages (gałąź `main`, katalog główny):

**https://szymonjozwiakzip.github.io/deep-learning-exam/**

Po każdym `git push` na `main` GitHub automatycznie odświeża stronę (zwykle w ciągu 1–2 minut).

#### Włączenie / konfiguracja (jednorazowo)

1. Wypchnij kod na GitHub (`git push origin main`).
2. W repozytorium: **Settings → Pages**.
3. **Build and deployment → Source:** wybierz **Deploy from a branch**.
4. **Branch:** `main`, folder **`/ (root)`**, zapisz.

Alternatywnie z CLI:

```bash
gh api --method POST repos/szymonjozwiakzip/deep-learning-exam/pages \
  -f 'source[branch]=main' \
  -f 'source[path]=/' \
  -f 'build_type=legacy'
```

#### Aktualizacja strony

Wystarczy normalny push:

```bash
git add .
git commit -m "opis zmian"
git push origin main
```


- `index.html` — aplikacja do nauki
- `questions.json` — baza pytań wielokrotnego wyboru
- `lectures/` — materiały wykładowe (notebooki, PDF)
- `css/`, `js/` — zasoby front-endu

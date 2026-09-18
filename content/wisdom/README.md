# Wisdom content register

This directory is the research and editorial register for Heatt's Wisdom library. It is intentionally separate from the app code so a reviewer can inspect the words, sources, and rights decisions without treating a research copy as launch-cleared content.

## Record contract

`library.json` keeps four layers separate:

- `sourceText`: the only text presented as an attributed source quotation.
- `editorialContext`: editorial description of the source and its setting.
- `interpretation`: Heatt's present-day reading; it is not the historical author's voice.
- `practicePrompt`: an original, optional prompt for the reader.

Each external record also includes the author, work, translator or edition, publication context, stable source URL, location, language, retrieval date, source type, rights status, and a rights note. `original` records are Heatt copy and are not presented as historical quotations.

## Rights gate

`public_domain_source_pending_review` is a deliberate state, not a green light. A source work being old, public-domain in one territory, or available from Project Gutenberg does **not** automatically clear the exact translation, transcription, edition, or every launch jurisdiction. Before production publication, an editor and legal reviewer must:

1. verify the exact quotation against the named edition;
2. record the translator, editor, publisher, and publication year where known;
3. verify the source repository's terms and the target launch jurisdictions;
4. decide whether to publish, replace with a licensed edition, or remove the record;
5. change the record only through a reviewed content change, retaining the evidence in the content review log.

The current external records remain `public_domain_source_pending_review` so a build cannot silently imply that they are cleared. Until review is complete, original Heatt records are the safest fallback.

## Sources researched

- [Project Gutenberg eBook 2388](https://www.gutenberg.org/ebooks/2388), Sir Edwin Arnold's *The Song Celestial; or, Bhagavad-Gita*, 1900 edition context; [HTML text](https://www.gutenberg.org/files/2388/2388-h/2388-h.htm).
- [Project Gutenberg eBook 2680](https://www.gutenberg.org/files/2680/2680-h/2680-h.htm), *Meditations* text; the displayed metadata identifies the translation used by the eBook. The exact edition and redistribution status still require review.
- [Project Gutenberg eBook 574](https://www.gutenberg.org/cache/epub/574/pg574.html), William Blake's *Poems of William Blake*; verify transcription and jurisdiction before publication.
- [Project Gutenberg eBook 2944](https://www.gutenberg.org/files/2944/2944-h/2944-h.htm), Ralph Waldo Emerson's *Essays, First Series*; the source's own legal notice is not a substitute for a Heatt rights decision.

## Review state

This catalog is suitable for deterministic local development and editorial review. It must not be described as a rights-cleared production catalog until every external record has a recorded decision. The app should show the review state when an entry is opened and should fall back to an original Heatt reflection when an external record is excluded.

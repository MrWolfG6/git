# Character art

Drop the anime portrait here as **`avatar.png`** — a transparent PNG, portrait
orientation, full body or upper body.

    portfolio/img/avatar.png

The hero checks for the file at load. If it is there, the layout switches to two
columns and the portrait sits beside the name. If it is missing, the image
element removes itself and the hero renders exactly as it does now — so nothing
breaks while the art is still being made.

The prompt that produces it, written against the reference photos, is in
`../PROMPT.md`, section 3.

## A background you draw

> Pass a function as animate: it draws into the stage and returns play and pause. klappe calls them, so your loop runs only on screen.

- scene.ts { background: { animate: (el) => ({ play, pause }) } } — your own loop

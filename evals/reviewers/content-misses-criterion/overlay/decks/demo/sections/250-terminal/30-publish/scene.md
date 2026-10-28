## Publish a release

> Three commands take a tested build to the registry. Each step types one command and shows what it prints.

```console
$ npm version minor
v0.7.0
$ npm publish
published klappe@0.7.0
```

- Bump the version.

> npm version writes the new version into package.json and tags the commit.

- Publish the package.

> npm publish uploads the package to the registry.
